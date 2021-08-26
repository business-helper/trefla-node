const EVENTS = require('../constants/socket.constant');
const models = require('../models');

module.exports.socketOnNewNotification = async ({ user_id, socketClient, notification }) => {
  return models.user.getById(user_id)
    .then(user => {
      if (user.socket_id) {
        socketClient.emit(EVENTS.SKT_LTS_SINGLE, {
          to: user.socket_id,
          event: EVENTS.SKT_NOTI_NUM_UPDATED,
          args: {
            num: user.noti_num,
            notification,
          }
        });
      }
    })
    .catch(error => false);  
}