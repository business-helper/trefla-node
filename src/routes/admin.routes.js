const express = require("express");
const { Validator } = require("node-input-validator");
const chatRouters = express.Router();

const ctrls = require("../controllers");
const models = require("../models");
const helpers = require("../helpers");
const middlewares = require("../middlewares/basic.middleware");

const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require("../helpers/common.helpers");

chatRouters.post('/login', async (req, res) => {

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
chatRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

chatRouters.get('/pending', async (req, res) => {
  console.log('[GET] /chat/pending');
  return adminCtrl.pendingChatrooms(req, res);
});

module.exports = chatRouters;
