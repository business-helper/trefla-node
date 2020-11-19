const { Validator } = require("node-input-validator");
const User = require("../models/user.model");
const Post = require("../models/post.model");
const PostLike = require("../models/postLike.model");
const Notification = require("../models/notification.model");

const models = require('../models/index');

const { BearerMiddleware } = require('../middlewares/basic.middleware');
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require("../helpers/common.helpers");

const getPostSummary = async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const limit = req.body.posts || 10;
  const offset = 0;

  let _posts = [], _users = {};
  return Post.pagination({ limit, offset })
    .then(posts => {
      _posts = posts;
      let user_ids = posts.map(post => post.user_id);  user_ids.push(0);
      return User.getByIds(user_ids);
    })
    .then(users => {
      users.forEach(user => _users[user.id] = user);
      return Promise.all(_posts.map(post => PostLike.postLikesOfUser({ user_id, post_id: post.id })));
    })
    .then(likes => {
      _posts = _posts.map(post => Post.output(post));
      _posts = _posts.map((post, i) => ({
        ...post,
        liked: likes[i].length > 0 ? 1 : 0,
        user: User.output(_users[post.post_user_id])
      }));
      console.log('[posts]', _posts.length);
      return _posts;
    });
}

const getNotificationSummary = async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const limit = req.body.notifications || 10;
  const offset = 0; //  as it's the first load

  let _notis = [], _users = {};
  return Notification.paginationByLastId({ limit, receiver_id: user_id })
    .then(notis => {
      _notis = notis;
      let user_ids = [0];
      notis.forEach(noti => {
        user_ids.push(noti.sender_id);
      });
      return User.getByIds(user_ids);
    })
    .then(users => {
      users.forEach(user => _users[user.id] = user);
      _notis = _notis.map(noti => Notification.output(noti));
      return _notis.map(noti => ({
        ...noti,
        sender: User.output(_users[noti.sender_id])
      }));
    });
}

const getInitDataWrapper = (req, res) => {
  return BearerMiddleware(req, res, () => {
    return getInitData(req, res)
      .then(result => res.json(result))
      .catch(error => respondValidateError(res, error))
  });
}

const getChatSummary = async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  // let _all_chats = [], _total = 0;
  let _chatrooms;
  return models.chat.myChatrooms(user_id)
    .then(chatrooms => {
      let idOfUsers = [0];
      chatrooms = chatrooms.filter(chat => {
        const user_ids = JSON.parse(chat.user_ids);
        const myIndex = user_ids.indexOf(user_id);
        if (myIndex > 0 && myIndex < user_ids.length - 1) return false; // this is the previous owner of the card

        if (chat.accept_status === 1) {
          idOfUsers.push(myIndex == 0 ? user_ids[user_ids.length - 1] : user_ids[0]);
          return true;
        } else {
          myIndex === 0 ? null : idOfUsers.push(myIndex == 0 ? user_ids[user_ids.length - 1] : user_ids[0]);
          return myIndex === 0 ? false : true;
        }
      });
      _chatrooms = chatrooms;
      return Promise.all(idOfUsers.map(user_id => models.user.getById(user_id)));
    })
    .then(users => {
      users = users.filter(users => !!users);
      let userObj = {};

      users.forEach(user => {
        userObj[user.id.toString()] = user;
      });
      _chatrooms = _chatrooms.map(chat => {
        const user_ids = JSON.parse(chat.user_ids);
        const myIndex = user_ids.indexOf(user_id);
        const partnerId = myIndex == 0 ? user_ids[user_ids.length - 1] : user_ids[0];
        return {
          ...(models.chat.output(chat)),
          user: models.user.output(userObj[partnerId])
        };
      });
      return _chatrooms;
    })


}

const getInitData = (req, res) => {
  const { uid } = getTokenInfo(req);
  const validator = new Validator(req.body, {
    posts: "required|integer",
    notifications: "required|integer",
    // chat: "required|integer"
  });

  return validator
    .check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), {
          code: 400,
          details: validator.errors,
        });
      }
    })
    .then(() => {
      return Promise.all([
        User.getById(uid),
        getPostSummary(req, res),
        getNotificationSummary(req, res),
        getChatSummary(req, res),
      ])
    })
    .then(([ user, posts, notis, chats, ]) => {
      return {
        status: true,
        profile: user,
        posts,
        notifications: notis,
        chats,
      };
    })
    // .catch(error => error);
}

module.exports = getInitDataWrapper;