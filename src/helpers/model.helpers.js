const { 
  DEFAULT_ADMIN,
  DEFAULT_ADMIN_NOTIFICATION,
  DEFAULT_COMMENT,
  DEFAULT_COMMENTLIKE,
  DEFAULT_NOTIFICATION,
  DEFAULT_PHOTO,
  DEFAULT_POST,
  DEFAULT_POSTLIKE,
  DEFAULT_REPORT,
  DEFAULT_CHAT,
  DEFAULT_MESSAGE,
} = require('../constants/model.constant');
const { 
  generateTZTimeString,
  getDistanceFromLatLonInMeter,
  string2Coordinate,
  string2Timestamp,
  timestamp,
} = require('./common.helpers');


const generateAdminData = basicData => {
  const defaultKeys = Object.keys(DEFAULT_ADMIN);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_ADMIN[field];
  }
  return data;
}

const generateAdminNotiData = basicData => {
  const defaultKeys = Object.keys(DEFAULT_ADMIN_NOTIFICATION);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_ADMIN_NOTIFICATION[field];
  }
  data.payload = JSON.stringify(data.payload || {});
  data.create_time = data.update_time = timestamp();
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
  let unread_nums = [0,0];

  online_status[sender_id.toString()] = 1;
  if (basicData.receiver_id) {
    user_ids.push(basicData.receiver_id);
    online_status[basicData.receiver_id.toString()] = receiver ? receiver.online : 0;
  }
  if (basicData.message) {
    unread_nums = [0, 1];
  }
  // if (basicData.message) {
    last_messages.push({
      msg: basicData.message || "",
      time: generateTZTimeString()
    });
  // }
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
  data.create_time = timestamp();
  data.update_time = timestamp();
  return data;
}

const generateCommentData = (basicData) => {
  const defaultKeys = Object.keys(DEFAULT_COMMENT);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_COMMENT[field];
  }
  data.time = generateTZTimeString();
  data.create_time = timestamp();
  data.update_time = timestamp();
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

const generateMessageData = basicData => {
  const defaultKeys = Object.keys(DEFAULT_MESSAGE);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_MESSAGE[field];
  }
  data.time = generateTZTimeString();
  data.create_time = timestamp();
  data.update_time = timestamp();
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

const generatePhotoData = (basicData) => {
  const defaultKeys = Object.keys(DEFAULT_PHOTO);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_PHOTO[field];
  }
  return data;
}

const generatePostData = (basicData) => {
  const defaultKeys = Object.keys(DEFAULT_POST);
  let data = {};
  for (let field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_POST[field];
  }
  data.post_time = generateTZTimeString();
  data.create_time = timestamp();
  data.update_time = timestamp();
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

const generateReportData = basicData => {
  const defaultKeys = Object.keys(DEFAULT_REPORT);
  let data = {};
  for (const field of defaultKeys) {
    data[field] = basicData[field] !== undefined ? basicData[field] : DEFAULT_REPORT[field];
  }
  return data;
}

const checkPostLocationWithUser = (post, user, aroundSearchPeriod, locationIndex) => {
  const postLocation = string2Coordinate(post.location_coordinate);
  const postTime = string2Timestamp(post.post_time);
  const userAroundRadius = user.radiusAround || 100;

  if (!user.location_array || !user.location_array.length) return true;

  if (locationIndex || locationIndex === 0) {
    if (locationIndex < 0 || locationIndex > user.location_array.length - 1) {
      return false;
    }

    const currentArray = user.location_array[locationIndex].split('&&');
    let userLocation = string2Coordinate(currentArray[0]);

    if ( getDistanceFromLatLonInMeter(postLocation, userLocation) > userAroundRadius ) {
      return false;
    }
    const givenTime = string2Timestamp(currentArray[1]);
    let nextLocationTime = Math.floor(new Date().getTime() / 1000);
    if (locationIndex < user.location_array.length - 1) {
      const nextArray = user.location_array[locationIndex + 1].split('&&');
      nextLocationTime = string2Timestamp(nextArray[1]);
    }
    return givenTime <= postTime && postTime <= nextLocationTime;
  } else {
    for (let [index, locationItem] of user.location_array.entries()) {
      const itemMembers = locationItem.split('&&');
      // distance condition
      let userLocation = string2Coordinate(itemMembers[0]);
      // console.log(
      //   'Distance is ',
      //   getDistanceFromLatLonInMeter(postLocation, userLocation)
      // );
      if (
        getDistanceFromLatLonInMeter(postLocation, userLocation) >
        userAroundRadius
      ) {
        // console.log('[around] distance not match',);
        // return false;
        continue;
      }
      // console.log('[around] distance passed', getDistanceFromLatLonInMeter(postLocation, userLocation), userAroundRadius);
      // time condition
      const locationTime = string2Timestamp(itemMembers[1]);

      // get next location time
      let nextLocationTime = Math.floor(new Date().getTime() / 1000);
      if (index < user.location_array.length - 1) {
        const nextItemArray = user.location_array[index + 1].split('&&');
        nextLocationTime = string2Timestamp(nextItemArray[1]);
      }

      // postTime > locationTime
      if (locationTime <= postTime && postTime <= nextLocationTime) {
        return true;
      } else {
        continue;
      }
      // if (
      //   locationTime > postTime ||
      //   locationTime < postTime - deltaTime * 86400
      // ) {
      //   // console.log('[around] time not passed', postTime - locationTime)
      //   // return false;
      //   continue;
      // }
      // return true;
    }
  }
}

module.exports = {
  checkPostLocationWithUser,
  generateAdminData,
  generateAdminNotiData,
  generateChatData,
  generateCommentData,
  generateCommentLikeData,
  generateMessageData,
  generateNotificationData,
  generatePhotoData,
  generatePostData,
  generatePostLikeData,
  generateReportData,
};
