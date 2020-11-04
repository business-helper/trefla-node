const sql = require("./db");
const { timestamp, int2Bool } = require("../helpers/common.helpers");

const CommentLike = function (pl) {
  this.user_id = pl.user_id;
};

CommentLike.create = (commentLike) => {
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO comment_likes SET ?", commentLike, (err, res) => {
			err ? reject(err) : resolve({ ...commentLike, id: res.insertId });
    });
  });
};

CommentLike.save = async (item) => {
  item.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query("UPDATE comment_likes SET ? WHERE id=?", [item, item.id], (err, res) => {
      err ? reject(err) : resolve(CommentLike.getById(item.id));
    });
  });
}

CommentLike.userLikedComment = async ({ user_id, comment_id, type }) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM comment_likes WHERE user_id=? AND comment_id=? AND type=?", [user_id, comment_id, type], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

CommentLike.commentLikesOfUser = async ({ user_id, comment_id }) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM comment_likes WHERE user_id=? AND comment_id=?", [user_id, comment_id], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  }); 
}

CommentLike.pagination = async ({ limit, offset, receiver_id }) => {
  const strWhere = (receiver_id) ? ` WHERE receiver_id=${receiver_id}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM comment_likes ${strWhere} LIMIT ? OFFSET ? `, [limit, offset], (err, res) => {
      err ? reject(err) : resolve(res);
    })
  });
}

CommentLike.getAll = ({ receiver_id = null }) => {
  const strWhere = (receiver_id) ? ` WHERE receiver_id=${receiver_id}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM comment_likes ${strWhere}`, (err, res) => {
			err ? reject(err) : resolve(res);
    });
  });
};

CommentLike.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM comment_likes WHERE id=? LIMIT 1", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

CommentLike.deleteById = id => {
  return new Promise((resolve, reject) => {
    sql.query("DELETE FROM comment_likes WHERE id=?", [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows > 0 ? true : false)
    });
  });
}

CommentLike.output = (comment) => {
  return comment;
}

module.exports = CommentLike;
