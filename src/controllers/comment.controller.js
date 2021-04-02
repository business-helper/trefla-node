const { Validator } = require("node-input-validator");
const User = require("../models/user.model");
const Post = require("../models/post.model");
const Comment = require("../models/comment.model");
const CommentLike = require("../models/commentLike.model");
const EVENT = require('../constants/socket.constant');
const { getTokenInfo } = require('../helpers/auth.helpers');
const { bool2Int, getTotalLikes, generateTZTimeString, respondError, sendSingleNotification } = require("../helpers/common.helpers");
const { generateCommentData, generateCommentLikeData } = require('../helpers/model.helpers');

const activity = {
  notifyNewComment: async ({ user, target_user, target, target_type, isGuest, comment, action = 'CREATE' }) => {
    const titleMap = activity.generateNotiTitle({ name: user.user_name, isGuest, target_type, action });
    const body = activity.generateCommentNotiBody(comment.comment);
    const title = titleMap[target_user.language.toLowerCase() === 'romanian' ? 'RO' : 'EN'];
    const avatar = activity.getUserAvatar(user);
    if (target_user.device_token) {
      await sendSingleNotification({ title, body, token: target_user.device_token })
        .then(() => {})
        .catch((error) => console.log('[Notify][Comment]', error.message));
    }
    return true;
  },
  generateNotiTitle: ({ name, isGuest, target_type = 'POST', action }) => {
    const target = target_type.toLowerCase();
    return {
      'EN': `${isGuest ? 'A guest' : name} ${action === 'UPDATE' ? 'updated comment' : 'commented'} on your ${target_type === 'POST' ? 'post' : 'comment'}`,
      'RO': `${isGuest ? 'Un oaspete' : name} ${action === 'UPDATE' ? 'a actualizat un comentariu la' : 'a comentat'} ${target_type === 'POST' ? 'postul' : 'comentariul'} dvs.`,
    };
  },
  generateCommentNotiBody: (feed, limit = 60) => {
    return feed.length < limit ? feed : (feed || "").substring(0, limit) + "...";
  },
  getUserAvatar: ({ photo, avatarIndex, sex }) => {
    sex = sex.toString();
    if (photo) {
      return photo;
    }
    const domain = "https://admin.trefla.net/assets";
    if (avatarIndex !== undefined && avatarIndex !== '') {
      return `${domain}/avatar/${
        sex === '1' ? 'girl' : 'boy'
      }/${avatarIndex}.png`;
    }
    return `${domain}/avatar/avatar_${sex === '1' ? 'girl2' : 'boy1'}.png`;
  },
}

exports.create = (req, res) => {
  const socketClient = req.app.locals.socketClient;
  const { uid: user_id } = getTokenInfo(req);
  let commentData = generateCommentData(req.body);
  commentData.user_id = user_id;
  commentData.time = req.body.time ? req.body.time : generateTZTimeString();
  // commentData.isGuest = bool2Int(req.body.isGuest);

  const TargetModel = req.body.type === 'COMMENT' ? Comment : Post;
  let _comment;
  return Comment.create(commentData)
    .then(comment => {
      _comment = comment;
      return Promise.all([
        TargetModel.getById(req.body.target_id),
        Comment.commentNumber({ target_id: req.body.target_id, type: req.body.type })
      ])
    })
    .then(([target, comment_num]) => {
      return Promise.all([
        User.getById(_comment.user_id),
        User.getById(target.user_id),
        TargetModel.save({ ...target, comment_num: comment_num })
      ]);
    })
    .then(async ([user, target_user, target]) => {
      if (target_user.socket_id) {
        socketClient.emit(EVENT.SKT_LTS_SINGLE, {
          to: target_user.socket_id,
          event: EVENT.SKT_COMMENT_CREATED,
          args: {
            ..._comment, 
            liked: 0,
            user: User.output(user),
          },
        });
      }
      await activity.notifyNewComment({ 
        user, target_user, target,
        target_type: req.body.type,
        isGuest: req.body.isGuest,
        comment: _comment,
       });
      _comment = Comment.output(_comment);
      return res.json({ status: true, message: "success", data: { ..._comment, liked: 0, user: User.output(user) } });
    })
    // .catch((error) => respondError(res, error));
};

