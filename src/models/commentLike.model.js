const sql = require("./db");
const { timestamp, int2Bool } = require("../helpers/common.helpers");

const CommentLike = function (pl) {
  this.user_id = pl.user_id;
};

CommentLike.create = (commentLike) => {
  commentLike.id !== undefined ? delete commentLike.id : null;
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO comment_likes SET ?", commentLike, (err, res) => {
      err ? reject(err) : resolve({ ...commentLike, id: res.insertId });
    });
  });
};

CommentLike.save = async (item) => {
  item.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query(
      "UPDATE comment_likes SET ? WHERE id=?",
      [item, item.id],
      (err, res) => {
        err ? reject(err) : resolve(CommentLike.getById(item.id));
      }
    );
  });
};

CommentLike.delete = (cond = null) => {
  if (Object.keys(cond).length === 0) {
    return false;
  }
  let baseQuery = "DELETE FROM comment_likes WHERE ?";
  let args = [cond];
  if (!cond || Object.keys(cond).length === 0) {
    baseQuery = "DELETE FROM comment_likes";
    args = [];
  }
  return new Promise((resolve, reject) => {
    sql.query(baseQuery, args, (err, res) => {
      err ? reject(err) : resolve(res.affectedRows);
    });
  });
};

CommentLike.deleteById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("DELETE FROM comment_likes WHERE id=?", [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows > 0 ? true : false);
    });
  });
};

CommentLike.deleteUserCommentLikes = async ({ user_id, comment_id }) => {
  return new Promise((resolve, reject) => {
    sql.query(
      "DELETE FROM comment_likes WHERE user_id=? AND comment_id=?",
      [user_id, comment_id],
      (err, res) => {
        err ? reject(err) : resolve(res.affectedRows);
      }
    );
  });
};

CommentLike.userLikedComment = async ({ user_id, comment_id, type }) => {
  return new Promise((resolve, reject) => {
    sql.query(
      "SELECT * FROM comment_likes WHERE user_id=? AND comment_id=? AND type=?",
      [user_id, comment_id, type],
      (err, res) => {
        err ? reject(err) : resolve(res[0]);
      }
    );
  });
};

CommentLike.commentLikesOfUser = async ({ user_id, comment_id }) => {
  return new Promise((resolve, reject) => {
    sql.query(
      "SELECT * FROM comment_likes WHERE user_id=? AND comment_id=?",
      [user_id, comment_id],
      (err, res) => {
        err ? reject(err) : resolve(res);
      }
    );
  });
};

CommentLike.pagination = async ({ limit, offset, receiver_id }) => {
  const strWhere = receiver_id ? ` WHERE receiver_id=${receiver_id}` : "";
  return new Promise((resolve, reject) => {
    sql.query(
      `SELECT * FROM comment_likes ${strWhere} LIMIT ? OFFSET ? `,
      [limit, offset],
      (err, res) => {
        err ? reject(err) : resolve(res);
      }
    );
  });
};

CommentLike.getLikedUsersOfComment = async ({ comment_id, last_id, limit }) => {
  const where = [`comment_likes.comment_id=${comment_id}`];
  if (last_id) {
    where.push(`comment_likes.id < ${last_id}`);
  }
  const strWhere = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const strLimit = limit ? ` LIMIT ${limit}` : "";
  return new Promise((resolve, reject) => {
    sql.query(
      `SELECT users.*, comment_likes.id as comment_like_id, comment_likes.isGuest, comment_likes.type as like_type
      FROM comment_likes
      JOIN users ON users.id=comment_likes.user_id
      ${strWhere}
      ORDER BY comment_likes.id DESC
      ${strLimit}
      `,
      [],
      (err, res) => {
        err ? reject(err) : resolve(res);
      }
    );
  });
};

CommentLike.getFirstLikeOfComment = async (comment_id) => {
  return new Promise((resolve, reject) => {
    sql.query(
      `SELECT * FROM comment_likes WHERE comment_id=? ORDER BY id ASC LIMIT 1`,
      [comment_id],
      (err, res) => {
        err ? reject(err) : resolve(res[0]);
      }
    );
  });
};

CommentLike.getAll = ({ receiver_id = null }) => {
  const strWhere = receiver_id ? ` WHERE receiver_id=${receiver_id}` : "";
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM comment_likes ${strWhere}`, (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
};

CommentLike.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query(
      "SELECT * FROM comment_likes WHERE id=? LIMIT 1",
      [id],
      (err, res) => {
        err ? reject(err) : resolve(res[0]);
      }
    );
  });
};

CommentLike.output = (comment) => {
  return comment;
};

module.exports = CommentLike;
