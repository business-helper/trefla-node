const CONSTS = require('../../constants/socket.constant');
const { PROFILE_REVEAL_STATUS } = require('../../constants/common.constant');
const NOTI_TYPES = require('../../constants/notification.constant');

const { IChat, INotification, IUser } = require('../../types');

const models = require('../../models');
const helpers = require('../../helpers');
const ctrls = require('../../controllers');
const commonActivity = require('../common');


const activity = {
  updateChatWithProfileReveal: (chat_id) => {
    return models.chat.getById(chat_id)
      .then(chat => {
        const iChat = new IChat(chat);
        iChat.profile_revealed = PROFILE_REVEAL_STATUS.PRIVATE;
        iChat.update_time = helpers.common.timestamp();
        return models.chat.save(iChat.toDB());
      });
  },
  createNotification: (chat, user_id) => {
    return models.user.getById(user_id)
      .then(async sender => {
        const iChat = new IChat(chat);
        const receiver_id = iChat.user_ids[1 - iChat.user_ids.indexOf(user_id)];
        if (!receiver_id) throw new Error("You're alone in this chat.");
        const receiver = await models.user.getById(receiver_id);

        const iSender = new IUser(sender);
        const iReceiver = new IUser(receiver);

        const iNotification = new INotification({
          sender_id: user_id,
          receiver_id,
          type: NOTI_TYPES.chatRevealReject,
          optional_val: iChat.id,
          time: helpers.common.generateTZTimeString(),
          is_read: 0,
          isFromAdmin: 0,
          isGuest: iSender.isGuest,
        });
        return models.notification.create(iNotification.toDB());
      });
  },
  pushNotification: async ({ notification }) => {
    const iNotification = new INotification(notification);
    const sender = await models.user.getById(iNotification.sender_id);
    const receiver = await models.user.getById(iNotification.receiver_id);
    const iSender = new IUser(sender);
    const iReceiver = new IUser(receiver);

    const senderName = {
      EN: iSender.isGuest ? 'A guest' : iSender.user_name,
      RO: iSender.isGuest ? 'Un musafir' : iSender.user_name,
    };
    const title = {
      EN: 'Profile Reveal Request Rejected',
      RO: 'Profilul dezvăluie cererea respinsă',
    };
    const body = {
      EN: `${senderName.EN} rejected to reveal profiles of each other.`,
      RO: `${senderName.RO} a respins să dezvăluie profiluri între ele.`,
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
      .then(async user => {
        const iUser = new IUser(user);

        if (iUser.socket_id) {
          socket.emit(CONSTS.SKT_PROFILE_REVEAL_REJECT, {
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
        const iReceiver = new IUser(receiver);
        if (iReceiver.socket_id) {
          io.to(iReceiver.socket_id).emit(CONSTS.SKT_PROFILE_REVEAL_REJECTED, {
            chat: iChat.toObject(),
          });
        }
      })
  },
};

module.exports = ({
  io, socket, token,
  chat_id,
}) => {
  const { uid } = helpers.auth.parseToken(token);
  return activity.updateChatWithProfileReveal(chat_id)
    .then(async chat => {
      // update chat.profile_revealed, and store it in db.
      const iChat = new IChat(chat);
      const notification = await activity.createNotification(chat, uid);
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
      console.log('[Socket][Profile Reveal][Accept] Error: ', error);
      socket.emit(CONSTS.SKT_PROFILE_REVEAL_ACCEPT, { status: false, message: error.message });
    })
}
