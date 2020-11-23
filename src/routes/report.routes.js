const express = require("express");
const { Validator } = require("node-input-validator");
const reportRouters = express.Router();

const ctrls = require('../controllers/index');
const models = require('../models/index');

const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require("../helpers/common.helpers");

reportRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

reportRouters.get('/:id', async (req, res) => {
  const validator = new Validator({
    id: req.params.id
  }, {
    id: 'required'
  });

  return validator.check()
    .then(matched => {
      if (!matched) { throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors })};
      return ctrls.report.getById(req.params.id);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

reportRouters.get('/', async (req, res) => {

});

reportRouters.post('/', async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);

  const validator = new Validator(req.body, {
    reason: "required",
    type: "required",
    target_id: "required|integer",
  });

  const TargetModel = req.body.type === 'COMMENT' ? models.comment : models.post;

  validator.addPostRule(async provider => {
    await Promise.all([
      TargetModel.getById(provider.inputs.target_id),
    ])
      .then(([target]) => {
        if (!target) {
          provider.error('target_id', 'custom', 'Target does not exist!');
        }
      })
  });

  return validator.check()
    .then(matched => {
      if (!matched) { throw Object.assign(new Error('INvalid request!'), { code: 400, details: validator.errors}); }
      return ctrls.report.createReq(req, res);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

reportRouters.patch('/:id', async (req, res) => {
  const validator = new Validator({
    id: req.params.id,
    ...req.body,
  }, {
    id: 'required',
    reason: "required"
  });

  return validator.check()
    .then(matched => {
      if (!matched) { throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors}); }
      return ctrls.report.updateById(req.params.id, req.body);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

reportRouters.delete('/:id', async (req, res) => {

});

module.exports = reportRouters;
