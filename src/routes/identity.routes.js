const { v4: uuid } = require('uuid');
const express = require('express');
const { Validator } = require('node-input-validator');
const formidable = require('formidable');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');

const config = require('../config/app.config');
const ctrls = require('../controllers');
const models = require('../models');
const helpers = require('../helpers');
const { BearerMiddleware } = require('../middlewares/basic.middleware');

const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError, timestamp, photoHash } = require('../helpers/common.helpers');

const routes = express.Router();

// apply Bearer middleware.
routes.use((req, res, next) => BearerMiddleware(req, res, next));

routes.route('/upload').post(async (req, res) => ctrls.identity
  .uploadIdentityRequest(req, res)
  .catch(error => respondValidateError(res, error))
);


module.exports = routes;
