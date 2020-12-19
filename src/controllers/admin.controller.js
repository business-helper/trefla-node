const { Validator } = require("node-input-validator");

const models = require("../models");
const helpers = require("../helpers");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { bool2Int, getTotalLikes, generateTZTimeString, JSONParser, respondError, sendMail, timestamp } = require("../helpers/common.helpers");
const { generateAdminData, generateMessageData } = require('../helpers/model.helpers');
const { ADMIN_NOTI_TYPES } = require("../constants/notification.constant");

// to-do
exports.create = async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);

  let model = generateAdminData(req.body, user_id, receiver);
  const message = req.body.message ? generateMessageData({
    ...req.body,
    sender_id: user_id,
    receiver_id: receiver ? receiver.id : 0,
    message: req.body.message
  }) : null;

  return models.admin.create(model)
    .then(chat => Promise.all([
      chat,
      models.user.getById(user_id),
      message ? models.message.create({ ...message, chat_id: chat.id }) : null
    ]))
    .then(([chat, sender, message]) => {
      chat = models.chat.output(chat);
      chat.receiver = models.user.output(receiver);
      return res.json({
        status: true, 
        message: 'Chat room created!',
        data: chat
      });
    })
    .catch((error) => respondError(res, error));
};

exports.getAdminById = async (id) => {
  return models.admin.getById(id);
}

exports.loginReq = async (req, res) => {
  const { email_or_name, password } = req.body;
  let _admin;
  return Promise.all([
    models.admin.getByEmail(email_or_name),
    models.admin.getByUsername(email_or_name)
  ])
    .then(([ adminByEmail, adminByName ]) => {
      if (!adminByEmail && !adminByName) {
        throw Object.assign(new Error('Invalid username or email!'), { code: 400 });
      }
      _admin = adminByEmail || adminByName;
      return Promise.all([
        helpers.auth.comparePassword(password, _admin.password),
        helpers.auth.genreateAuthToken(_admin, 'ADMIN')
      ])
    })
    .then(([matched, token]) => {
      if (!matched) {
        throw Object.assign(new Error('Password does not match!'), { code: 400 });
      }
      return {
        status: true,
        message: "Login success!",
        data: models.admin.output(_admin),
        token
      };
    });
}

exports.getIdTransfersReq = async ({ limit = 0, page = 0 }) => {
  limit = Number(limit);
  page = Number(page);

  let _total, _rows;
  return Promise.all([
    models.adminNotification.pagination({ page, limit }),
    models.adminNotification.total({}),
  ])
    .then(([ rows, total ]) => {
      _rows = rows; _total = total;
      const userIds = [0];
      rows.forEach(transfer => {
        const payload = JSONParser(transfer.payload);
        payload.from ? userIds.push(payload.from) : null;
        payload.to ? userIds.push(payload.to) : null;
      });
      return models.user.getByIds(userIds);
    })
    .then(users => {
      const userObj = {};
      users.forEach(user => {
        userObj[user.id.toString()] = user;
      });

      const hasMore = _rows.length + page * limit < _total;
      const pager = { page, limit, total: _total };
      return {
        status: true,
        message: 'success',
        data: _rows.map(item => {
          item = models.adminNotification.output(item);
          return {
            ...item,
            from: models.user.output(userObj[item.payload.from]),
            to: models.user.output(userObj[item.payload.to]),
          }
        }),
        pager,
        hasMore,
      };
    })
}

exports.getIdTransferById = async (id) => {
  let _noti;
  return models.adminNotification.getById(id)
    .then(adminNoti => {
      _noti = adminNoti;
      const payload = JSON.parse(adminNoti.payload);
      return models.user.getByIds([ payload.from, payload.to ]);
    })
    .then(users => {
      return {
        status: true,
        message: 'success',
        data: {
          ...(models.adminNotification.output(_noti)),
          from: models.user.output(users[0]),
          to: models.user.output(users[1]),
        }
      }
    });
}

exports.deleteIdTransferById = async (id) => {
  return models.adminNotification.deleteById(id)
    .then(() => {
      return {
        status: true,
        message: 'Data has been deleted',
      };
    })
}

exports.getEmailTemplateReq = async ({ limit = 0, page = 0 }) => {
  limit = Number(limit);
  page = Number(page);

  let _total, _rows;

  return Promise.all([
    models.emailTemplate.pagination({ page, limit }),
    models.emailTemplate.total({}),
  ])
    .then(([ rows, total ]) => {
      const hasMore = page * limit + rows.length < total;
      const pager = { page, limit, total };
      return {
        status: true,
        message: 'success',
        data: rows.map(row => models.emailTemplate.output(row)),
        pager,
        hasMore,
      }
    })
}

exports.getEmailTemplateById = async (id) => {
  return models.emailTemplate.getById(id)
    .then(et => ({ status: true, message: 'success', data: et }));
}

