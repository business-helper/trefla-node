const { Validator } = require("node-input-validator");
const CONSTS = require('../constants/socket.constant');
const Post = require("../models/post.model");
const User = require("../models/user.model");
const Config = require("../models/config.model");
const PostLike = require("../models/postLike.model");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { filterAroundUsers, generateTZTimeString, getTimeAfter, getTotalLikes, respondError, SendAllMultiNotifications, timestamp } = require("../helpers/common.helpers");
const { checkPostLocationWithUser, generatePostData, generatePostLikeData } = require('../helpers/model.helpers');


const activity = {
  pushNotificationToAroundUsers: async ({ contents, areaUsers, post }) => {
    const aroundUsers = filterAroundUsers(post.location_coordinate, areaUsers); //.filter(el => el.id !== user.id));
    const messages = aroundUsers.filter(u => u.device_token).map(u => ({
      token: u.device_token,
      notification: {
        title: 'Trefla',
        body: contents[(u.language && u.language.toLowerCase() === 'romanian') ? 'RO' : 'EN'],
      },
    }));
    await SendAllMultiNotifications(messages);
  }
}

exports.create = (req, res) => {
  const socketClient = req.app.locals.socketClient;

  const { uid: user_id, role } = getTokenInfo(req);
  let postData = generatePostData(req.body);
  role !== 'ADMIN' ? postData.user_id = user_id : null; // req.body.post_user_id;
  postData.post_time = req.body.post_time ? req.body.post_time : generateTZTimeString();
  return Post.create(postData)
    .then(post => Promise.all([
      post,
      User.getById(post.user_id)
    ]))
    .then(async ([post, user]) => {
      post = Post.output(post);
      if (post.location_area) {
        const aroundUsers = await User.getByLocationArea(post.location_area);

        contents = {
          'EN': `${user.user_name} created a new post.`,
          'RO': `${user.user_name} a creat o nouă postare.`,
        };
        await activity.pushNotificationToAroundUsers({ post, areaUsers, contents });

        socketClient.emit(CONSTS.SKT_LTS_MULTIPLE, { 
          users: aroundUsers, 
          event: CONSTS.SKT_POST_CREATED,
          args: { ...post, liked: 0, user: User.output(user) }
         });
      } else {
        socketClient.emit(CONSTS.SKT_LTS_BROADCAST, {
          event: CONSTS.SKT_POST_CREATED,
          args: { ...post, liked: 0, user: User.output(user) }
        })        
      }

      return res.json({ status: true, message: "success", data: { ...post, liked: 0, user: User.output(user) } })
    })
    .catch((error) => respondError(res, error));
};

exports.getById = (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { id } = req.params;
  return Post.getById(id)
    .then(post => Promise.all([
      post,
      User.getById(post.user_id),
      PostLike.postLikesOfUser({ post_id: id, user_id })
    ]))
    .then(([post, user, likes]) => {
      post = Post.output(post);
      return res.json({ 
        status: true,
        message: 'success',
        data: {
          ...post, 
          liked: likes.length > 1 ? 1 : 0,
          user: User.output(user)
        }
      })
    })
    .catch((error) => respondError(res, error));
}

