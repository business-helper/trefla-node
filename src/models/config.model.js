const sql = require("./db");
const { timestamp, int2Bool } = require("../helpers/common.helpers");

const Config = function (config) {
  this.create_time = timestamp();
  this.update_time = timestamp();
};

Config.create = (config) => {
  config.id !== undefined ? delete config.id : null;
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO config SET ?", config, (err, res) => {
			err ? reject(err) : resolve({ ...config, id: res.insertId });
    });
  });
}

Config.save = async (config) => {
  config.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query("UPDATE config SET ? WHERE id=?", [config, config.id], (err, res) => {
      err ? reject(err) : resolve(Config.getById(config.id));
    });
  });
}

Config.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM config WHERE id=? LIMIT 1", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Config.get = () => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM config ORDER BY id ASC LIMIT 1", (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Config.output = (config) => {
  let delKeys = ['create_time', 'update_time'];

  // delete keys
  delKeys.forEach((key, i) => {
    if (config[key]) delete config[key];
  });
  return config;
}

module.exports = Config;
