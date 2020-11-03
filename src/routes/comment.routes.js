const express = require("express");
const { Validator } = require("node-input-validator");
const commentRouters = express.Router();

const commentCtrl = require("../controllers/comment.controller");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const Comment = require("../models/comment.model");
const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { respondValidateError } = require("../helpers/common.helpers");

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

commentRouters.post("/pagination", async (req, res) => {
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

commentRouters.post("/", async (req, res) => {
  const validator = new Validator(req.body, {
    user_id: "required|integer",
    type: "required",
    comment: "required",
    target_id: "required",
    isGuest: "required|boolean",
    time: "required",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      provider.inputs.type === 'POST' ? Post.getById(provider.inputs.target_id) : Comment.getById(provider.inputs.target_id)
    ]).then(([target]) => {
      if (!target) {
        provider.error(
          "id",
          "custom",
          `Targte post or comment with id "${provider.inputs.target_id}" does not exists!`
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
    .then(() => commentCtrl.create(req, res))
    .catch((error) => respondValidateError(res, error));
});


module.exports = commentRouters;
