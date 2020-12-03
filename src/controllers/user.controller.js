const { Validator } = require("node-input-validator");
const CONSTS = require('../constants/socket.constant');
const NOTI_TYPES = require('../constants/notification.constant');
const { ADMIN_NOTI_TYPES } = require("../constants/notification.constant");
const models = require("../models/index");
const User = require("../models/user.model");
const helpers = require('../helpers');

const EmailTemplate = require("../models/emailTemplate.model");
const { respondError, sendMail } = require("../helpers/common.helpers");
const {
  comparePassword,
  generateUserData,
  genreateAuthToken,
  generatePassword,
  getTokenInfo,
} = require("../helpers/auth.helpers");

exports.register = async (req, res) => {
  let verifiedUser = null, new_number;
  new_number = req.body.card_number || "";
  let cardExists = false, verifiedUserWithCard = 0;

  if (new_number) {
    [verifiedUser] = await models.user.getByCard(new_number, 1);
    if (verifiedUser) {
      cardExists = true; verifiedUserWithCard = verifiedUser.id;
    }
  }

  // if card is already verified, then user can't have that card.
  const userData = generateUserData({ ...req.body, card_number: verifiedUser ? '' : new_number });

  return generatePassword(userData.password)
    .then(encPassword => ({ ...userData, password: encPassword }))
    .then(async userModel => {
      return User.create(userModel)
    })
    .then(async user => {
      // check if user has card number, if true, notify to the chat creator to the card.
      if (new_number && !verifiedUser) {
        let _chats = [];

        // notifies the card chat creators that a new user registered with card.
        await models.chat.getChatToCard({ card_number: user.card_number })
          .then(chats => {
            _chats = chats;
            const sender_ids = chats.map(chat => {
              const user_ids = JSON.parse(chat.user_ids);
              return user_ids[0];
            });
            return User.getByIds(sender_ids);
          })
          .then(senders => {
            const socketClient = req.app.locals.socketClient;
            senders.forEach((sender, i) => {
              if (sender.socket_id) {
                socketClient.emit(CONSTS.SKT_LTS_SINGLE, {
                  to: sender.socket_id,
                  event: CONSTS.SKT_REGISTER_WITH_CARD,
                  args: {
                    chat: {
                      ...(models.chat.output(_chats[i])),
                      user: models.user.output(user),
                    }
                  }
                });
              }
            });
          });
      } 
      return Promise.all([
        user,
        genreateAuthToken(user)
      ]);
    })
    .then(([user, token]) => res.json({
      status: true,
      message: 'success',
      data: User.output(user, 'PROFILE'),
      token,
      cardVerified: {
        exists: cardExists,
        user_id: verifiedUserWithCard,
      },
    }))
    .catch((error) => respondError(res, error));
};

exports.login = (req, res) => {
  return Promise.all([
    User.getByEmail(req.body.email_username),
    User.getByUserName(req.body.email_username),
  ])
    .then(([userByEmail, userByName]) => Promise.all([
      userByEmail || userByName,
      comparePassword(req.body.password, (userByEmail || userByName).password),
      genreateAuthToken(userByEmail || userByName),
      req.body.device_token !== undefined ? User.save({ ...(userByEmail || userByName), device_token: req.body.device_token }) : null
    ]))
    .then(([ user, match, token ]) => {
      if (match) {
        return res.json({
          status: true,
          message: 'success',
          data: User.output(user, 'PROFILE'),
          token
        });
      } else {
        return res.status(400).json({
          status: false,
          message: 'Password does not match!',
        });
      }
    })
    .catch((error) => respondError(res, error));
};

exports.forgotPassword = (req, res) => {
  return Promise.all([
    User.getByEmail(req.body.email),
    EmailTemplate.getByIdentifier('forgot_password')
  ])
    .then(([user, et]) => {
      const emailConsent = et.body
        .replace(new RegExp('%Username%'), user.user_name)
        .replace(new RegExp('%code%'), req.body.code);
      return Promise.all([
        sendMail({
          from: 'trefla <admin@trefla.com>',
          to: user.email,
          subject: et.subject,
          body: emailConsent,
        }),
        User.save({ ...user, recovery_code: req.body.code })
      ]);
    })
    .then(([info, saved]) => {
      if (info && info.messageId) {
        return res.json({
          status: true, 
          message: 'success', 
          data: {
            code: req.body.code,
            messageId: info.messageId
          }
        });
      } else {
        return res.json({
          status: false,
          message: 'failed',
          data: info
        });
      }
    })
    .catch((error) => respondError(res, error));
}

