const sql = require("./db");
const { timestamp } = require("../helpers/common.helpers");

const Language = function (lang) {
  this.code = lang.code;
  this.name = lang.name;
  this.active = lang.active;
  this.create_time = timestamp();
  this.update_time = timestamp();
};

Language.create = (newLang) => {
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO langs SET ?", newLang, (err, res) => {
			err ? reject(err) : resolve({ id: res.insertId, ...newLang });
    });
  });
};

Language.save = async (updateData) => {
  updateData.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query("UPDATE langs SET ? WHERE id=?", [updateData, updateData.id], (err, res) => {
      err ? reject(err) : resolve(Language.getById(updateData.id));
    });
  });
}

Language.getAll = () => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM langs", (err, res) => {
			err ? reject(err) : resolve(res);
    });
  });
};

Language.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM langs WHERE id=? LIMIT 1", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Language.getByCode = (code) => {
	return new Promise((resolve, reject) => {
		sql.query("SELECT * FROM langs WHERE code=? LIMIT 1", [code], (err, res) => {
			err ? reject(err) : resolve(res[0]);
		});
	})
}

Language.getByName = (name) => {
	return new Promise((resolve, reject) => {
		sql.query("SELECT * FROM langs WHERE name=? LIMIT 1", [name], (err, res) => {
			err ? reject(err) : resolve(res[0]);
		});
	});
}

module.exports = Language;
