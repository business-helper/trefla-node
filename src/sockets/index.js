const models = require('../models/index');
const helpers = require('../helpers/index');
const ctrls = require('../controllers/index');
const {
  SKT_CHECK_HEALTH  
} = require('../constants/socket.constant');
const CONSTS = require('../constants/socket.constant');
const INNER_CLIENT = 'INNER_CLIENT';

const bootstrapSocket = (io) => {
  io.on('connection', socket => {
    console.log('[socket connect]', socket.request._query.token);
    const token = socket.request._query.token;
    if (token !== INNER_CLIENT) {
      const { uid } = helpers.auth.parseToken(token);

      Promise.all([
        models.user.getById(uid),
        models.chat.myChatrooms(uid),
        models.user.updateSocketSession({ id: uid, socketId: socket.id })
      ])
      .then(([user, chats]) => {
        if (user) {
          for (let chat of chats) {
            socket.join(`chatroom_${chat.id}`);
            console.log(`"${user.user_name}" joined "chatroom_${chat.id}"`);
            // alert the online status to all users
            io.sockets.emit(CONSTS.SKT_UPDATE_ONLINE, {
              user_id: uid,
              online: 1,
            });
          }
          return Promise.all(chats.map(chat => {
            let onlines = JSON.parse(chat.online_status);
            onlines[uid.toString()] = 1;
            return models.chat.save({
              ...chat,
              online_status: JSON.stringify(onlines)
            });
          }));
        }
      })
      .then(() => {
        console.log(`Updated online status of user ${uid} in chatrooms`);
      });
    }

    // connection request to a user.
    socket.on(CONSTS.SKT_CONNECT_TO_USER, ({ toId, message }) => {
      const { uid } = helpers.auth.parseToken(token);
      let _toUser, _fromUser;
      Promise.all([
        models.user.getById(toId),
        models.user.getById(uid)
      ])
        .then(([toUser, fromUser]) => {
          if (!toUser) {
            throw Object.assign(new Error("User doesn't exist!"), { code: 400 });
          }
          _toUser = toUser;
          _fromUser = fromUser;
          return ctrls.chat.createNormalChatReq(uid, { receiver_id: toId, message });
        })
        .then(result => {
          const { status, message, data } = result;
          if (_toUser.socket_id) {
            io.to(_toUser.socket_id).emit(CONSTS.SKT_CONNECT_REQUESTED, { status, message: `Connection request from ${_fromUser.user_name}`, data: { ...data, isSent: false, user: _fromUser } });
          } else {
            console.log('[user is offline]', toId);
          }
          socket.emit(CONSTS.SKT_CONNECT_TO_USER, { status, message, data: { ...data, isSent: true } });
        })
        .catch(error => {
          console.log(error);
          socket.emit(CONSTS.SKT_CONNECT_TO_USER, { status: false, message: error.message });
        })
    });

    socket.on(CONSTS.SKT_CONNECT_ACCEPT, async ({ chat_id }) => {
      const { uid } = helpers.auth.parseToken(token);
      const chatroom = await models.chat.getById(chat_id);
      if (chatroom) {
        const user_ids = JSON.parse(chatroom.user_ids);
        if (user_ids[0] === uid || !user_ids.includes(uid)) { // only requested user can accept it.
          return false;
        }
        Promise.all([
          models.user.getById(uid),
          models.user.getById(user_ids[0]),
          ctrls.chat.acceptChatConnectionReq(chat_id)
        ])
          .then(([me, sender, chat]) => {
            if (sender.socket_id) {

              io.to(sender.socket_id).emit(CONSTS.SKT_CONNECT_ACCEPTED, { status: true, message: `Chatroom with ${me.user_name} has been activated!`, data: { ...chat, user: me } });
            }
            socket.join(`chatroom_${chat.id}`);
            console.log(`"${me.user_name}" joined "chatroom_${chat.id}"`);
            socket.emit(CONSTS.SKT_CONNECT_ACCEPT, { status: true, message: `You activated the chatroom with ${sender.user_name}`, data: { ...chat, user: sender } });
          })
          .catch(error => {
            console.log(error);
            socket.emit(CONSTS.SKT_CONNECT_ACCEPT, { status: false, message: error.message });
          })
      }
    });

    socket.on(CONSTS.SKT_CONNECT_ACCEPTED, ({ id }) => {
      const { uid } = helpers.auth.parseToken(token);
      // some validation
      socket.join(`chatroom_${id}`);
      models.user.getById(uid)
        .then(user => {
          console.log(`"${user.user_name}" joined "chatroom_${id}"`);
        });
    })

    socket.on(CONSTS.SKT_SEND_MSG, async ({ message, chat_id }) => {
      const { uid } = helpers.auth.parseToken(token);
      const chat = await models.chat.getById(chat_id);
      const user_ids = JSON.parse(chat.user_ids);
      const receiver_id = user_ids.length > 0 ? 
        (user_ids[0] === uid ? user_ids[user_ids.length - 1] : user_ids[0] ): 
        0;
      Promise.all([
        ctrls.chat.addMessageReq({
          sender_id: uid,
          receiver_id,
          chat_id,
          payload: {
            message
          }
        }),
        models.user.getById(uid),
        models.user.getById(receiver_id)
      ])
        .then(([{message: msg, chat}, me, receiver]) => {
          socket.to(`chatroom_${chat_id}`).emit(CONSTS.SKT_RECEIVE_MSG, {
            message: {
              ...msg,
              user: me
            },
            chat: {
              ...chat,
              user: me
            }
          });
          socket.emit(CONSTS.SKT_RECEIVE_MSG, {
            message: {
              ...msg,
              user: me
            },
            chat: {
              ...chat,
              user: receiver
            }
          })
        })
        .catch(error => {
          console.log(error);
          socket.emit(CONSTS.SKT_SEND_MSG, {
            status: false,
            message: error.message,
          });
        });
    });

    socket.on(CONSTS.SKT_USER_TYPING, ({ chat_id, typing }) => {
      socket.to(`chatroom_${chat_id}`).emit(CONSTS.SKT_USER_TYPING, { chat_id, typing });
    });

    socket.on(CONSTS.SKT_SELECT_CHAT, async ({ chat_id }) => {
      const { uid } = helpers.auth.parseToken(token);
      Promise.all([
        models.user.save({ id: uid, current_chat: chat_id }),
        models.chat.myChatrooms(uid),
      ])      
        .then(([res, chats]) => {
          console.log(`User ${uid} entered chatroom ${chat_id}`);
          return Promise.all(chats.map(chat => {
            const user_ids = JSON.parse(chat.user_ids);
            let unread_nums = JSON.parse(chat.unread_nums);
            const myIdx = user_ids.indexOf(uid);
            unread_nums[myIdx] = 0;
            return models.chat.save({ ...chat, unread_nums: JSON.stringify(unread_nums) });
          }))
        })
        .then(() => {
          console.log(`Updated unread nums of user ${uid}`);
        })
    });

    socket.on('disconnecting', () => {
      const { uid } = helpers.auth.parseToken(token);
      models.user.save({ id: uid, socket_id: '', current_chat: 0 })
        .then(res => {
          console.log(`User ${uid} has been disconnected...`);
          io.sockets.emit(CONSTS.SKT_UPDATE_ONLINE, {
            user_id: uid,
            online: 0,
          });
          return models.chat.myChatrooms(uid);
        })
        .then(chats => {
          return Promise.all(chats.map(chat => {
            let onlines = JSON.parse(chat.online_status) || {};
            onlines[uid.toString()] = 0;
            return models.chat.save({
              ...chat,
              online_status: JSON.stringify(onlines)
            });
          }))
        })
        .then(() => {
          console.log(`Updated online status of user ${uid} in chatrooms`);
        });
    });

    socket.on('disconnect', () => {

    });

    socket.on(CONSTS.SKT_CHECK_HEALTH, args => {
      console.log('[check_health]', args);
      const { uid } = helpers.auth.parseToken(token);
      socket.emit(CONSTS.SKT_CHECK_HEALTH, { args, your_id: uid });
    });
  });
}

module.exports = {
  bootstrapSocket
}