exports.resetPassword = (req, res) => {
  return Promise.all([
    User.getByEmail(req.body.email),
    generatePassword(req.body.password)
  ])
    .then(([ user, password ]) => {
      if (user.recovery_code !== req.body.code) {
        throw Object.assign(new Error('Recovery code does not match!'), { code: 400 });
      } else {
        user.password = password;
        user.recovery_code = '';
        return User.save(user);
      }
    })
    .then(user => res.json({
      status: true,
      message: 'success',
    }))
    .catch((error) => respondError(res, error));
}

exports.getById = (req, res) => {
  const { id: user_id } = req.params;
  return User.getById(user_id)
    .then(user => {
      user = User.output(user, 'PROFILE');
      return res.json({
        status: true,
        message: 'success',
        data: user
      });
    })
    .catch((error) => respondError(res, error));
}

exports.getProfile = (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  return User.getById(user_id)
    .then(user => {
      user = User.output(user, 'PROFILE');
      return res.json({
        status: true,
        message: 'success',
        data: user
      });
    })
    .catch((error) => respondError(res, error));
}

exports.pagination = (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  return Promise.all([
    User.pagination({ limit: req.query.limit || 10, page: req.query.page || 0 }),
    User.numberOfUsers()
  ])
    .then(([users, total]) => res.json({
      status: true,
      message: 'success',
      data: users.map(user => User.output(user, req.query.mode || 'PROFILE')), //.filter(user => user.id !== user_id)
      pager: {
        limit: Number(req.query.limit || 10),
        page: Number(req.query.page || 0),
        total,
      },
      hasMore: (req.query.page || 0) * (req.query.limit || 10) + users.length < total
    }))
    .catch(error => respondError(res, error));
}

exports.cardPagination = (req, res) => {
  const { uid, role } = getTokenInfo(req);
  let { limit, page } = req.query;
  page = Number(page); limit = Number(limit);
  return Promise.all([
    User.cardPagination({ limit, page }),
    User.numberOfCard(),
  ])
    .then(([users, total]) => {
      const hasMore = page * limit + users.length < total;
      return res.json({
        status: true,
        message: 'success',
        data: users.map(user => User.output(user)),
        pager: {
          page, limit, total,
        },
        hasMore,
      });
    })
}

exports.updateProfile = async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  let cardExists = false, verifiedUserWithCard = 0;

  
  const new_number = req.body['card_number'] || "";
  let old_number;
  let verifiedUser = null;
  let cardChats = [];

  // get verified user except 
  if (new_number) {
    [verifiedUser] = await User.getByCard(new_number, 1);
    verifiedUser = verifiedUser && verifiedUser.id !== user_id ? verifiedUser : null;
  }

  return User.getById(user_id)
    .then(async user => {
      old_number = user.card_number || "";
      
      const keys = Object.keys(user);
      keys.forEach(key => {
        // update fields except card number.
        if (req.body[key] !== undefined && key !== "card_number") {
          if (['location_array'].includes(key)) {
            user[key] = JSON.stringify(req.body[key]);
          } else if (key === 'card_number') { // skip it.
              
          } else {
            user[key] = req.body[key] !== undefined ? req.body[key] : user[key];
          }
        }
      });
      
      // when user gonna update card_number
      if (new_number !== old_number && !verifiedUser) {
        // when there is no verified user, it's possible to update card. But with unverified status.
        user.card_number = new_number;
        // if user is already verified with other number, all related card chats will be unverified.
        if (user.card_verified) {
          await models.chat.unverifyChatsByCard({ card_number: old_number });
        }
        user.card_verified = 0;
      }

      return User.save(user);
    })
    .then(async newUser => {
      if (new_number && new_number !== old_number && verifiedUser) {
        cardExists = true; verifiedUserWithCard = verifiedUser.id;
      }

      return res.json({
        status: true,
        message: 'Profile has been updated!',
        data: User.output(newUser, 'PROFILE'),
        cardVerified: {
          exists: cardExists,
          user_id: verifiedUserWithCard,
        },
      });
    })
    .catch((error) => respondError(res, error));
}

