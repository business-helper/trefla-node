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
    // console.log('[socket connect]', socket.request._query.token);
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
          }
        }
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

    socket.on('room message', ({ message, room }) => {
      console.log('room message in ' + room, message);
      // socket.to(`chatroom_${room}`).emit('room message', { message, room });
      io.to(`chatroom_${room}`).emit('room message', { message, room });
    });

    socket.on('user typing', ({ room, typing }) => {
      socket.to(`chatroom_${room}`).emit('user typing', { room, typing });
    });

    socket.on('connect user', ({ receiver }) => {
      console.log('connect', socket.id, receiver);
      socket.emit('connect user', { receiver });
    });

    socket.on('disconnecting', () => {
      const { uid } = helpers.auth.parseToken(socket.request._query.token);
      models.user.updateSocketSession({ id: uid, socketId: '' })
        .then(res => {
          console.log(`User ${uid} has been disconnected...`);
        })
    });

    socket.on('disconnect', () => {

    });

    socket.on('check_health', args => {
      console.log('[check_health]', args);
    });
  });
}

module.exports = {
  bootstrapSocket
}
