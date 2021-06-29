const express = require("express");
const appV1 = express();
const cors = require('cors');

const appConfig = require('./config/app.config');

// Routers
const adminRouters = require('./routes/admin.routes');
const authRouters = require('./routes/auth.routes');
const bugRouters = require('./routes/bug.routes');
const chatRouters = require('./routes/chat.routes');
const commentRouters = require('./routes/comment.routes');
const langRouters = require('./routes/lang.routes');
const notificationRouters = require('./routes/notification.routes');
const photoRouters = require('./routes/photo.routes');
const postRouters = require('./routes/post.routes');
const reportRouters = require('./routes/report.routes');
const userRouters = require('./routes/user.routes');
// Resolvers
const { getInitData } = require('./resolvers');

appV1.use(cors({
  origin: '*',
  optionsSuccessStatus: 200
}));

appV1.use('/test', require('./routes/test.routes'))

appV1.use('/admin', adminRouters);
appV1.use('/lang', langRouters);
appV1.use('/auth', authRouters);
appV1.use('/bug', bugRouters);
appV1.use('/chat', chatRouters);
appV1.use('/comment', commentRouters);
appV1.use('/notification', notificationRouters);
appV1.use('/photo', photoRouters);
appV1.use('/post', postRouters);
appV1.use('/report', reportRouters);
appV1.use('/user', userRouters);

appV1.post('/init-data', getInitData);

const socketClient = require('socket.io-client')(`http://localhost:${appConfig.port}`, {query: `token=INNER_CLIENT`});
appV1.locals.socketClient = socketClient;

module.exports = appV1;