exports.updateById = (req, res) => {
  const { id } = req.params;
  const { uid, role } = getTokenInfo(req);

  return User.getById(id)
    .then(user => {
      const keys = Object.keys(user);
      keys.forEach(key => {
        if (['location_array'].includes(key)) {
          user[key] = req.body[key] ? JSON.stringify(req.body[key]) : user[key];
        } else {
          user[key] = req.body[key] !== undefined ? req.body[key] : user[key];
        }
      });
      return User.save(user);
    })
    .then(newUser => {
      return res.json({
        status: true,
        message: 'User has been updated!',
        data: User.output(newUser, 'PROFILE'),
      });
    })

}

exports.deleteByIdReq = (req, res) => {
  let user_id = Number(req.params.id);
  const { chat, comment, friend, post, report } = req.body.options || {};
  let _deleted = false;
  return models.user.deleteById(user_id)
    .then(deleted => {
      _deleted = deleted
      if (!deleted) {
        throw Object.assign(new Error('Failed to delete user!'), { code: 400 });
      }
      return Promise.all([
        chat ? models.chat.deleteByUser(user_id) : null,
        comment ? models.comment.deleteByUser(user_id) : null,
        post ? models.post.deleteByUser(user_id) : null,
        // friend ? m
      ]);
    })
    .then(([deleteChat, deleteComment, deletePost]) => {
      return {
        status: true,
        message: 'User has been deleted!'
      };
    })
}

exports.verifyUserReq = (req, res) => {
  const user_id = Number(req.params.id);
  
  let _user, _card_number;
  return User.getById(user_id)
    .then(user => {
      if (!user.card_number && !user.card_img_url) {
        throw Object.assign(new Error("User doesn't have card information!"), { code: 400 });
      }
      _user = user;
      _card_number = user.card_number;
      return Promise.all([
        models.user.getByCard(user.card_number),
        models.chat.getChatToCard({ card_number: user.card_number }),
      ]);
    })
    .then(([users, chats]) => {
      return Promise.all([
        manageVerificationStatusOfUsers(users, user_id),
        processChatroomToCard(chats, user_id),
      ]);
    })
    .then(async ([ users, chats ]) => {
      // const [verifiedUser] = cardUsers.filter(user => user.id === user_id);
      const sender_ids = chats.map(chat => {
        const user_ids = JSON.parse(chat.user_ids);
        return user_ids[0];
      }).filter((item, i, ar) => ar.indexOf(item) === i);

      // send socket message to the creator of card chat.
      await models.user.getByIds(sender_ids)
        .then(senders => {
          const socketClient = req.app.locals.socketClient;
          senders.forEach((sender, i) => {
            if (sender.socket_id) {
              // get card chat sender triggered.
              const [chat] = chats.filter(chat => {
                const user_ids = typeof chat.user_ids === 'string' ? JSON.parse(chat.user_ids) : chat.user_ids;
                return user_ids[0] === sender.id;
              });

              // notify the card chat creators that a user has been verified on interesting card number,
              socketClient.emit(CONSTS.SKT_LTS_SINGLE, {
                to: sender.socket_id,
                event: CONSTS.SKT_CARD_VERIFIED,
                args: {
                  chat: {
                    ...(models.chat.output(chat)),
                    user: models.user.output(_user),
                  }
                }
              });
            }
          });
        })
      return {
        status: true,
        message: 'success',
        verified: users,
        chatrooms: chats,
      };
    });
}

exports.unverifyUserReq = (req, res) => {
  const { id: user_id } = req.params;
  let _user;
  return User.getById(user_id)
    .then(user => {
      const { card_number, card_verified } = user;
      user.card_verified = 0;
      return Promise.all([
        User.save(user),
        models.chat.getChatToCard(card_number),
      ]);
    })
    .then(([user, cardChats]) => {
      if (cardChats.length) {
        return Promise.all(cardChats.map(chat => models.card.save({ ...chat, card_verified: 0 })));
      }
    })
    .then(() => ({
      status: true,
      message: 'User has been unverified!',
    }));
}

exports.banReplyReq = (req, res) => {
  const { uid: user_id } = getTokenInfo(req);

  return User.getById(user_id)
    .then(user => {
      user.ban_reply = req.body.reply;
      return User.save(user);
    })
    .then(user => ({
      status: true,
      message: "Thank you! We will get back to you soon."
    }));
}

