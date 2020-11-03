const { 
  DEFAULT_POST 
} = require('../constants/model.constant');

const generatePostData = (basicData) => {
  const defaultKeys = Object.keys(DEFAULT_POST);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_POST[field];
  }
  return data;
}

module.exports = {
  generatePostData
};
