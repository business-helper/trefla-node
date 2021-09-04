const TreflaModel = require('./_TreflaModel');
const { generateTZTimeString, timestamp } = require('../helpers/common.helpers');

class INotification extends TreflaModel {
  constructor(args) {
    super(args);
    this.defineProperties();
    this.jsonFields = [];
    // initialize properties by args.
    for (const key in args) {
      if (this[key] !== undefined) this[key] = args[key];
    }
    // convert the JSON feilds into object or array.
    this.jsonify();
  }

  defineProperties() {
    this.id = 0;
    this.sender_id = 0;
    this.receiver_id = 0;
    this.type = 0;
    this.optional_val = '';
    this.time = generateTZTimeString();
    this.is_read = 0;
    this.isFromAdmin = 1;
    this.isGuest = 0;
    this.text = '';
    this.create_time = timestamp();
    this.update_time = timestamp();
  }
}

module.exports = INotification;
