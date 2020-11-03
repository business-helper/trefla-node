const express = require("express");
const { Validator } = require("node-input-validator");
const postRouters = express.Router();

const postCtrl = require("../controllers/post.controller");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { respondValidateError } = require("../helpers/common.helpers");

// bearer authentication
postRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

postRouters.get('/:id', async (req, res) => {
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
  .then(() => postCtrl.getById(req, res))
  .catch((error) => respondValidateError(res, error));
})

postRouters.post("/pagination", async (req, res) => {
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
    .then(() => postCtrl.pagination(req, res))
    .catch((error) => respondValidateError(res, error));
});

postRouters.post("/", async (req, res) => {
  const validator = new Validator(req.body, {
    post_user_id: "required|integer",
    type: "required",
    feed: "required",
    post_name: "required",
    location_address: "required",
    location_coordinate: "required",
    city: "required",
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
    .then(() => postCtrl.create(req, res))
    .catch((error) => respondValidateError(res, error));
});

postRouters.patch('/:id', async (req, res) => {
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


module.exports = postRouters;
