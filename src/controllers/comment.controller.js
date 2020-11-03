const { Validator } = require("node-input-validator");
const Post = require("../models/post.model");
const Comment = require("../models/comment.model");
const { bool2Int, generateTZTimeString, respondError } = require("../helpers/common.helpers");
const { generateCommentData } = require('../helpers/model.helpers');

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
