const { 
  DEFAULT_COMMENT,
  DEFAULT_COMMENTLIKE,
  DEFAULT_NOTIFICATION,
  DEFAULT_POST,
  DEFAULT_POSTLIKE,
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

const generatePostLikeData = basicData => {
  const defaultKeys = Object.keys(DEFAULT_POSTLIKE);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_POSTLIKE[field];
  }
  return data;
}

const generateCommentLikeData = basicData => {
  const defaultKeys = Object.keys(DEFAULT_COMMENTLIKE);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_COMMENTLIKE[field];
  }
  return data;
}

module.exports = {
  generateCommentData,
  generateCommentLikeData,
  generateNotificationData,
  generatePostData,
  generatePostLikeData,
};
