'use strict';

var dbm;
var type;
var seed;
var fs = require('fs');
var path = require('path');
var PPromise;
const logger = require('../src/config/logger');
const ChatModel = require('../src/models/chat.model');

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
  PPromise = options.Promise;
};

exports.up = function(db) {
  var filePath = path.join(__dirname, 'sqls', '20210331024916-chat-sources-up.sql');
  return new Promise( function( resolve, reject ) {
    fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
      if (err) return reject(err);
      console.log('received data: ' + data);

      resolve(data);
    });
  })
    .then(async function(sqlData) {
      await db.addColumn('chats', 'sources', { type: 'text', defaultValue: '[]' })
        .then(() => console.log(`[Chats][sources] added.`))
        .catch((error) => console.log(`[Chats][sources] already exists`));
      return ChatModel.getAll({ isForCard: 0 });
      // return db.runSql(sqlData);
    })
    .then((chats) => Promise.all(chats.map(async chat => {
      const { from_where, target_id } = chat;
      let sources = '[]';
      if (from_where && target_id) {
        sources = JSON.stringify([{ from_where, target_id }]);
      }
      chat.sources = sources;
      return ChatModel.save(chat);
    })))
    .then((chats) => {
      logger.info(`[Chat][sources] configured[${chats.length}]`);
    });
};

exports.down = function(db) {
  var filePath = path.join(__dirname, 'sqls', '20210331024916-chat-sources-down.sql');
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
