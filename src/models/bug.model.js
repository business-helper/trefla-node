const sql = require("./db");
const { JSONParser, timestamp, int2Bool } = require("../helpers/common.helpers");

const table = 'bugs';

const Bug = function (lang) {
  this.create_time = timestamp();
  this.update_time = timestamp();
};

Bug.create = (model) => {
  model.id !== undefined ? delete model.id : '';
  return new Promise((resolve, reject) => {
    sql.query(`INSERT INTO ${table} SET ?`, model, (err, res) => {
			err ? reject(err) : resolve({ ...model, id: res.insertId });
    });
  });
};

Bug.save = (model) => {
  model.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query(`UPDATE ${table} SET ? WHERE id=?`, [model, model.id], (err, res) => {
      err ? reject(err) : resolve(Bug.getById(model.id));
    });
  });
}

Bug.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} WHERE id=? LIMIT 1`, [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Bug.pagination = ({ limit = 20, page = 0, user_id = null, fixed = null, sort: { field, desc } }) => {
  limit = Number(limit);
  page = Number(page);

  const offset = limit * page;
  let where = [];
  if (user_id) {
    where.push(`user_id=${user_id}`);
  }
  if (fixed !== null) {
    where.push(`fixed = ${fixed}`);
  }

  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} ${strWhere} ORDER BY ${field || 'id'} ${desc ? 'DESC' : 'ASC'} LIMIT ? OFFSET ? `, [limit, offset], (err, res) => {
      err ? reject(err) : resolve(res);
    })
  });
}

Bug.getTotal = ({ user_id = null, fixed = null }) => {
  let where = [];
  if (user_id) {
    where.push(`user_id=${user_id}`);
  }
  if (fixed !== null) {
    where.push(`fixed=${fixed}`);
  }
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total FROM ${table} ${strWhere}`, [], (err, res) => {
      err ? reject(err) : resolve(res[0].total)
    })
  })
}

Bug.deleteById = async (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`DELETE FROM ${table} WHERE id=?`, [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows > 0);
    })
  });
}

Bug.output = (model) => {
  // JSON parse
  const delKeys = [];

  delKeys.forEach(key => {
    model[key] !== undefined ? delete model[key] : null;
  })
  return model;
}

module.exports = Bug;