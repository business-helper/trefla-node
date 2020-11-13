const express = require("express");
const { Validator } = require("node-input-validator");
const notificationRouters = express.Router();

const notificationCtrl = require("../controllers/notification.controller");
const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require("../helpers/common.helpers");

// Bearer authentication
notificationRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

notificationRouters.get("/read", async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(
    {
      user_id
    },
    {
      user_id: "required|integer"
    }
  );

  validator.addPostRule(async (provider) => {
    User.getById(provider.inputs.user_id)
    .then(user => {
      if (!user) {
        provider.error('user', 'custom', 'User does not exist!')
      }
    })
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors });
      }
    })
    .then(() => notificationCtrl.markAllAsRead(req, res))
    .catch(error => respondValidateError(res, error));
});

notificationRouters.get("/:id/read", async (req, res) => {
  const validator = new Validator(
    {
      id: req.params.id,
    },
    {
      id: "required|integer",
    }
  );

  validator.addPostRule(async (provider) =>
    Promise.all([Notification.getById(provider.inputs.id)]).then(
      ([notiById]) => {
        if (!notiById) {
          provider.error("id", "custom", `Notification does not exist!`);
        }
      }
    )
  );

	return validator.check()
		.then(matched => {
			if (!matched) {
				throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors });
			}
		})
		.then(() => notificationCtrl.markAsRead(req, res))
		.catch((error) => respondValidateError(res, error));
		
});

notificationRouters.get("/:id", async (req, res) => {
  const validator = new Validator(
    {
      id: req.params.id,
    },
    {
      id: "required|integer",
    }
  );

  validator.addPostRule(async (provider) =>
    Promise.all([Notification.getById(provider.inputs.id)]).then(
      ([notiById]) => {
        if (!notiById) {
          provider.error(
            "id",
            "custom",
            `Notification with id "${provider.inputs.id}" does not exist!`
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
    .then(() => notificationCtrl.getById(req, res))
    .catch((error) => respondValidateError(res, error));
});

notificationRouters.post("/pagination", async (req, res) => {
  const validator = new Validator(req.body, {
    page: "required|integer",
    limit: "required|integer",
  });

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
    .then(() => notificationCtrl.pagination(req, res))
    .catch((error) => respondValidateError(res, error));
});

notificationRouters.post("/", async (req, res) => {
  const validator = new Validator(req.body, {
    sender_id: "required|integer",
    receiver_id: "required|integer",
    type: "required|integer",
    optional_val: "required",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      User.getById(provider.inputs.sender_id),
      User.getById(provider.inputs.receiver_id),
    ]).then(([sender, receiver]) => {
      if (!sender) {
        provider.error(
          "sender_id",
          "custom",
          `User with id "${provider.inputs.sender_id}" does not exists!`
        );
      }
      if (!receiver) {
        provider.error(
          "id",
          "custom",
          `User with id "${provider.inputs.receiver_id}" does not exists!`
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
    .then(() => notificationCtrl.create(req, res))
    .catch((error) => respondValidateError(res, error));
});

module.exports = notificationRouters;
