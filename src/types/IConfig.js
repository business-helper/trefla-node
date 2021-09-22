const TreflaModel = require('./_TreflaModel');
const { timestamp } = require('../helpers/common.helpers');

class IConfig extends TreflaModel {
  constructor(args) {
    super(args);
    this.defineProperties();
    this.jsonFields = [];
    this.acceptData(args);
  }

  defineProperties() {
    this.id = 0;
    this.admin_email = '';
    this.aroundSearchPeriod = 0;
    this.aroundSearchDays = 0;
    this.defaultAroundRadius = 0;
    this.defaultUserRadiusAround = 0;
    this.lang_version = '';
    this.default_zone = '';
    this.apply_default_zone = 0;
    this.android_version = '';
    this.android_link = '';
    this.apple_version = '';
    this.apple_link = '';
    this.enable_top_music = '';
    this.post_point = '';
    this.daily_post_limit = '';
    this.comment_point = '';
    this.daily_comment_limit = 0;
    this.chat_point = 0;
    this.match_skip_days = 7;
    this.create_time = timestamp();
    this.update_time = timestamp();
  }
}

module.exports = IConfig;
