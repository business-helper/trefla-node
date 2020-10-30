const express = require("express");
const { Validator } = require("node-input-validator");
const langRouters = express.Router();
const language = require('../controllers/lang.controller');
const { respondValidateError } = require("../helpers/common.helpers");

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
		
	]))

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

langRouters.get('/', language.getAll);

module.exports = langRouters;
