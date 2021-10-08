const sql = require('./db');
const { IUserSetting } = require('../types');
const { timestamp } = require('../helpers/common.helpers');

const table = 'user_settings';

class UserSetting extends IUserSetting {
  constructor(args) {
    super(args);
  }

  save() {
    const model = this.toDB();
    if (this.id === 0) {
      delete model.id;
      return new Promise((resolve, reject) => {
        sql.query(`INSERT INTO ${UserSetting.table()} SET ?`, model, (err, res) => {
          err ? reject(err) : resolve({ id: res.insertId, ...model });
        });
      });
    } else {
      model.update_time = timestamp();
      return new Promise((resolve, reject) => {
        sql.query(`UPDATE ${UserSetting.table()} SET ? WHERE id=?`, [model, model.id], (err, res) => {
          err ? reject(err) : resolve(UserSetting.getById(model.id));
        });
      });
    }
  }
}

UserSetting.table = () => {
  return table;
}

UserSetting.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${UserSetting.table()} WHERE id=?`, [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

UserSetting.getByUserId = (user_id) => {
  const getByUserId = (user_id) => {
    return new Promise((resolve, reject) => {
      sql.query(`SELECT * FROM ${UserSetting.table()} WHERE user_id=?`, [user_id], (err, res) => {
        err ? reject(err) : resolve(res);
      });
    });
  }
  return getByUserId(user_id).then(userSetting => {
    if (userSetting) return userSetting;
    const newSetting = new UserSetting({ user_id });
    return newSetting.save();
  });
}

module.exports = UserSetting;
