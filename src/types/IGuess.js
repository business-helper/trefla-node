const TreflaModel = require('./_TreflaModel');
const { timestamp } = require('../helpers/common.helpers');

class IGuess extends TreflaModel {
  constructor(args) {
    super(args);
    this.defineProperties();
    this.jsonFields = ['selected_users'];
    this.acceptData(args);
  }

  defineProperties() {
    this.id = 0;
    this.user_id = 0;
    this.match_id = 0;
    this.selected_users = [];
    this.isCorrect = 0;
    this.create_time = timestamp();
    this.update_time = timestamp();
  }
}

module.exports = IGuess;
