const sql = require("./db");
const { timestamp } = require("../helpers/common.helpers");

const Photo = function (lang) {
  this.code = lang.code;
  this.name = lang.name;
  this.active = lang.active;
  this.create_time = timestamp();
  this.update_time = timestamp();
};

Photo.create = (model) => {
  delete model.id;
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO photos SET ?", model, (err, res) => {
			err ? reject(err) : resolve({ id: res.insertId, ...model });
    });
  });
};

Photo.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM photos WHERE id=?", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Photo.getByUser = (user_id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM photos WHERE user_id=?", [user_id], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

Photo.deleteById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("DELETE FROM photos WHERE id=?", [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows > 0);
    });
  })
}

Photo.output = (model) => {
  ['create_time', 'update_time'].map(key => delete model[key]);
  return model;
}
module.exports = Photo;
