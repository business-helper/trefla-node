const { Validator } = require("node-input-validator");
const Post = require("../models/post.model");
const Comment = require("../models/comment.model");
const CommentLike = require("../models/commentLike.model");
const { bool2Int, getTotalLikes, generateTZTimeString, respondError } = require("../helpers/common.helpers");
const { generateCommentData, generateCommentLikeData } = require('../helpers/model.helpers');

exports.create = (req, res) => {
  let commentData = generateCommentData(req.body);
  commentData.time = req.body.time ? req.body.time : generateTZTimeString();
  commentData.isGuest = bool2Int(req.body.isGuest);
  return Comment.create(commentData)
    .then((comment) => res.json({ status: true, message: "success", data: Comment.output(comment) }))
    .catch((error) => respondError(res, error));
};

exports.getById = (req, res) => {
  const { id } = req.params;
  return Comment.getById(id)
    .then(post => res.json({ 
      status: true,
      message: 'success',
      data: Comment.output(post)
    }))
    .catch((error) => respondError(res, error));
}

exports.pagination = (req, res) => {
  const { page, limit, target_id, type } = req.body;
  const offset = page * limit;

  return Promise.all([
    Comment.pagination({ limit, offset, target_id, type }),
    Comment.getAll({ target_id, type }),
  ])
    .then(([comment, allComment]) => {
      return res.json({
        status: true,
        message: 'success',
        data: comment.map(item => Comment.output(item)),
        pager: {
          page,
          limit,
          total: allComment.length
        },
        hadMore: (limit * page + comment.length) < allComment.length
      });
    })
    .catch((error) => respondError(res, error));
}

// to-do: only admin or creator can update
exports.updateById = (req, res) => {
  const { id } = req.params;
  return Comment.getById(id)
    .then(comment => {
      // remove user id in update data
      let updateData = {};
      const disallowedKeys = ['id', 'user_id', 'target_id', 'type'];
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
    .then(newComment => res.json({
      status: true,
      message: 'success',
      data: Comment.output(newComment)
    }))
    .catch((error) => respondError(res, error));
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
  const { id: comment_id } = req.params;
  const { user_id, type } = req.body;
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

