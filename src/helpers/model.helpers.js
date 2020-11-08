const { 
  DEFAULT_COMMENT,
  DEFAULT_COMMENTLIKE,
  DEFAULT_NOTIFICATION,
  DEFAULT_POST,
  DEFAULT_POSTLIKE,
  DEFAULT_CHAT,
  DEFAULT_MESSAGE
} = require('../constants/model.constant');
const { generateTZTimeString } = require('./common.helpers');


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

const generateChatData = (basicData, sender_id, receiver = null) => {
  const defaultKeys = Object.keys(DEFAULT_CHAT);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_CHAT[field];
  }
  // normal case
  let user_ids = [sender_id];
  let online_status = {};
  let last_messages = [];
  let unread_nums = [];

  online_status[sender_id.toString()] = 1;
  if (basicData.receiver_id) {
    user_ids.push(basicData.receiver_id);
    online_status[basicData.receiver_id.toString()] = receiver ? receiver.online : 0;
  }
  if (basicData.message) {
    unread_nums = [0, 1];
  }
  if (basicData.message) {
    last_messages.push({
      msg: basicData.message || "",
      time: generateTZTimeString()
    });
  }
  data.user_ids = JSON.stringify(user_ids);
  data.online_status = JSON.stringify(online_status);
  data.last_messages = JSON.stringify(last_messages);
  data.unread_nums = JSON.stringify(unread_nums);  

  // id chat
  if (basicData.isForCard !== undefined) {
    data.isForCard = basicData.isForCard;
  }
  if (basicData.card_number !== undefined) {
    data.card_number = basicData.card_number;
  }
  return data;
}

const generateMessageData = basicData => {
  const defaultKeys = Object.keys(DEFAULT_MESSAGE);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_MESSAGE[field];
  }
  return data;
}

module.exports = {
  generateChatData,
  generateCommentData,
  generateCommentLikeData,
  generateMessageData,
  generateNotificationData,
  generatePostData,
  generatePostLikeData,
};
