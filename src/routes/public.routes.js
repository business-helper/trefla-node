const express = require('express');
const { Validator } = require("node-input-validator");
const { basicMiddleware } = require('../middlewares/basic.middleware');
const { respondValidateError } = require("../helpers/common.helpers");
const models = require('../models');

const routes = express.Router();

// basic authentication
// authRouters.use((req, res, next) => {
//   basicMiddleware(req, res, next);
// });

routes.route('/profile/:username').get(async (req, res) => {
  const { username } = req.params
  const niv = new Validator(req.params, {
    username: "required",
  });

  let foundUser;
  niv.addPostRule(provider => models.user.getByUserName(username).then((user) => {
    if (!user) {
      provider.error('username', 'custom', "User not found with the given username!");
    }
    foundUser = user;
  }));

  return niv.check()
    .then((matched) => {
      if (!matched) throw Object.assign(new Error('Invalid request!'), {
        code: 400,
        details: niv.errors,
      });
      return Promise.all([
        models.user.getByUserName(username),
        models.photo.getByUser(foundUser.id, ['normal', 'youtube']),
      ]);
    })
    .then(([user, photos]) => {
      return res.json({
        status: true,
        message: "success",
        data: {
          user: models.user.output(user, 'PUBLIC'),
          photos: photos.map(photo => models.photo.output(photo)),
        },
      });
    })
    .catch((error) => respondValidateError(res, error));
});

module.exports = routes;
