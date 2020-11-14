const chat = require('./chat.controller');
const comment = require('./comment.controller');
const language = require('./lang.controller');
const notification = require('./notification.controller');
const photo = require('./photo.controller');
const post = require('./post.controller');
const postLike = require('./postLike.controller');
const user = require('./user.controller');

module.exports = {
  chat,
  comment,
  language,
  notification,
  photo,
  post,
  postLike,
  user
};
