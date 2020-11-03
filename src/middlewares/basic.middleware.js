const { ba_username, ba_password } = require('../config/app.config');

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

module.exports = {
  basicMiddleware
}