exports.getById = (req, res) => {
  const { id } = req.params;
  return Comment.getById(id)
    .then(comment => Promise.all([
      comment,
      User.getById(comment.user_id),
      CommentLike.commentLikesOfUser({ comment_id: id, user_id: comment.user_id })
    ]))
    .then(([comment, user, likes]) => {
      console.log('[Likes]', likes);
      comment = Comment.output(comment);
      return res.json({ status: true, message: "success", data: { 
        ...comment, 
        liked: likes.length > 1 ? 1 : 0, 
        user: User.output(user) } });
    })
    .catch((error) => respondError(res, error));
}

exports.pagination = (req, res) => {
  const { uid } = getTokenInfo(req);
  const { last_id, limit, target_id, type } = req.body;
  let _comments = [], _total = 0, _posters = {}; _minId = 0;

  return Promise.all([
    Comment.pagination({ limit, last_id, target_id, type }),
    Comment.getCountOfComments({ target_id, type }),
    Comment.minId({ target_id, type }),
  ])
    .then(async ([comments, total, minId]) => {
      _comments = comments; _total = total; _minId = minId;
      const poster_ids = comments.map(comment => comment.user_id);
      return User.getByIds(poster_ids);
    })
    .then(users => {
      users.map(user => _posters[user.id] = user);
      return Promise.all(_comments.map(comment => CommentLike.commentLikesOfUser({ user_id: uid, comment_id: comment.id })));
    })
    .then((commentLikedArray) => {
      // console.log('[Liked]', uid, commentLikedArray.map(a => a.length));
      // console.log('[posters]', _posters);
      _comments = _comments.map(comment => Comment.output(comment)); // filter keys

      _comments = _comments.map((comment, i) => ({
        ...comment,
        liked: commentLikedArray[i].length > 0 ? commentLikedArray[i][0].type : 0,
        user: User.output(_posters[comment.user_id])
      }));
      if (type === 'POST') {
        return Promise.all(_comments.map(comment => Comment.pagination({
          limit: 10000,
          offset: 0,
          target_id: comment.id,
          type: 'COMMENT',
        })));
      } else {
        return [];
      }
    })
    .then(async (children_array) => {
      
      if (children_array.length > 0) {
        let user_ids = [0];
        let comment_ids = [0];
        children_array.forEach(children => {
          children.forEach(comment => {
            user_ids.push(comment.user_id);
            !comment_ids.includes(comment.id) ? comment_ids.push(comment.id) : null;
          })
        });

        const users = await User.getByIds(user_ids);
        let usersObj = {};
        users.forEach(user => {
          usersObj[user.id] = user;
        });
        const likeArray = await Promise.all(comment_ids.map(comment_id => CommentLike.commentLikesOfUser({ user_id: uid, comment_id }))); 
        // console.log('[like array]', comment_ids, likeArray);
        const likes = {};
        likeArray.forEach((la, i) => {
          likes[comment_ids[i]] = likeArray[i];
        });

        // transform children
        children_array.forEach((children, i) => {
          const cld = children.map(comment => ({
            ...(Comment.output(comment)),
            liked: likes[comment.id].length > 0 ? 1 : 0,
            user: User.output(usersObj[comment.user_id])
          }));
          _comments[i] = {
            ...(_comments[i]),
            children: cld,
          }
        });
      }

      cMinId = _comments.length > 0 ? _comments[_comments.length - 1].id : 0;

      return res.json({
        status: true,
        message: 'success',
        data: _comments,
        pager: {
          // page,
          last_id: cMinId,
          limit,
          total: _total
        },
        hadMore: cMinId > _minId, //(limit * page + _comments.length) < _total
      });
    })
    .catch((error) => respondError(res, error));
}

