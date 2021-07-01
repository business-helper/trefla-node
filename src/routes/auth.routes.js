const express = require("express");
const { Validator } = require("node-input-validator");
const authRouters = express.Router();
const userCtrl = require("../controllers/user.controller");
const User = require("../models/user.model");
const AppleToken = require("../models/appleToken.model");
const { basicMiddleware } = require("../middlewares/basic.middleware");
const { respondValidateError } = require("../helpers/common.helpers");
const { generatePassword } = require("../helpers/auth.helpers");
const { generateAppleToken } = require("../helpers/model.helpers");
const { LOGIN_MODE } = require('../constants/common.constant');

// basic authentication
authRouters.use((req, res, next) => {
  basicMiddleware(req, res, next);
});


const activity = {
  generateUsername: async ({ email, user }) => {

  },
};

authRouters.post("/register", async (req, res) => {
  // const { user_name, email, password, language, isGuest, guestName, location_address, location_coordinate, birthday, sex, avatarIndex, card_verified, card_number } = req.body;

  if (!req.body.user_name) {
    req.body.user_name = await userCtrl.generateUsername(req.body.email);
  }

  const validator = new Validator({...req.body}, {
    user_name: "required|minLength:4|maxLength:50",
    email: "required|email|minLength:5",
    password: "required|minLength:5|maxLength:50",
    device_token: "required",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      User.getByUserName(provider.inputs.user_name),
      // User.duplicatedByEmailSocial(provider.inputs.email, req.body.login_mode),
      User.getByEmail(provider.inputs.email),
    ]).then(([userByUserName, duplicated]) => {
      if (userByUserName) {
        provider.error("user_name", "custom", `User with user_name "${provider.inputs.user_name}" already exist!`);
      }
      if (duplicated) {
        provider.error("email", "custom", `Account already exists with the email!`);
      }
    })
  );

  return validator
    .check()
    .then((matched) => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), {
          code: 400,
          details: validator.errors,
        });
      }
    })
    .then(() => userCtrl.register(req, res))
    .catch((error) => respondValidateError(res, error));
});

authRouters.post("/login", async (req, res) => {
  req.body.login_mode = req.body.login_mode || LOGIN_MODE.NORMAL;
  const validator = new Validator(req.body, {
    email_username: "required",
    password: "required|minLength:5|maxLength:50",
    login_mode: "required",
    // device_token: "required"
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      User.getByEmail(provider.inputs.email_username),
      User.getByUserName(provider.inputs.email_username)
    ]).then(
      ([userByEmail, userByName]) => {
        if (!userByEmail && !userByName) {
          provider.error(
            "email_username",
            "custom",
            `Account does not exist!`
          );
        }
        if (!Object.keys(LOGIN_MODE).includes(req.body.login_mode)) {
          provider.error('login_mode', 'custom', 'Invalid login mode!');
        }
      }
    )
  );

  return validator
    .check()
    .then((matched) => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), { code: 400, details: validator.errors });
      }
    })
    .then(async () => {
      return userCtrl.login(req, res);
    })
    .catch((error) => respondValidateError(res, error));
});

authRouters.post("/forgot_password", async (req, res) => {
  const validator = new Validator(req.body, {
    email: "required|email|minLength:5",
    // user_id: "required|integer",
    code: "required",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([User.getByEmail(provider.inputs.email)]).then(
      ([userByEmail]) => {
        if (!userByEmail) {
          provider.error(
            "email",
            "custom",
            `User does not exist with the given email!`
          );
        }
      }
    )
  );

  return validator
    .check()
    .then((matched) => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), {
          code: 400,
          details: validator.errors,
        });
      }
    })
    .then(() => userCtrl.forgotPassword(req, res))
    .catch((error) => respondValidateError(res, error));
});

authRouters.post("/reset_password", async (req, res) => {
  const validator = new Validator(req.body, {
    email: "required|email|minLength:5",
    password: "required|minLength:5|maxLength:50",
    code: "required",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([User.getByEmail(provider.inputs.email)]).then(
      ([userByEmail]) => {
        if (!userByEmail) {
          provider.error("email", "custom", `User does not exist with the given email!`);
        }
      }
    )
  );

  return validator
    .check()
    .then((matched) => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), {
          code: 400,
          details: validator.errors,
        });
      }
    })
    .then(() => userCtrl.resetPassword(req, res))
    .catch((error) => respondValidateError(res, error));
});

authRouters.post('/gen-password', async (req, res) => {
  const { password } = req.body;
  return generatePassword(password)
    .then(pass => res.json({ status: true, password: pass }))
    .catch(error => respondValidateError(res, error));
});

authRouters.post('/apple-token', async (req, res) => {
  const { token, email, name } = req.body;
  return AppleToken.getByToken(token).then((row) => {
    if (row) return res.json({
      status: true,
      message: 'exists',
      data: row,
    });

    // add new
    const tokenData = generateAppleToken({ token, email, name });
    return AppleToken.create(tokenData).then((tokenRow) => res.json({
      status: true,
      message: 'created',
      data: tokenRow,
    }));
  })
  .catch((error) => respondValidateError(res, error));
});

module.exports = authRouters;
