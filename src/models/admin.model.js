const sql = require("./db");
const { timestamp } = require("../helpers/common.helpers");
const { ADMIN_ROLE } = require('../constants/common.constant')

const table = 'admins';

const Admin = function (lang) {
  this.create_time = timestamp();
  this.update_time = timestamp();
};

Admin.create = (model) => {
  model.id !== undefined ? delete model.id : '';
  return new Promise((resolve, reject) => {
    sql.query(`INSERT INTO ${table} SET ?`, model, (err, res) => {
			err ? reject(err) : resolve({ ...model, id: res.insertId });
    });
  });
};

Admin.save = (model) => {
  return new Promise((resolve, reject) => {
    sql.query(`UPDATE ${table} SET ? WHERE id=?`, [model, model.id], (err, res) => {
      err ? reject(err): resolve(Admin.getById(model.id));
    });
  });
}

Admin.getByEmail = (email) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM admins WHERE email=?", [email], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Admin.getByUsername = (user_name) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM admins WHERE user_name=?", [user_name], (err, res) => {
      err ? reject(err): resolve(res[0]);
    });
  });
}

Admin.getById = async (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} WHERE id=?`, [id], (err, res) => {
      err ? reject(err): resolve(res[0]);
    });
  });
}

Admin.paginattion = async ({ page = 0, limit = 10 }) => {
  const skip = page * limit;
  const where = [];
  where.push(`role='${ADMIN_ROLE.ADMIN}'`);
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : "";
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} ${strWhere} ORDER BY id ASC LIMIT ? OFFSET ? `, [limit, skip], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

Admin.numberOfEmployees = async () => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total FROM ${table} WHERE role='${ADMIN_ROLE.ADMIN}'`, [], (err, res) => {
      err ? reject(err) : resolve(res[0].total);
    })
  })
}

Admin.deleteById = async (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`DELETE FROM ${table} WHERE id=?`, [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows);
    });
  })
}

Admin.output = (model) => {
  ['password'].map(key => delete model[key]);
  return model;
}

module.exports = Admin;
