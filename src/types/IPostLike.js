const TreflaModel = require("./_TreflaModel");
const { timestamp } = require("../helpers/common.helpers");

class IPostLike extends TreflaModel {
  constructor(args) {
    super(args);
    this.defineProperties();
    this.jsonFields = [];
    this.acceptData(args);
  }

  defineProperties() {
    this.id = 0;
    this.user_id = 0;
    this.isGuest = 1;
    this.post_id = 0;
    this.type = 1;
    this.create_time = timestamp();
    this.update_time = timestamp();
  }
}

module.exports = IPostLike;