exports.simplePagination = async (req, res) => {
  let { limit, page, target_id, type } = req.query;
  limit = Number(limit);
  page = Number(page);

  let _comments, _total;
  return Promise.all([
    Comment.simplePagination({ limit, page, target_id, type }),
    Comment.getCountOfComments({ target_id, type })
  ])
    .then(([comments, total]) => {
      _comments = comments;
      _total = total;
      const post_ids = comments.filter(item => item.type === 'POST').map(item => item.target_id);
      const comment_ids = comments.filter(item => item.type === 'COMMENT').map(item => item.target_id);
      const user_ids = comments.map(item => item.user_id);
      // console.log('ids', post_ids, comment_ids, user_ids)
      return Promise.all([
        Post.getByIds(post_ids),
        Comment.getByIds(comment_ids),
        User.getByIds(user_ids),
      ]);
    })
    .then(([posts, comments, users]) => {
      let postsObj = {}, commentsObj = {}, usersObj = {};
      posts.forEach(post => {
        postsObj[post.id.toString()] = post;
      });
      comments.forEach(comment => {
        commentsObj[comment.id.toString()] = comment;
      });
      users.forEach(user => {
        usersObj[user.id.toString()] = user;
      });
      _comments = _comments.map(comment => {
        const user = usersObj[comment.user_id.toString()];
        const target = comment.type === 'COMMENT' ? Comment.output(commentsObj[comment.target_id.toString()]) : Post.output(postsObj[comment.target_id.toString()]);
        return {
          ...(Comment.output(comment)),
          user: User.output(user),
          target,
        };
      });
      return {
        status: true,
        message: 'success',
        data: _comments,
        pager: {
          limit,
          page,
          total: _total,
        },
        hasMore: (limit * page) + _comments.length < _total,
      }
    })
}

// to-do: only admin or creator can update
exports.updateById = async (req, res) => {
  const socketClient = req.app.locals.socketClient;
  const { uid, role } = getTokenInfo(req);
  const { id } = req.params;
  let _comment;
  
  return Comment.getById(id)
    .then(comment => {
      // remove user id in update data
      let updateData = {};
      const disallowedKeys = role === 'ADMIN' ? ['id', 'target_id', 'type'] : ['id', 'user_id', 'target_id', 'type'];
      Object.keys(req.body).forEach(key => {
        if (disallowedKeys.includes(key)) {
          // skip it
        } else if (key === 'isGuest') {
          comment.isGuest = bool2Int(req.body.isGuest);
        } else if (comment[key] !== undefined) {
          comment[key] = req.body[key];
        }
      });
      return Comment.save(comment);      
    })
    .then(async (comment) => {
      _comment = comment;
      const TargetModel = comment.type === 'COMMENT' ? Comment : Post;
      const target = await TargetModel.getById(comment.target_id);
      return Promise.all([
        role === 'ADMIN' ? { user_name: 'ADMIN', sex: '0' } : User.getById(uid),
        target ? User.getById(target.user_id) : null,
        target,
      ])
    })
    .then(async ([user, target_user, target]) => {
      if (target_user && target_user.socket_id) {
        socketClient.emit(EVENT.SKT_LTS_SINGLE, {
          to: target_user.socket_id,
          event: EVENT.SKT_COMMENT_UPDATED,
          args: {
            ..._comment, 
            liked: 0,
            user: User.output(user),
          },
        });
      }
      await activity.notifyNewComment({ 
        user, target_user, target,
        target_type: _comment.type,
        isGuest: _comment.isGuest,
        comment: _comment,
        action: 'UPDATE',
       });
      _comment = Comment.output(_comment);
      return res.json({ status: true, message: "success", data: { ..._comment, liked: 0, user: User.output(user) } });
    })
    // .then(newComment => res.json({
    //   status: true,
    //   message: 'success',
    //   data: Comment.output(newComment)
    // }))
    // .catch((error) => respondError(res, error));
}

