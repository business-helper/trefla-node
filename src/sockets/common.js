const CONSTS = require('../constants/socket.constant');
const { PROFILE_REVEAL_STATUS } = require('../constants/common.constant');
const NOTI_TYPES = require('../constants/notification.constant');

const {
  IChat,
  INotification,
  IUser
} = require('../types');

const models = require('../models');
const helpers = require('../helpers');
const ctrls = require('../controllers');

const activity = {
  createNotificationForProfileRevealChange: async (chat, user_id) => {
    return models.user.getById(user_id)
      .then(async (sender) => {
        const iChat = new IChat(chat);
        const iSender = new IUser(sender);

        const receiver_id = iChat.user_ids[1 - iChat.user_ids.indexOf(user_id)];
        if (!receiver_id) throw new Error("You are alone in this chat.");

        const iNotification = new INotification({
          sender_id: user_id,
          receiver_id,
          type: NOTI_TYPES.chatRevealRequest,
          optional_val: chat.id,
          time: helpers.common.generateTZTimeString(),
          is_read: 0,
          isFromAdmin: 0,
          isGuest: iSender.isGuest,
        });
        return models.notification.create(iNotification.toDB());
      });
  },
  socket4NewNotification: async ({ user_id, io, notification }) => {
    return models.user.getById(user_id)
      .then(user => {
        const iUser = new IUser(user);
        if (iUser.socket_id) {
          io.to(iUser.socket_id).emit(CONSTS.SKT_NOTI_NUM_UPDATED,
            {
              num: user.noti_num,
              notification,
            });
        }
      })
      .catch(error => false);  
  },
};

module.exports = activity;
