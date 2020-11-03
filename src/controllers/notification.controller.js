const { Validator } = require("node-input-validator");
const Post = require("../models/post.model");
const Notification = require("../models/notification.model");
const { bool2Int, generateTZTimeString, respondError } = require("../helpers/common.helpers");
const { generateNotificationData } = require('../helpers/model.helpers');

exports.create = (req, res) => {
  let notiData = generateNotificationData(req.body);
  notiData.time = req.body.time ? req.body.time : generateTZTimeString();
  return Notification.create(notiData)
    .then((noti) => res.json({ status: true, message: "success", data: Notification.output(noti) }))
    .catch((error) => respondError(res, error));
};

exports.getById = (req, res) => {
  const { id } = req.params;
  return Notification.getById(id)
    .then(post => res.json({ 
      status: true,
      message: 'success',
      data: Notification.output(post)
    }))
    .catch((error) => respondError(res, error));
}

exports.pagination = (req, res) => {
  const { page, limit, sender_id, receiver_id } = req.body;
  const offset = page * limit;

  return Promise.all([
    Notification.pagination({ limit, offset, receiver_id }),
    Notification.getAll({ receiver_id }),
  ])
    .then(([notis, allNoti]) => {
      return res.json({
        status: true,
        message: 'success',
        data: notis.map(item => Notification.output(item)),
        pager: {
          page,
          limit,
          total: allNoti.length
        },
        hadMore: (limit * page + notis.length) < allNoti.length
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
