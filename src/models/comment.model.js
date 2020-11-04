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

Comment.pagination = async ({ limit, offset, target_id = null, type = null }) => {
  const strWhere = (target_id && type) ? ` WHERE target_id=${target_id} AND type="${type}"` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM comments ${strWhere} LIMIT ? OFFSET ? `, [limit, offset], (err, res) => {
      err ? reject(err) : resolve(res);
    })
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

Comment.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM comments WHERE id=? LIMIT 1", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Comment.output = (comment) => {
  // comment.isGuest = int2Bool(comment.isGuest);
  return comment;
}

module.exports = Comment;
