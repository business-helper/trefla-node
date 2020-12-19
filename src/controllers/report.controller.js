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

exports.paginationReq = async ({ page, limit, type, target_id }) => {
  [page, limit] = [page, limit].map(item => Number(item));

  let _reports = [], _total = 0;

  return Promise.all([
    models.report.get({ page, limit, type, target_id }),
    models.report.getTotal({ type, target_id }),
  ])
    .then(([reports, total]) => {
      _reports = reports;
      _total = total;
      const user_ids = [0];
      const comment_ids = [0];
      const post_ids = [0];
      
      reports.forEach(report => {
        const { user_id, type, target_id } = report;
        user_ids.push(user_id);
        type === 'COMMENT' ? comment_ids.push(target_id) : post_ids.push(target_id);
      });

      return Promise.all([
        models.user.getByIds(user_ids),
        models.post.getByIds(post_ids),
        models.comment.getByIds(comment_ids),
      ])
    })
    .then(([ users, posts, comments ]) => {
      const userObj = {}, postObj = {}, commentObj = {};
      users.forEach(user => userObj[user.id.toString()] = user);
      posts.forEach(post => postObj[post.id.toString()] = post);
      comments.forEach(comment => commentObj[comment.id.toString()] = comment);

      _reports = _reports.map(report => ({
        ...(models.report.output(report)),
        user: models.user.output(userObj[report.user_id.toString()], 'SIMPLE'),
        target: report.type === 'COMMENT' ? models.comment.output(commentObj[report.target_id.toString()]) : models.post.output(postObj[report.target_id.toString()])
      }));

      return {
        status: true,
        message: 'success',
        data: _reports,
        pager: {
          limit,
          page,
          total: _total,
        },
        hasMore: page * limit + _reports.length < _total,
      }
    })
}

exports.deleteByIdReq = async ({ id }) => {
  let _report;
  return models.report.getById(id)
    .then(report => {
      _report = report;
      return models.report.deleteById(id)
    })
    .then(deletedRows => {
      return {
        status: true,
        message: 'Report has been deleted!',
      };
    })
}

