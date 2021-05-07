const sql = require("./db");
const { timestamp, int2Bool } = require("../helpers/common.helpers");

const Notification = function (noti) {
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

Notification.paginationByLastId = async ({ limit, last_id = null, receiver_id }) => {
  let where = [];
  where.push(`receiver_id='${receiver_id}'`);
  if (last_id) {
    where.push(`id < ${last_id}`);
  }
  
  const strWhere = (receiver_id) ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM notifications ${strWhere} ORDER BY id DESC LIMIT ?`, [limit], (err, res) => {
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

Notification.getMinIdtoUser = ({ receiver_id = null }) => {
  let where = [];
  if (receiver_id) {
    where.push(`receiver_id = ${receiver_id}`);
  }
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : "";
  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total from notifications ${strWhere}`, [], (err, res) => {
      err ? reject(err) : resolve(res[0].total);
    });
  });
}

Notification.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM notifications WHERE id=? LIMIT 1", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Notification.getByUserId = (user_id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM notifications WHERE receiver_id=?", [user_id], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

Notification.getUnreadCount = (user_id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT COUNT(id) as total FROM notifications WHERE receiver_id=? AND is_read=?", [user_id, 0], (err, res) => {
      err ? reject(err) : resolve(res ? res[0].total : 0);
    });
  });
}

Notification.deleteByUserId = (user_id) => {
  return new Promise((resolve, reject) => {
    sql.query("DELETE FROM notifications WHERE receiver_id=?", [user_id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows > 0);
    });
  });
}

Notification.deleteById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("DELETE FROM notifications WHERE id=?", [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows > 0);
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
