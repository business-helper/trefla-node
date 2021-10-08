const TreflaType = require('./_TreflaType');
const { JSONParser, JSONStringify } = require('../helpers/common.helpers');


class TreflaModel extends TreflaType {
  constructor(args, jsonFields = []) {
    super();
    this.jsonFields = jsonFields;
    // do something to initialize with args.
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

  toObject() {
    const object = super.toObject();
    delete object.jsonFields;
    return object;
  }

  toJSON() {
    this.jsonify();
    return this.toObject();
  }

  toDB() {
    const object4DB = {};
    for (const key in this) {
      if (key === 'jsonFields') continue;
      object4DB[key] = this.jsonFields.includes(key) ? JSONStringify(this[key]) : this[key];
    }
    return object4DB;
  }

  acceptData(args = {}) {
    for (const key in args) {
      if (this[key] !== undefined) {
        this[key] = args[key];
      }
    }
    this.jsonify();
  }
}

module.exports = TreflaModel;
