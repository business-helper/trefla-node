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

const getTime = () => {
  return new Date().getTime();
};

const respondError = (res, error) => {
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

function sendMail({ from, to, subject, body }) {
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

module.exports = {
  generateTZTimeString,
  getTime,
	respondError,
  respondValidateError,
  sendMail,
  timestamp,
};
