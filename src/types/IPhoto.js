const TreflaModel = require('./_TreflaModel');
const { timestamp } = require('../helpers/common.helpers');
const { moduleExpression } = require('@babel/types');

class IPhoto extends TreflaModel {
  constructor(args) {
    super(args);
    this.defineProperties();
    this.jsonFields = [];
    for (const key in args) {
      if (this[key] !== undefined) this[key] = args[key];
    }
    this.jsonify();
  }

  defineProperties() {
    this.id = 0;
    this.user_id = 0;
    this.url = '';
    this.type = 'normal';
    this.ratio = '1';
    this.thumbnail = '';
    this.orderIdx = 0;
    this.private = 0;
    this.description = '';
    this.create_time = timestamp();
    this.update_time = timestamp();
  }
}

module.exports = IPhoto;
