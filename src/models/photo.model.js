const sql = require('./db');
const config = require('../config/app.config');
const { timestamp, photoHash } = require('../helpers/common.helpers');
const { IPhoto } = require('../types');

const table = 'photos';

class Photo extends IPhoto {
  constructor(args) {
    super(args);
  }

  save() {
    const model = this.toDB();
    if (this.id === 0) {
      delete model.id;
      return new Promise((resolve, reject) => {
        sql.query(`INSERT INTO ${table} SET ?`, model, (err, res) => {
          err ? reject(err) : resolve({ id: res.insertId, ...model });
        });
      });
    } else {
      model.update_time = timestamp();
      return new Promise((resolve, reject) => {
        sql.query(`UPDATE ${table} SET ? where id=?`, [model, model.id], (err, res) => {
          err ? reject(err) : resolve(Post.getById(model.id));
        });
      });
    }
  }

  output() {
    const model = this.toJSON();
    const hash = photoHash(model);
    ['create_time', 'update_time'].map((key) => delete model[key]);
    model.url_editable = `${config.domain}/images/${model.type || 'normal'}/${hash}`;
    return model;
  }
}

Photo.create = (model) => {
  delete model.id;
  return new Promise((resolve, reject) => {
    sql.query('INSERT INTO photos SET ?', model, (err, res) => {
      err ? reject(err) : resolve({ id: res.insertId, ...model });
    });
  }).then((photo) => {
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
};

Photo.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query('SELECT * FROM photos WHERE id=?', [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
};

Photo.getByIds = (ids = []) => {
  const strIds = [...ids, '__'].map((id) => `'${id}'`).join(',');
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} WHERE id IN (${strIds}) ORDER BY orderIdx ASC`, [], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
};

Photo.getByUser = (user_id) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM photos WHERE user_id=? ORDER BY orderIdx ASC`, [user_id], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
};

Photo.getByUserAndTypes = (user_id, types = ['__']) => {
  const str = types.map((type) => `'${type}'`).join(',');
  // const query = `SELECT * FROM photos WHERE user_id=${user_id} AND type in (${str}) ORDER BY orderIdx`; console.log('[Query]', query)
  return new Promise((resolve, reject) => {
    sql.query(
      `SELECT * FROM photos WHERE user_id=? AND type in (${str}) ORDER BY orderIdx ASC`,
      [user_id],
      (err, res) => {
        err ? reject(err) : resolve(res);
      }
    );
  });
};

Photo.getUserGallery = (user_id, isPrivate = null) => {
  const galleryTypes = ['normal', 'video', 'youtube', 'url'];
  const where = [`user_id=${user_id}`, `type IN ('${galleryTypes.join("','")}')`];
  if (isPrivate !== null && [0, 1].includes(isPrivate)) {
    where.push(`private = ${isPrivate}`);
  }
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} ${strWhere} ORDER BY orderIdx DESC`, [], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
};

Photo.updateOrderIndex = ({ id, orderIdx, user_id = null }) => {
  const where = [`id = ${id}`];
  if (user_id) {
    where.push(`user_id = ${user_id}`);
  }
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`UPDATE ${table} SET orderIdx=? ${strWhere}`, [orderIdx], (err, res) => {
      err ? reject(err) : resolve(Photo.getById(id));
    });
  });
};

Photo.deleteById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query('DELETE FROM photos WHERE id=?', [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows > 0);
    });
  });
};

Photo.output = (model) => {
  const hash = photoHash(model);
  ['create_time', 'update_time'].map((key) => delete model[key]);
  model.url_editable = `${config.domain}/images/${model.type || 'normal'}/${hash}`;
  return model;
};

module.exports = Photo;
