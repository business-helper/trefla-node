'use strict';

var dbm;
var type;
var seed;
var fs = require('fs');
var path = require('path');
var Promise;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
  Promise = options.Promise;
};

exports.up = function(db) {
  let sqls;
  var filePath = path.join(__dirname, 'sqls', '20210325020056-chats-structure-change-up.sql');
  return new Promise( function( resolve, reject ) {
    fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
      if (err) return reject(err);
      console.log('received data: ' + data);

      resolve(data);
    });
  })
  .then(async function(data) {
    await db.addColumn('chats', 'from_where', { type: 'string', length: 20, defaultValue: 'NONE' })
      .then(() => console.log('[Chats][from_where] Added'))
      .catch((error) => db.changeColumn('chats', 'from_where', { type: 'string', length: 20, defaultValue: 'NONE' }).then(() => console.log('[Chats][from_where] changed')));
    await db.addColumn('chats', 'target_id', { type: 'string', length: 20, defaultValue: '0' })
      .then(() => console.log('[Chats.target_id] Added'))
      .catch((error) => db.changeColumn('chats', 'target_id', { type: 'string', length: 20, defaultValue: '0' }).then(() => console.log('[Chats.target_id] Changed')))
    return db.runSql(data);
  });
};

exports.down = function(db) {
  var filePath = path.join(__dirname, 'sqls', '20210325020056-chats-structure-change-down.sql');
  return new Promise( function( resolve, reject ) {
    fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
      if (err) return reject(err);
      console.log('received data: ' + data);

      resolve(data);
    });
  })
  .then(function(data) {
    return db.runSql(data);
  });
};

exports._meta = {
  "version": 1
};
