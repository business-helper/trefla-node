const models = require('../../models');
const helpers = require('../../helpers');
const ctrls = require('../../controllers');
const CONSTS = require('../../constants/socket.constant');

module.exports = async ({
  io, socket, token,
  message, chat_id, ...payload
}) => {
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

  const user_t = await models.user.getById(receiver_id); user_t.black_list = JSON.parse(user_t.black_list);
  const user_f = await models.user.getById(uid); 
  if (user_t.black_list.includes(uid)) {
    socket.emit(CONSTS.SKT_MSG_FAILED, {
      status: false,
      message: `You're blocked by "${user_t.user_name}"`,
      payload: {
        message,
        chat_id,
        ...payload
      }
    });
    return false;
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
    .then(async ([{message: msg, chat, unread_updated, sockets }, me, receiver, cardUsers]) => {
      
      /** callback sockets */
      if (sockets.length) {
        for (let skt of sockets) {
          io.to(skt.to).emit(skt.event, skt.args);
        }
      }
      /**
       * @description send socket to receiver
       * @for normal chat.
       */
      if (chat.isForCard === 0 && receiver.socket_id) {
        io.to(receiver.socket_id).emit(CONSTS.SKT_RECEIVE_MSG, {
          message: {
            ...msg,
            user: models.user.output(me) // sender
          },
          chat: {
            ...chat,
            user: models.user.output(me)
          }
        });
      }


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
}
