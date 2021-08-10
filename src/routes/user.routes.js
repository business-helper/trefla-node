const express = require("express");
const { Validator } = require("node-input-validator");
const userRouters = express.Router();
const os = require('os');

const ctrls = require("../controllers");
const models = require("../models");
const userCtrl = require("../controllers/user.controller");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require("../helpers/common.helpers");

userRouters.route('/test').post(async (req, res) => {
  return User.getBySocialPass(req.body.pass)
    .then(user => res.json(user))
    .catch(error => respondValidateError(res, error))
})

// bearer authentication
userRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});


userRouters.route('/block/:id').post(async (req, res) => {
  const { uid } = getTokenInfo(req);
  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required",
  })

  validator.addPostRule(provider => {
    return models.user.getById(provider.inputs.id)
      .then(user => {
        if (!user) provider.error('id', 'custom', 'User does not exist!');
      })
  })

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      const socketClient = req.app.locals.socketClient;
      return ctrls.user.blockUser({ fromId: Number(uid), toId: Number(req.params.id), socketClient });
    })
    .then(resl => res.json(resl))
    .catch(error => respondValidateError(res, error))
})

userRouters.route('/unblock/:id').post(async (req, res) => {
  const { uid } = getTokenInfo(req);
  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required",
  })

  validator.addPostRule(provider => {
    return Promise.all([
      models.user.getById(req.params.id),
      models.user.getById(uid),
    ])
      .then(([blockee, me]) => {
        const blackList = JSON.parse(me.black_list || '[]');
        if (!blockee) provider.error('id', 'custom', 'User does not exist!');
        else if (!blackList.includes(blockee.id)) {
          console.log('blackList', blackList)
          provider.error('id', 'custom', `You never blocked '${blockee.user_name}'`);
        }
      })
  })

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalida request!"), { code: 400, details: validator.errors });
      const socketClient = req.app.locals.socketClient;
      return userCtrl.unblockUser({ fromId: Number(uid), toId: Number(req.params.id), socketClient });
    })
    .then(resl => res.json(resl))
    .catch(error => respondValidateError(res, error));
})

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

userRouters.get('/card', async (req, res) => {
  const validator = new Validator(req.query, {
    limit: "required|integer",
    page: "required|integer",
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error("Invalida request!"), { code: 400, details: validators.errors });
      }
      return userCtrl.cardPagination(req, res)
    })
    .catch((error) => respondValidateError(res, error))

});

userRouters.get('/in-area-users', async (req, res) => {
  req.query.fake = 1;
  const validator = new Validator(req.query, {
    fake: "required",
  });

  return validator.check()
    .then((matched) => {
      if (!matched) {
        throw Object.assign(new Error('Invalid request!'), { code: 400, details: validators.errors });
      }
      return userCtrl.getUsersInMyArea(req, res);
    })
    .catch((error) => respondValidateError(res, error));
})

userRouters.get('/:id', async (req, res) => {
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

userRouters.post('/ban-reply', async (req, res) => {
  const validator = new Validator(req.body, {
    reply: "required",
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors });
      }
      return userCtrl.banReplyReq(req, res);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

/**
* @description verify a user with card
* @permission admin only
*/
userRouters.post('/verify/:id', async (req, res) => {
  const { role, uid: user_id } = getTokenInfo(req);
  // if (role !== 'ADMIN') return res.json({ status: true, message: 'Permission error!' });
  const socketClient = req.app.locals.socketClient;

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: 'required|integer',
  });

  validator.addPostRule(async (provider) => {
    Promise.all([
      User.getById(provider.inputs.id),
    ])
      .then(([ user ]) => {
        if (!user) {
          provider.error('id', 'custom', 'User does not exist!');
        } else if (user.card_verified === 1) {
          provider.error('user', 'custom', 'User is already verified!');
        }
      })
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      }
      return userCtrl.verifyUser({ user_id: Number(req.params.id), socketClient });
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

/**
 * @description unverify a user
 * @permission admin
 */
userRouters.post('/unverify/:id', async (req, res) => {
  const { role } = getTokenInfo(req);
  // if (role !== 'ADMIN') return res.json({ status: true, message: 'Permission error!' });

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: 'required|integer',
  });

  validator.addPostRule(async (provider) => {
    Promise.all([
      User.getById(provider.inputs.id),
    ])
      .then(([user]) => {
        if (!user) {
          provider.error('id', 'custom', 'User does not exist!');
        } else if (user.card_verified === 0) {
          provider.error('user', 'custom', 'User is already unverified!');
        }
      })
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      }
      return userCtrl.unverifyUserReq(req, res);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

userRouters.post('/transfer-request/reply', async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const socketClient = req.app.locals.socketClient;
  const validator = new Validator({
    ...req.body,
  }, {
    noti_id: "required|integer",
    accept: "required|boolean",
  });

  validator.addPostRule(provider => {
    return Promise.all([
      models.notification.getById(provider.inputs.noti_id),
    ])
      .then(([notification]) => {
        if (!notification) provider.error('noti_id', 'custom', 'Notification does not exist!');
      })
  })

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors });
      return userCtrl.replyToTransferRequest({ ...req.body, user_id, socketClient });
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

userRouters.post('/transfer-request', async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const socketClient = req.app.locals.socketClient;

  const validator = new Validator({
    ...req.body,
    user_id,
  }, {
    user_id: "required",
    card_number: "required|minLength:5",
  });

  validator.addPostRule(provider => {
    return models.user.getByCard(provider.inputs.card_number, 1)
      .then(([verifiedUser]) => {
        if (!verifiedUser) provider.error('card_number', 'custom', 'Card number is not verified!');
      })
  });

  return validator.check()
    .then(matched => {
      if (!matched) { throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors }); }
      return userCtrl.createIDTransferReq({ user_id, card_number: req.body.card_number, socketClient });
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

userRouters.post('/verify-request', async (req, res) => {
  return userCtrl.createVerifyIdReq(req, res)
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
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
        User.getById(id),
      ]).then(([userByEmail, me]) => {
        if (userByEmail && userByEmail.id !== id && userByEmail.login_mode === me.login_mode) {
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
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') {
    return res.json({
      status: false,
      message: 'Permission error!'
    })
  }
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
        provider.error("id", "custom", `User with id "${provider.inputs.id}" does not exist!`);
      }
    })
  );

  return validator.check()
  .then((matched) => {
    if (!matched) {
      throw Object.assign(new Error("Invalid request"), {
        code: 400,
        details: validator.errors,
      });
    }
  })
  .then(() => userCtrl.updateById(req, res))
  .catch((error) => respondValidateError(res, error));
})

userRouters.delete('/:id', async (req, res) => {
  const { role } = getTokenInfo(req);
  // if (role !== 'ADMIN') {
  //   return res.json({
  //     status: false,
  //     message: 'Permission Error!',
  //   });
  // }

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: 'required|integer',
  });

  validator.addPostRule(async (provider) => {
    Promise.all([
      User.getById(provider.inputs.id)
    ])
      .then(([userById]) => {
        if (!userById) {
          provider.error('id', 'custom', `User with id "${provider.inputs.id}" does not exist!`);
        }
      })
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error('Invalid request!'), { code: 400, details: validators.errors });
      }
    })
    .then(() => userCtrl.deleteByIdReq(req, res))
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});


module.exports = userRouters;
