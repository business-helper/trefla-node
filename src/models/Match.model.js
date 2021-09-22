const sql = require('./db');
const { IMatch } = require('../types');
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


module.exports = Match;
