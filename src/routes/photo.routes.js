const { v4: uuid } = require('uuid');
const express = require('express');
const { Validator } = require('node-input-validator');
const photoRouters = express.Router();
const formidable = require('formidable');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('ffmpeg');
const FfmpegCommand = require('fluent-ffmpeg');
const extractFrames = require('ffmpeg-extract-frames');

const config = require('../config/app.config');
const photoCtrl = require('../controllers/photo.controller');
const Photo = require('../models/photo.model');
const User = require('../models/user.model');
const models = require('../models');
const helpers = require('../helpers');
const { BearerMiddleware } = require('../middlewares/basic.middleware');
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError, timestamp, photoHash } = require('../helpers/common.helpers');

const activity = {
  confirmDirPath: (parent, name) => helpers.file.confirmDir(parent, name),
  addPhoto: async ({ user_id, url, type, ratio, description = '' }) => {
    const photoData = helpers.model.generatePhotoData({
      user_id,
      url,
      type,
      ratio,
      description,
    });
    return Photo.create(photoData).then((photo) => {
      const hash = photoHash(photo);
      photo.thumbnail = hash;
      return Photo.save(photo);
    });
  },
  cropToThumnail: async ({ originPath, user_id }) => {
    const sizes = [40, 80];
    const image = sharp(originPath);
    const { width, height, format } = await image.metadata();
    console.log('[MetaData]', width, height, format);

    const edge = Math.min(width, height);
    const left = Math.floor((width - edge) / 2);
    const top = Math.floor((height - edge) / 2);

    const extract = image.extract({ left, top, width: edge, height: edge });
    // `${config.domain}/uploads/${type}/${newName}`
    const thumbPath = {};
    const ext = originPath.split('.')[1];
    sizes.forEach((size) => {
      thumbPath[size.toString()] = originPath.replace(`.${ext}`, `_${size}.${ext}`);
    });

    return Promise.all(
      sizes.map((size) => {
        return new Promise((resolve, reject) => {
          extract.resize(size, size).toFile(thumbPath[size.toString()], (err) => {
            if (err) reject(err);
            resolve(true);
          });
        });
      })
    );
  },
  updateProfilePhoto: async ({ photo }) => {
    const user_id = photo.user_id;
    const hash = helpers.common.photoHash(photo);
    const url = `${config.domain}/images/profile/${hash}`;

    return models.user.getById(user_id).then((user) => {
      user.photo = url;
      user.update_time = timestamp();
      return models.user.save(user);
    });
  },
  updateUserCardImageURL: async ({ user_id, url }) => {
    return models.user.getById(user_id).then((user) => {
      user.card_img_url = url;
      user.update_time = timestamp();
      return models.user.save(user);
    });
  },
  readFile: (path_from) => helpers.file.read(path_from),
  writeFile: (path_to, data) => helpers.file.write(path_to, data),
  deleteFile: (path) => helpers.file.delete(path),
  extractThumbnailFromVideo: ({ src, photo }) => {
    const dirPath = activity.confirmDirPath(path.resolve('assets/uploads'), 'frames');
    const frameName = `${uuid()}.jpg`;
    return extractFrames({
      input: src,
      output: path.resolve(dirPath, frameName),
      offsets: [1000],
    })
      .then((what) => {
        console.log('[What]', what);
        photo.thumbnail = `${config.cdnDomain}/uploads/frames/${frameName}`;
        return models.photo.save(photo);
      })
      .then(async (photo) => {
        const thumbnail_param = {
          user_id: photo.user_id,
          url: photo.thumbnail,
          type: 'internal',
          ratio: 1,
        };
        const thumbnail = await activity.addPhoto(thumbnail_param);
        photo.thumbnail = thumbnail.thumbnail;
        return models.photo.save(photo);
      });
  },
};

// bearer authentication
photoRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

photoRouters.get('/user/:id', async (req, res) => {
  const validator = new Validator(
    {
      id: req.params.id,
    },
    {
      id: 'required|integer',
    }
  );

  validator.addPostRule(async (provider) => {
    User.getById(provider.inputs.id).then((user) => {
      if (!user) {
        provider.error('id', 'custom', "User doesn't exist with the given id!");
      }
    });
  });

  return validator
    .check()
    .then((matched) => {
      if (!matched) {
        throw Object.assign(new Error('Invalid request'), { code: 400, details: validator.errors });
      }
    })
    .then(() => photoCtrl.getByUserIdReq(req, res))
    .then((result) => res.json(result))
    .catch((error) => respondValidateError(res, error));
});

photoRouters.get('/:id', async (req, res) => {
  const validator = new Validator(
    {
      id: req.params.id,
    },
    {
      id: 'required|integer',
    }
  );

  validator.addPostRule(async (provider) =>
    Promise.all([Photo.getById(provider.inputs.id)]).then(([byId]) => {
      if (!byId) {
        provider.error('id', 'custom', `Photo with id "${provider.inputs.id}" does not exists!`);
      }
    })
  );

  return validator
    .check()
    .then((matched) => {
      if (!matched) {
        throw Object.assign(new Error('Invalid request'), {
          code: 400,
          details: validator.errors,
        });
      }
    })
    .then(() => photoCtrl.getById(req, res))
    .catch((error) => respondValidateError(res, error));
});

