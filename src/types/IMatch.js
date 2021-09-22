const TreflaModel = require('./_TreflaModel');
const { generateTZTimeString, timestamp } = require('../helpers/common.helpers');
const { MATCH_STATUS } = require('../constants/common.constant');

class IMatch extends TreflaModel {
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
    this.user_id1 = 0;
    this.user_id2 = 0;
    this.status = MATCH_STATUS.INIT;
    this.create_time = timestamp();
    this.update_time = timestamp();
  }
}

module.exports = IMatch;
