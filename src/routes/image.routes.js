const express = require('express');
const routes = express.Router();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const config = require('../config/app.config');
const models = require('../models');

const { parsePhotoHash } = require('../helpers/common.helpers');
const { stream } = require('../config/logger');

const activity = {
  sendDefaultImage: (res) => {
    const defaultPath = path.resolve('assets/img/image_not_found.jpg');
    return res.sendFile(defaultPath);
  },
  readImage: (req, res) => {
    const { id: photo_id, user_id, create_time } = parsePhotoHash(req.params.hash);
    const { shape_type, size } = req.params;

    return models.photo.getById(photo_id).then(async (photo) => {
      if (!photo) throw new Error('Photo not found in the database!');
      // if external image, then redirect to it.
      if (!photo.url.includes(config.cdnDomain)) return res.redirect(photo.url);
  
      const assetPath = photo.url.replace(config.cdnDomain, ''); // starting with '/uploads'
  
      const internalPath = path.resolve(`assets/${assetPath}`);
      if (!fs.existsSync(internalPath)) throw new Error('Image not found on the server storage!');
  
      const ext = assetPath.split('.')[1];
      res.set('Cache-Control', 'public, max-age=31557600');
      res.set('Content-Type', `image/${ext}`);

      if (!shape_type && !size) {
        return res.sendFile(internalPath);
      } else if (shape_type && !size) {
        if (shape_type === 'rectangle') {
          const image = sharp(internalPath);
          const { width, height } = await image.metadata();
          if (width === height) return res.sendFile(internalPath);
          const rectPath = await activity.generateRectPath(assetPath);
          return res.sendFile(rectPath);
        }
        return res.sendFile(internalPath);
      } else {
        const thumbPath = await activity.generateThumbPath({ assetPath, shape_type, size });
        return res.sendFile(thumbPath);
      }
    })
    .catch((error) => {
      console.log('[Images]', error);
      return activity.sendDefaultImage(res);
    });
  },
  generateRectPath: async (assetPath) => {
    const ext = assetPath.split('.')[1];
    const targetPath = path.resolve(`assets/${assetPath.replace(`.${ext}`, `_rect.${ext}`)}`);
    if (fs.existsSync(targetPath)) {
      return targetPath;
    }
    const originPath = path.resolve(`assets/${assetPath}`);
    const image = sharp(originPath);
    const { width, height } = await image.metadata();
    const edge = Math.min(width, height);
    const left = Math.floor((width - edge) / 2);
    const top = Math.floor((height - edge) / 2);

    return new Promise((resolve, reject) => {
      image
        .extract({ left, top, width: edge, height: edge })
        .toFile(targetPath, err => {
        if (err) reject(err);
        resolve(targetPath)
      })
    });    
  },
  generateThumbPath: async ({ assetPath, shape_type, size }) => {
    let originPath = path.resolve(`assets/${assetPath}`);
    const ext = assetPath.split('.')[1];
    const targetAssetPath = assetPath.replace(`.${ext}`, `_${shape_type}_${size}.${ext}`);
    const targetPath = path.resolve(`assets/${targetAssetPath}`);
    if (fs.existsSync(targetPath)) {
      return targetPath;
    }

    if (shape_type === 'rectangle') {
      originPath = await activity.generateRectPath(assetPath);
    }
    const image = sharp(originPath);
    const { width, height } = await image.metadata();

    return new Promise((resolve, reject) => {
      image
        .resize(Number(size), Math.floor(height / width * size))
        .toFile(targetPath, err => {
        if (err) reject(err);
        resolve(targetPath)
      })
    });   
  },
}

routes.route('/:type/:hash/:shape_type/:size').get(async (req, res) => activity.readImage(req, res));

routes.route('/:type/:hash/:shape_type').get(async (req, res) => activity.readImage(req, res));

routes.route('/:type/:hash').get(async (req, res) => activity.readImage(req, res));

module.exports = routes;
