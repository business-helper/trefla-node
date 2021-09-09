/**
 * @description Request to share the profile each other in a chat.
 * 
 */
const CONSTS = require('../../constants/socket.constant');
const { PROFILE_REVEAL_STATUS } = require('../../constants/common.constant');
const { IChat, INotification, IUser } = require('../../types');
const models = require('../../models');
const helpers = require('../../helpers');
const ctrls = require('../../controllers');
const commonActivity = require('../common');

const activity = {
  updateProfileRevealStatusOfChat: (chat_id, requested_by) => {
    return models.chat.getById(chat_id)
      .then(chat => {
        const iChat = new IChat(chat);
        iChat.profile_revealed = PROFILE_REVEAL_STATUS.PENDING;
        iChat.reveal_request_by = requested_by;
        iChat.update_time = helpers.common.timestamp();
        return models.chat.save(iChat.toDB());
      });
  },
  pushNotification: async ({ notification }) => {
    const iNotification = new INotification(notification);
    const sender = await models.user.getById(iNotification.sender_id);
    const receiver = await models.user.getById(iNotification.receiver_id);
    const iSender = new IUser(sender);
    const iReceiver = new IUser(receiver);
    
    const title = {
      EN: 'A Request to Reveal Profiles',
      RO: 'O cerere de revelare a profilurilor',
    };
    
    const senderName = {
      EN: iSender.isGuest ? 'A guest' : iSender.user_name,
      RO: iSender.isGuest ? 'Un musafir' : iSender.user_name,
    };

    const body = {
      EN: `${senderName.EN} requested to reveal profiles of each other.`,
      RO: `${senderName.RO} a cerut să-și dezvăluie profilurile reciproce.`,
    };
    const lang = ['EN', 'RO'].includes(iReceiver.language.toUpperCase()) ? iReceiver.language.toUpperCase() : 'EN';

    const data = {
      noti_id: String(notification.id || ""),
      optionalVal: String(notification.optional_val || ""),
      type: String(notification.type || ""),
      user_id: iSender.id,
      user_name: senderName[lang],
      avatar: '',
    };
    if (iReceiver.device_token) {
      return helpers.common.sendSingleNotification({
        body: body[lang],
        title: title[lang],
        token: iReceiver.device_token,
        data,
      }).catch(error => false);
    }
  },
  respond2Sender: async (socket, { chat, user_id }) => {
    const iChat = new IChat(chat);
    return models.user.getById(user_id)
      .then(user => {
        const iUser = new IUser(user);
        if (iUser.socket_id) {
          socket.emit(CONSTS.SKT_PROFILE_REVEAL_REQUEST, {
            status: true,
            chat: iChat.toJSON(),
          });
        }
      });
  },
  respond2Receiver: (io, { chat, notification }) => {
    const iChat = new IChat(chat);
    const iNotification = new INotification(notification);
    return Promise.all([
      models.user.getById(iNotification.sender_id),
      models.user.getById(iNotification.receiver_id),
    ])
      .then(([sender, receiver]) => {
        const iSender = new IUser(sender);
        const iReceiver = new IUser(receiver);
        if (iReceiver.socket_id) {
          io.to(iReceiver.socket_id).emit(CONSTS.SKT_PROFILE_REVEAL_REQUESTED, {
            chat: iChat.toObject(),
            sender: iSender.asNormal(),
          });
        }
      })
  },
};


module.exports = async ({
  io, socket, token,
  chat_id,
}) => {
  const { uid } = helpers.auth.parseToken(token);
  return activity.updateProfileRevealStatusOfChat(chat_id, uid)
    .then(async chat => {
      const notification = await commonActivity.createNotificationForProfileRevealChange(chat, uid);
      const iNotification = new INotification(notification);
      await commonActivity.socket4NewNotification({
        user_id: iNotification.receiver_id,
        io,
        notification,
      });
      await activity.pushNotification({ notification });

      // now respond to users via socket.
      await activity.respond2Sender(socket, { chat, user_id: uid }).catch(error => false);
      await activity.respond2Receiver(io, { chat, notification }).catch(error => false);
    })
    .catch(error => {
      console.log('[Profile Reveal][Request] error: ', error);
      socket.emit(CONSTS.SKT_PROFILE_REVEAL_REQUEST, { status: 'error', details: error.message });
    });    
}
