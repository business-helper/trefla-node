const { ba_username, ba_password } = require('../config/app.config');
const { parseToken } = require('../helpers/auth.helpers');
const User = require('../models/user.model');
const Admin = require('../models/admin.model');

const basicMiddleware = (req, res, next) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const strauth = Buffer.from(b64auth, 'base64').toString();
  const splitIndex = strauth.indexOf(':');
  const username = strauth.substring(0, splitIndex).trim();
  const password = strauth.substring(splitIndex + 1).trim();

  if (username === ba_username && password === ba_password) {
    next();
  } else {
    res.status(401).json({
      status: false,
      message: 'Authentication error!',
      details: 'Basic authorization failed!'
    });
  }
};

const BearerMiddleware = (req, res, next) => {
  const bauth = (req.headers.authorization || '').split(' ')[1] || '';
  
  Promise.all([
    parseToken(bauth)
  ])
    .then(([tokenInfo]) => {
      if (!tokenInfo) {
        throw Object.assign(new Error('Invalid token'), { code: 400 });
      }
      return Promise.all([
        User.getByEmail(tokenInfo.email),
        Admin.getByEmail(tokenInfo.email),
      ]);
    })
    .then(([user, admin]) => {
      if (user || admin) {
        next();
      } else {
        throw Object.assign(new Error('User for token does not exist!'), { code: 400 });
      }
    })
    .catch(error => res.status(401).json({
      status: false,
      message: 'Authentication error!',
      details: error.message
    }));
}

const adminMiddleware = (req, res, next) => {

}

module.exports = {
  basicMiddleware,
  BearerMiddleware
}
