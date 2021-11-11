const sql = require("./db");
const { timestamp, int2Bool } = require("../helpers/common.helpers");

const PostLike = function (pl) {
  this.user_id = pl.user_id;
};

PostLike.create = (postLikes) => {
  postLikes.id !== undefined ? delete postLikes.id : null;
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO post_likes SET ?", postLikes, (err, res) => {
      err ? reject(err) : resolve({ ...postLikes, id: res.insertId });
    });
  });
};

PostLike.save = async (noti) => {
  noti.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query(
      "UPDATE post_likes SET ? WHERE id=?",
      [noti, noti.id],
      (err, res) => {
        err ? reject(err) : resolve(PostLike.getById(noti.id));
      }
    );
  });
};

PostLike.deleteById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("DELETE FROM post_likes WHERE id=?", [id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows > 0 ? true : false);
    });
  });
};

PostLike.deleteUserPostLike = ({ user_id, post_id }) => {
  return new Promise((resolve, reject) => {
    sql.query(
      "DELETE FROM post_likes WHERE user_id=? AND post_id=?",
      [user_id, post_id],
      (err, res) => {
        err ? reject(err) : resolve(res.affectedRows);
      }
    );
  });
};

PostLike.userLikedPost = async ({ user_id, post_id, type }) => {
  return new Promise((resolve, reject) => {
    sql.query(
      "SELECT * FROM post_likes WHERE user_id=? AND post_id=? AND type=?",
      [user_id, post_id, type],
      (err, res) => {
        err ? reject(err) : resolve(res[0]);
      }
    );
  });
};

PostLike.postLikesOfUser = async ({ user_id, post_id }) => {
  return new Promise((resolve, reject) => {
    sql.query(
      "SELECT * FROM post_likes WHERE user_id=? AND post_id=?",
      [user_id, post_id],
      (err, res) => {
        err ? reject(err) : resolve(res);
      }
    );
  });
};

PostLike.getLikedUsersOfPost = async ({ post_id, last_id, limit }) => {
  const where = [`post_likes.post_id=${post_id}`];
  if (last_id) {
    where.push(`post_likes.id < ${last_id}`);
  }
  const strWhere = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const strLimit = limit ? ` LIMIT ${limit}` : "";
  return new Promise((resolve, reject) => {
    sql.query(
      `SELECT users.*, post_likes.id as post_like_id, post_likes.isGuest, post_likes.type as like_type
      FROM post_likes
      JOIN users ON users.id=post_likes.user_id
      ${strWhere}
      ORDER BY post_likes.id DESC
      ${strLimit}
      `,
      [],
      (err, res) => {
        err ? reject(err) : resolve(res);
      }
    );
  });
};

PostLike.getFirstLikeOfPost = async (post_id) => {
  return new Promise((resolve, reject) => {
    sql.query(
      `SELECT * FROM post_likes WHERE post_id=? ORDER BY id ASC LIMIT 1`,
      [post_id],
      (err, res) => {
        err ? reject(err) : resolve(res[0]);
      }
    );
  });
};

PostLike.pagination = async ({ limit, offset, receiver_id }) => {
  const strWhere = receiver_id ? ` WHERE receiver_id=${receiver_id}` : "";
  return new Promise((resolve, reject) => {
    sql.query(
      `SELECT * FROM post_likes ${strWhere} LIMIT ? OFFSET ? `,
      [limit, offset],
      (err, res) => {
        err ? reject(err) : resolve(res);
      }
    );
  });
};

PostLike.getAll = ({ receiver_id = null }) => {
  const strWhere = receiver_id ? ` WHERE receiver_id=${receiver_id}` : "";
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM post_likes ${strWhere}`, (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
};

PostLike.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query(
      "SELECT * FROM post_likes WHERE id=? LIMIT 1",
      [id],
      (err, res) => {
        err ? reject(err) : resolve(res[0]);
      }
    );
  });
};

PostLike.output = (noti) => {
  return noti;
};

module.exports = PostLike;
