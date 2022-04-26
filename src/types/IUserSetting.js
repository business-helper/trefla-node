const TreflaModel = require('./_TreflaModel');
const { timestamp } = require('../helpers/common.helpers');

class IUserSetting extends TreflaModel {
  constructor(args) {
    super(args);
    this.defineProperties();
    this.jsonFields = [];
    this.acceptData(args);
  }

  defineProperties() {
    this.id = 0;
    this.user_id = 0;
    this.match_enable = 1;
    this.match_like_notification = 1;
    this.create_time = timestamp();
    this.update_time = timestamp();
  }
}

module.exports = IUserSetting;
