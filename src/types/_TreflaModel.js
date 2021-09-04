const TreflaType = require('./_TreflaType');
const { JSONParser, JSONStringify } = require('../helpers/common.helpers');


class TreflaModel extends TreflaType {
  constructor(args, jsonFields = []) {
    this.jsonFields = jsonFields;
    // do something to initialize with args.
  }

  toObject() {
    const object = super.toObject();
    delete object.jsonFields;
    return object;
  }

  stringify() {
    for (const key of this.jsonFields) {
      this[key] = JSONStringify(this[key]);
    }
    return this.toObject();
  }

  jsonify() {
    for (const key of this.jsonFields) {
      this[key] = JSONParser(this[key]);
    }
    return this.toObject();
  }
}

module.exports = TreflaModel;
