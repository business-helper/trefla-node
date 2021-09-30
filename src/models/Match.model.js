const sql = require('./db');
const { IMatch } = require('../types');
const { GALLERY_TYPE } = require('../constants/common.constant');
const { timestamp } = require('../helpers/common.helpers');

const table = 'matches';

class Match extends IMatch {
  constructor(args) {
    super(args);
  }

  save() {
    const model = this.toDB();
    if (this.id === 0) {
      delete model.id;
      return new Promise((resolve, reject) => {
        sql.query(`INSERT INTO ${Match.table()} SET ?`, model, (err, res) => {
          err ? reject(err) : resolve({ id: res.insertId, ...model });
        });
      });
    } else {
      model.update_time = timestamp();
      return new Promise((resolve, reject) => {
        sql.query(`UPDATE ${Match.table()} SET ? WHERE id=?`, [model, model.id], (err, res) => {
          err ? reject(err) : resolve(Match.getById(model.id));
        });
      });
    }
  }
}

Match.table = () => {
  return 'matches';
}

Match.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${Match.table()} WHERE id=?`, [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Match.getByUserIds = (user_id1, user_id2) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${Match.table()} WHERE user_id1=? AND user_id2=?`, [user_id1, user_id2], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Match.recentMatches = (user_id, timeAfter) => {
  const galleryTypes = Object.values(GALLERY_TYPE);
  const str_galleryTypes = `'${galleryTypes.join("','")}'`;
  
  return new Promise((resolve, reject) => {
    sql.query(`
      SELECT * FROM ${Match.table()} WHERE user_id1=? AND matches.update_time >= ?`, [user_id, timeAfter], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

Match.getMatches = ({ user_id, last_id, limit }) => {
  const table = Match.table();

  const where = [
    `${table}.user_id1=${user_id}`,
  ];
  if (last_id) {
    where.push(`users.id < ${last_id}`);
  }
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';

  return new Promise((resolve, reject) => {
    sql.query(`SELECT users.*
      FROM ${table}
      JOIN users ON users.id=${table}.user_id2
      ${strWhere}
      GROUP BY users.id
      ORDER BY ${table}.update_time DESC LIMIT ${limit}`, [], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}


module.exports = Match;
