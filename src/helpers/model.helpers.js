const { 
  DEFAULT_COMMENT,
  DEFAULT_POST
} = require('../constants/model.constant');


const generateCommentData = (basicData) => {
  const defaultKeys = Object.keys(DEFAULT_COMMENT);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_COMMENT[field];
  }
  return data;
}

const generatePostData = (basicData) => {
  const defaultKeys = Object.keys(DEFAULT_POST);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_POST[field];
  }
  return data;
}

module.exports = {
  generateCommentData,
  generatePostData
};
