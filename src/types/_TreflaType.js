class TreflaType {
  toObject() {
    const data = {};
    for (const key in this) {
      const val = this[key];
      if (val && typeof val === 'object' && val.toObject && typeof val.toObject === 'function') {
        data[key] = val.toObject();
      } else {
        data[key] = val === undefined ? '' : val;
      }
    }
    return data;   
  }
}

module.exports = TreflaType;
