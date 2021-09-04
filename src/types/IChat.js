const TreflaModel = require('./_TreflaModel');
const { DEFAULT_CHAT } = require('../constants/model.constant');

class IChat extends TreflaModel {
  constructor(args) {
    super(args);
    this.defineProperties();
    this.jsonFields = ['user_ids', 'sources', 'online_status', 'last_messages', 'lastMsgIdOnTransfer'];
    // initialize properties by args.
    for (const key in args) {
      if (this[key] !== undefined) this[key] = args[key];
    }
    // convert the JSON feilds into object or array.
    this.jsonify();
  }

  defineProperties() {
    this.id = '';
    this.user_ids = '';
    this.accept_status = '';
    this.sources = [];
    this.isForCard = 0;
    this.card_number = '';
    this.card_verified = 0;
    this.profile_revealed = 0;
    this.from_where = '';
    this.target_id = '';
    this.unread_nums = '';
    this.online_status = '';
    this.last_messages = '';
    this.isTransfered = 0;
    this.lastMsgIdOnTransfer = 0;
    this.create_time = 0;
    this.update_time = 0;
  }
}

module.exports = IChat;
