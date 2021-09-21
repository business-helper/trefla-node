const express = require('express');
const { Validator } = require("node-input-validator");

const { BearerMiddleware } = require('../middlewares/basic.middleware');
const ctrls = require('../controllers');
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

module.exports = routes;
