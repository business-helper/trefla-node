const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

const { appSecret } = require('../config/app.config');
const { DEFAULT_USER } = require('../constants/model.constant');
const psSaltRounds = 10;


const genreateAuthToken = (user, role = 'USER', role2 = 'USER') => {
  return jwt.sign(
    {
      foo: "bar",
      uid: user.id,
      email: user.email,
      user_name: user.user_name,
      role: role,
      role2,
      iat: Math.floor(Date.now() / 1000) - 30,
    },
    appSecret,
    { expiresIn: '100d' }
  );
};

const parseToken = (token) => {
  try {
    const privateKey = appSecret;
    const decoded = jwt.verify(token, privateKey);
    return decoded;
  } catch (error) {
    console.log("[Parse Token]", error.message);
    return false;
  }
};

const generateUserData = (basicData) => {
  const userKeys = Object.keys(DEFAULT_USER);
  let userObject = {};
  for (let field of userKeys) {
    userObject[field] = (basicData[field] !== undefined && basicData[field] !== null) ? basicData[field] : DEFAULT_USER[field];
  }
  if (!userObject.sex) userObject.sex = 0;
  if (!userObject.location_address) userObject.location_address = "";
  return userObject;
}

const generatePassword = async (strPassword) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(strPassword, psSaltRounds, (err, hash) => {
			if (err) reject(err);
			else resolve(hash);
		});
  });
};

const comparePassword = (plainPassword, hash) => {
	return new Promise((resolve, reject) => {
		bcrypt.compare(plainPassword, hash, (err, result) => {
			if (err) reject(err);
			else resolve(result);
		});
	});
}

const getTokenInfo = (req) => {
  const bauth = (req.headers.authorization || '').split(' ')[1] || '';
  return parseToken(bauth);
}



module.exports = {
  comparePassword,
  genreateAuthToken,
  generatePassword,
  generateUserData,
  getTokenInfo,
	parseToken,
};
