const models = require('../models/index');
const helpers = require('../helpers/index');
const {
  SKT_CHECK_HEALTH  
} = require('../constants/socket.constant');
const INNER_CLIENT = 'INNER_CLIENT';

const bootstrapSocket = (io) => {
  io.on('connection', socket => {
    console.log('[socket connect]', socket.request._query.token);
    const token = socket.request._query.token;
    if (token !== INNER_CLIENT) {
      const { uid } = helpers.auth.parseToken(token);
      models.user.getById(uid)
        .then(user => {
          // console.log('[user]', user)
        });
    }

    socket.on('disconnecting', () => {
      console.log('[socket disconnect]', socket.request._query.token);
    });

    socket.on('disconnect', () => {

    });

    socket.on('check_health', args => {
      console.log('[check_health]', args);
    })
  });
}

module.exports = {
  bootstrapSocket
}
