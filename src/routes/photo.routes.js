const express = require("express");
const { Validator } = require("node-input-validator");
const photoRouters = express.Router();

const photoCtrl = require("../controllers/photo.controller");
const Photo = require('../models/photo.model');
const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require("../helpers/common.helpers");

// bearer authentication
photoRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

photoRouters.get('/:id', async (req, res) => {
  const validator = new Validator({
    id: req.params.id
  }, {
    id: "required|integer",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Photo.getById(provider.inputs.id)
    ]).then(([byId]) => {
      if (!byId) {
        provider.error("id", "custom", `Photo with id "${provider.inputs.id}" does not exists!`);
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
  .then(() => photoCtrl.getById(req, res))
  .catch((error) => respondValidateError(res, error));
})

photoRouters.get('/', async (req, res) => {
  return photoCtrl.getAllOfUser(req, res)
    .catch(error => respondValidateError(res, error));
});

photoRouters.post('/', async (req, res) => {

  const validator = new Validator({
    ...req.body 
  }, {
    url: "required"
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), {
          code: 400,
          details: validator.errors,
        });
      }
    })
    .then(() => photoCtrl.create(req, res))
    .catch(error => respondValidateError(res, error));
});

photoRouters.delete('/:id', async (req, res) => {
  const validator = new Validator({
    id: req.params.id
  }, {
    id: "required|integer",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Photo.getById(provider.inputs.id)
    ]).then(([byId]) => {
      if (!byId) {
        provider.error("id", "custom", `Photo with id "${provider.inputs.id}" does not exists!`);
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
  .then(() => photoCtrl.deleteById(req, res))
  .catch((error) => respondValidateError(res, error));
});

module.exports = photoRouters;
