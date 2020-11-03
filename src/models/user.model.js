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

User.output = (user) => {
  user.location_array = JSON.parse(user.location_array);
  return user;
}

module.exports = User;
