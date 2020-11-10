const chat = require('./chat.controller');
const comment = require('./comment.controller');
const language = require('./lang.controller');
const notification = require('./notification.controller');
const post = require('./post.controller');
const postLike = require('./postLike.controller');
const user = require('./user.controller');

module.exports = {
  chat,
  comment,
  language,
  notification,
  post,
  postLike,
  user
};
