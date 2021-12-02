const sql = require('./db');
const { JSONParser, timestamp } = require('../helpers/common.helpers');

const table = 'admin_permissions';

const AdminPermission = function (lang) {
  this.create_time = timestamp();
  this.update_time = timestamp();
};

AdminPermission.create = (model) => {
  model.id !== undefined ? delete model.id : '';
  return new Promise((resolve, reject) => {
    sql.query(`INSERT INTO ${table} SET ?`, model, (err, res) => {
      err ? reject(err) : resolve({ ...model, id: res.insertId });
    });
  });
};

AdminPermission.save = (model) => {
  return new Promise((resolve, reject) => {
    sql.query(`UPDATE ${table} SET ? WHERE id=?`, [model, model.id], (err, res) => {
      err ? reject(err) : resolve(AdminPermission.getById(model.id));
    });
  });
};

AdminPermission.getById = async (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} WHERE id=?`, [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
};

AdminPermission.getByUserId = async (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} WHERE admin_id=?`, [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
};

AdminPermission.deleteById = async (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`DELETE FROM ${table} WHERE id=?`, [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows);
    });
  });
};

AdminPermission.deleteByUserId = async (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`DELETE FROM ${table} WHERE admin_id=?`, [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows);
    });
  });
};

AdminPermission.output = (model) => {
  // ['create_time', 'update_time'].map(key => delete model[key]);

  const noObjectKey = ['id', 'admin_id', 'create_time', 'update_time'];
  Object.keys(model).forEach((key) => {
    if (!noObjectKey.includes(key)) {
      model[key] = JSONParser(model[key]);
    }
  });
  return model;
};

module.exports = AdminPermission;
