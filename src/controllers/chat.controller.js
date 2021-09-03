const { Validator } = require("node-input-validator");
const CONSTS = require('../constants/socket.constant');
const { POINT_AWARD_TYPE } = require('../constants/common.constant');
const NOTI_TYPES = require('../constants/notification.constant');

const Chat = require("../models/chat.model");
const User = require("../models/user.model");
const Message = require('../models/message.model');
const models = require('../models');
const helpers = require('../helpers');
const { getTokenInfo } = require('../helpers/auth.helpers');
const { bool2Int, chatPartnerId, getTotalLikes, generateTZTimeString, respondError, timestamp } = require("../helpers/common.helpers");
const { generateChatData, generateMessageData, getLastMsgIndexOfChat } = require('../helpers/model.helpers');

const activity = {
  processChatSource: ({ chat, from_where, target_id, last_msg_id = 0 }) => {
    /**
     * @description users can talk about multiple posts or comments, or without any of them.
     *              Targets must not be in sequence for the adjacent two sources.
     */
    if (from_where && target_id && ['POST', 'COMMENT'].includes(from_where)) {
      const sources = JSON.parse(chat.sources || '[]');
      let lastIndex = -1;
      sources.forEach((source, i) => {
        if (source.from_where === from_where && source.target_id === target_id.toString()) {
          lastIndex = i;
        }
      });
      if (lastIndex < sources.length - 1) {
        sources.push({ from_where, target_id, last_msg_id });
      }
      chat.sources = JSON.stringify(sources);
    }
    return chat;
  },
  checkNewChat: async ({ chat_id, from_where = null, target_id = null }) => {
    const lastPreview = await models.message.lastPreviewMsgInChat(chat_id);
    const mapWhere2Type = {
      'POST': 4,
      'COMMENT': 5,
      'CARD': 6,
    };
    return lastPreview && mapWhere2Type[from_where] === lastPreview.type && lastPreview.message === target_id.toString();
  },
  processPreviewMsg: async ({ chat, user_id, payload: { from_where, target_id, receiver_id } }) => {
    if (!from_where || !target_id) return chat;

    const mapWhere2Type = {
      'POST': 4,
      'COMMENT': 5,
      'CARD': 6,
      'NONE': 7,
    };
    // check the last preview message.
    const lastPreview = await models.message.lastPreviewMsgInChat(chat.id);
    // if 'from_where' is invalid, skip it.
    // if (Object.keys(mapWhere2Type).includes(from_where)) return chat;

    // if the lastest preview is same, then skip it.
    if (lastPreview && 
      (mapWhere2Type[from_where] === lastPreview.type && (lastPreview.type === 7 || lastPreview.message === target_id.toString()))
      ) return chat;

    // lets insert new preview msg.
    const message = generateMessageData({
      chat_id: chat.id,
      message: from_where !== 'NONE' ? target_id : '------- A user contacted you from around -------',
      sender_id: user_id,
      receiver_id: receiver_id || 0,
      type: mapWhere2Type[from_where],
      isOnlyEmoji: 0,
      numEmoji: 0,
      sizeEmoji: 0,
    });
    await models.message.create(message);
    // emoticon message
    // const emotionMsg = generateMessageData({
    //   chat_id: chat.id,
    //   message: '[36]',
    //   sender_id: user_id,
    //   receiver_id: receiver_id || 0,
    //   type: 0,
    //   numEmoji: 1,
    //   sizeEmoji: 100,
    //   isOnlyEmoji: 1,
    // });
    // await models.message.create(emotionMsg);


    // let unread_nums = JSON.parse(chat.unread_nums);
    // const userIndex = JSON.parse(chat.user_ids).indexOf(user_id);
    // unread_nums[1 - userIndex] += 1; 

    // update last message info of chat.
    // let last_messages = JSON.parse(chat.last_messages);
    // chat.unread_nums = JSON.stringify(unread_nums);
    // chat.last_messages = JSON.stringify([{
    //   msg: '[36]',
    //   time: helpers.common.generateTZTimeString(),
    // }]);

    await models.chat.save(chat);
    
    return chat;
  },
  updateChat4Delete: async ({ chat, messages }) => {
    if (messages.length === 0) return chat;
    const last_msgs = JSON.parse(chat.last_messages);
    const unread_nums = JSON.parse(chat.unread_nums);
    const user_ids = JSON.parse(chat.user_ids);
    
    const unreads = [0, 0];
    messages.forEach((message) => {
      if (Number(message.sender_id) === Number(user_ids[0])) unreads[1] ++;
      else unreads[0] ++;
    });
    [0,1].forEach((index) => {
      unread_nums[index] = Math.max((unread_nums[index] || 0) - unreads[index], 0);
    });
    chat.unread_nums = JSON.stringify(unread_nums);
    
    const minId = messages[0].id;
    const newLastMsg = await models.message.getOneUnderId(chat.id, minId);

    chat.last_messages = JSON.stringify(newLastMsg ? [{
      msg: newLastMsg.message,
      time: newLastMsg.time,
    }] : []);
    // delete messages;
    await models.message.deleteAfterId(chat.id, minId - 1);

    return models.chat.save(chat);
  },
  addNewPoint: async ({ chat, user_id }) => {
    // get last preview message.
    // check the message count after preview message.
    // if first message ( count === 1 ), proceed add message.
    // 
    console.log('[Here] my Id', user_id)
    return Promise.resolve()
      .then(async () => {
        const lastPreviewMessage = await models.message.lastPreviewMsgInChat(chat.id);
        const user = await models.user.getById(user_id);
        if (!user || !user.id_verified) {
          throw new Error(`User doesn't exist or is not verified!`);
        }
        const userMsgs = await models.message.pagination({
          userId: user_id,
          chat_id: chat.id,
          minId: lastPreviewMessage.id,
          limit: 2,
        });

        if (userMsgs.length === 0) throw new Error("You must add a new message!");
        if (userMsgs.length > 1) throw new Error("You can't get point again!");

        // start to add point to user.
        const config = await models.config.get();
        const transactionData = helpers.model.generatePointTransactionData({
          user_id,
          amount: config.chat_point,
          src_type: POINT_AWARD_TYPE.MESSAGE,
          src_id: userMsgs[0].id,
        });
        const transaction = await models.pointTransaction.create(transactionData);

        // notification
        const notiData = helpers.model.generateNotificationData({
          sender_id: 0,
          receiver_id: user_id,
          type: NOTI_TYPES.notiTypePointReceived,
          optional_val: config.chat_point,
          time: generateTZTimeString(),
          isFromAdmin: 1,
        });
        const notification = await models.notification.create(notiData);

        user.points += config.chat_point;
        user.noti_num ++;
        user.update_time = timestamp();
        await models.user.save(user);

        const sockets = [];
        if (user.socket_id) {
          // socket for winning a point.
          sockets.push({
            to: user.socket_id,
            event: CONSTS.SKT_POINT_ADDED,
            args: {
              amount: config.chat_point,
              current: user.points,
              data: {
                type: POINT_AWARD_TYPE.MESSAGE,
                id: userMsgs[0].id,
                user_id,
                message: userMsgs[0].message,
              },
            },
          });
          // socket for notification num increased.
          sockets.push({
            to: user.socket_id,
            event: CONSTS.SKT_NOTI_NUM_UPDATED,
            args: {
              num: user.noti_num,
              notification,
            },
          })
        }
        activity.pushNotification4NewPost({ user, notification }).catch(e => {});
        return { sockets };
      })
      .catch(error => {
        console.log('[Error]', error);
        return {
          sockets: [],
        }
      });
  },
  pushNotification4NewPost: ({ user, notification }) => {
    const title = {
      EN: 'Point Added',
      RO: 'Punct adăugat',
    };
    const body = {
      EN: `You earned ${notification.optional_val} points.`,
      RO: `Ai câștigat ${notification.optional_val} puncte.`,
    };
    const data = {
      noti_id: String(notification.id || ""),
      optionalVal: String(notification.optional_val || ""),
      type: String(notification.type || ""),
      user_id: "0",
      user_name: 'Admin',
      avatar: '',
    };
    const lang = ['EN', 'RO'].includes(user.language.toUpperCase()) ? user.language.toUpperCase() : 'EN';
    if (user.device_token) {
      return helpers.common.sendSingleNotification({
        body: body[lang],
        title: title[lang],
        token: user.device_token,
        data,
      });
    }
  },
}


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
}

