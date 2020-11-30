const { Validator } = require("node-input-validator");

const models = require("../models");
const helpers = require("../helpers");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { bool2Int, getTotalLikes, generateTZTimeString, JSONParser, respondError, timestamp } = require("../helpers/common.helpers");
const { generateAdminData, generateMessageData } = require('../helpers/model.helpers');

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