exports.updateEmailTemplateById = async (id, data) => {
  return models.emailTemplate.getById(id)
    .then(template => {
      const keys = Object.keys(template);
      const jsonKeys = ['payload', 'emails'];
      keys.forEach(key => {
        template[key] = data[key] !== undefined ? (jsonKeys.includes(key) ? JSON.stringify(data[key]) : data[key]) : template[key];
      });
      return models.emailTemplate.save(template);
    })
    .then(et => {
      return {
        status: true,
        message: 'success',
        data: models.emailTemplate.output(et),
      };
    })
}

exports.updateProfileReq = async (id, data) => {
  return models.admin.getById(id)
    .then(admin => {
      const keys = Object.keys(admin);
      keys.forEach(key => {
        admin[key] = data[key] !== undefined ? data[key]: admin[key];
      });
      admin.update_time = timestamp();
      return models.admin.save(admin);
    })
    .then(admin => {
      return {
        status: true,
        message: 'Profile has been updated!',
        data: models.admin.output(admin),
      };
    })
}

exports.updateAdminPassword = async (id, { old_pass, password }) => {
  let _admin;
  return models.admin.getById(id)
    .then(async admin => {
      const matched = await helpers.auth.comparePassword(old_pass, admin.password);
      if (!matched) throw Object.assign(new Error("Old password does not match!"), { code: 400 });
      _admin = admin;
      return helpers.auth.generatePassword(password);
    })
    .then(newHash => {
      _admin.password = newHash;
      _admin.update_time = timestamp();
      return models.admin.save(_admin);
    })
    .then(admin => {
      return {
        status: true,
        message: 'Password has been updated!',
      };
    })
}

exports.getAdminConfigReq = async () => {
  return models.config.getById(1)
    .then(config => {
      return {
        status: true,
        message: 'success',
        data: config,
      };
    })
}

exports.updateAdminConfigReq = async (data) => {
  return models.config.getById(1)
    .then(config => {
      const keys = Object.keys(config);
      keys.forEach(key => {
        config[key] = data[key] !== undefined ? data[key]: config[key];
      });
      return models.config.save(config);
    })
    .then(config => {
      return {
        status: true,
        message: 'Config has been updated!',
        data: config,
      };
    })
}

exports.recentPosts4Stats = async () => {
  let _posts;
  return models.post.recentPosts()
    .then(posts => {
      _posts = posts;
      const user_ids = posts.map(post => post.user_id); user_ids.push(0);
      return models.user.getByIds(user_ids);
    })
    .then(users => {
      const userObj = {};
      users.forEach(user => {
        userObj[user.id.toString()] = user;
      });
      return _posts.map(post => {
        return {
          ...post,
          user: models.user.output(userObj[post.user_id.toString()]),
        };
      })
    })
}

exports.totalResource4Stats = async () => {
  return Promise.all([
    models.post.total(),
    models.comment.total(),
    models.report.total(),
    models.user.total(),
  ])
    .then(([ posts, comments, reports, users ]) => {
      return { posts, comments, reports, users };
    })
}

exports.last7DayPosts = async () => {
  const time = timestamp();
  const start_time = time - 86400 * 7;
  let stats = [0, 0, 0, 0, 0, 0, 0];
  return models.post.last7DayPosts(start_time)
    .then(posts => {
      posts.map(post => {
        const deltaDay = Math.floor((time - Number(post.create_time)) / 86400);
        console.log('diff', time, post.create_time);
        stats[6 - deltaDay] ++;
      });
      return stats;
    });
}

exports.sendConsentEmail4Transfer = async (noti_id) => {
  let _noti;
  return models.adminNotification.getById(noti_id)
    .then(adminNoti => {
      _noti = adminNoti;
      const payload = JSONParser(adminNoti.payload);
      return Promise.all([
        models.emailTemplate.getByIdentifier('verify_consent'),
        models.user.getByIds([payload.from, payload.to]),
        models.config.get(),
      ])
    })
    .then(([ template, users, config ]) => {
      let htmlBody = template.body
        .replace(new RegExp('%username%', 'g'), users[0].user_name)
        .replace(new RegExp('%toUser%', 'g'), users[1].user_name)
        .replace(new RegExp('%email%', 'g'), users[1].email);

      sendMail({
        from: `Trefla Admin <${config.admin_email}>`,
        to: users[0].email,
        subject: template.subject,
        body: htmlBody,
      })
    })
    .then(async info => {
      const emails = JSONParser(_noti.emails || "[]");
      emails.push(timestamp());
      _noti.emails = JSON.stringify(emails);
      return models.adminNotification.save(_noti);
    })
    .then(adminNoti => {
      return {
        status: true,
        message: 'Email has been sent!',
      };
    });
}
