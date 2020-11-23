const { Validator } = require("node-input-validator");
const models = require('../models');
const helpers = require('../helpers');
const { getTokenInfo } = require('../helpers/auth.helpers');
const { bool2Int, chatPartnerId, getTotalLikes, generateTZTimeString, respondError } = require("../helpers/common.helpers");
const { generateReportData, generateMessageData } = require('../helpers/model.helpers');


exports.createReq = async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);

  const model = generateReportData({
    ...req.body, user_id
  });

  return models.report.create(model)
    .then(report => Promise.all([
      report,
    ]))
    .then(([report]) => {
      report = models.report.output(report);

      return {
        status: true, 
        message: 'Report has been created!',
        data: report,
      };
    });
}

exports.getById = async (id) => {
  return models.report.getById(id)
    .then(report => {
      return {
        status: true,
        message: 'success',
        data: models.report.output(report),
      };
    })
}

exports.updateById = async (id, data) => {
  return models.report.getById(id)
    .then(report => {
      Object.keys(report).forEach(key => {
        report[key] = data[key] !== undefined ? data[key] : report[key];
      });
      return models.report.save(report);
    })
    .then(report => {
      return {
        status: true,
        message: 'Report has been updated!',
        data: models.report.output(report),
      };
    });
}