exports.createIDTransferReq = async ({ user_id, card_number, socketClient }) => {
  let _user, verifiedUser;
  [verifiedUser] = await models.user.getByCard(card_number, 1);

  return User.getById(user_id)
    .then(user => {
      _user = user;

      // add notification for admin.
      const adminNotiModel = helpers.model.generateAdminNotiData({ 
        type: ADMIN_NOTI_TYPES.ID_TRANSFER, 
        payload: {
          from: verifiedUser.id,
          to: user.id,
          card_number,
        }
      });

      // add a notification for origin owner
      const notiModel = helpers.model.generateNotificationData({
        sender_id: user_id,
        receiver_id: verifiedUser.id,
        type: NOTI_TYPES.cardTransferRequestNotiType,
        optional_val: card_number,
      });
      
      // increase noti_num of the verified user.
      verifiedUser.noti_num ++;
      
      return Promise.all([
        models.user.save(verifiedUser),
        models.notification.create(notiModel),
        models.adminNotification.create(adminNotiModel),
      ])
    })
    .then(([owner, notification, adminNoti]) => {
      // send socket to owner
      if (verifiedUser.socket_id) {
        socketClient.emit(CONSTS.SKT_LTS_SINGLE, {
          to: verifiedUser.socket_id,
          event: CONSTS.SKT_NOTI_NUM_UPDATED,
          args: { 
            num: verifiedUser.noti_num,
            notification
          }
        });
      }
      return {
        status: true,
        message: "You request has been received!",
      }
    });
}

const manageVerificationStatusOfUsers = (users, user_id) => {
  const card_number = users[0].card_number;
  return Promise.all(users.map(user => User.save({
    ...user,
    card_verified: user.id === user_id ? 1 : 0,
    card_number:  user.id === user_id ? card_number : '',
    card_img_url: user.id === user_id ? user.card_img_url : '',
  })))
  .then((users) => users)
  .catch(error => {
    console.log('[Users verify status] error', error);
    return false
  });
}

const processChatroomToCard = async (chats, user_id) => {
  const user = await User.getById(user_id);

  return Promise.all(chats.map(async chat => {
    const chat_users = JSON.parse(chat.user_ids);
    const isTransfer = chat_users.length > 1;

    let updateData = {};
    if (!isTransfer) {
      updateData = {
        user_ids: JSON.stringify([chat_users[0], user_id])
      };

    } else if (chat_users[chat_users.length -1] !== user_id) {
      console.log('[ID Transfer] acceptable');
      const lastMsg = await models.message.lastMsgInChat(chat.id);
      const lastMsgIdOnTransfer = JSON.parse(chat.lastMsgIdOnTransfer || '[]');
      const last_messages = JSON.parse(chat.last_messages || '[]');
      updateData = checkDuplicatedOwner({
        user_ids: [...chat_users, user_id],
        isTransfered: true,
        lastMsgIdOnTransfer: [...lastMsgIdOnTransfer, lastMsg ? lastMsg.id : 0],
        last_messages: [...last_messages, {
          msg: lastMsg.message,
          time: lastMsg.time,
        }]
      });
    } else {
      console.log('[ID transfer] same id with last owner!')
      updateData = {
        card_number: chat.card_number,
      };
    }
    updateData.id = chat.id;
    updateData.card_verified = 1;

    return Promise.all([
      models.chat.save(updateData),
      models.message.updateReceiverInCardChat(chat.id, user_id),
    ]);
  }))
  .then(([[chat]]) => [chat])
  .catch(error => {
    console.log('[Process card chats] error', error);
    return false;
  });
}

const checkDuplicatedOwner = (data) => {
  let { user_ids, isTransfered, lastMsgIdOnTransfer, last_messages } = data;
  const current_owner = user_ids[user_ids.length - 1];
  if (user_ids.length > 3) {
    let dupId = user_ids.indexOf(current_owner);
    if (dupId > 0 && dupId < user_ids.length - 1) {
      user.ids.splice(dupId, 1);
      lastMsgIdOnTransfer.splice(dupId - 2, 1);
      last_messages.splice(dupId - 1, 1);
    }
  }
  return {
    user_ids: JSON.stringify(user_ids),
    isTransfered,
    lastMsgIdOnTransfer: JSON.stringify(lastMsgIdOnTransfer),
    last_messages: JSON.stringify(last_messages),
  };
}

