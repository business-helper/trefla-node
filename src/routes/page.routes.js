const express = require("express");
const path = require('path');
const pageRouters = express.Router();
const { respondValidateError, SendAllMultiNotifications } = require("../helpers/common.helpers");
const token = "fWx5_7tSQhyhv0Q5DMQUOh:APA91bEVhz36gwwRijKFkTsYXbAiFM1ZHuifYrTA3iQKmWa-kBbpuF9kTrGjlnANlR0fR4YSutNdm1lcNraWl2V_UMSGhRkwk7LFm1h5cHuDBUDDYi3Gw-yDCwoCxaoyCcaHb8XH0QUa";


pageRouters.get('/home', (req, res) => {
  res.render('index');
});

pageRouters.get('/login', (req, res) => {
  res.render('login');
});

pageRouters.route('/noti-test').post(async (req, res) => {
  // const {title, body, image} = req.body;
  const messages = [1].map(u => ({
    token,
    notification: {
      title: 'Guest posted in your area',
      body: 'Hey, I am testing push notification with profile avatar.' + (new Date().toLocaleTimeString()),
      image: "http://149.202.193.217:3500/img/avatar/boy/2.png"
    },
    // android: {
    //   notification: {
    //     // image: 'http://149.202.193.217:3500/img/avatar/boy/1.png'
    //   }
    // },
  }));
  const result = await SendAllMultiNotifications(messages);
  res.json(result);
})

pageRouters.get('/', (req, res) => {
  // res.writeHead(200, {
  //   'Content-Type': 'text/html'
  // })
  // .sendFile(path.resolve('src/views/index.html'));
  res.render('login');
});

module.exports = pageRouters;
