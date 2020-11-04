const { Validator } = require("node-input-validator");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const PostLike = require("../models/postLike.model");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { generateTZTimeString, getTotalLikes, respondError } = require("../helpers/common.helpers");
const { generatePostData, generatePostLikeData } = require('../helpers/model.helpers');



exports.create = (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  let postData = generatePostData(req.body);
  postData.user_id = user_id; // req.body.post_user_id;
  postData.post_time = req.body.post_time ? req.body.post_time : generateTZTimeString();
  return Post.create(postData)
    .then(post => Promise.all([
      post,
      User.getById(post.user_id)
    ]))
    .then(([post, user]) => {
      post = Post.output(post);
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

exports.pagination = (req, res) => {
  //const tokenInfo = getTokenInfo(req); //console.log('tokenInfo', tokenInfo);
  const { uid } = getTokenInfo(req);
  const { page, limit, type } = req.body;
  const offset = page * limit;
  let _posts = [], _total = 0, _posters = {};
  return Promise.all([
    Post.pagination({ limit, offset, type }),
    Post.getCountOfPosts({ type }),
  ])
    .then(async ([posts, total]) => {
      _posts = posts; _total = total;
      const poster_ids = posts.map(post => post.user_id);
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

      return res.json({
        status: true,
        message: 'success',
        data: posts,
        pager: {
          page,
          limit,
          total: _total
        },
        hadMore: (limit * page + posts.length) < _total
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
  const { id } = req.params;
  return Post.getById(id)
    .then(post => {
      // remove user id in update data
      let updateData = {};
      const disallowedKeys = ['id', 'user_id'];
      Object.keys(req.body).forEach(key => {
        if (disallowedKeys.includes(key)) {
          // skip it
        // } else if (key === 'isGuest') {
        //   post.isGuest = bool2Int(req.body.isGuest);
        } else if (post[key] !== undefined) {
          post[key] = req.body[key];
        }
      });
      return Post.save(post);      
    })
    .then(newPost => res.json({
      status: true,
      message: 'success',
      data: Post.output(newPost)
    }))
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
