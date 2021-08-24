const sql = require("./db");
const config = require('../config/app.config');
const { timestamp } = require("../helpers/common.helpers");

const table = 'point_transactions';

const PointTransaction = function (lang) {
  this.create_time = timestamp();
  this.update_time = timestamp();
};

PointTransaction.create = (model) => {
  delete model.id;
  return new Promise((resolve, reject) => {
    sql.query(`INSERT INTO ${table} SET ?`, model, (err, res) => {
			err ? reject(err) : resolve({ id: res.insertId, ...model });
    });
  });
};

PointTransaction.save = async (model) => {
  model.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query(`UPDATE ${table} SET ? WHERE id=?`, [model, model.id], (err, res) => {
      err ? reject(err) : resolve(PointTransaction.getById(model.id));
    });
  });
}

PointTransaction.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} WHERE id=?`, [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

PointTransaction.getByUser = (user_id, types) => {
  const str = types.map((type) => `'${type}'`).join(',');
  const query = `SELECT * FROM ${table} WHERE user_id=${user_id} AND type in (${str})`;
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} WHERE user_id=? AND type in (${str})`, [user_id], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

PointTransaction.deleteById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`DELETE FROM ${table} WHERE id=?`, [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows > 0);
    });
  })
}

PointTransaction.output = (model) => {
  ['create_time', 'update_time'].map(key => delete model[key]);
  return model;
}

module.exports = PointTransaction;
