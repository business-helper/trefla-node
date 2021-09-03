const models = require('../../models');
const helpers = require('../../helpers');
const ctrls = require('../../controllers');
const CONSTS = require('../../constants/socket.constant');

module.exports = async ({
  io, socket, token,
  card_number, message, toId = 0, isGuest = true, from_where = 'CARD'
}) => {
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

  ctrls.chat.createCardChatReq(uid, {
      receiver_id: toId,
      message, card_number,
      isForCard: 1,
      card_verified: verifiedUser ? 1 : 0,
      from_where,
      target_id: card_number,
     }, isGuest)
    .then(({ status, message, data: chat, msg, sockets = [] }) => {
      /** callback sockets */
      if (sockets.length) {
        for (let skt of sockets) {
          io.to(skt.to).emit(skt.event, skt.args);
        }
      }
      
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
}