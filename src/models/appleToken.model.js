const sql = require("./db");
const { timestamp } = require("../helpers/common.helpers");
const config = require('../config/app.config');

const table = 'apple_tokens';

const AppleToken = function (lang) {
  this.create_time = timestamp();
  this.update_time = timestamp();
};

AppleToken.create = (data) => {
  return new Promise((resolve, reject) => {
    sql.query(`INSERT INTO ${table} SET ?`, data, (err, res) => {
			err ? reject(err) : resolve({ id: res.insertId, ...data });
    });
  });
};

AppleToken.save = async (updateData) => {
  updateData.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query(`UPDATE ${table} SET ? WHERE id=?`, [updateData, updateData.id], (err, res) => {
      err ? reject(err) : resolve(AppleToken.getById(updateData.id));
    });
  });
}

AppleToken.getAll = () => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table}`, (err, res) => {
			err ? reject(err) : resolve(res);
    });
  });
};

AppleToken.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} WHERE id=? LIMIT 1`, [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

AppleToken.getByToken = (token) => {
	return new Promise((resolve, reject) => {
		sql.query(`SELECT * FROM ${table} WHERE token=? LIMIT 1`, [token], (err, res) => {
			err ? reject(err) : resolve(res[0]);
		});
	})
}

AppleToken.getByName = (name) => {
	return new Promise((resolve, reject) => {
		sql.query(`SELECT * FROM ${table} WHERE name=? LIMIT 1`, [name], (err, res) => {
			err ? reject(err) : resolve(res[0]);
		});
	});
}

AppleToken.deleteById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`DELETE FROM ${table} WHERE id=?`, [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows);
    });
  })
}

AppleToken.output = (model) => {
  return model;
}

module.exports = AppleToken;
