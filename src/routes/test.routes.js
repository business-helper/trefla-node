const express = require("express");
const path = require('path');
const routes = express.Router();

const ctrls = require('../controllers');
const models = require('../models');

const { respondValidateError, SendAllMultiNotifications } = require("../helpers/common.helpers");

routes.get('/json-extract', (req, res) => {
  return models.chat.test_json_extract().then((rows) => {
    return res.json(rows)
  })
  .catch((error) => respondValidateError(res, error))
})

module.exports = routes;
