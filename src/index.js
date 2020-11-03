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
app.use('/api/v1', appV1);

// Routers
const authRouters = require('./routes/auth.routes');
const langRouters = require('./routes/lang.routes');
const postRouters = require('./routes/post.routes');


// simple route
app.get("/health", (req, res) => {
	res.json({ status: true, message: "I'm healthy!" });
});

appV1.use('/lang', langRouters);
appV1.use('/auth', authRouters);
appV1.use('/post', postRouters);

// Handle 404 Path
app.use((req, res, next) => {
	res.status(404).json({
		status: false,
		message: `Can not process the request ${req.url}`
	});
})

http.listen(appConfig.port, () => `Server running on port ${appConfig.port}`);
