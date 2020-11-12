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
    .then(([chat, sender, message]) => {
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

exports.pendingChatrooms = async (req, res) => {
  const { uid } = getTokenInfo(req); console.log('[uid]', uid);
  return Chat.pendingChatrooms(uid)
    .then(chats => {
      let user_ids = [0];
      for (let chat of chats) {
        let chat_users = JSON.parse(chat.user_ids);
        if (chat_users.length > 1) {
          user_ids.push(chat_users[0]);
          user_ids.push(chat_users[chat_users.length - 1]);
        }
      }
      const users = User.getByIds(user_ids);
      return Promise.all([ chats, users ]);
    })
    .then(([ chats, users ]) => {
      let _users = {};
      users.forEach(user => {
        _users[user.id] = User.output(user);
      });
      chats = chats.map(chat => Chat.output(chat))
        .map(chat => {
          let user_ids = [ chat.user_ids[0] ];
          if (chat.user_ids.length > 1) {  
            user_ids.push(chat.user_ids[chat.user_ids.length - 1]);
          }

          const partnerId = user_ids[0] === uid ? user_ids[1] : user_ids[0];
          return {
            ...chat,
            isSent: user_ids[0] === uid,
            user: _users[partnerId.toString()]
          };
        });
      
      return res.json({
        status: true,
        message: 'success',
        data: chats,
      });
    })
    .catch(error => respondError(res, error));
}

exports.availableChatrooms = async (req, res) => {
  const { uid } = getTokenInfo(req);
  return Chat.myChatrooms(uid, 1)
    .then(chats => {
      let user_ids = [0];
      for (let chat of chats) {
        let chat_users = JSON.parse(chat.user_ids);
        if (chat_users.length > 1) {
          user_ids.push(chat_users[0]);
          user_ids.push(chat_users[chat_users.length - 1]);
        }
      }
      const users = User.getByIds(user_ids);
      return Promise.all([ chats, users ]);
    })
    .then(([ chats, users ]) => {
      let _users = {};
      users.forEach(user => {
        _users[user.id] = User.output(user);
      });
      chats = chats.map(chat => Chat.output(chat))
        .map(chat => {
          let user_ids = [ chat.user_ids[0] ];
          if (chat.user_ids.length > 1) {  
            user_ids.push(chat.user_ids[chat.user_ids.length - 1]);
          }

          const partnerId = user_ids[0] === uid ? user_ids[1] : user_ids[0];
          return {
            ...chat,
            // isSent: user_ids[0] === uid,
            user: _users[partnerId.toString()]
          };
        });
      
      return res.json({
        status: true,
        message: 'success',
        data: chats,
      });
    })
    .catch(error => respondError(res, error));
}

exports.createNormalChatReq = async (user_id, payload) => {
  const receiver = payload.receiver_id ? await User.getById(payload.receiver_id) : null;
  let model = generateChatData(payload, user_id, receiver);
  const message = payload.message ? generateMessageData({
    ...payload,
    sender_id: user_id,
    receiver_id: receiver ? receiver.id : 0,
    message: payload.message
  }) : null;

  let _chat;

  if (receiver) {
    // check existing chat room between two users
    let chatrooms = await Chat.getByUserIds({ sender_id: user_id, receiver_id: receiver.id, isForCard: 0 });
    chatrooms.filter(chat => {
      const user_ids = JSON.parse(chat.user_ids);
      return user_ids.length === 2;
    })
    if (chatrooms.length > 0) {
      _chat = chatrooms[0];
    }
  }

  return Promise.all([
    _chat ? _chat : Chat.create(model),
    User.getById(user_id),
    message ? Message.create({ ...message, chat_id: chat.id }) : null
  ])
  // return Chat.create(model)
  //   .then(chat => Promise.all([
  //     chat,
  //     User.getById(user_id),
  //     message ? Message.create({ ...message, chat_id: chat.id }) : null
  //   ]))
    .then(([chat, sender, msgObj]) => {
      chat = Chat.output(chat);
      chat.user = User.output(receiver);
      return ({
        status: true,
        message: 'Chat room created!',
        data: chat
      });
    })
    // .catch((error) => ({
    //   status: false,
    //   message: error.message
    // }));
}

exports.acceptChatConnectionReq = async (chat_id) => {
  return Chat.getById(chat_id)
    .then(chat => {
      chat.accept_status = 1;
      return Chat.save(chat);
    })
    .then(chat => {
      return Chat.output(chat);      
    })
}

exports.addMessageReq = async ({ sender_id, receiver_id, chat_id, payload }) => {
  let _chat;
  let _sender, _receiver;
  return Promise.all([
    Chat.getById(chat_id),
    User.getById(sender_id),
    User.getById(receiver_id),
  ])
    .then(([chat, sender, receiver]) => {
      _sender = sender;
      _receiver = receiver;

      let last_messages = JSON.parse(chat.last_messages);
      const user_ids = JSON.parse(chat.user_ids);
      const lastIndex = user_ids.length > 1 ? user_ids.length - 2 : 0;
      last_messages[lastIndex] = {
        msg: payload.message,
        time: generateTZTimeString()
      };
      chat.last_messages = JSON.stringify(last_messages);

      // check unread num
      if (receiver && receiver.current_chat !== chat.id) { // receiver is not in the chat room
        let unread_nums = JSON.parse(chat.unread_nums);
        const senderIdx = user_ids.indexOf(receiver_id);
        unread_nums[senderIdx] ++;
        chat.unread_nums = JSON.stringify(unread_nums);
      }

      const message = generateMessageData({
        sender_id,
        receiver_id,
        chat_id,
        message: payload.message
      });
      
      
      return Promise.all([
        Message.create(message),
        Chat.save(chat)
      ]);
    })
    .then(([message, chat]) => {
      message = Message.output(message);
      message.sender = User.output(_sender);
      message.receiver = User.output(_receiver);
      return { message, chat: Chat.output(chat) };
    })
}

exports.loadMessageReq = async ({ myId = null, chat_id, last_id, limit }) => {
  const chat = await Chat.getById(chat_id);
  const uIds = JSON.parse(chat.user_ids);
  const userIds = uIds.length > 1 ? [uIds[0], uIds[uIds.length - 1]] : uIds; // current member ids
  // const [ partnerId ] = userIds.filter(id => id !== myId);


  return Promise.all([
    Message.pagination({ limit, last_id, chat_id }),
    Message.getAll({ chat_id }),
    Message.getMinId({ chat_id }),
    User.getByIds(userIds)
  ])
    .then(([messages, total, minId, users]) => {
      let userObj = {};
      users.forEach(user => {
        userObj[user.id.toString()] = User.output(user);
      });
      messages = messages.map(msg => Message.output(msg)).map(msg => {
        return {
          ...msg,
          user: userObj[msg.sender_id]
        };
      }).reverse();
      return { messages, minId, total };
    })
}

exports.deleteByIdReq = async ({ id }) => {
  return Chat.deleteById(id)
    .then(deleted => {
      // delete all message in chat room.
      return Message.deleteByChatId(id);
    })
    .then(deleted => {
      return true;
    })
}

