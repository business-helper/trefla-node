const express = require("express");
const path = require('path');
const pageRouters = express.Router();
const { respondValidateError } = require("../helpers/common.helpers");


pageRouters.get('/home', (req, res) => {
  res.render('index');
});

pageRouters.get('/login', (req, res) => {
  res.render('login');
});

pageRouters.get('/', (req, res) => {
  // res.writeHead(200, {
  //   'Content-Type': 'text/html'
  // })
  // .sendFile(path.resolve('src/views/index.html'));
  res.render('login');
});

module.exports = pageRouters;
