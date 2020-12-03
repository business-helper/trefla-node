const sql = require("./db");
const { timestamp } = require("../helpers/common.helpers");
const helpers = require("../helpers");
const NOTI_TYPES = require("../constants/notification.constant");

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
    sql.query(`UPDATE ${table} SET ? WHERE id=?`, [model, model.id], (err, res) => {
      err ? reject(err) : resolve(AdminNotification.getById(model.id));
    });
  });
}

AdminNotification.getById = async (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} WHERE id=? LIMIT 1`, [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  })
}

AdminNotification.transferRequest = async ({ id, from, to }) => {
  const where = [`type='${NOTI_TYPES.ADMIN_NOTI_TYPES.ID_TRANSFER}'`];
  if (id) where.push(`id=${id}`);
  if (from) where.push(`JSON_EXTRACT(payload, "$.from")=${from}`);
  if (to) where.push(`JSON_EXTRACT(payload, "$.to")=${to}`);

  const strWhere = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} ${strWhere}`, [], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  })
}

AdminNotification.pagination = async ({ page = 0, limit = 0 }) => {
  const where = [];
  const offset = page * limit;
  const limitOffset = limit ? ` LIMIT ${limit} OFFSET ${offset}` : '';

  const strWhere = where.length ? ` WHERE ${where.join(' AND ')}` : '';

  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} ${strWhere} ORDER BY id ${limitOffset}`, [], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  })
}

AdminNotification.total = async ({}) => {
  const where = [];
  const strWhere = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total FROM ${table} ${strWhere}`, [], (err, res) => {
      err ? reject(err) : resolve(res[0].total);
    });
  });
}

AdminNotification.deleteById = async (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`DELETE FROM ${table} WHERE id=?`, [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows);
    });
  })
}

AdminNotification.deleteTransferRequest = ({ id, from, to }) => {
  const where = [`type='${NOTI_TYPES.ADMIN_NOTI_TYPES.ID_TRANSFER}'`];
  if (id) where.push(`id=${id}`);
  if (from) where.push(`JSON_EXTRACT(payload, "$.from")=${from}`);
  if (to) where.push(`JSON_EXTRACT(payload, "$.to")=${to}`);

  const strWhere = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`DELETE FROM ${table} ${strWhere}`, [], (err, res) => {
      err ? reject(err) : resolve(res.affectdRows);
    });
  })
}

AdminNotification.output = (model) => {
  if (!model) return null;

  ['create_time', 'update_time'].map(key => delete model[key]);
  model.payload = helpers.common.JSONParser(model.payload);
  model.emails = helpers.common.JSONParser(model.emails);

  return model;
}



module.exports = AdminNotification;