exports.pagination = async (req, res) => {
  //const tokenInfo = getTokenInfo(req); //console.log('tokenInfo', tokenInfo);
  const { uid } = getTokenInfo(req);
  const { limit, last_id, type, post_type } = req.body;
  // const offset = page * limit;
  let _posts = [], _total = 0, _posters = {}, _minId;

  let promiseAll;

  if (type === 'ALL') {
    const me = await User.getById(uid);
    promiseAll = Promise.all([
      Post.pagination({ limit, last_id, type: post_type, location_area: me.location_area }),
      Post.getCountOfPosts({ type: post_type, location_area: me.location_area }),
      Post.getMinIdOfPosts({ type: post_type, location_area: me.location_area }),
    ]);
  } else if (type === 'ME') {
    promiseAll = Promise.all([
      Post.pagination({ limit, last_id, type: post_type, user_id: uid }),
      Post.getCountOfPosts({ type: post_type, user_id: uid }),
      Post.getMinIdOfPosts({ type: post_type, user_id: uid })
    ]);
  } else { // AROUND
    // get config
    let [me, config] = await Promise.all([
      User.getById(uid),
      Config.get()
    ]);
    // const config = await Config.get();
    const deltaDays = config.aroundSearchDays || 100;
    const minTime = timestamp(getTimeAfter(new Date(), -deltaDays));
    const rawPosts = await Post.getAroundPosts({ last_id, minTime });
    // console.log('me', me);
    me = User.output(me, 'PROFILE');
    const aroundPosts = rawPosts.filter(post => checkPostLocationWithUser(post, me, config.aroundSearchPeriod, req.body.locationIndex));
    const posts = aroundPosts.splice(0, limit || 20);
    const minId = aroundPosts.length > 0 ? aroundPosts[aroundPosts.length - 1].id : 0;
    const total = aroundPosts.length;
    promiseAll = Promise.all([ posts, minId, total ]);
  }

  return promiseAll
    .then(async ([posts, total, minId]) => {
      _posts = posts; _total = total; _minId = minId;
      let poster_ids = posts.map(post => post.user_id); poster_ids.push(0);
      return User.getByIds(poster_ids);
    })
    .then(users => {
      users.map(user => _posters[user.id] = user);
      return Promise.all(_posts.map(post => PostLike.postLikesOfUser({ user_id: uid, post_id: post.id })))
    })
    .then((postLikedArray) => {
      // console.log('[Liked]', uid, postLikedArray.map(a => a.length));
      // console.log('[posters]', _posters);
      
      let posts = _posts.map(post => Post.output(post)); // filter keys
      posts = posts.map((post, i) => ({
        ...post, 
        liked: postLikedArray[i].length > 0 ? 1 : 0,
        user: User.output(_posters[post.post_user_id])
      }));

      cLastId = posts.length > 0 ? posts[posts.length - 1].id : 0;

      return res.json({
        status: true,
        message: 'success',
        data: posts,
        pager: {
          last_id: cLastId,
          limit,
          total: _total
        },
        hadMore: cLastId > _minId
      });
    })
    .catch((error) => respondError(res, error));
}

exports.simplePagination = async (req, res) => {
  //const tokenInfo = getTokenInfo(req); //console.log('tokenInfo', tokenInfo);
  const { uid } = getTokenInfo(req);
  let { limit, page, type, post_type } = req.query; limit = Number(limit);

  let _posts = [], _total = 0, _posters = {}, _minId;

  let promiseAll = Promise.all([
    Post.simplePagination({ limit, page, type: post_type }),
    Post.getCountOfPosts({ type: post_type }),
    Post.getMinIdOfPosts({ type: post_type })
  ]);

  return promiseAll
    .then(async ([posts, total, minId]) => {
      _posts = posts; _total = total; _minId = minId;
      let poster_ids = posts.map(post => post.user_id); poster_ids.push(0);
      return User.getByIds(poster_ids);
    })
    .then(users => {
      users.map(user => _posters[user.id] = user);
      return true;
    })
    .then(() => {
      // console.log('[Liked]', uid, postLikedArray.map(a => a.length));
      // console.log('[posters]', _posters);
      
      let posts = _posts.map(post => Post.output(post)); // filter keys
      posts = posts.map((post, i) => ({
        ...post, 
        user: User.output(_posters[post.post_user_id])
      }));

      cLastId = posts.length > 0 ? posts[posts.length - 1].id : 0;

      return res.json({
        status: true,
        message: 'success',
        data: posts,
        pager: {
          // last_id: cLastId,
          limit,
          total: _total
        },
        hasMore: cLastId > _minId
      });
    })
    .catch((error) => respondError(res, error));
}

exports.getAll = (req, res) => {
  Post.getAll()
    .then((posts) =>
      res.json({ status: true, message: "success", data: posts })
    )
    .catch((error) =>
      res.status(500).json({
        status: false,
        message: error.message || "Something went wrong!",
      })
    );
};

