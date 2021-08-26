const path = require('path');
const { v4: uuid } = require('uuid');
const { Validator } = require('node-input-validator');
const formidable = require('formidable');
const fs = require('fs');
const sizeOf = require('image-size');

const config = require('../config/app.config');
const models = require('../models');
const helpers = require('../helpers');
const {
  generateTZTimeString,
  timestamp,
} = require('../helpers/common.helpers');
const {
  notiTypeIDVerified,
  notiTypeIDUnverified,
} = require('../constants/notification.constant');
const EVENTS = require('../constants/socket.constant');
const { identity } = require('.');

const activity = {
  addPhoto: async ({ user_id, url, type, ratio }) => {
    const photoData = helpers.model.generatePhotoData({
      user_id, url, type, ratio
    })
    return models.photo.create(photoData)
      .then(photo => {
        const hash = helpers.common.photoHash(photo);
        photo.thumbnail = hash;
        return models.photo.save(photo);
      });
  },
  uploadPhoto: ({ file, type, user_id }) => {
    const ext = path.extname(file.name);
    const newName = `${uuid()}${ext}`;
    const dirPath = helpers.file.confirmDir(path.resolve('assets/uploads'), type);
    if (!dirPath) throw new Error('Failed to create path!');
    const newPath = path.join(dirPath, newName);
    const url = `${config.cdnDomain}/uploads/${type}/${newName}`;
    const resolution = sizeOf(file.path);
    const ratio = resolution.width && resolution.height
      ? (resolution.height / resolution.width).toFixed(1)
      : 1;

    return helpers.file.read(file.path)
      .then(data => helpers.file.write(newPath, data))
      .then(() => helpers.file.delete(file.path))
      .then(() => activity.addPhoto({ user_id, url, type, ratio }));
  },
  pushNotificationOnVerification: ({ user, verified, data }) => {
    const title = {
      EN: 'Identity Verification Updated',
      RO: 'Verificarea identității a fost actualizată',
    };
    const body = {
      EN: verified ? 'Your identity has been verified.' : 'Your identity has been unverified.',
      RO: verified ? 'Identitatea dvs. a fost verificată.' : 'Identitatea dvs. a fost verificată.',
    };
    const lang = ['EN', 'RO'].includes(user.language.toUpperCase()) ? user.language.toUpperCase() : 'EN';
    if (user.device_token) {
      return helpers.common.sendSingleNotification({
        body: body[lang],
        title: title[lang],
        token: user.device_token,
        data,
      }).catch(e => {});
    }
  },
};

/**
 * @description  upload identity data.
 * @param {file | string} id
 * @param {file | string} photo
 * @todo validate the image urls.
 */
exports.uploadIdentityRequest = async (req, res) => {
  const { uid: user_id } = helpers.auth.getTokenInfo(req);
  const user = await models.user.getById(user_id);
  return helpers.common.parseForm(req)
    .then(async ({ fields, files }) => {
      // validate input for id photo.
      if (!fields.id && !files.id) {
        throw Object.assign(new Error("Id field is required!"));
      }
      // validate the input for person photo.
      if (!files.photo && !fields.photo && !user.photo) {
        throw new Object.assign(new Error('Please add your photo!'));
      }
      return { fields, files };
    })
    .then(async ({ files, fields }) => {
      const photos = {
        id: '',
        person: '',
      };
      if (fields.id) { photos.id = fields.id; }
      else {
        const isIdFileEmpty = await helpers.file.isEmpty(files.id.path);
        if (isIdFileEmpty) {
          throw new Error('Id file is empty!');
        }
        const photoRaw = await activity.uploadPhoto({ file: files.id, type: 'ID', user_id });
        const photo = await models.photo.output(photoRaw);
        photos.id = photo.url_editable;
      }
      if (fields.photo) { photos.person = fields.photo; }
      else if (files.photo) {
        const isPhotoFileEmpty = await helpers.file.isEmpty(files.photo.path);
        if (isPhotoFileEmpty) throw new Error('Photo file is empty!');
        const photoRaw = await activity.uploadPhoto({ file: files.photo, type: 'Person', user_id });
        const photo = await models.photo.output(photoRaw);
        photos.person = photo.url_editable;
      }

      const identity = await models.identity.getByUser(user_id);
      if (identity) {
        identity.photo_id = photos.id;
        identity.photo_person = photos.person;
        return models.identity.save(identity);
      } else {
        const identityData = helpers.model.generateIdentityData({
          user_id,
          photo_id: photos.id,
          photo_person: photos.person,
          verified: 0,
        });
        return models.identity.create(identityData);
      }
    })
    .then((identity) => res.json({
      status: true,
      message: 'success',
      data: identity,
    }));
}

