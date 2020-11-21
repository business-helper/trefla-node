const express = require("express");
const { Validator } = require("node-input-validator");
const userRouters = express.Router();
const os = require('os');

const userCtrl = require("../controllers/user.controller");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require("../helpers/common.helpers");

// bearer authentication
userRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});


userRouters.get('/me', async (req, res) => {
  const { uid } = getTokenInfo(req);
  const validator = new Validator({
    id: uid
  }, {
    id: "required|integer",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      User.getById(provider.inputs.id)
    ]).then(([userById]) => {
      if (!userById) {
        provider.error(
          "id",
          "custom",
          `User does not exists!`
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
  .then(() => userCtrl.getProfile(req, res))
  .catch((error) => respondValidateError(res, error));
})

userRouters.get('/:id', async (req, res) => {
  console.log('[Home dir]', os.homedir());
  const validator = new Validator({
    id: req.params.id
  }, {
    id: "required|integer",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      User.getById(provider.inputs.id)
    ]).then(([userById]) => {
      if (!userById) {
        provider.error(
          "id",
          "custom",
          `User with id "${provider.inputs.id}" does not exists!`
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
  .then(() => userCtrl.getById(req, res))
  .catch((error) => respondValidateError(res, error));
})

userRouters.get('/', async (req, res) => {
  const validator = new Validator(req.query, {
    limit: 'required|integer',
    page: "required|integer",
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), {
          code: 400,
          details: validator.errors,
        });
      }
      return userCtrl.pagination(req, res);
    })
    .catch((error) => respondValidateError(res, error));
});


userRouters.post('/', async (req, res) => {
  userCtrl.pagination(req, res)
  .catch(error => respondValidateError(res, error));
});

userRouters.patch('/me', async (req, res) => {
  const { uid: id } = getTokenInfo(req);
  const validator = new Validator({
    id
  }, {
    id: "required|integer",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      User.getById(provider.inputs.id)
    ]).then(([userById]) => {
      if (!userById) {
        provider.error(
          "id",
          "custom",
          `User with id "${provider.inputs.id}" does not exists!`
        );
      }
    })
  );

  if (req.body.email) {
    validator.addPostRule(async (provider) =>
      Promise.all([
        User.getByEmail(req.body.email),
      ]).then(([userByEmail]) => {
        if (userByEmail && userByEmail.id !== id) {
          provider.error(
            "id",
            "custom",
            `Email already exists with other account!`
          );
        }
      })
    );
  }

  if (req.body.user_name) {
    validator.addPostRule(async (provider) =>
      Promise.all([
        User.getByUserName(req.body.user_name),
      ]).then(([user]) => {
        if (user && user.id !== id) {
          provider.error(
            "id",
            "custom",
            `User name already exists with other account!`
          );
        }
      })
    );
  }

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
  .then(() => userCtrl.updateProfile(req, res))
  .catch((error) => respondValidateError(res, error));
})

userRouters.patch('/:id', async (req, res) => {
  const validator = new Validator({
    id: req.params.id
  }, {
    id: "required|integer",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Post.getById(provider.inputs.id)
    ]).then(([postById]) => {
      if (!postById) {
        provider.error(
          "id",
          "custom",
          `Post with id "${provider.inputs.id}" does not exists!`
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
  .then(() => postCtrl.updateById(req, res))
  .catch((error) => respondValidateError(res, error));
})



module.exports = userRouters;
