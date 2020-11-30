const sql = require("./db");
const { timestamp, int2Bool } = require("../helpers/common.helpers");

const Comment = function (lang) {
  this.user_id = lang.code;
  this.comment = lang.name;
  this.active = lang.active;
  this.create_time = timestamp();
  this.update_time = timestamp();
};

Comment.create = (comment) => {
  comment.id !== undefined ? delete comment.id : '';
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO comments SET ?", comment, (err, res) => {
			err ? reject(err) : resolve({ ...comment, id: res.insertId });
    });
  });
};

Comment.save = async (comment) => {
  comment.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query("UPDATE comments SET ? WHERE id=?", [comment, comment.id], (err, res) => {
      err ? reject(err) : resolve(Comment.getById(comment.id));
    });
  });
}

Comment.deleteById = async (id) => {
  return new Promise((resolve, reject) => {
    sql.query("DELETE FROM comments WHERE id=?", [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows > 0);
    })
  })
}

Comment.pagination = async ({ limit, last_id = null, target_id = null, type = null }) => {
  let where = [];
  last_id ? where.push(`id < ${last_id}`) : null;
  (target_id && type) ? where.push(`target_id=${target_id} AND type='${type}'`) : null;
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';

  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM comments ${strWhere} ORDER BY id DESC LIMIT ? `, [limit], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

Comment.simplePagination = async ({ limit = 10, page = 0, target_id = null, type = null }) => {
  let where = [];
  target_id && type ? where.push(`(target_id=${target_id} AND type='${type}')`) : null;

  const strWhere = where.length > 0 ? ` WHERE ${where.joni(' AND ')}` : '';

  const offset = limit * page;
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM comments ${strWhere} ORDER BY id DESC LIMIT ? OFFSET ?`, [limit, offset], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

Comment.getAll = ({ target_id = null, type = null }) => {
  const strWhere = (target_id && type) ? ` WHERE target_id=${target_id} AND type="${type}"` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM comments ${strWhere}`, (err, res) => {
			err ? reject(err) : resolve(res);
    });
  });
};

Comment.getCountOfComments = ({ type = null, target_id = null }) => {
  const strWhere = type && target_id ? ` WHERE type='${type}' AND target_id=${target_id}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total FROM comments ${strWhere}`, (err, res) => {
      err ? reject(err) : resolve(res[0].total);
    });
  });
}

Comment.minId = ({ type = null, target_id = null }) => {
  const strWhere = type && target_id ? ` WHERE type='${type}' AND target_id=${target_id}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT id FROM comments ${strWhere} ORDER BY id ASC LIMIT 1`, (err, res) => {
      err ? reject(err) : resolve(res.length > 0 ? res[0].id : 0);
    });
  });
}

Comment.commentNumber = ({ target_id, type }) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total FROM comments WHERE type=? AND target_id=?`, [type, target_id], (err, res) => {
      err ? reject(err) : resolve(res[0].total);
    });
  });
}

Comment.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM comments WHERE id=? LIMIT 1", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Comment.getByIds = (ids) => {
  ids.length === 0 ? ids = [0] : null;
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM comments WHERE id IN (?)", [ids], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

Comment.getByUser = (user_id) => {
  return new Promise((resolve ,reject) => {
    sql.query("SELECT * FROM comments WHERE user_id = ?", [user_id], (err, res) => {
      err ? reject(err) : resolve(res);
    })
  })
}

Comment.deleteByUser = (user_id) => {
  return new Promise((resolve, reject) => {
    sql.query("DELETE FROM comments WHERE user_id=?", [user_id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows);
    });
  });
}

Comment.total = () => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total FROM comments`, [], (err, res) => {
      err ? reject(err) : resolve(res[0].total);
    })
  })
}

Comment.output = (comment) => {
  if (!comment) return null;
  // comment.isGuest = int2Bool(comment.isGuest);
  const delKeys = ['create_time', 'update_time'];
  delKeys.forEach(key => {
    comment[key] !== undefined ? delete comment[key] : null;
  })
  return comment;
}

module.exports = Comment;
