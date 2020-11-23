const sql = require("./db");
const { timestamp } = require("../helpers/common.helpers");

const Report = function (lang) {
  this.create_time = timestamp();
  this.update_time = timestamp();
};

Report.create = (report) => {
  delete report.id;
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO posts SET ?", report, (err, res) => {
			err ? reject(err) : resolve({ id: res.insertId, ...report });
    });
  });
};

module.exports = Report;
