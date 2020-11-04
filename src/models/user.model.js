const sql = require("./db");
const { timestamp } = require("../helpers/common.helpers");

const User = function (user) {
  this.user_name = user.user_name;
  this.email = user.email;
  this.active = lang.active;
  this.create_time = timestamp();
  this.update_time = timestamp();
};

User.create = (newUser) => {
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO users SET ?", newUser, (err, res) => {
			err ? reject(err) : resolve({ ...newUser, id: res.insertId });
    });
  });
};

User.save = async (updateData) => {
  updateData.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query("UPDATE users SET ? WHERE id=?", [updateData, updateData.id], (err, res) => {
      err ? reject(err) : resolve(User.getById(updateData.id));
    });
  });
}

User.getAll = () => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM users", (err, res) => {
			err ? reject(err) : resolve(res);
    });
  });
};

User.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM users WHERE id=? LIMIT 1", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

User.getByIds = (ids) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM users WHERE id IN (?)", [ids], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

User.getByEmail = (email) => {
	return new Promise((resolve, reject) => {
		sql.query("SELECT * FROM users WHERE email=? LIMIT 1", [email], (err, res) => {
			err ? reject(err) : resolve(res[0]);
		});
	})
}

User.getByUserName = (user_name) => {
	return new Promise((resolve, reject) => {
		sql.query("SELECT * FROM users WHERE user_name=? LIMIT 1", [user_name], (err, res) => {
			err ? reject(err) : resolve(res[0]);
		});
	});
}

User.output = (user, mode = 'NORMAL') => {
  try {
    user.location_array = JSON.parse(user.location_array || "");
  } catch (e) {
    console.log('[location array]', user.location_array);
  }
  // keys to delete
  let delKeys = [];
  if (mode === 'NORMAL') {
    delKeys = ['email', 'password', 'language', 'bio', 'radiusAround', 'noti_num', 'location_array', 'postAroundCenterCoordinate', 'create_time', 'update_time']
  } else if (mode === 'PROFILE') {
    const delKeys = ['password', 'create_time', 'update_time'];
  }
  // delete the given keys
  delKeys.forEach(field => {
    delete user[field];
  });
  return user;
}

module.exports = User;
