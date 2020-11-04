const express = require("express");
const { Validator } = require("node-input-validator");
const authRouters = express.Router();
const userCtrl = require("../controllers/user.controller");
const User = require("../models/user.model");
const { basicMiddleware } = require("../middlewares/basic.middleware");
const { respondValidateError } = require("../helpers/common.helpers");

// basic authentication
authRouters.use((req, res, next) => {
  basicMiddleware(req, res, next);
});

authRouters.post("/register", async (req, res) => {
  // const { user_name, email, password, language, isGuest, guestName, location_address, location_coordinate, birthday, sex, avatarIndex, card_verified, card_number } = req.body;
  const validator = new Validator(req.body, {
    user_name: "required|minLength:4|maxLength:50",
    email: "required|email|minLength:5",
    password: "required|minLength:5|maxLength:50",
    device_token: "required",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      User.getByUserName(provider.inputs.user_name),
      User.getByEmail(provider.inputs.email),
    ]).then(([userByUserName, userByEmail]) => {
      if (userByUserName) {
        provider.error(
          "user_name",
          "custom",
          `User with user_name "${provider.inputs.user_name}" already exists!`
        );
      }
      if (userByEmail) {
        provider.error(
          "email",
          "custom",
          `User with email "${provider.inputs.email}" already exists!`
        );
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
  const validator = new Validator(req.body, {
    email_username: "required",
    password: "required|minLength:5|maxLength:50",
    device_token: "required"
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
    .then(() => userCtrl.login(req, res))
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

module.exports = authRouters;
