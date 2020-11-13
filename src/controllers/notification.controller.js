const { Validator } = require("node-input-validator");
const CONSTS = require('../constants/socket.constant');
const User = require("../models/user.model");
const Notification = require("../models/notification.model");
const { getTokenInfo } = require('../helpers/auth.helpers');
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
    .then(noti => Promise.all([
      noti,
      User.getById(noti.sender_id),
      User.getById(noti.receiver_id)
    ]))
    .then(([noti, sender, receiver]) => {
      noti = Notification.output(noti);
      return res.json({ 
        status: true,
        message: 'success',
        data: { 
          ...noti, 
          sender: User.output(sender), 
          receiver: User.output(receiver) 
        }
      });
    })
    .catch((error) => respondError(res, error));
}

exports.pagination = (req, res) => {
  const { page, limit, sender_id, receiver_id } = req.body;
  const offset = page * limit;

  let _notis = [], _total = 0, _users = {};

  return Promise.all([
    Notification.pagination({ limit, offset, receiver_id }),
    Notification.getCountOfNotifications({ receiver_id }),
  ])
    .then(([notis, total]) => {
      _notis = notis; _total = total;
      let user_ids = [0];
      notis.forEach(noti => {
        user_ids.push(noti.sender_id);
        user_ids.push(noti.receiver_id);
      });
      return User.getByIds(user_ids);
    })
    .then(users => {
      users.forEach(user => _users[user.id] = user);
      _notis = _notis.map(noti => Notification.output(noti));
      _notis = _notis.map(item => ({
        ...item,
        sender: User.output(_users[item.sender_id]),
        receiver: User.output(_users[item.receiver_id])
      }));

      return res.json({
        status: true,
        message: 'success',
        data: _notis,
        pager: {
          page,
          limit,
          total: _total
        },
        hadMore: (limit * page + _notis.length) < _total
      });
    })
    .catch((error) => respondError(res, error));
}

// to-do: only admin or creator can update
exports.updateById = (req, res) => {
  const { id } = req.params;
  return Notification.getById(id)
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
      return Notification.save(comment);      
    })
    .then(newComment => res.json({
      status: true,
      message: 'success',
      data: Notification.output(newComment)
    }))
    .catch((error) => respondError(res, error));
}

exports.getAll = (req, res) => {
  Notification.getAll()
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

exports.markAsRead = (req, res) => {
  const { id } = req.params;
  return this.markAsReadReq(id)
    .then(noti => {
      return res.json({
        status: true,
        message: 'Notification has been marked as read!',
        data: Notification.output(noti)
      });
    })
    .catch((error) => respondError(res, error));
}

exports.markAsReadReq = (id) => {
  return Notification.getById(id)
    .then(noti => {
      return Notification.save({ ...noti, is_read: 1 });
    })
    .then(noti => noti);
}

exports.markAllAsRead = (req, res) => {
  const socketClient = req.app.locals.socketClient; //console.log('[socket.client]', socketClient);
  const { uid: user_id } = getTokenInfo(req);
  return this.markAllAsReadReq({ user_id, socketClient })
    .then(result => {
      res.json({
        status: true,
        message: 'success',
      })
    });
}

exports.markAllAsReadReq = async ({ user_id, socketClient }) => {
  const user = await User.getById(user_id);
  return Notification.getByUserId(user_id)
    .then(notis => {
      return Promise.all(notis.map(noti => {
        noti.is_read = 1;
        return Notification.save(noti);
      }));
    })
    .then((notis) => {
      // send user noti_num = 0;
      if (user && user.socket_id) {
        socketClient.emit(CONSTS.SKT_LTS_SINGLE, {
          to: user.socket_id,
          event: CONSTS.SKT_NOTI_NUM_UPDATED,
          args: {num: 0}
        });
      }
      return true;
    });
}
