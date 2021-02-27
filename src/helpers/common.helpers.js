const path = require('path');
const nodemailer = require('nodemailer');const admin = require('firebase-admin');
const serviceAccount = require('../config/trefla-firebase-adminsdk-ic030-de756cf0e9.json');
const logger = require('../config/logger');

const { 
	ERR_MSG_NORMAL,
	ERR_MSG_VALIDATE
} = require("../constants/common.constant");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://trefla.firebaseio.com"
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  // host: 'smtp.gmail.com',
  // port: 587,
  // secure: false,
  auth: {
    user: 'martinstevanovic000@gmail.com',
    pass: 'blizanac1',
  },
});

const formatAsTwoDigits = (num) => {
  return num > 9 ? num : '0' + num;
}

const generateTZTimeString = (strTime = '') => {
  let dt = !strTime ? new Date() : new Date(strTime);
  const year = dt.getFullYear();
  const month = formatAsTwoDigits(dt.getMonth() + 1);
  const date = formatAsTwoDigits(dt.getDate());
  const hh = formatAsTwoDigits(dt.getHours());
  const mm = formatAsTwoDigits(dt.getMinutes());
  const ss = formatAsTwoDigits(dt.getSeconds());
  const tz = -dt.getTimezoneOffset();
  return `${year}-${month}-${date}-${hh}-${mm}-${ss}:${tz}`;
}

const bool2Int = (boolVal) => {
  return boolVal ? 1 : 0;
}

const deg2rad = function (deg) {
  return deg * (Math.PI / 180);
};

const getTime = () => {
  return new Date().getTime();
};

const int2Bool = (intVal) => {
  return Number(intVal) === 1 ? true : false;
}

const respondError = (res, error) => {
  // console.log(error);
  logger.error(error);
  return res
    .status(500)
    .json({ status: false, message: error.message || ERR_MSG_NORMAL });
};

const respondValidateError = (res, error) => {
  console.log('[Validation error]', error);
  logger.error(error);
  const details = error.details || {}; //console.log(details);

  return res.status(400).json({
		status: false,
		message: Object.keys(details).length > 0 ? details[Object.keys(details)[0]].message : (error.message || ERR_MSG_VALIDATE),
		details: error.details || {}
	});
};

const sendMail = ({ from, to, subject, body }) => {
  const mailOptions = {
    from: 'Trefla Support <admin@trefla.com>',
    to: to,
    subject: subject,
    // text: 'That was easy!',
    html: body,
  };

  return transporter.sendMail(mailOptions);
}

const timestamp = (dt = null) => {
  !dt ? dt = new Date() : null;
  const time = dt.getTime();
  return Math.floor(time / 1000);
};

const getDistanceFromLatLonInMeter = function (location1, location2) {
  const lat1 = location1.lat;
  const lon1 = location1.lng;
  const lat2 = location2.lat;
  const lon2 = location2.lng;

  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1); // deg2rad below
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d * 1000;
};

const getTotalLikes = (obj) => {
  const fields = [1,2,3,4,5,6].map(type => `like_${type}_num`);
  return fields.reduce((total, field) => total + Number(obj[field]), 0);
}

/**
 * @function getTimeAfterDelta
 * @param {Date} nowDt
 * @param {int} delta // days
 * @return {Date}
 */
const getTimeAfter = (nowDt = null, delta = 0) => {
  !nowDt ? nowDt = new Date() : null;
  let time = nowDt.getTime();
  return new Date(time + 86400 * 1000 * delta);
}

const string2Coordinate = function (str) {
  try {
    const tmp_arr = str.split(',');
    return { lat: Number(tmp_arr[0]), lng: Number(tmp_arr[1]) };
  } catch (error) {
    return { lat: 0.0, lng: 0.0 };
  }
};

const string2Timestamp = (str_time) => {
  const arr1 = str_time.split(':');
  const date_arr = arr1[0].split('-');
  const dt = new Date(
    Number(date_arr[0]),
    Number(date_arr[1]) - 1,
    Number(date_arr[2]),
    Number(date_arr[3]),
    Number(date_arr[4]),
    Number(date_arr[5])
  );
  const my_timezone = -dt.getTimezoneOffset();
  const time = dt.getTime();
  const timezoneOffset = Number(arr1[1]);
  const final_time =
    Math.floor(time / 1000) - (my_timezone - timezoneOffset) * 60;
  return final_time;
};

const chatPartnerId = (user_ids, my_id) => {
  if (typeof user_ids === 'string') {
    user_ids = JSON.parse(user_ids);
  }
  let myPosition = user_ids.indexOf(my_id);
  if (myPosition === -1) { return 0; }
  const partnerPos = 1 - myPosition;
  return user_ids[partnerPos] !== my_id ? user_ids[partnerPos] : 0;
}

const JSONParser = (data) => {
  if (!data) return data;
  if (typeof data === 'object') return data;

  return JSON.parse(data);
}

const JSONStringify = (data) => {
  if (!data) return data;
  if (typeof data === 'object') return JSON.stringify(data);
  return data;  
}

const stringifyModel = (data) => {
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'object') {
      data[key] = JSONStringify(data[key]);
    }
  })
  return data;
}

const filterAroundUsers = (strPostCoord, users) => {
  try {
    const postPos = string2Coordinate(strPostCoord);
    return users.filter(user => {
      const userPos = getUserLastLocation(user);
      const d = getDistanceFromLatLonInMeter(postPos, userPos);
      const r = user.radiusAround || 100;
      return d <= r;
    });
  }
  catch(e) {
    return [];
  }
}

const getUserLastLocation = function (user) {
  try {
    location_array = JSONParser(user.location_array);
    const locationItem = location_array[location_array.length - 1];
    const tmp_arr = locationItem.split('&&');
    return string2Coordinate(tmp_arr[0]);
  } catch (error) {
    return { lat: 0, lng: 0 };
  }
};

const SendAllMultiNotifications = async function (messages) {
  if (!messages || messages.length === 0) return false;
  return admin.messaging().sendAll(messages);
};

const sendMultiNotifications = async ({ title, body, tokens }) => {
  const message = {
    tokens,
    notification: { body, title },
  };
  return admin.messaging().sendMulticast(message);
}

const sendSingleNotification = async ({ title, body, token, data = {} }) => {
  const message = {
    token,
    notification: { title, body },
    data,
  };
  return admin.messaging().send(message);
}

const generateRandomString = (length) => {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

module.exports = {
  bool2Int,
  chatPartnerId,
  filterAroundUsers,
  generateRandomString,
  generateTZTimeString,
  getDistanceFromLatLonInMeter,
  getTime,
  getTimeAfter,
  getTotalLikes,
  int2Bool,
  JSONParser,
  JSONStringify,
	respondError,
  respondValidateError,
  SendAllMultiNotifications,
  sendMail,
  sendMultiNotifications,
  sendSingleNotification,
  string2Coordinate,
  string2Timestamp,
  stringifyModel,
  timestamp,
};
