const TreflaModel = require('./_TreflaModel');
const { generateTZTimeString, timestamp } = require('../helpers/common.helpers');

class IPost extends TreflaModel {
  constructor(args) {
    super(args);
    this.defineProperties();
    this.jsonFields = ['photos'];
    this.acceptData(args);
  }

  defineProperties() {
    this.id = 0;
    this.user_id = 0;
    this.post_name = '';
    this.feed = '';
    this.photos = [];
    this.isGuest = 0;
    this.type = '1';
    this.target_date = '';
    this.option_val = '';
    this.comment_num = 0;
    this.liked = 0;
    this.like_1_num = 0;
    this.like_2_num = 0;
    this.like_3_num = 0;
    this.like_4_num = 0;
    this.like_5_num = 0;
    this.like_6_num = 0;
    this.location_area = '';
    this.location_address = '';
    this.location_coordinate = '';
    this.city = '';
    this.active = 1;
    this.post_time = generateTZTimeString();
    this.create_time = timestamp();
    this.update_time = timestamp();
  }
}

module.exports = IPost;
