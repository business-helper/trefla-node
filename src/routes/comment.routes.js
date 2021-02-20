const express = require("express");
const { Validator } = require("node-input-validator");
const commentRouters = express.Router();

const commentCtrl = require("../controllers/comment.controller");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const Comment = require("../models/comment.model");
const models = require("../models");
const helpers = require("../helpers");
const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require("../helpers/common.helpers");
const { ADMIN_ROLE } = require('../constants/common.constant');

const activity = {
  checkAdminPermission: async (req, identifier) => {
    const { role, role2, uid } = getTokenInfo(req);
    
    if (role !== 'ADMIN') return false;
    if (role2 === ADMIN_ROLE.SUPER) return true;

    const permission = models.adminPermission.output(await models.adminPermission.getByUserId(uid));
    return activity.checkAllowed(permission, identifier);
  },
  checkAllowed: (permission, identifier = null) => {
    if (typeof identifier === 'boolean') return identifier;
    else if (identifier === null || identifier === '' || identifier === undefined) return true;
    
    const keys = identifier.split('.');
    if (keys.length === 1) return permission[keys[0]];
    else if (keys.length === 2) return permission[keys[0]][keys[1]];
    else if (keys.length === 3) return permission[keys[0]][keys[1]][keys[2]];
    else if (keys.length === 4) return permission[keys[0]][keys[1]][keys[2]][keys[3]];
    return false;
  },
};

// Bearer authentication
commentRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

commentRouters.get('/:id', async (req, res) => {
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
  .then(() => commentCtrl.getById(req, res))
  .catch((error) => respondValidateError(res, error));
})

/**
 * @secured by admin types
 */
commentRouters.get('/', async (req ,res) => {
  const permitted = await activity.checkAdminPermission(req, 'comment.show');
  if (!permitted) return res.status(403).json({ status: false, message: "Permission denied!" });

  const validator = new Validator(req.query, {
    limit: "required|integer",
    page: "required|integer",
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error("Validation Failed!"), { code: 400, details: validator.errors });
      }
    })
    .then(() => commentCtrl.simplePagination(req, res))
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

commentRouters.post("/pagination", async (req, res) => {
  const validator = new Validator(req.body, {
    // page: "required|integer",
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

commentRouters.post('/:id/toggle-like', async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { type } = req.body;
  const validator = new Validator({
    id: req.params.id,
    user_id,
    type
  }, {
    id: "required|integer",
    user_id: "required|integer",
    type: "required|integer|between:1,6"
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Comment.getById(provider.inputs.id),
      User.getById(provider.inputs.user_id),
    ]).then(([comment, user]) => {
      if (!comment) {
        provider.error(
          "id",
          "custom",
          `Comment with id "${provider.inputs.id}" does not exists!`
        );
      }
      if (!user) {
        provider.error(
          "id",
          "custom",
          `User with id "${provider.inputs.user_id}" does not exists!`
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
  .then(() => commentCtrl.toggleCommentLike(req, res))
  .catch((error) => respondValidateError(res, error));
})

commentRouters.post('/:id/like', async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { type } = req.body;
  const validator = new Validator({
    id: req.params.id,
    user_id,
    type
  }, {
    id: "required|integer",
    user_id: "required|integer",
    type: "required|integer|between:1,6"
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Comment.getById(provider.inputs.id),
      User.getById(provider.inputs.user_id),
    ]).then(([comment, user]) => {
      if (!comment) {
        provider.error(
          "id",
          "custom",
          `Target comment does not exist!`
        );
      }
      if (!user) {
        provider.error(
          "id",
          "custom",
          `User does not exist!`
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
  .then(() => commentCtrl.doLikeComment(req, res))
  .catch((error) => respondValidateError(res, error));
})

commentRouters.post('/:id/dislike', async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const { type } = req.body;
  const validator = new Validator({
    id: req.params.id,
    user_id,
    type
  }, {
    id: "required|integer",
    user_id: "required|integer",
    type: "required|integer|between:1,6"
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Comment.getById(provider.inputs.id),
      User.getById(provider.inputs.user_id),
    ]).then(([comment, user]) => {
      if (!comment) {
        provider.error(
          "id",
          "custom",
          `Target comment does not exist!`
        );
      }
      if (!user) {
        provider.error(
          "id",
          "custom",
          `User does not exist!`
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
  .then(() => commentCtrl.dislikeComment(req, res))
  .catch((error) => respondValidateError(res, error));
})

commentRouters.post("/", async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(
    {
      ...req.body,
      user_id
    }, 
    {
      user_id: "required|integer",
      type: "required",
      comment: "required",
      target_id: "required",
      isGuest: "required|integer",
      // time: "required",
    }
  );

  validator.addPostRule(async (provider) =>
    Promise.all([
      provider.inputs.type === 'POST' ? Post.getById(provider.inputs.target_id) : Comment.getById(provider.inputs.target_id)
    ]).then(([target]) => {
      if (!target) {
        provider.error(
          "target_id",
          "custom",
          `Target post or comment with id "${provider.inputs.target_id}" does not exist!`
        );
      } else if (target.type == 'COMMENT') {
        provider.error('target_id', 'custom', "This action is not allowed!");
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
    .then(() => commentCtrl.create(req, res))
    .catch((error) => respondValidateError(res, error));
});

commentRouters.patch("/:id", async (req, res) => {
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

commentRouters.delete("/:id", async (req, res) => {
  const { role } = getTokenInfo(req);
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator({
    id: req.params.id
  }, {
    id: "required|integer",
  });
  console.log('[Comment id]', req.params.id);
  validator.addPostRule(async (provider) =>
    Promise.all([
      Comment.getById(provider.inputs.id)
    ]).then(([commentById]) => {
      if (!commentById) {
        provider.error("id", "custom", `Comment does not exist!`);
      } else if (role !== 'ADMIN' && commentById.user_id !== user_id) {
        provider.error('id', 'custom', 'You cannot delete this comment!');
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


module.exports = commentRouters;
