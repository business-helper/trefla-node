const models = require('../../models');
const helpers = require('../../helpers');
const ctrls = require('../../controllers');
const CONSTS = require('../../constants/socket.constant');

module.exports = ({
  io, socket, token,
  toId, message, isGuest = true, from_where = 'NONE', target_id = '0'
}) => {
  const { uid } = helpers.auth.parseToken(token);
  console.log('[connection req]', toId, uid);
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
      return ctrls.chat.createNormalChatReq(uid, { receiver_id: toId, message, from_where, target_id }, isGuest);
    })
    .then(result => {
      const { status, message, data, isNewChat } = result;
      if (_toUser.socket_id) {
        io.to(_toUser.socket_id).emit(CONSTS.SKT_CONNECT_REQUESTED, { 
          status,
          message: `Connection request from ${_fromUser.user_name}`,
          data: { ...data, isSent: false, user: models.user.output(_fromUser) },
          isNewChat,
        });
      } else {
        console.log('[user is offline]', toId);
      }
      socket.emit(CONSTS.SKT_CONNECT_TO_USER, { status, message, data: { ...data, isSent: true }, isNewChat });
    })
    .catch(error => {
      console.log(error);
      socket.emit(CONSTS.SKT_CONNECT_TO_USER, { status: false, message: error.message });
    })
}
