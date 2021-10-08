const sql = require('./db');
const { IGuess } = require('../types');
const { timestamp } = require('../helpers/common.helpers');

const table = 'guesses';

class Guess extends IGuess {
  constructor(args) {
    super(args);
  }

  save() {
    const model = this.toDB();
    if (this.id === 0) {
      delete model.id;
      return new Promise((resolve, reject) => {
        sql.query(`INSERT INTO ${Guess.table()} SET ?`, model, (err, res) => {
          err ? reject(err) : resolve({ id: res.insertId, ...model });
        });
      });
    } else {
      model.update_time = timestamp();
      return new Promise((resolve, reject) => {
        sql.query(`UPDATE ${Guess.table()} SET ? WHERE id=?`, [model, model.id], (err, res) => {
          err ? reject(err) : resolve(Guess.getById(model.id));
        });
      });
    }
  }
}

Guess.table = () => {
  return table;
}

Guess.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${Guess.table()} WHERE id=?`, [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Guess.getByMatchId = (match_id) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${Guess.table()} WHERE match_id=?`, [match_id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

module.exports = Guess;
