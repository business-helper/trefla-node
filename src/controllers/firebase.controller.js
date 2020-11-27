const admin = require('firebase-admin');
const serviceAccount = require('../config/trefla-firebase-adminsdk-ic030-de756cf0e9.json');

const models = require('../models/index');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://trefla.firebaseio.com"
});


exports.sendNotification2UserReq = ({ user_id, title, body }) => {
  return models.user.getById(user_id)
    .then(user => {
      if (!user || !user.device_token) {
        throw Object.assign(new Error("Can not send notification to user!"), { code: 400 });
      }

      const { device_token: token } = user; console.log('[Token]', token);
      return sendSingleNotification({
        token, title, body
      });
    })
}

exports.sendBulkNotificationReq = ({ user_ids, title, body }) => {
  return models.user.getByIds(user_ids)
    .then(users => {
      const tokens = users.filter(user => user.device_token).map(user => user.device_token);
      if (tokens.length === 0) {
        throw Object.assign(new Error('None of users can receive notification!'), { code: 400 });
      }

      return sendMultiNotifications({ tokens, title, body });
    })
}

const sendSingleNotification = async ({ title, body, token }) => {
  const message = {
    token,
    notification: { title, body },
  };
  return admin.messaging().send(message);
}

const sendMultiNotifications = async ({ title, body, tokens }) => {
  const message = {
    tokens,
    notification: { body, title },
  };
  return admin.messaging().sendMulticast(message);
}