// to-do: permission check. only admin or creator can update it.
exports.updateById = (req, res) => {
  const socketClient = req.app.locals.socketClient;

  const { role } = getTokenInfo(req);
  const { id } = req.params;
  return Post.getById(id)
    .then(post => {
      // remove user id in update data
      let updateData = {};
      const disallowedKeys = role === 'ADMIN' ? ['id'] : ['id', 'user_id'];
      Object.keys(req.body).forEach(key => {
        if (disallowedKeys.includes(key)) {
        // skip it
        // } else if (key === 'isGuest') {
        //   post.isGuest = bool2Int(req.body.isGuest);
        } else if (post[key] !== undefined) {
          post[key] = req.body[key];
        }
      });
      return Promise.all([
        Post.save(post),
        User.getById(post.user_id),
      ]);
    })
    .then(async ([newPost, user]) => {
      if (newPost.location_area) {
        const areaUsers = await User.getByLocationArea(newPost.location_area);

        contents = {
          'EN': `${user.user_name} updated a post.`,
          'RO': `${user.user_name} și-a actualizat postarea.`,
        };
        await activity.pushNotificationToAroundUsers({ post: newPost, areaUsers, contents });

        socketClient.emit(CONSTS.SKT_LTS_MULTIPLE, { 
          users: areaUsers, 
          event: CONSTS.SKT_POST_UPDATED,
          args: { ...newPost, liked: 0, user: User.output(user) }
         });
      } else {
        socketClient.emit(CONSTS.SKT_LTS_BROADCAST, {
          event: CONSTS.SKT_POST_UPDATED,
          args: { ...newPost, liked: 0, user: User.output(user) }
        })        
      }

      return res.json({
        status: true,
        message: 'success',
        data: Post.output(newPost)
      });
    })
    .catch((error) => respondError(res, error));
}

exports.deleteById = (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { id: post_id } = req.params;
  return Post.deleteById(post_id)
    .then(deleted => {
      if (deleted) {
        return PostLike.deleteUserPostLike({ user_id, post_id });
      } else {
        throw Object.assign(new Error('Failed to delete the post!'), { code: 400 });
      }
    })
    .then(() => {
      return res.json({
        status: true,
        message: 'Post has been deleted!'
      })
    })
    .catch(error => respondError(res, error));
}

exports.togglePostLike = (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { id: post_id } = req.params;
  const { type } = req.body;
  return PostLike.userLikedPost({ user_id, post_id, type })
    .then(postLike => {
      return postLike ? dislikePost({ user_id, post_id, type }) : likePost({ user_id, post_id, type });
    })
    .then(result => res.json({
      status: !!result,
      message: result ? 'success' : 'failed'
    }))
    .catch((error) => respondError(res, error));
}

exports.doLikePost = (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { id: post_id } = req.params;
  const { type } = req.body;
  return PostLike.userLikedPost({ user_id, post_id, type })
    .then(postLike => {
      if (postLike) {
        throw Object.assign(new Error('You already liked this post!'), { code: 400 });
      } else {
        return likePost({ user_id, post_id, type });
      }
    })
    .then(result => res.json({
      status: !!result,
      message: result ? 'You liked this post!' : 'Failed to like post!'
    }))
    .catch((error) => respondError(res, error));
}

exports.disLikePost = (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { id: post_id } = req.params;
  const { type } = req.body;
  return PostLike.userLikedPost({ user_id, post_id, type })
    .then(postLike => {
      if (postLike) {
        return dislikePost({ user_id, post_id, type });
      } else {
        throw Object.assign(new Error('You never liked this post!'), { code: 400 });
      }
    })
    .then(result => res.json({
      status: !!result,
      message: result ? 'You disliked this post!' : 'Failed to dislike post!'
    }))
    .catch((error) => respondError(res, error));
}

const dislikePost = ({ user_id, post_id, type }) => {
  return Promise.all([
    Post.getById(post_id),
    PostLike.userLikedPost({ user_id, post_id, type })
  ])
    .then(([post, postLike]) => {
      const like_fld = `like_${type}_num`;
      post[like_fld] = post[like_fld] ? post[like_fld] - 1 : 0;
      post['liked'] = getTotalLikes(post);
      return Promise.all([
        PostLike.deleteById(postLike.id),
        Post.save(post)
      ])
    })
    .then(([deleted, newPost]) => {
      return deleted && newPost;
    })
    .catch((error) => false);
}

const likePost = ({ user_id, post_id, type }) => {
  return Promise.all([
    Post.getById(post_id),
    PostLike.userLikedPost({ user_id, post_id, type })
  ])
    .then(([post, postLike]) => {
      if (postLike) {
        throw Object.assign(new Error('You liked this post already!'), { code: 400 }); return;
      }
      const like_fld = `like_${type}_num`;
      post[like_fld] = post[like_fld] + 1;
      post['liked'] = getTotalLikes(post);

      const plData = generatePostLikeData({ user_id, post_id, type });
      return Promise.all([
        PostLike.create(plData),
        Post.save(post)
      ])
    })
    .then(([created, newPost]) => {
      return created && newPost;
    })
    .catch((error) => {
      console.log('[Like Post]', error);
      return false
    });
}
