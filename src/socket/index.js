const {
  SKT_CHECK_HEALTH  
} = require('../constants/socket.constant');

const bootstrapSocket = (io) => {
  io.on('connection', socket => {
    console.log('[socket connect]');

    socket.on('disconnecting', () => {

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
