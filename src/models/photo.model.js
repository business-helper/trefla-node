const sql = require("./db");
const config = require('../config/app.config');
const { timestamp, photoHash } = require("../helpers/common.helpers");

const table = 'photos';

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
  })
  .then(photo => {
    photo.orderIdx = photo.id;
    return Photo.save(photo);
  });
};

Photo.save = async (model) => {
  model.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query(`UPDATE ${table} SET ? WHERE id=?`, [model, model.id], (err, res) => {
      err ? reject(err) : resolve(Photo.getById(model.id));
    });
  });
}

Photo.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM photos WHERE id=?", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Photo.getByUser = (user_id, types) => {
  const str = types.map((type) => `'${type}'`).join(',');
  const query = `SELECT * FROM photos WHERE user_id=${user_id} AND type in (${str})`; console.log('[Query]', query)
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM photos WHERE user_id=? AND type in (${str})`, [user_id], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

Photo.getUserGallery = (user_id, isPrivate = null) => {
  const galleryTypes = ['normal', 'video' ,'youtube','url'];
  const where = [
    `user_id=${user_id}`,
    `type IN ('${galleryTypes.join("','")}')`
  ];
  if (isPrivate !== null && [0, 1].includes(isPrivate)) {
    where.push(`private = ${isPrivate}`);
  }
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} ${strWhere} ORDER BY id DESC`, [], (err, res) => {
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
  const hash = photoHash(model);
  ['create_time', 'update_time'].map(key => delete model[key]);
  model.url_editable = `${config.domain}/images/${model.type || 'normal'}/${hash}`;
  return model;
}
module.exports = Photo;
