const express = require("express");
const { Validator } = require("node-input-validator");
const adminRouters = express.Router();

const ctrls = require("../controllers");
const models = require("../models");
const helpers = require("../helpers");
const middlewares = require("../middlewares/basic.middleware");

const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require("../helpers/common.helpers");

adminRouters.post('/login', async (req, res) => {

  middlewares.basicMiddleware(req, res, () => {
    const validator = new Validator(req.body, {
      email_or_name: "required",
      password: "required|minLength:5"
    });

    return validator.check()
      .then(matched => {
        if (!matched) {
          throw Object.assign(new Error('Validation failed!'), { code: 400, details: validator.errors });
        }
        return ctrls.admin.loginReq(req, res);
      })
      .then((result) => {
        return res.json(result);
      })
      .catch(error => respondValidateError(res, error));
  })  
});

// Bearer authentication
adminRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

adminRouters.get('/firebase', async (req, res) => {
  console.log('[GET] /admin/firebase');
  return ctrls.firebase.test()
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

adminRouters.post('/send-notification', async (req, res) => {
  const { uid } = getTokenInfo(req);
  const { user_id, title, body } = req.body;

  const validator = new Validator(req.body, {
    user_id: "required",
    title: "required",
    body: "required",
  });

  validator.addPostRule(async provider => 
    Promise.all([
      models.user.getById(user_id),
    ])
      .then(([ user ]) => {
        if (!user) {
          provider.error('user_id', 'custom', 'User does not exist with the given id!');
        }
      })  
  );

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error('Invalid requset!'), { code: 400, details: validator.errors });
      }
      return ctrls.firebase.sendNotification2UserReq({ user_id, title, body });
    })
    .then(() => res.json({ status: true, message: 'Notification has been sent!' }))
    .catch(error => respondValidateError(res, error));
});

adminRouters.post('/bulk-notifications', async (req, res) => {
  const { uid, role } = getTokenInfo(req);
  const { user_ids, title, body } = req.body;

  const validator = new Validator(req.body, {
    user_ids: "required",
    title: "required",
    body: "required",
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error('Invalid requset!'), { code: 400, details: validator.errors });
      }
      return ctrls.firebase.sendBulkNotificationReq({ user_ids, title, body });
    })
    .then(() => res.json({ status: true, message: 'Notifications have been sent!' }))
    .catch(error => respondValidateError(res, error));
});


module.exports = adminRouters;
