const path = require('path');
const { v4: uuid } = require('uuid');
const { Validator } = require('node-input-validator');
const formidable = require('formidable');
const fs = require('fs');
const sizeOf = require('image-size');

const config = require('../config/app.config');
const models = require('../models');
const helpers = require('../helpers');

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
    .then((identity) => res.json(identity));
}
