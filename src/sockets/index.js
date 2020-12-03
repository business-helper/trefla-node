const models = require('../models/index');
const helpers = require('../helpers/index');
const ctrls = require('../controllers/index');
const {
  SKT_CHECK_HEALTH  
} = require('../constants/socket.constant');
const CONSTS = require('../constants/socket.constant');
const INNER_CLIENT = 'INNER_CLIENT';

const bootstrapSocket = (io) => {
  io.on('connection', async socket => {
    console.log('[socket connect]', socket.request._query.token);
    const token = socket.request._query.token;
    if (token !== INNER_CLIENT) {
      const { uid } = helpers.auth.parseToken(token);

      await Promise.all([
        models.user.getById(uid),
        models.chat.myChatrooms(uid, 1),
        models.user.updateSocketSession({ id: uid, socketId: socket.id })
      ])
      .then(([user, chats]) => {
        if (user) {
          console.log(`"${user.user_name}" is online now`);
          for (let chat of chats) {
            if (!chat.isForCard) {
              socket.join(`chatroom_${chat.id}`);
              console.log(`"${user.user_name}" joined "chatroom_${chat.id}"`);
            }
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
    socket.on(CONSTS.SKT_CONNECT_TO_USER, ({ toId, message, isGuest = true }) => {
      console.log('[connection req]', toId);
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
          return ctrls.chat.createNormalChatReq(uid, { receiver_id: toId, message }, isGuest);
        })
        .then(result => {
          const { status, message, data } = result;
          if (_toUser.socket_id) {
            io.to(_toUser.socket_id).emit(CONSTS.SKT_CONNECT_REQUESTED, { status, message: `Connection request from ${_fromUser.user_name}`, data: { ...data, isSent: false, user: models.user.output(_fromUser) } });
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

    socket.on(CONSTS.SKT_CONNECT_TO_CARD, async ({ card_number, message, toId = 0, isGuest = true }) => {
      const { uid } = helpers.auth.parseToken(token);
      let _chat, _message;

      const [cardUsers, fromUser] = await Promise.all([
        models.user.getByCard(card_number),
        models.user.getById(uid),
        // models.chat.getChatToCard({ card_number, uid }),
      ]);
      const [verifiedUser] = cardUsers.filter(user => user.card_verified);
      toId = verifiedUser ? verifiedUser.id : 0;
      console.log('[connection req]', toId);

      ctrls.chat.createCardChatReq(uid, { receiver_id: toId, message, card_number, isForCard: 1, card_verified: verifiedUser ? 1 : 0 }, isGuest)
        .then(({ status, message, data: chat, msg }) => {
          _chat = chat; _message = msg;
          // process the sender
          socket.emit(CONSTS.SKT_CONNECT_TO_USER, { 
            status, message, 
            data: { ...chat, isSent: true } 
          });

          // process the receivers
          (verifiedUser ? [verifiedUser] : cardUsers).map(receiver => {
            if (receiver.socket_id) {
              io.to(receiver.socket_id).emit(CONSTS.SKT_CONNECT_REQUESTED, {
                status: true,
                message: `Connection request from ${fromUser.user_name}`,
                data: {
                  ...chat,
                  isSent: false,
                  user: models.user.output(fromUser),
                }
              });
            }
          });
        })
        .then(() => {
          if (_message) {
            socket.emit(CONSTS.SKT_RECEIVE_MSG, { 
              message: {
                ...(models.message.output(_message)),
                user: models.user.output(fromUser) // sender
              },
              chat: {
                ..._chat,
                user: models.user.output(verifiedUser)
              }
            });

            (verifiedUser ? [verifiedUser] : cardUsers).map(receiver => {
              if (receiver.socket_id) {
                io.to(receiver.socket_id).emit(CONSTS.SKT_RECEIVE_MSG, {
                  message: {
                    ...(models.message.output(_message)),
                    user: models.user.output(fromUser) // sender
                  },
                  chat: {
                    ..._chat,
                    user: models.user.output(fromUser)
                  }
                });
              }
            });
          }
        })
        .catch(error => {
          console.log(error);
          socket.emit(CONSTS.SKT_CONNECT_TO_USER, { status: false, message: error.message });
        });
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

              io.to(sender.socket_id).emit(CONSTS.SKT_CONNECT_ACCEPTED, { status: true, message: `Chatroom with ${me.user_name} has been activated!`, data: { ...chat, user: models.user.output(me) } });
            }
            socket.join(`chatroom_${chat.id}`);
            console.log(`"${me.user_name}" joined "chatroom_${chat.id}"`);
            socket.emit(CONSTS.SKT_CONNECT_ACCEPT, { status: true, message: `You activated the chatroom with ${sender.user_name}`, data: { ...chat, user: models.user.output(sender) } });
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

    socket.on(CONSTS.SKT_CONNECT_REJECT, ({ chat_id }) => {
      console.log(CONSTS.SKT_CONNECT_REJECT, chat_id);
      const { uid } = helpers.auth.parseToken(token);
      let _chat;
      ctrls.chat.rejectChatReq({ chat_id })
        .then(async (result) => {
          if (result.status) {

            let { data: chat } = result;
            _chat = chat;
            const user_ids = JSON.parse(chat.user_ids);

            const partnerIdx = helpers.common.chatPartnerId(user_ids, uid);
            const partner = await models.user.getById(partnerIdx);
            const me = await models.user.getById(uid);

            socket.leave(`chatroom_${chat_id}`);
            _chat = models.chat.output(_chat);
            socket.emit(CONSTS.SKT_CONNECT_REJECT, {
              status: true,
              message: 'You rejected the chat!',
              data: {
                ..._chat,
                user: models.user.output(partner)
              }
            });

            if (partner && partner.socket_id) {
              io.to(partner.socket_id).emit(CONSTS.SKT_CONNECT_REJECTED, {
                status: true,
                message: `${me.user_name} rejected a chat with you!`,
                data: {
                  ..._chat,
                  user: models.user.output(me)
                }
              });
            }
          } else {
            // socket.emit(CONSTS.SKT_CONNECT_REJECT, result);
            throw Object.assign(new Error(result.message), { code: 400 });
          }
        })

        .catch(error => {
          console.log(`[${CONSTS.SKT_CONNECT_REJECT}]`, error)
          socket.emit(CONSTS.SKT_CONNECT_REJECT, {
            status: false,
            message: error.message || 'Failed to reject chat...'
          });
        });
    })

    socket.on(CONSTS.SKT_SEND_MSG, async ({ message, chat_id, ...payload }) => {
      const { uid } = helpers.auth.parseToken(token);
      const chat = await models.chat.getById(chat_id);
      const user_ids = JSON.parse(chat.user_ids);
      let receiver_id = user_ids.length > 1 ? 
        (user_ids[0] === uid ? user_ids[user_ids.length - 1] : user_ids[0] ): 
        0;

      if (chat.isForCard === 1) {
        if (!chat.card_verified) {
          receiver_id = 0;
        }
      }

      Promise.all([
        ctrls.chat.addMessageReq({
          sender_id: uid,
          receiver_id,
          chat_id,
          payload: {
            message,
            ...payload
          }
        }),
        models.user.getById(uid),
        models.user.getById(receiver_id),
        (chat.isForCard === 1) ? models.user.getByCard(chat.card_number) : null,
      ])
        .then(async ([{message: msg, chat, unread_updated}, me, receiver, cardUsers]) => {
          
          /**
           * @description send socket to receiver
           * @for normal chat.
           */
          socket.to(`chatroom_${chat_id}`).emit(CONSTS.SKT_RECEIVE_MSG, {
            message: {
              ...msg,
              user: models.user.output(me) // sender
            },
            chat: {
              ...chat,
              user: models.user.output(me)
            }
          });


          /**
           * @description send socket to me.
           */
          socket.emit(CONSTS.SKT_RECEIVE_MSG, {
            message: {
              ...msg,
              user: models.user.output(me) // sender
            },
            chat: {
              ...chat,
              user: models.user.output(receiver)
            }
          });

          /**
           * @deprecated
           * @reason unread messages are calculated from chats list only
           * @description send unread message status to receiver
           * */ 
          // if (chat.isForCard === 0 && unread_updated && receiver.socket_id) {
          //   const unreads = await ctrls.chat.getUnreadMsgInfoReq(receiver.id);
          //   io.to(receiver.socket_id).emit(CONSTS.SKT_UNREAD_MSG_UPDATED, unreads); // @deprecated
          // } 
          
          /**
           * @description send message to card users for card chat
           * @memo for card chat there is no accepted status. it would be unused.
           */
          if (chat.isForCard === 1 && cardUsers.length) {
            // if card chat is verified, then only to verified user, if not, then to all card users.
            cardUsers.filter(item => item.socket_id && item.card_verified === chat.card_verified).forEach(cardUser => {
              io.to(cardUser.socket_id).emit(CONSTS.SKT_RECEIVE_MSG, {
                message: {
                  ...msg,
                  user: models.user.output(me),
                },
                chat: {
                  ...chat,
                  user: models.user.output(me),
                }
              });
            });
          } 
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
        models.chat.myChatrooms(uid, 1),
        models.chat.getById(chat_id),
      ])
        .then(([res, chats, chat]) => {
          console.log(`User ${uid} entered chatroom ${chat_id}`);
          const user_ids = JSON.parse(chat.user_ids);
          let unread_nums = JSON.parse(chat.unread_nums);
          const myIdx = user_ids.indexOf(uid);
          myIdx > -1 ? unread_nums[myIdx] = 0 : null;
          return models.chat.save({ ...chat, unread_nums: JSON.stringify(unread_nums) });
        })
        .then(() => {
          return ctrls.chat.getUnreadMsgInfoReq(uid);
        })
        .then((unreads) => {
          socket.emit(CONSTS.SKT_UNREAD_MSG_UPDATED, unreads);
          console.log(`Updated unread nums of user ${uid}`);
        });
    });

    socket.on(CONSTS.SKT_LEAVE_CHAT, ({ chat_id }) => {
      const { uid } = helpers.auth.parseToken(token);
      models.user.save({ id: uid, current_chat: 0 })
        .then((user) => {
          console.log(`"${user.user_name}" left chatroom No.${chat_id}`);
        })
    });

    socket.on(CONSTS.SKT_LTS_SINGLE, ({ to, event, args }) => {
      io.to(to).emit(event, args);
    });

    socket.on(CONSTS.SKT_LTS_BROADCAST, ({ event, args }) => {
      io.sockets.emit(event, args);
    })

    socket.on('disconnecting', () => {
      const { uid } = helpers.auth.parseToken(token);
      models.user.save({ id: uid, socket_id: '', current_chat: 0 })
        .then(res => {
          console.log(`User ${uid} has been disconnected...`);
          io.sockets.emit(CONSTS.SKT_UPDATE_ONLINE, {
            user_id: uid,
            online: 0,
          });
          return models.chat.myChatrooms(uid, 1);
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
