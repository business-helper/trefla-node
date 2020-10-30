const { 
	ERR_MSG_NORMAL,
	ERR_MSG_VALIDATE
} = require("../constants/common.constant");

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

const timestamp = () => {
  return Math.floor(new Date().getTime() / 1000);
};

module.exports = {
  getTime,
	respondError,
	respondValidateError,
  timestamp,
};
