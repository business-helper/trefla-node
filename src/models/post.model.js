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

Post.pagination = async ({ limit, offset, type = null }) => {
  const strWhere = type ? ` WHERE type='${type}'` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM posts ${strWhere} LIMIT ? OFFSET ? `, [limit, offset], (err, res) => {
      err ? reject(err) : resolve(res);
    })
  });
}

Post.getAll = ({ type = null }) => {
  const strWhere = type ? ` WHERE type='${type}'` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM posts ${strWhere}`, (err, res) => {
			err ? reject(err) : resolve(res);
    });
  });
};

Post.getCountOfPosts = ({ type = null }) => {
  const strWhere = type ? ` WHERE type='${type}'` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total FROM posts ${strWhere}`, (err, res) => {
      err ? reject(err) : resolve(res[0].total);
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

Post.output = (post) => {
  post.post_user_id = post.user_id;
  ['user_id', 'create_time', 'update_time', 'city'].map(key => delete post[key]);
  return post;
}

module.exports = Post;
