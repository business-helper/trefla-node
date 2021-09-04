const TreflaModel = require('./_TreflaModel');
const { DEFAULT_CHAT } = require('../constants/model.constant');

class IChat extends TreflaModel {
  // this.id = '';
  // user_ids;
  // accept_status;
  // sources;
  // isForCard;
  // card_number;
  // card_verified;
  // profile_revealed;
  // from_where;
  // target_id;
  // unread_nums;
  // online_status;
  // last_messages;
  // isTransfered;
  // lastMsgIdOnTransfer;
  // create_time;
  // update_time;
  constructor(args) {
    super(args);
    this.jsonFields = ['user_ids', 'sources', 'online_status', 'last_messages', 'lastMsgIdOnTransfer'];
    // initialize properties by args.
    for (const key in DEFAULT_CHAT) {
      this[key] = DEFAULT_CHAT[key];
    }
    this.profile_revealed = true;
  }

  toReturn() {
    return 'hi';
  }
}

module.exports = { IChat };
