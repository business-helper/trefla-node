const sql = require("./db");
const { timestamp, int2Bool } = require("../helpers/common.helpers");

const Notification = function (noti) {
  this.sender_id = noti.sender_id;
  this.receiver_id = noti.receiver_id;
  this.create_time = timestamp();
  this.update_time = timestamp();
};

Notification.create = (noti) => {
  noti.id !== undefined ? delete noti.id : null;
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO notifications SET ?", noti, (err, res) => {
			err ? reject(err) : resolve({ ...noti, id: res.insertId });
    });
  });
};

Notification.save = async (noti) => {
  noti.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query("UPDATE notifications SET ? WHERE id=?", [noti, noti.id], (err, res) => {
      err ? reject(err) : resolve(Notification.getById(noti.id));
    });
  });
}

Notification.pagination = async ({ limit, offset, receiver_id }) => {
  const strWhere = (receiver_id) ? ` WHERE receiver_id=${receiver_id}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM notifications ${strWhere} LIMIT ? OFFSET ? `, [limit, offset], (err, res) => {
      err ? reject(err) : resolve(res);
    })
  });
}

Notification.getAll = ({ receiver_id = null }) => {
  const strWhere = (receiver_id) ? ` WHERE receiver_id=${receiver_id}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM notifications ${strWhere}`, (err, res) => {
			err ? reject(err) : resolve(res);
    });
  });
};

Notification.getCountOfNotifications = ({ receiver_id = null }) => {
  const strWhere = (receiver_id) ? ` WHERE receiver_id=${receiver_id}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total FROM notifications ${strWhere}`, (err, res) => {
			err ? reject(err) : resolve(res[0].total);
    });
  });
};

Notification.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM notifications WHERE id=? LIMIT 1", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Notification.output = (noti) => {
  let delKeys = ['create_time', 'update_time'];

  // delete keys
  delKeys.forEach((key, i) => {
    if (noti[key]) delete noti[key];
  });
  return noti;
}

module.exports = Notification;