exports.getById = async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { id } = req.params;
  const limit = 30;
  const last_id = null;
  return Chat.getById(id)
    .then(chat => {
      const user_ids = JSON.parse(chat.user_ids);
      let myIdx = user_ids.indexOf(user_id);
      if (myIdx === -1) { myIdx = 0; }
      const partnerIdx = user_ids.length - myIdx - 1;

      return Promise.all([
        chat,
        user_ids.length > 0 ? User.getById(user_ids[partnerIdx]) : null,
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
          ...chat, 
          // liked: likes.length > 1 ? 1 : 0,
          user: User.output(receiver)
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
          const user_ids = chat.user_ids;

          const partnerId = chatPartnerId(chat.user_ids, uid);
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
            user: _users[partnerId.toString()] // partners info
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

exports.createNormalChatReq = async (user_id, payload, isGuest = true) => {
  const receiver = payload.receiver_id ? await User.getById(payload.receiver_id) : null;
  payload.last_msg_id = 0; // inital msg id on create chat.

  let model = generateChatData(payload, user_id, receiver);
  const accept_status = 1; // !isGuest ? 1 : 0;
  model.accept_status = accept_status;

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
    chatrooms = chatrooms.filter(chat => {
      const user_ids = JSON.parse(chat.user_ids);
      return ['COMMENT', 'POST', 'NONE'].includes(chat.from_where) && (user_ids.length === 2);
    });
    // if chats already exist between two users;
    if (chatrooms.length > 0) {
      _chat = chatrooms[0];
      _chat.accept_status = accept_status;

      // get the last message ID.
      const lastMsg = await models.message.lastMsgInChat(_chat.id);
      const last_msg_id = lastMsg ? lastMsg.id : 0;

      // check & update chat.sources. They can talk about different post or comment.
      _chat = activity.processChatSource({ chat: _chat, ...payload, last_msg_id });
    }
  }

  return Promise.all([
    _chat ? Chat.save(_chat) : Chat.create(model),
    User.getById(user_id),
  ])
    .then(async ([chat, sender]) => {
      // to-dos
      // - add preview message.
      // - add emoticon message.
      chat = await activity.processPreviewMsg({ chat, user_id, payload });

      // add message after preview?
      const msgObj = message ? await Message.create({ ...message, chat_id: chat.id }) : null
      chat = Chat.output(chat);
      chat.user = User.output(receiver);

      const isNewChat = await activity.checkNewChat({ chat_id: chat.id, ...payload });

      // @deprecated?
      // chat.preview_data = await helpers.common.populateChatSource(chat.sources, models);

      const { sockets } = await activity.addNewPoint({ chat, user_id });

      return ({
        status: true,
        message: 'Chat room created!',
        data: chat,
        isNewChat,
        sockets,
      });
    })
}

exports.createCardChatReq = async (user_id, payload, isGuest) => {
  const receiver = payload.receiver_id ? await User.getById(payload.receiver_id) : null;
  let model = generateChatData(payload, user_id, receiver);
  model.accept_status = !isGuest ? 1 : 0;
  const message = payload.message ? generateMessageData({
    ...payload,
    sender_id: user_id,
    receiver_id: receiver ? receiver.id : 0,
    message: payload.message,
  }) : null;

  let _chat;

  // check existing chat room between two users
  let chatrooms = await Chat.getChatToCard({ card_number: payload.card_number, user_id });

  const fromMe = chatrooms.filter(chat => {
    const user_ids = JSON.parse(chat.user_ids);
    return user_ids[0] === user_id;
  });
  if (fromMe.length > 0) {
    _chat = fromMe[0];
  }

  return Promise.all([
    _chat ? _chat : Chat.create(model),
    User.getById(user_id),
    // message ? Message.create({ ...message, chat_id: _chat.id }) : null
  ])
  .then(([chat, sender]) => Promise.all([
    chat, sender,
    message ? Message.create({ ...message, chat_id: chat.id }) : null
  ]))
    .then(([chat, sender, msgObj]) => {
      chat = Chat.output(chat);
      chat.user = User.output(receiver);
      return ({
        status: true,
        message: 'Chat room created!',
        data: chat,
        msg: msgObj,
      });
    });
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
    .then(async ([chat, sender, receiver]) => {
      _sender = sender;
      _receiver = receiver;

      // update chat.last_messages
      let last_messages = JSON.parse(chat.last_messages);
      const user_ids = JSON.parse(chat.user_ids);
      // const lastIndex = user_ids.length > 1 ? user_ids.length - 2 : 0;
      const lastIndex = 0; // getLastMsgIndexOfChat(chat);
      last_messages[lastIndex] = {
        msg: payload.message,
        time: generateTZTimeString()
      };
      chat.last_messages = JSON.stringify(last_messages);

      // update unread_messages in chat.
      let unread_updated = false;
      let unread_nums = JSON.parse(chat.unread_nums);
      // check unread num
      if (receiver && receiver.current_chat !== chat.id) { // receiver is not in the chat room
        unread_updated = true;
        const receiverIdx = user_ids.indexOf(receiver_id);
        unread_nums[receiverIdx] ++;
        chat.unread_nums = JSON.stringify(unread_nums);
      } else if (chat.isForCard && !chat.card_verified) { // for the unverified card chat.
        unread_updated = true;
        const lastUnreadIdx = user_ids.length;
        unread_num = unread_nums[lastUnreadIdx] || 0;
        unread_nums[lastUnreadIdx] = unread_num + 1;
        chat.unread_nums = JSON.stringify(unread_nums);
      }

      const message = generateMessageData({
        ...payload,
        sender_id,
        receiver_id,
        chat_id,
        // message: payload.message
      });
      
      
      return Promise.all([
        Message.create(message),
        Chat.save(chat),
        unread_updated,
      ]);
    })
    .then(async ([message, chat, unread_updated]) => {
      message = Message.output(message);
      // message.sender = User.output(_sender);
      // message.receiver = User.output(_receiver);
      chat = Chat.output(chat);
      chat.preview_data = await helpers.common.populateChatSource(chat.sources, models);

      const { sockets } = await activity.addNewPoint({ chat, user_id: sender_id });
      return { message, chat, unread_updated, sockets };
    })
}

exports.loadMessageReq = async ({ myId = null, chat_id, last_id, limit }) => {
  const chat = await Chat.getById(chat_id);
  const uIds = JSON.parse(chat.user_ids);
  const asSender = uIds[0] === myId;

  let msgMaxId = 0, msgMinId = 0;
  // if (chat.isForCard && !asSender) {
  //   const myPos = uIds.indexOf(myId);
  //   if (myPos > 0 && myPos < uIds.length - 1) { // in the middle of verified users
  //     // minId
  //     const trasferMsgIds = JSON.parse(chat.lastMsgIdOnTransfer);
  //     msgMinId = transferMsgIds[myPos - 1];
  //   }
  //   if (myPos > 0 && myPos < uIds.length - 2) {
  //     msgMaxId = transferMsgIds[myPos];
  //   }
  // }

  return Promise.all([
    Message.pagination({ limit, last_id, chat_id, minId: msgMinId, maxId: msgMaxId }),
    Message.getAll({ chat_id, minId: msgMinId, maxId: msgMaxId }),
    Message.getMinId({ chat_id }),
    User.getByIds(uIds)
  ])
    .then(async ([messages, total, minId, users]) => {
      let userObj = {};
      users.forEach(user => {
        userObj[user.id.toString()] = User.output(user);
      });
      messages = messages.map(msg => Message.output(msg)).map(msg => {
        return {
          ...msg,
          user: userObj[msg.sender_id]
        };
      }); //.reverse();

      const mapType2Model = {
        '4': 'post',
        '5': 'comment',
      };
      await Promise.all(messages.map(async (msg) => {
        const msgType = msg.type.toString();

        if (msgType === '4' || msgType === '5') {
          // console.log('[preview message]', msg, mapType2Model[msgType])
          const model = models[mapType2Model[msgType]];
          const target = await model.getById(msg.message);
          if (!target) return msg.data = null;
          const poster = await models.user.getById(target.user_id);
          msg.data = {
            ...model.output(target),
            user: poster ? models.user.output(poster) : null,
          };
        }
      }))
      return { messages, minId, total };
    })
}

exports.deleteByIdReq = async ({ id, user_id, socketClient }) => {
  
  const chat = await Chat.getById(id);
  return Chat.deleteById(id)
    .then(deleted => {
      // delete all message in chat room.
      return Message.deleteByChatId(id);
    })
    .then(async deleted => {
      // notify the partner that chat is deleted.
      const user_ids = JSON.parse(chat.user_ids);
      const partnerId = chatPartnerId(user_ids, user_id);
      if (partnerId && socketClient) {
        partner = await User.getById(partnerId);
        if (partner.socket_id) {
          socketClient.emit(CONSTS.SKT_LTS_SINGLE, {
            to: partner.socket_id,
            event: CONSTS.SKT_CHAT_DELETED,
            args: { chat_id: id }
          });
        }
      }

      return true;
    })
}

exports.getUnreadMsgInfoReq = async (user_id) => {
  let unreads = {};
  let total_unreads = 0;
  let _chatrooms;
  return Chat.myChatrooms(user_id)
    .then(chatrooms => {
      let partner_ids = [0];
      chatrooms = chatrooms.filter(chat => {
        const user_ids = JSON.parse(chat.user_ids);
        const userPos = user_ids.indexOf(user_id);
        const isForMe = (userPos === 0) || (userPos === user_ids.length - 1);
        if (isForMe) {
          const unread_nums = JSON.parse(chat.unread_nums) || [0,0];
          const unread_num = unread_nums[userPos] || 0;
          unreads[chat.id] = unread_num;
          total_unreads += unread_num || 0;
          partner_ids.push(user_ids.length > 0 ? user_ids[user_ids.length - 1 - userPos] : 0);
        }
        return isForMe;
      });

      _chatrooms = chatrooms;
      return User.getByIds(partner_ids);
    })
    .then(partners => {
      let users = {};
      partners.forEach(user => {
        users[user.id.toString()] = User.output(user);
      });
      _chatrooms = _chatrooms.map(chat => {
        const user_ids = JSON.parse(chat.user_ids);
        const userPos = user_ids.indexOf(user_id);
        const partnerId = user_ids[user_ids.length - 1 - userPos];
        return {
          ...(Chat.output(chat)),
          user: User.output(users[partnerId]),
        };
      });

      return {
        total: total_unreads,
        unread_nums: unreads,
        chats: _chatrooms,
      };
    })
}

exports.rejectChatReq = async ({ chat_id }) => {
  let chat = await Chat.getById(chat_id);
  if (!chat) {
    return { 
      status: false,
      message: 'Chat does not exist!',
    }
  }

  chat.accept_status = 2; // 2: rejected
  return Chat.save(chat)
    .then(chat => {
      return {
        status: true,
        data: chat,
      };
    });
}

exports.getAllChatsOfUser = async (user_id) => {
  return User.getById(user_id)
    .then(user => Chat.allChatsOfUser(user_id, user.card_number))
    .then(chats => chats);
}

exports.deleteMessagesInChat = async ({ id, last_msg_id, socketClient, user_id }) => {
  let chat = await models.chat.getById(id);
  if (!chat) throw new Error(`Chat does not exist with the given id!`);
  const users = await models.user.getByIds(JSON.parse(chat.user_ids));

  const messages = await models.message.getFromId(id, last_msg_id);
  return activity.updateChat4Delete({ chat, messages })
    .then((chat) => {
      users.forEach((user, i) => {
        if (user.socket_id) {
          socketClient.emit(CONSTS.SKT_LTS_SINGLE, {
            to: user.socket_id,
            event: CONSTS.SKT_RECEIVE_MSG,
            args: {
              message: null,
              chat: {
                ...models.chat.output(chat),
                user: models.user.output(users[1 - i]),
              },
            },
          });
        }
      });
      return chat;
    });
}
