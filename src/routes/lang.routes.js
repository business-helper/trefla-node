const express = require("express");
const { Validator } = require("node-input-validator");
const langRouters = express.Router();
const language = require('../controllers/lang.controller');
const { respondValidateError } = require("../helpers/common.helpers");
const { basicMiddleware } = require('../middlewares/basic.middleware');
const Language = require('../models/lang.model');
const Config = require('../models/config.model');

langRouters.use((req, res, next) => {
  basicMiddleware(req, res, next);
});

langRouters.get("/health", (req, res) => {
	res.json({ status: true, message: 'I am good!' });
});

langRouters.post("/", async (req, res) => {
	const validator = new Validator(req.body, {
    code: "required|minLength:2|maxLength:2",
    name: "required|minLength:3",
    active: "required|integer",
  });

	validator.addPostRule(async (provider) => Promise.all([
    Language.getByCode(provider.inputs.code),
    Language.getByName(provider.inputs.name)
  ])
    .then(([langByCode, langByName]) => {
      if (langByCode) {
        provider.error('code', 'custom', `Language with code "${provider.inputs.code}" already exists!`);
      }
      if (langByName) {
        provider.error('name', 'custom', `Language with name "${provider.inputs.name}" already exists!`);
      }
    })
  );

  return validator
		.check()
		.then((matched) => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), { code: 400, details: validator.errors });
      }
		})
		.then(() => language.create(req, res))
		.catch(error => respondValidateError(res, error));
});

langRouters.patch("/:id", async (req, res) => {
	const validator = new Validator(
    {
      id: req.params.id,
      ...req.body,
    }, 
    {
      id: "required|integer",
  });

	validator.addPostRule(async (provider) => Promise.all([
    Language.getById(provider.inputs.id),
    provider.inputs.code ? Language.getByCode(provider.inputs.code) : false,
    provider.inputs.name ? Language.getByName(provider.inputs.name) : false,
    provider.inputs.code || provider.inputs.name || provider.inputs.active
  ])
    .then(([lang, langByCode, langByName, optionalFields]) => {
      if (!lang) {
        provider.error('id', 'custom', `Language with id "${provider.inputs.id}" does not exist!`);
      }
      if (langByCode && (langByCode.id !== Number(provider.inputs.id))) {
        provider.error('code', 'custom', `Language with code "${provider.inputs.code}" already exists!`);
      }
      if (langByName && (langByName.id !== Number(provider.inputs.id))) {
        provider.error('name', 'custom', `Language with name "${provider.inputs.name}" already exists!`);
      }
      if (optionalFields === undefined) {
        provider.error('optional', 'custom', `One of code, name, active should exists!`)
      }
    })
  );

  return validator
		.check()
		.then((matched) => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), { code: 400, details: validator.errors });
      }
    })
    .then(() => Language.getById(req.params.id))
    .then(lang => {
      const { code, name, active } = req.body;
      lang.code = code || lang.code;
      lang.name = name || lang.name;
      lang.active = active !== undefined ? active : lang.active;
      return lang;
    })
    .then((lang) => Language.save(lang))
    .then(newLang => res.json({ status: true, message: 'success', data: newLang }))
		.catch(error => respondValidateError(res, error));
});

langRouters.get('/by-code/:code', async (req, res) => {
	const v = new Validator(req.params, {
		code: "required|minLength:2|maxLength:2",
	});

	v.check()
		.then(matched => {
			if (!matched) {
				throw Object.assign(new Error('Invalid request!'), { code: 400, details: v.errors });
			}
		})
		.then(() => language.getByCode(req, res))
		.catch(error => respondValidateError(res, error));
});

langRouters.get('/by-name/:name', async (req, res) => {
	const v = new Validator(req.params, {
		name: "required|minLength:2",
	});

	v.check()
		.then(matched => {
			if (!matched) {
				throw Object.assign(new Error('Invalid request!'), { code: 400, details: v.errors });
			}
		})
		.then(() => language.getByName(req, res))
		.catch(error => respondValidateError(res, error));
});

langRouters.get('/version', async (req, res) => {
  return Config.getById(1)
    .then(config => res.json({
      version: config.lang_version,
      android_version: config.android_version,
      apple_version: config.apple_version,
      android_link: config.android_link,
      apple_link: config.apple_link,
      enable_top_music: config.enable_top_music,
    }));
})

langRouters.get('/', language.getAll);

module.exports = langRouters;
