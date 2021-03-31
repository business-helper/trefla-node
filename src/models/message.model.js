const sql = require("./db");
const { timestamp, int2Bool } = require("../helpers/common.helpers");

const table = 'messages';

const Message = function (model = {}) {
  this.create_time = timestamp();
  this.update_time = timestamp();
};

Message.create = (model) => {
  model.id !== undefined ? delete model.id : '';
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO messages SET ?", model, (err, res) => {
			err ? reject(err) : resolve({ ...model, id: res.insertId });
    });
  });
};

Message.save = async (model) => {
  model.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query("UPDATE messages SET ? WHERE id=?", [model, model.id], (err, res) => {
      err ? reject(err) : resolve(Message.getById(model.id));
    });
  });
}

Message.deleteById = async (id) => {
  return new Promise((resolve, reject) => {
    sql.query("DELETE FROM messages WHERE id=?", [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows > 0);
    })
  })
}

Message.deleteByChatId = async (chat_id) => {
  return new Promise((resolve, reject) => {
    sql.query("DELETE FROM messages WHERE chat_id=?", [chat_id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows > 0);
    })
  })
}

Message.pagination = async ({ limit, last_id = null, chat_id, minId = 0, maxId = 0 }) => {
  let where = [`chat_id=${chat_id}`];
  if (minId) where.push(`id > ${minId}`);
  if (maxId) where.push(`id <= ${maxId}`);
  if (last_id) {
    where.push(`id < ${last_id}`);
  }
  const strWhere = ' WHERE ' + where.join(' AND ');
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM messages ${strWhere} ORDER BY id DESC, create_time DESC LIMIT ?`, [limit], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

Message.getAll = ({ chat_id, minId = 0, maxId = 0 }) => {
  let where = [`chat_id=${chat_id}`];
  if (minId) where.push(`id > ${minId}`);
  if (maxId) where.push(`id <= ${maxId}`);
  const strWhere = ' WHERE ' + where.join(' AND ');
  return new Promise((resolve, reject) => {
    sql.query(`SELECT count(id) as total FROM messages ${strWhere}`, (err, res) => {
			err ? reject(err) : resolve(res[0].total);
    });
  });
};

Message.getMinId = ({ chat_id }) => {
  const strQuery = `SELECT id FROM messages WHERE chat_id=${chat_id} ORDER BY id ASC LIMIT 1`;
  return new Promise((resolve, reject) => {
    sql.query(strQuery, [], (err, res) => {
      err ? reject(err) : resolve(res.length > 0 ? res[0].id : 0);
    })
  })
}

Message.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM messages WHERE id=? LIMIT 1", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Message.lastMsgInChat = (chat_id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM messages WHERE chat_id=? ORDER BY id DESC LIMIT 1", [chat_id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Message.updateReceiverInCardChat = (chat_id, receiver_id) => {
  return new Promise((resolve, reject) => {
    sql.query(`UPDATE ${table} SET receiver_id=? WHERE chat_id=?`, [receiver_id, chat_id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows);
    });
  });
}

Message.output = (comment) => {
  const delKeys = ['create_time', 'update_time'];
  
  delKeys.forEach(key => {
    comment[key] !== undefined ? delete comment[key] : null;
  })
  return comment;
}

module.exports = Message;
