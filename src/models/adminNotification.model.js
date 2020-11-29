const sql = require("./db");
const { timestamp } = require("../helpers/common.helpers");


const table = 'admin_notifications';

const AdminNotification = function (lang) {
  this.create_time = timestamp();
  this.update_time = timestamp();
  this.table = 'admin_notifications';
};

AdminNotification.create = (model) => {
  model.id !== undefined ? delete model.id : '';
  return new Promise((resolve, reject) => {
    sql.query(`INSERT INTO ${table} SET ?`, model, (err, res) => {
			err ? reject(err) : resolve({ ...model, id: res.insertId });
    });
  });
};

AdminNotification.save = async (model) => {
  model.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query(`UPDATE ${this.table} SET ? WHERE id=?`, [model, model.id], (err, res) => {
      err ? reject(err) : resolve(AdminNotification.getById(model.id));
    });
  });
}

module.exports = AdminNotification;
