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
  console.log('[GET] /chat/pending');
  return chatCtrl.pendingChatrooms(req, res);
});

chatRouters.get('/accepted', async (req, res) => {
  return chatCtrl.availableChatrooms(req, res);
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
  const { uid: user_id } = getTokenInfo(req);

  return chatCtrl.getAllChatsOfUser(user_id)
    .then(chats => res.json(chats))
    .catch(error => respondValidateError(res, error));
});

chatRouters.post("/pagination", async (req, res) => {
  const validator = new Validator(req.body, {
    page: "required|integer",
    limit: "required|integer",
  });

  return validator.check()
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

chatRouters.post('/:id/messages', async (req, res) => {
  const { uid } = getTokenInfo(req);
  const validator = new Validator({
    ...req.body,
    chat_id: req.params.id,
  }, {
    chat_id: "required|integer",
    limit: "required|integer"
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Chat.getById(provider.inputs.chat_id)
    ]).then(([chatById]) => {
      if (!chatById) {
        provider.error( "id", "custom", `Chatroom does not exists for the given id!` );
      }
    })
  );

  return validator
    .check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), {
          code: 400,
          details: validator.errors,
        });
      }
    })
    .then(() => chatCtrl.loadMessageReq({
      myId: uid,
      chat_id: req.params.id,
      last_id: req.body.last_id || null,
      limit: req.body.limit
    }))
    .then(({ messages, minId, total }) => {
      res.json({
        status: true,
        message: 'success',
        data: messages,
        pager: {
          limit: req.body.limit, 
          last_id: messages.length ? messages[messages.length - 1].id : 0,
        },
        hasMore: (messages.length > 0 && messages[messages.length - 1].id > minId) ? 1 : 0,
        total,
      })
    })
    .catch(error => respondValidateError(res, error));
})

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
  const socketClient = req.app.locals.socketClient;

  const { uid } = getTokenInfo(req);
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
          `Chat does not exist!`
        );
      } else {
        const user_ids = JSON.parse(chatById.user_ids);
        if (!user_ids.includes(uid)) {
          provider.error('id', 'custom', "You are not a member of this chat room!");
        }
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
    return chatCtrl.deleteByIdReq({ id: req.params.id, user_id: uid, socketClient });
  })
  .then(deleted => {
    return res.json({
      status: true,
      message: 'Chat has been deleted'
    });
  })
  // .then(() => chatCtrl.deleteById(req, res))
  .catch((error) => respondValidateError(res, error));
});

chatRouters.delete('/:id/:last_msg_id', async (req, res) => {
  const socketClient = req.app.locals.socketClient;
  const { uid } = getTokenInfo(req);
  const validator = new Validator({
    id: req.params.id,
    last_msg_id: req.params.last_msg_id,
  }, {
    id: "required|integer",
    last_msg_id: "required",
  });

  return validator.check()
    .then((matched) => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), {
          code: 400,
          details: validator.errors,
        });
      }
      return chatCtrl.deleteMessagesInChat({ ...req.params, socketClient, user_id: uid });
    })
    .then(() => res.json({
      status: true,
      message: 'success',
    }))
    .catch((error) => respondValidateError(res, error));
});

module.exports = chatRouters;
