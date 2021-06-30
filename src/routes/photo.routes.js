const { v4: uuid } = require('uuid');
const express = require("express");
const { Validator } = require("node-input-validator");
const photoRouters = express.Router();
const formidable = require('formidable');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');

const config = require('../config/app.config');
const photoCtrl = require("../controllers/photo.controller");
const Photo = require('../models/photo.model');
const User = require('../models/user.model');
const models = require('../models');
const helpers = require('../helpers');
const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError, timestamp } = require("../helpers/common.helpers");

const activity = {
  confirmDirPath: (parent, name) => {
    try {
      const dirPath = path.join(parent, name);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
      } 
      return dirPath;
    } catch (error) {
      return false;
    }
  },
  addPhoto: async ({ user_id, url, type }) => {
    const photoData = helpers.model.generatePhotoData({
      user_id, url, type
    })
    return Photo.create(photoData);
  },
  cropToThumnail: async ({ originPath, user_id }) => {
    const sizes = [50, 100];
    const image = sharp(originPath);
    const { width, height, format } = await image.metadata();
    console.log('[MetaData]', width, height, format)

    const edge = Math.min(width, height);
    const left = Math.floor((width - edge) / 2);
    const top = Math.floor((height - edge) / 2);
    
    const extract = image.extract({ left, top, width: edge, height: edge });
    // `${config.domain}/uploads/${type}/${newName}`
    const thumbPath = {};
    const ext = originPath.split('.')[1];
    sizes.forEach((size) => {
      thumbPath[size.toString()]  = originPath.replace(`.${ext}`, `_${size}.${ext}`);
    });

    return Promise.all(sizes.map((size) => {
      return new Promise((resolve, reject) => {
        extract.resize(size, size)
        .toFile(thumbPath[size.toString()], err => {
          if (err) reject(err);
          resolve(true)
        })
      })
    }));
  },
  updateProfilePhoto: async ({ photo }) => {
    const user_id = photo.user_id;
    const hash = helpers.common.photoHash(photo);
    const url = `${config.domain}/images/profile/${hash}`;
    
    return models.user.getById(user_id)
      .then((user) => {
        user.photo = url;
        user.update_time = timestamp();
        return models.user.save(user);
      });
  },
  updateUserCardImageURL: async ({ user_id, url }) => {
    return models.user.getById(user_id)
      .then((user) => {
        user.card_img_url = url;
        user.update_time = timestamp();
        return models.user.save(user);
      });
  },
}

// bearer authentication
photoRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

photoRouters.get('/user/:id', async (req, res) => {
  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required|integer",
  });

  validator.addPostRule(async (provider) => {
    User.getById(provider.inputs.id)
      .then(user => {
        if (!user) {
          provider.error("id", "custom", "User doesn't exist with the given id!");
        }
      })
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), { code: 400, details: validator.errors,});
      }
    })
    .then(() => photoCtrl.getByUserIdReq(req, res))
    .then(result => res.json(result))
    .catch((error) => respondValidateError(res, error));
});

photoRouters.get('/:id', async (req, res) => {
  const validator = new Validator({
    id: req.params.id
  }, {
    id: "required|integer",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Photo.getById(provider.inputs.id)
    ]).then(([byId]) => {
      if (!byId) {
        provider.error("id", "custom", `Photo with id "${provider.inputs.id}" does not exists!`);
      }
    })
  );

  return validator
  .check()
  .then((matched) => {
    if (!matched) {
      throw Object.assign(new Error("Invalid request"), {
        code: 400,
        details: validator.errors,
      });
    }
  })
  .then(() => photoCtrl.getById(req, res))
  .catch((error) => respondValidateError(res, error));
})

photoRouters.get('/', async (req, res) => {
  return photoCtrl.getAllOfUser(req, res)
    .catch(error => respondValidateError(res, error));
});

photoRouters.post('/upload', async (req, res) => {
  const { uid: user_id } = helpers.auth.getTokenInfo(req);

  let form = formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    const type = fields.type || 'normal';
    
    let oldpath = files.file.path;
    let ext = path.extname(files.file.name);// console.log('[old path]', oldpath, ext)
    let newName = `${uuid()}${ext}`;

    const dirPath = activity.confirmDirPath(path.resolve('assets/uploads'), type);

    if (!dirPath) {
      return res.json({
        'status': false,
        'message': 'Failed to create path!',
      });
    }

    let newpath = path.join(dirPath, newName);

    let url = `${config.cdnDomain}/uploads/${type}/${newName}`;
    fs.readFile(oldpath, function(err, data) {
      if (err) {
        return res.json({
          status: false,
          message: 'Failed to read file...',
          details: err.message,
        });
      }
      fs.writeFile(newpath, data, async function(err) {
        if (err) {
          return res.json({
            status: false,
            message: 'Failed to write file...',
            details: err.message,
          });
        }
        fs.unlink(oldpath, function(err) {
          if (err) {
            return res.json({
              status: false,
              message: 'Failed to delete file...',
              details: err.message,
            });
          }
        })

        // add to db.
        const photo = await activity.addPhoto({ url, user_id, type });
        // crop image if type is 'profile'
        if (type === 'profile') {
          await activity.cropToThumnail({ user_id, originPath: newpath })
            .then(() => activity.updateProfilePhoto({ photo }))
        } else if (type === 'card') {
          await activity.updateUserCardImageURL({ user_id, url })
        }

        return res.json({
          status: true,
          message: 'File has been uploaded!',
          url: `${config.cdnDomain}/uploads/${type}/${newName}`,
          data: models.photo.output(photo),
        })
      })
    });
  })
});

photoRouters.post('/', async (req, res) => {

  const validator = new Validator({
    ...req.body 
  }, {
    url: "required"
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), {
          code: 400,
          details: validator.errors,
        });
      }
    })
    .then(() => photoCtrl.create(req, res))
    .catch(error => respondValidateError(res, error));
});

photoRouters.delete('/:id', async (req, res) => {
  const validator = new Validator({
    id: req.params.id
  }, {
    id: "required|integer",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Photo.getById(provider.inputs.id)
    ]).then(([byId]) => {
      if (!byId) {
        provider.error("id", "custom", `Photo with id "${provider.inputs.id}" does not exists!`);
      }
    })
  );

  return validator
  .check()
  .then((matched) => {
    if (!matched) {
      throw Object.assign(new Error("Invalid request"), {
        code: 400,
        details: validator.errors,
      });
    }
  })
  .then(() => photoCtrl.deleteById(req, res))
  .catch((error) => respondValidateError(res, error));
});

module.exports = photoRouters;
