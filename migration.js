var mysql = require('mysql');
var migration = require('mysql-migrations');
const dbConfig = require('./src/config/db.config');

var connection = mysql.createPool({
  connectionLimit : 10,
  host     : dbConfig.HOST,
  user     : dbConfig.USER,
  password : dbConfig.PASSWORD,
  database : dbConfig.DB,
});

migration.init(connection, __dirname + '/src/migrations', () => {
  console.log('[Migration] finished')
});