exports.deleteById = async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { id: comment_id } = req.params;

  const comment = await Comment.getById(comment_id);
  const TargetModel = comment.type === 'COMMENT' ? Comment : Post;

  return Comment.deleteById(comment_id)
    .then(deleted => {
      return Promise.all([
        Comment.commentNumber({ type: comment.type, target_id: comment.target_id }),
        TargetModel.getById(comment.target_id),
        CommentLike.delete({ comment_id }),
      ]);
    })
    .then(([comment_num, target, delRows]) => {
      return TargetModel.save({ ...target, comment_num });
    })
    .then(() => {
      return res.json({
        status: true,
        message: 'Comment has been deleted!'
      });
    })
    .catch(error => respondError(res, error));
}

exports.getAll = (req, res) => {
  Post.getAll()
    .then((langs) =>
      res.json({ status: true, message: "success", data: langs })
    )
    .catch((error) =>
      res.status(500).json({
        status: false,
        message: error.message || "Something went wrong!",
      })
    );
};

exports.toggleCommentLike = (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { id: comment_id } = req.params;
  const { type } = req.body;
  return CommentLike.userLikedComment({ user_id, comment_id, type })
    .then(postLike => {
      return postLike ? dislikeComment({ user_id, comment_id, type }) : likeComment({ user_id, comment_id, type });
    })
    .then(result => res.json({
      status: !!result,
      message: result ? 'success' : 'failed'
    }))
    .catch((error) => respondError(res, error));
}

exports.doLikeComment = (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { id: comment_id } = req.params;
  const { type } = req.body;
  return CommentLike.userLikedComment({ user_id, comment_id, type })
    .then(liked => {
      if (liked) {
        throw Object.assign(new Error('You liked it already!'), { code: 400 });
      } else {
        return likeComment({ user_id, comment_id, type });
      }
    })
    .then(result => res.json({
      status: !!result,
      message: result ? 'You liked the comment!' : 'Failed to like the comment!'
    }))
    .catch((error) => respondError(res, error));
}

exports.dislikeComment = (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { id: comment_id } = req.params;
  const { type } = req.body;
  return CommentLike.userLikedComment({ user_id, comment_id, type })
    .then(liked => {
      if (liked) {
        return dislikeComment({ user_id, comment_id, type });
      } else {
        throw Object.assign(new Error('You disliked it already!'), { code: 400 });
      }
    })
    .then(result => res.json({
      status: !!result,
      message: result ? 'You disliked the comment!' : 'Failed to dislike the comment!'
    }))
    .catch((error) => respondError(res, error));
}

const dislikeComment = ({ user_id, comment_id, type }) => {
  return Promise.all([
    Comment.getById(comment_id),
    CommentLike.userLikedComment({ user_id, comment_id, type })
  ])
    .then(([comment, commentLike]) => {
      const like_fld = `like_${type}_num`;
      comment[like_fld] = comment[like_fld] ? comment[like_fld] - 1 : 0;
      comment['liked'] = getTotalLikes(comment);
      return Promise.all([
        CommentLike.deleteById(commentLike.id),
        Comment.save(comment)
      ])
    })
    .then(([deleted, newPost]) => {
      return deleted && newPost;
    })
    .catch((error) => false);
}

const likeComment = ({ user_id, comment_id, type }) => {
  return Promise.all([
    Comment.getById(comment_id),
    CommentLike.userLikedComment({ user_id, comment_id, type })
  ])
    .then(([comment, commentLike]) => {
      if (commentLike) {
        throw Object.assign(new Error('You liked this comment already!'), { code: 400 }); return;
      }
      const like_fld = `like_${type}_num`;
      comment[like_fld] = comment[like_fld] + 1;
      comment['liked'] = getTotalLikes(comment);

      const cmtData = generateCommentLikeData({ user_id, comment_id, type });
      return Promise.all([
        CommentLike.create(cmtData),
        Comment.save(comment)
      ])
    })
    .then(([created, newCmt]) => {
      return created && newCmt;
    })
    .catch((error) => {
      console.log('[Like Comment]', error.message);
      return false
    });
}

