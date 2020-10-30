const { Validator } = require("node-input-validator");
const Language = require("../models/lang.model");
const { respondError } = require("../helpers/common.helpers");

exports.create = (req, res) => {
  const lang = new Language({
    code: req.body.code,
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
