const mysql = require("mysql");
const dbConfig = require("../config/db.config");

let connection;
try {
  connection = mysql.createConnection({
    host: dbConfig.HOST,
    user: dbConfig.USER,
    password: dbConfig.PASSWORD,
    database: dbConfig.DB,
    charset : 'utf8mb4'
  });
  console.log('[DB] connection created!')
} catch (error) {
  console.log('[DB Connect]', error.message);
  process.exit(1);
}

module.exports = connection;