/**
 * @description load identity list
 * @param { string } page
 * @param { string } limit
 * @return { object } { status, message, data, pager, hasMore }
 */
exports.loadIdentitiesRequest = async (payload) => {
  let { limit, page, type, sort } = payload;
  limit = Number(limit);
  page = Number(page);
  // sort = JSON.parse(sort);

  return Promise.all([
    models.identity.pagination({ page, limit }),
    models.identity.getTotal(),
  ])
    .then(([rows, total]) => {
      return {
        status: true,
        message: 'success',
        data: rows,
        pager: {
          limit,
          total,
        },
        hasMore: total > page * limit + rows.length,
      };
    });
}

/**
 * @description verify the identity of a user.
 * @param { String } id
 * @param { Object } socketClient
 * @worflow 
 *  1. mark the identity as verified.
 *  2. mark the user as 'ID verified'
 *  3. add a notification with type 'notiTypeIDVerified'
 *  4. send the socket to the user. SKT_ID_VERIFEID
 */
exports.verifyUserIdentityRequest = async ({ id, socketClient }) => {
  return models.identity.getById(id)
    .then(identity => { // update the identity record.
      identity.verified = 1;
      identity.update_time = helpers.common.timestamp();
      return Promise.all([
        models.identity.save(identity),
        models.user.getById(identity.user_id),
      ]);
    })
    .then(([identity, user]) => { // mark the user as ID verified.
      user.id_verified = 1;
      user.update_time = helpers.common.timestamp();
      return Promise.all([
        models.user.save(user),
        identity,
      ]);
    })
    .then(async ([user, identity]) => {
      // add a notification.
      const notiData = {
        sender_id: 0,
        receiver_id: user.id,
        type: notiTypeIDVerified,
        optional_val: id,
        time: generateTZTimeString(),
        is_read: 0,
        isFromAdmin: 1,
        isGuest: 0,
        text: '',
        create_time: timestamp(),
        update_time: timestamp(),
      };
      const notification = await models.notification.create(notiData);
      user.noti_num ++;
      await models.user.save(user);
      // send a proper socket.
      if (user.socket_id) {
        socketClient.emit(EVENTS.SKT_LTS_SINGLE, {
          to: user.socket_id,
          event: EVENTS.SKT_ID_VERIFEID,
          args: { identity },
        });
        await helpers.notification.socketOnNewNotification({ user_id: user.id, notification, socketClient });
      }
      const pushNotiData = {
        noti_id: notification.id,
        optionalVal: notification.optional_val,
        type: notification.type,
        user_id: 0,
        user_name: 'Admin',
        avatar: '',
      };
      activity.pushNotificationOnVerification({ user, verified: true, data: pushNotiData });
      return {
        status: true,
        message: 'success',
      };
    });
}

/**
 * @description unverify the identity of a user.
 * @param { String } id
 * @param { Object } socketClient
 * @workflow
 *  1. unverify identity & user
 *  2. add a notification.
 *  3. send a socket to the user.
 */
exports.unverifyUserIdentityRequest = async ({ id, reason, socketClient }) => {
  return models.identity.getById(id).then(identity => models.user.getById(identity.user_id)
    .then(async user => {
      identity.verified = 0;
      identity.update_time = timestamp();
      user.id_verified = 0;
      user.update_time = timestamp();

      // save the verification status.
      await Promise.all([
        models.identity.save(identity),
        models.user.save(user),
      ]);

      // add a notification.
      const notiData = {
        sender_id: 0,
        receiver_id: user.id,
        type: notiTypeIDUnverified,
        optional_val: id,
        time: generateTZTimeString(),
        is_read: 0,
        isFromAdmin: 1,
        isGuest: 0,
        text: reason || '',
        create_time: timestamp(),
        update_time: timestamp(),
      };

      const notification = await models.notification.create(notiData);
      user.noti_num ++;
      await models.user.save(user);
      // send a proper socket.
      if (user.socket_id) {
        socketClient.emit(EVENTS.SKT_LTS_SINGLE, {
          to: user.socket_id,
          event: EVENTS.SKT_ID_UNVERIFIED,
          args: { identity },
        });
        await helpers.notification.socketOnNewNotification({ user_id: user.id, socketClient, notification });
      }
      const pushNotiData = {
        noti_id: notification.id,
        optionalVal: notification.optional_val,
        type: notification.type,
        user_id: 0,
        user_name: 'Admin',
        avatar: '',
      };
      activity.pushNotificationOnVerification({ user, verified: false, data: pushNotiData });
      return {
        status: true,
        message: 'success',
      };
    })
  );
}
