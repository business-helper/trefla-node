require("dotenv").config();

module.exports = {
  port: process.env.APP_PORT,
  ba_username: process.env.BASIC_USERNAME,
  ba_password: process.env.BASIC_PASSWORD,
  appSecret: process.env.APP_SECRET,
  domain: process.env.APP_DOMAIN,
  default_zones: (process.env.DEFAULT_ZONE || '').split(','),
};
