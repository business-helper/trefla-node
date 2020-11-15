const admin = require('./admin.model');
const chat = require('./chat.model');
const comment = require('./comment.model');
const commentLike = require('./commentLike.model');
const config = require('./config.model');
const emailTemplate = require('./emailTemplate.model');
const language = require('./lang.model');
const message = require('./message.model');
const notification = require('./notification.model');
const photo = require('./photo.model');
const post = require('./post.model');
const postLike = require('./postLike.model');
const user = require('./user.model');


module.exports = {
  admin,
  chat,
  config,
  comment,
  commentLike,
  emailTemplate,
  language,
  message,
  notification,
  photo,
  post,
  postLike,
  user
};
