const sql = require("./db");
const { timestamp } = require("../helpers/common.helpers");

const Post = function (lang) {
  this.code = lang.code;
  this.name = lang.name;
  this.active = lang.active;
  this.create_time = timestamp();
  this.update_time = timestamp();
};

Post.create = (post) => {
  delete post.id;
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO posts SET ?", post, (err, res) => {
			err ? reject(err) : resolve({ id: res.insertId, ...post });
    });
  });
};

Post.save = async (post) => {
  post.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query("UPDATE posts SET ? WHERE id=?", [post, post.id], (err, res) => {
      err ? reject(err) : resolve(Post.getById(post.id));
    });
  });
}

Post.deleteById = async (id) => {
  return new Promise((resolve, reject) => {
    sql.query("DELETE FROM posts WHERE id=?", [id], (err, res) => {
      err ? reject(err) : resolve(true);
    });
  })
}

Post.deleteByUser = (user_id) => {
  return new Promise((resolve, reject) => {
    sql.query("DELETE FROM posts WHERE user_id=?", [user_id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows);
    })
  })
}

Post.getAll = ({ type = null, user_id = null }) => {
  const where = [];
  type ? where.push(`type=${type}`) : null;
  user_id ? where.push(`user_id=${user_id}`) : null;
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';

  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM posts ${strWhere}`, (err, res) => {
			err ? reject(err) : resolve(res);
    });
  });
};

Post.pagination = async ({ limit, last_id, type = null, user_id = null }) => {
  limit = Number(limit);
  let where = [];
  type ? where.push(`type='${type}'`) : null;
  last_id ? where.push(`id < ${last_id}`) : null;
  user_id ? where.push(`user_id=${user_id}`) : null;

  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM posts ${strWhere} ORDER BY id DESC LIMIT ?  `, [limit], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

Post.simplePagination = async ({ limit, page, type = null, user_id = null }) => {
  limit = Number(limit);
  page = Number(page);
  const offset = limit * page;

  let where = [];
  type ? where.push(`type='${type}'`) : null;
  user_id ? where.push(`user_id=${user_id}`) : null;

  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM posts ${strWhere} ORDER BY id DESC LIMIT ? OFFSET ?`, [limit, offset], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}


Post.getCountOfPosts = ({ type = null, user_id = null }) => {
  const where = [];
  type ? where.push(`type=${type}`) : null;
  user_id ? where.push(`user_id=${user_id}`) : null;
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';

  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total FROM posts ${strWhere}`, (err, res) => {
      err ? reject(err) : resolve(res[0].total);
    });
  });
}

Post.getMinIdOfPosts = ({ type = null }) => {
  const strWhere = type ? ` WHERE type='${type}'` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT id from posts ${strWhere} ORDER BY id ASC LIMIT 1`, (err, res) => {
      err ? reject(err) : resolve(res.length > 0 ? res[0].id : 0);
    });
  });
}

Post.getAroundPosts = ({ last_id, minTime }) => {
  let where = [];
  where.push(`create_time > '${minTime}'`);
  last_id ? where.push(`id < ${last_id}`) : null;
  
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM posts ${strWhere} ORDER BY id DESC`, [], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

Post.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM posts WHERE id=? LIMIT 1", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Post.getByIds = (ids) => {
  ids.length === 0 ? ids = [0] : null;
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM posts WHERE id IN (?)", [ids], (err, res) => {
      err ? reject(err) : resolve(res);
    })
  });
}

Post.output = (post) => {
  if (!post) return null;
  post.post_user_id = post.user_id;
  ['user_id', 'create_time', 'update_time', 'city'].map(key => delete post[key]);
  return post;
}

module.exports = Post;
