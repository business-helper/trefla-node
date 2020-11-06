const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const appV1 = express();
const http = require('http').Server(app);

const appConfig = require('./config/app.config');

//  parse requests of content-type - application/json
app.use(bodyParser.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// Static assets
app.use(express.static('assets'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


const pageRouters = require('./routes/page.routes');
app.use('/page', pageRouters);

app.use('/api/v1', appV1);

// Routers
const authRouters = require('./routes/auth.routes');
const commentRouters = require('./routes/comment.routes');
const langRouters = require('./routes/lang.routes');
const notificationRouters = require('./routes/notification.routes');
const postRouters = require('./routes/post.routes');
const userRouters = require('./routes/user.routes');
// Resolvers
const { getInitData } = require('./resolvers');

// simple route
app.get("/health", (req, res) => {
	res.json({ status: true, message: "I'm healthy!" });
});

appV1.use('/lang', langRouters);
appV1.use('/auth', authRouters);
appV1.use('/comment', commentRouters);
appV1.use('/notification', notificationRouters);
appV1.use('/post', postRouters);
appV1.use('/user', userRouters);

appV1.post('/init-data', getInitData);

// Handle 404 Path
app.use((req, res, next) => {
	res.status(404).json({
		status: false,
		message: `Can not process the request ${req.url}`
	});
})



/////////////////////////////////////
//   Socket IO
//

const io = require('socket.io')(http);
// const socketClient = require('socket.io-client')(`http://localhost:${appConfig.port}`);
// app.locals.socketClient = socketClient;

io.on('connection', (socket) => {
  console.log('new connection', socket.id);

  socket.on('disconnect', () => {
    console.log('[disconnect]', socket.id);
  });

  socket.on('SMS_HEALTH', data => {
    console.log('[check health]', data);
    io.sockets.emit('STC_HEALTH', { ...data, message: "I'm healthy!" });
  });

})

http.listen(Number(appConfig.port), () => `Server running on port ${appConfig.port}`);
