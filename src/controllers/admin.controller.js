const { Validator } = require("node-input-validator");

const models = require("../models");
const helpers = require("../helpers");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { bool2Int, getTotalLikes, generateTZTimeString, respondError } = require("../helpers/common.helpers");
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
