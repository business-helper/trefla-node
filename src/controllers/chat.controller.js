const { Validator } = require("node-input-validator");
const Chat = require("../models/chat.model");
const User = require("../models/user.model");
const Message = require('../models/message.model');
const { getTokenInfo } = require('../helpers/auth.helpers');
const { bool2Int, getTotalLikes, generateTZTimeString, respondError } = require("../helpers/common.helpers");
const { generateChatData, generateMessageData } = require('../helpers/model.helpers');


exports.create = async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const receiver = req.body.receiver_id ? await User.getById(req.body.receiver_id) : null;
  let model = generateChatData(req.body, user_id, receiver);
  const message = req.body.message ? generateMessageData({
    ...req.body,
    sender_id: user_id,
    receiver_id: receiver ? receiver.id : 0,
    message: req.body.message
  }) : null;

  return Chat.create(model)
    .then(chat => Promise.all([
      chat,
      User.getById(user_id),
      message ? Message.create({ ...message, chat_id: chat.id }) : null
    ]))
    .then(([chat, sender]) => {
      chat = Chat.output(chat);
      chat.receiver = User.output(receiver);
      return res.json({
        status: true, 
        message: 'Chat room created!',
        data: chat
      });
    })
    .catch((error) => respondError(res, error));
};

exports.getById = async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { id } = req.params;
  const limit = 30;
  const last_id = null;
  return Chat.getById(id)
    .then(chat => {
      const user_ids = JSON.parse(chat.user_ids).filter( id => id !== user_id);

      return Promise.all([
        chat,
        user_ids.length > 0 ? User.getById(user_ids[user_ids.length -1]) : null,
        Message.pagination({ limit, last_id, chat_id: chat.id }),
        // PostLike.postLikesOfUser({ post_id: id, user_id })
      ])
    })
    .then(([chat, receiver, messages]) => {
      chat = Chat.output(chat);

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

