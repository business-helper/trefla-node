const { 
  DEFAULT_COMMENT,
  DEFAULT_NOTIFICATION,
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

const generateNotificationData = (basicData) => {
  const defaultKeys = Object.keys(DEFAULT_NOTIFICATION);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_NOTIFICATION[field];
  }
  return data;
}

module.exports = {
  generateCommentData,
  generateNotificationData,
  generatePostData
};
