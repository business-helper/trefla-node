const comment = require('./comment.model');
const commentLike = require('./commentLike.model');
const emailTemplate = require('./emailTemplate.model');
const language = require('./lang.model');
const notification = require('./notification.model');
const post = require('./post.model');
const postLike = require('./postLike.model');
const user = require('./user.model');
const chat = require('./chat.model');
const message = require('./message.model');

module.exports = {
  chat,
  comment,
  commentLike,
  emailTemplate,
  language,
  message,
  notification,
  post,
  postLike,
  user
};
