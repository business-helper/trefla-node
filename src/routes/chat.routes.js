const express = require("express");
const { Validator } = require("node-input-validator");
const chatRouters = express.Router();

const chatCtrl = require("../controllers/chat.controller");
const Chat = require("../models/chat.model");
const User = require("../models/user.model");
const Message = require("../models/message.model");
const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require("../helpers/common.helpers");

// Bearer authentication
chatRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

chatRouters.get('/pending', async (req, res) => {
  return chatCtrl.pendingChatrooms(req, res);
});

chatRouters.get('/accepted', async (req, res) => {

});

chatRouters.get('/:id', async (req, res) => {
  const validator = new Validator({
    id: req.params.id
  }, {
    id: "required|integer",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Chat.getById(provider.inputs.id)
    ]).then(([chatById]) => {
      if (!chatById) {
        provider.error(
          "id",
          "custom",
          `Chatroom does not exists for the given id!`
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
  .then(() => chatCtrl.getById(req, res))
  .catch((error) => respondValidateError(res, error));
})

chatRouters.get('/', async (req,res) => {

});

chatRouters.post("/pagination", async (req, res) => {
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
    .then(() => commentCtrl.pagination(req, res))
    .catch((error) => respondValidateError(res, error));
});

/**
 * @endpoint /normal
 * @description creates a normal chat. with optional message
 * @param {*number} receiver_id
 * @param {?string} message
 */
chatRouters.post("/normal", async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(
    {
      ...req.body,
      user_id
    }, 
    {
      user_id: "required|integer",
      receiver_id: "required|integer",
    }
  );

  validator.addPostRule(async (provider) =>
    Promise.all([
      User.getById(provider.inputs.user_id),
      User.getById(provider.inputs.receiver_id),
      Chat.getByUserIds({ sender_id: user_id, receiver_id: provider.inputs.receiver_id })
    ])
    .then(([sender, receiver, chatrooms]) => {
      if (!sender) {
        provider.error('sender', 'custom', 'Sender does not exist!');
      }
      if (!receiver) {
        provider.error('receiver', 'custom', 'Receiver does not exist!');
      }
      if (chatrooms.length > 0) {
        provider.error('chatroom', 'custom', 'Chat room already exists between users!');
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
    .then(() => chatCtrl.create(req, res))
    .catch((error) => respondValidateError(res, error));
});

chatRouters.patch("/:id", async (req, res) => {
  const validator = new Validator({
    id: req.params.id,
    ...req.body
  }, {
    id: "required|integer",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Comment.getById(provider.inputs.id)
    ]).then(([commentById]) => {
      if (!commentById) {
        provider.error(
          "id",
          "custom",
          `Comment with id "${provider.inputs.id}" does not exists!`
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
  .then(() => commentCtrl.updateById(req, res))
  .catch((error) => respondValidateError(res, error));
});

chatRouters.delete("/:id", async (req, res) => {
  const validator = new Validator({
    id: req.params.id
  }, {
    id: "required|integer",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Comment.getById(provider.inputs.id)
    ]).then(([commentById]) => {
      if (!commentById) {
        provider.error(
          "id",
          "custom",
          `Comment does not exist!`
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
  .then(() => commentCtrl.deleteById(req, res))
  .catch((error) => respondValidateError(res, error));
});


module.exports = chatRouters;
