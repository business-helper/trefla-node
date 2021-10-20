const TreflaModel = require('./_TreflaModel');
const { timestamp } = require('../helpers/common.helpers');
const { MATCH_RELATION } = require('../constants/common.constant');

class IMatchProfile extends TreflaModel {
  constructor(args) {
    super(args);
    this.defineProperties();
    this.jsonFields = ['relations', 'preference'];
    this.acceptData(args);
  }

  defineProperties() {
    this.id = 0;
    this.user_id = 0;
    this.name = '';
    this.smoking = 0;
    this.drinking = 0;
    this.height = 0;
    this.relations = Object.values(MATCH_RELATION);
    this.preference = {
      smoking: 1,
      drinking: 1,
      heightRange: [150, 200],
      ageRange: [13, 65],
      relations: Object.values(MATCH_RELATION),
    }
    this.create_time = timestamp();
    this.update_time = timestamp();
  }
}

module.exports =  IMatchProfile;
