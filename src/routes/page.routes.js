const express = require("express");
const path = require('path');
const pageRouters = express.Router();
const { respondValidateError, SendAllMultiNotifications } = require("../helpers/common.helpers");
const token = "ckMzqbPvSYK8Ae10OcCTtH:APA91bGnPzM7kD5TENN7V0fuVv2X_Xl7ujrFew_EqY1FfO0uLW7haDfdNkUEIXY55G_RUeRoLzsMWBu827U11_AyeCi5j6chuzqCmDHwuDMUSejIydxOyWMy75QUj1d2i7_vM2nzMK1h";


pageRouters.get('/home', (req, res) => {
  res.render('index');
});

pageRouters.get('/login', (req, res) => {
  res.render('login');
});

pageRouters.route('/noti-test').post(async (req, res) => {
  const messages = [1].map(u => ({
    token,
    notification: {
      title: 'Tai posted in your area',
      body: 'Hey, I am testing push notification with profile avatar.' + (new Date().toLocaleTimeString()),
    },
    android: {
      notification: {
        image: 'http://149.202.193.217:3500/uploads/test.png'
      }
    },
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