photoRouters.get('/', async (req, res) => {
  return photoCtrl.getAllOfUser(req, res).catch((error) => respondValidateError(res, error));
});

photoRouters.post('/upload', async (req, res) => {
  const { uid: user_id } = helpers.auth.getTokenInfo(req);
  let form = formidable.IncomingForm();

  // convert callback => promise.
  const parseForm = () => {
    return new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });
  };

  return parseForm()
    .then(async ({ fields, files }) => {
      const type = fields.type || 'normal';
      const ratio = fields.ratio || 1;
      const description = fields.description || '';

      const oldPath = files.file.path;
      const ext = path.extname(files.file.name);
      const newName = `${uuid()}${ext}`;
      const dirPath = activity.confirmDirPath(path.resolve('assets/uploads'), type);

      if (!dirPath) throw new Error('Failed to create path!');

      const newPath = path.join(dirPath, newName);
      const url = `${config.cdnDomain}/uploads/${type}/${newName}`;

      return activity
        .readFile(oldPath)
        .then((data) => activity.writeFile(newPath, data))
        .then(() => activity.deleteFile(oldPath))
        .then(() => activity.addPhoto({ url, user_id, type, ratio, description }))
        .then(async (photo) => {
          // crop image if type is 'profile'
          if (type === 'profile') {
            await activity
              .cropToThumnail({ user_id, originPath: newPath })
              .then(() => activity.updateProfilePhoto({ photo }));
          } else if (type === 'card') {
            await activity.updateUserCardImageURL({ user_id, url });
          } else if (type == 'video') {
            return activity.extractThumbnailFromVideo({ src: newPath, photo });
          }
          return photo;
        })
        .then((photo) =>
          res.json({
            status: true,
            message: 'File has been uploaded!',
            url: `${config.cdnDomain}/uploads/${type}/${newName}`,
            data: models.photo.output(photo),
          })
        );
    })
    .catch((error) => respondValidateError(res, error));
});

photoRouters.post('/', async (req, res) => {
  const validator = new Validator(
    {
      ...req.body,
    },
    {
      url: 'required',
    }
  );

  return validator
    .check()
    .then((matched) => {
      if (!matched) {
        throw Object.assign(new Error('Invalid request'), {
          code: 400,
          details: validator.errors,
        });
      }
    })
    .then(() => photoCtrl.create(req, res))
    .catch((error) => respondValidateError(res, error));
});

photoRouters.patch('/:id/private', async (req, res) => {
  const { uid: user_id } = helpers.auth.getTokenInfo(req);
  const validator = new Validator(
    {
      ...req.body,
      ...req.params,
    },
    {
      private: 'required',
      id: 'required',
    }
  );

  return validator
    .check()
    .then(async (matched) => {
      if (!matched) throw Object.assign(new Error('Invalid request'), { code: 400, details: validator.errors });
      const photo = await models.photo.getById(req.params.id);
      if (!photo) throw new Error('Photo not found!');
      if (photo.user_id !== user_id) throw new Error('Permission denied!');
    })
    .then(() => photoCtrl.updatePrivateStatus(Number(req.params.id), req.body.private))
    .then((result) => res.json({ status: true, message: 'success', data: result }))
    .catch((error) => respondValidateError(res, error));
});

/**
 * @descriptioin update the order status of photos.
 * @param { Array<Object> } orders
 * @member { Integer } id
 * @member { Integer } orderIdx
 * @return { Object }
 * @member { String } message
 * @member { Boolean } status
 * @member { Array<Photo> } data
 */
photoRouters.route('/orders').patch(async (req, res) => {
  const { uid: user_id } = helpers.auth.getTokenInfo(req);
  const validator = new Validator(req.body, {
    orders: 'required|array',
    'orders.*.id': 'required|integer',
    'orders.*.orderIdx': 'required|integer',
  });
  return validator
    .check()
    .then((matched) => {
      if (!matched) throw Object.assign(new Error('Invalid request'), { code: 400, details: validator.errors });
    })
    .then(() => photoCtrl.updateOrderIndices(user_id, req.body.orders))
    .then((result) => res.json({ status: true, message: 'success', data: result }))
    .catch((error) => respondValidateError(res, error));
});

photoRouters.delete('/:id', async (req, res) => {
  const validator = new Validator(
    {
      id: req.params.id,
    },
    {
      id: 'required|integer',
    }
  );

  validator.addPostRule(async (provider) =>
    Promise.all([Photo.getById(provider.inputs.id)]).then(([byId]) => {
      if (!byId) {
        provider.error('id', 'custom', `Photo with id "${provider.inputs.id}" does not exists!`);
      }
    })
  );

  return validator
    .check()
    .then((matched) => {
      if (!matched) {
        throw Object.assign(new Error('Invalid request'), {
          code: 400,
          details: validator.errors,
        });
      }
    })
    .then(() => photoCtrl.deleteById(req, res))
    .catch((error) => respondValidateError(res, error));
});

module.exports = photoRouters;
