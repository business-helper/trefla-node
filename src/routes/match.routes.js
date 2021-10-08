const express = require('express');
const { Validator } = require("node-input-validator");

const { BearerMiddleware } = require('../middlewares/basic.middleware');
const ctrls = require('../controllers');
const models = require('../models');
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require('../helpers/common.helpers');


const routes = express.Router();

routes.route('/ping').get((req, res) => res.send('[Match] Pong!'));

// encapcule with bearer authentication.
routes.use((req, res, next) => BearerMiddleware(req, res, next));

routes.route('/area-users').post((req, res) => {
  const { uid: user_id } = getTokenInfo(req);

  return ctrls.match.getAreaUsers({
    user_id,
    last_id: req.body.last_id || 0,
    limit: req.body.limit,
  })
    .then(result => res.json({ status: true, message: 'success', data: result }))
    .catch(error => respondValidateError(res, error));
});

routes.route('/guess-list').post((req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(req.body, {
    match_id: "required",
  });

  return validator.check()
    .then(async matched => {
      if (!matched) throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors });
      const match = await models.Match.getById(req.body.match_id);
      if (!match) throw new Error('Not found the match!');
      if (match.user_id2 !== user_id) throw Object.assign(new Error('Permission denied!'), { code: 403, details: [] });
    })
    .then(() => ctrls.match.getGuessList({ user_id, ...req.body }))
    .then(result => res.json({ status: true, message: 'success', data: result }))
    .catch(error => respondValidateError(res, error));
});

routes.route('/like/:target_id').post((req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(req.params, {
    target_id: "required",
  });

  return validator.check()
    .then(async matched => {
      if (!matched) throw Object.assign(new Error('Invalid request'), { code: 400, details: validator.errors });
      const target_user = await models.user.getById(req.params.target_id);
      if (!target_user) throw new Error('Target user not found!');
    })
    .then(() => ctrls.match.likeUser({ my_id: user_id, target_id: Number(req.params.target_id) }))
    .then(result => res.json({ status: true, message: 'success', data: result }))
    .catch(error => respondValidateError(res, error));
});

routes.route('/dislike/:target_id').post((req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(req.params, {
    target_id: "required",
  });
  return validator.check()
    .then(async matched => {
      if (!matched) throw Object.assign(new Error('Invalid request'), { code: 400, details: validator.errors });
      const target_user = await models.user.getById(req.params.target_id);
      if (!target_user) throw new Error('Target user not found!');
    })
    .then(() => ctrls.match.dislikeUser({ my_id: user_id, target_id: Number(req.params.target_id) }))
    .then((result) => res.json({ status: true, message: 'success', data: result }))
    .catch(error => respondValidateError(res, error));
});

routes.route('/pass/:target_id').post((req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(req.params, {
    target_id: "required",
  });
  return validator.check()
    .then(async matched => {
      if (!matched) throw Object.assign(new Error('Invalid request'), { code: 400, details: validator.errors });
      const target_user = await models.user.getById(req.params.target_id);
      if (!target_user) throw new Error('Target user not found!');
    })
    .then(() => ctrls.match.passUser({ my_id: user_id, target_id: Number(req.params.target_id) }))
    .then((result) => res.json({ status: true, message: 'success', data: result }))
    .catch(error => respondValidateError(res, error));
});

routes.route('/').post((req, res) => {
  const { uid: user_id } = getTokenInfo(req);

  return ctrls.match.getMatchedUsers({
    user_id,
    last_id: req.body.last_id || 0,
    limit: req.body.limit,
  })
    .then(users => res.json({ status: true, message: 'success', data: users }))
    .catch(error => respondValidateError(res, error));
});

module.exports = routes;
