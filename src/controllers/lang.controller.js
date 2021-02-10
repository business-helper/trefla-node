const { Validator } = require("node-input-validator");
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const Language = require("../models/lang.model");
const config = require('../config/app.config');
const { respondError, timestamp } = require("../helpers/common.helpers");


exports.create = (req, res) => {
  const lang = new Language({
    code: req.body.code.toLowerCase(),
    name: req.body.name,
    active: req.body.active,
  });
  return Language.create(lang)
    .then((lang) => res.json({ status: true, message: "success", data: lang }))
    .catch((error) => respondError(res, error));
};

exports.getAll = (req, res) => {
  Language.getAll()
    .then((langs) =>
      res.json({ status: true, message: "success", data: langs })
    )
    .catch((error) =>
      res.status(500).json({
        status: false,
        message: error.message || "Something went wrong!",
      })
    );
};

exports.getByCode = (req, res) => {
  Language.getByCode(req.params.code)
    .then((lang) => {
      if (!lang) {
        return res.status(404).json({
          status: false,
          message: `Language not found with code '${req.params.code}'`,
        });
      } else {
        return res.json({
          status: true,
          message: "success",
          data: lang,
        });
      }
    })
    .catch((error) => respondError(res, error));
};

exports.getByName = (req, res) => {
  Language.getByName(req.params.name)
    .then((lang) => {
      if (!lang) {
        return res.status(404).json({
          status: false,
          message: `Language not found with name '${req.params.name}'`,
        });
      } else {
        return res.json({
          status: true,
          message: "success",
          data: lang,
        });
      }
    })
    .catch((error) => respondError(res, error));
}

exports.getByIdReq = (id) => {
  return Language.getById(id)
    .then(lang => {
      return {
        status: true, 
        message: 'success',
        data: lang,
      };
    })
}

exports.paginationReq = ({ page = 0, limit = 0 }) => {
  page = Number(page); limit = Number(limit);

  return Promise.all([
    Language.pagination({ page, limit }),
    Language.total(),
  ])
    .then(([ langs, total ]) => {
      const hasMore = page * limit + langs.length < total;
      const pager = { page, limit };
      return {
        status: true,
        message: 'success',
        data: langs,
        pager,
        hasMore,
      };
    });
}

exports.uploadLangFileReq = (req) => {
  const langCode = req.params.langCode;

  return new Promise((resolve, reject) => {
    let form = formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
      let oldpath = files.file.path;
      let ext = path.extname(files.file.name) || '.json';// console.log('[old path]', oldpath, ext)
      let newName = `${langCode}${ext}`; console.log('[ext]', ext);

      let newpath = path.join(path.resolve('assets/uploads/langs'), newName);
      fs.readFile(oldpath, function(err, data) {
        if (err) {
          reject({
            status: false,
            message: 'Failed to read file...',
            details: err.message,
          });
        }
        fs.writeFile(newpath, data, function(err) {
          if (err) {
            reject({
              status: false,
              message: 'Failed to write file...',
              details: err.message,
            });
          }
          fs.unlink(oldpath, function(err) {
            if (err) {
              reject({
                status: false,
                message: 'Failed to delete file...',
                details: err.message,
              });
            }
          })
          resolve({
            status: true,
            message: 'File has been uploaded!',
            url: `/uploads/langs/${newName}`,
            domain: config.domain,
          })
        })
      });
    })    
  });
}

exports.updateLangById = (id, data) => {
  return Language.getById(id)
    .then(lang => {
      const keys = Object.keys(lang);
      keys.forEach(key => {
        lang[key] = data[key] !== undefined ? data[key] : lang[key];
      });
      lang.update_time = timestamp();
      return Language.save(lang);
    })
    .then(lang => {
      return {
        status: true,
        message: 'Language has been updated!',
        data: lang,
      };
    });
}

exports.getFileContent = (id) => {
  return Language.getById(id)
    .then(lang => {
      const relPath = lang.url.replace(config.domain, '');
      const localPath = path.resolve(`assets${relPath}`);

      const content = fs.readFileSync(localPath);
      return content;
    })
}

exports.syncLangReq = (id) => {
  return Promise.all([
    Language.getById(id),
    Language.getByCode('en'),
  ])
    .then(([target, en]) => {
      if (!target || !en) {
        throw Object.assign(new Error("Insufficient resources!"));
      }
      if (target.id === en.id) {
        throw Object.assign(new Error("English is the default language, so it can't be synced!"));
      }
      const relPathEN = en.url.replace(config.domain, '');
      const localPathEN = path.resolve(`assets${relPathEN}`);
      const contentEN = fs.readFileSync(localPathEN, 'utf8');
      const jsonEN = JSON.parse(contentEN || "{}");
      
      let realPathTarget = '', localPathTarget = '', contentTarget = '';
      if (!target.url) target.url = `${config.domain}/uploads/langs/${target.code}.json`;

      realPathTarget = target.url.replace(config.domain, '');
      localPathTarget = path.resolve(`assets${realPathTarget}`);
      try {
        contentTarget = fs.readFileSync(localPathTarget, 'utf8');
      } catch (e) {
        console.log('[Read Target Content]', e);
        contentTarget = "{}";
      }
      const jsonTarget = JSON.parse(contentTarget);

      const keys = Object.keys(jsonEN);
      keys.forEach(key => {
        jsonTarget[key] = jsonTarget[key] !== undefined ? jsonTarget[key] : jsonEN[key];
      });

      fs.writeFileSync(localPathTarget, JSON.stringify(jsonTarget), 'utf8');
      return {
        status: true,
        message: `${target.name} has been synced!`,
      }
    })
}

exports.deleteById = (id) => {
  let _lang;
  return Language.getById(id)
    .then(lang => {
      _lang = lang;
      return Language.deleteById(id);
    })
    .then(() => {
      if (_lang.url) {
        const relPath = _lang.url.replace(config.domain, '');
        const localPath = path.resolve(`assets${relPath}`);
        fs.unlinkSync(localPath);
      }
      return {
        status: true,
        message: 'Language has been deleted!',
      };
    })
}
