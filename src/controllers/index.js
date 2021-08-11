const admin = require('./admin.controller');
const chat = require('./chat.controller');
const comment = require('./comment.controller');
const firebase = require('./firebase.controller');
const identity = require('./identity.controller');
const language = require('./lang.controller');
const notification = require('./notification.controller');
const photo = require('./photo.controller');
const post = require('./post.controller');
const postLike = require('./postLike.controller');
const report = require('./report.controller');
const user = require('./user.controller');

module.exports = {
  admin,
  chat,
  comment,
  firebase,
  identity,
  language,
  notification,
  photo,
  post,
  postLike,
  report,
  user
};
