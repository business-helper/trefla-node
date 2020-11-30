const sql = require("./db");
const { timestamp } = require("../helpers/common.helpers");

const table = 'email_templates';
const EmailTemplate = function (et) {
  this.identifier = et.identifier;
  this.body = user.body;
  this.create_time = timestamp();
  this.update_time = timestamp();
};

EmailTemplate.create = (et) => {
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO email_templates SET ?", et, (err, res) => {
			err ? reject(err) : resolve({ ...et, id: res.insertId });
    });
  });
};

EmailTemplate.save = async (et) => {
  et.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query("UPDATE email_templates SET ? WHERE id=?", [et, et.id], (err, res) => {
      err ? reject(err) : resolve(EmailTemplate.getById(et.id));
    });
  });
}

EmailTemplate.getAll = () => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM email_templates", (err, res) => {
			err ? reject(err) : resolve(res);
    });
  });
};

EmailTemplate.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM email_templates WHERE id=? LIMIT 1", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

EmailTemplate.getByIdentifier = (identifier) => {
	return new Promise((resolve, reject) => {
		sql.query("SELECT * FROM email_templates WHERE identifier=? LIMIT 1", [identifier], (err, res) => {
			err ? reject(err) : resolve(res[0]);
		});
	})
}

EmailTemplate.pagination = ({ page, limit }) => {
  const offset = page * limit;
  const limitOffset = limit ? ` LIMIT ${limit} OFFSET ${offset}` : '';

  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} ${limitOffset}`, [], (err, res) => {
      err ? reject(err) : resolve(res);
    })
  })
}

EmailTemplate.total = ({}) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total FROM ${table}`, [], (err, res) => {
      err ? reject(err) : resolve(res[0].total);
    })
  })
}

EmailTemplate.output = (et) => {
  // user.location_array = JSON.parse(user.location_array);
  return et;
}

module.exports = EmailTemplate;
