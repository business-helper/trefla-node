const express = require("express");
const bodyParser = require("body-parser");
const app = express();
// const cors = require('cors');
const appV1 = require('./appV1');
const http = require('http').Server(app);

const appConfig = require('./config/app.config');

//  parse requests of content-type - application/json
app.use(bodyParser.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// appV1.use(cors({
//   origin: '*',
//   optionsSuccessStatus: 200
// }));

// Static assets
app.use(express.static('assets'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

const pageRouters = require('./routes/page.routes');
app.use('/page', pageRouters);
app.use('/images', require('./routes/image.routes'));
app.use('/api/v1', appV1);


// simple route
app.get("/health", (req, res) => {
	res.json({ status: true, message: "I'm healthy!" });
});

app.get('/version', (req, res) => {
  return res.send('2021-07-20 11:26 AM');
})

// Handle 404 Path
app.use((req, res, next) => {
	res.status(404).json({
		status: false,
		message: `Can not process the request ${req.url}`
	});
});


const { bootstrapSocket } = require('./sockets');
const io = require('socket.io')(http);
// const socketClient = require('socket.io-client')(`http://localhost:${appConfig.port}`, {query: `token=INNER_CLIENT`});
// app.locals.socketClient = socketClient;
bootstrapSocket(io);

http.listen(Number(appConfig.port), () => `Server running on port ${appConfig.port}`);
