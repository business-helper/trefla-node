const express = require("express");
const appV1 = express();

// Routers
const authRouters = require('./routes/auth.routes');
const chatRouters = require('./routes/chat.routes');
const commentRouters = require('./routes/comment.routes');
const langRouters = require('./routes/lang.routes');
const notificationRouters = require('./routes/notification.routes');
const postRouters = require('./routes/post.routes');
const userRouters = require('./routes/user.routes');
// Resolvers
const { getInitData } = require('./resolvers');


appV1.use('/lang', langRouters);
appV1.use('/auth', authRouters);
appV1.use('/chat', chatRouters);
appV1.use('/comment', commentRouters);
appV1.use('/notification', notificationRouters);
appV1.use('/post', postRouters);
appV1.use('/user', userRouters);

appV1.post('/init-data', getInitData);

module.exports = appV1;
