const sql = require("./db");
const { timestamp } = require("../helpers/common.helpers");

const Report = function (lang) {
  this.create_time = timestamp();
  this.update_time = timestamp();
};

Report.create = (report) => {
  delete report.id;
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO reports SET ?", report, (err, res) => {
			err ? reject(err) : resolve({ id: res.insertId, ...report });
    });
  });
};

Report.save = (model) => {
  model.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query("UPDATE reports SET ? WHERE id=?", [model, model.id], (err, res) => {
      err ? reject(err) : resolve(Report.getById(model.id));
    });
  });
}

Report.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM reports WHERE id=?", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

Report.output = (model) => {
  if (!model) return null;
  ['create_time', 'update_time'].map(key => delete model[key]);
  return model;
}

module.exports = Report;
