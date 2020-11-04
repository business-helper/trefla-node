const nodemailer = require('nodemailer');
const { 
	ERR_MSG_NORMAL,
	ERR_MSG_VALIDATE
} = require("../constants/common.constant");


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

const getTime = () => {
  return new Date().getTime();
};

const int2Bool = (intVal) => {
  return Number(intVal) === 1 ? true : false;
}

const respondError = (res, error) => {
  console.log(error);
  return res
    .status(500)
    .json({ status: false, message: error.message || ERR_MSG_NORMAL });
};

const respondValidateError = (res, error) => {
  return res.status(500).json({
		status: false,
		message: error.message || ERR_MSG_VALIDATE,
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

const timestamp = () => {
  return Math.floor(new Date().getTime() / 1000);
};

const getTotalLikes = (obj) => {
  const fields = [1,2,3,4,5,6].map(type => `like_${type}_num`);
  return fields.reduce((total, field) => total + Number(obj[field]), 0);
}

module.exports = {
  bool2Int,
  generateTZTimeString,
  getTime,
  getTotalLikes,
  int2Bool,
	respondError,
  respondValidateError,
  sendMail,
  timestamp,
};
