const { Validator } = require("node-input-validator");
const CONSTS = require('../constants/socket.constant');
const Bug = require("../models/bug.model");
const User = require("../models/user.model");

const { getTokenInfo } = require('../helpers/auth.helpers');
const { bool2Int, respondError } = require("../helpers/common.helpers");
const { generateBugData } = require('../helpers/model.helpers');


exports.create = async (req, res) => {
  const { uid: user_id } = getTokenInfo(req); console.log('user_id', user_id);
  let model = generateBugData({ user_id, ...req.body });

  return Bug.create(model)
    .then((bug) => {
      return {
        status: true, 
        message: 'We received your bug report. Thanks!',
        data: Bug.output(bug),
      };
    })
}

exports.update = async (req, res) => {
  let bug = await Bug.getById(req.params.id);

  let updateData = {};
  const disallowedKeys = ['id', 'user_id'];

  Object.keys(req.body).forEach(key => {
    if (disallowedKeys.includes(key)) {

    } else if (bug[key] !== undefined) {
      bug[key] = req.body[key];
    }
  });

  return Bug.save(bug)
    .then(updatedBug => {
      return {
        status: true,
        message: 'Bug report has been updated!',
        data: Bug.output(updatedBug),
      };
    })
}

exports.getById = async (req, res) => {
  return Bug.getById(req.params.id)
    .then(bug => {
      return {
        status: true,
        message: 'success',
        data: Bug.output(bug),
      }
    })
}

exports.deleteById = async (req, res) => {
  return Bug.deleteById(req.params.id)
    .then(deleted => {
      return {
        status: true,
        message: "Bug report has been deleted!",
        data: {},
      };
    })
}

exports.loadBugByUser = async (req, res) => {
  let { page, limit } = req.query;
  page = Number(page);
  limit = Number(limit);

  const { uid: user_id } = getTokenInfo(req);

  let condObj = {};
  condObj.user_id = user_id;
  if (req.query.fixed !== undefined) {
    condObj.fixed = Number(req.query.fixed);
  }

  return Promise.all([
    Bug.pagination({
      page, limit,
      ...condObj,
    }),
    Bug.getTotal({ ...condObj })
  ])
    .then(([ rows, total ]) => {
      return {
        status: true,
        message: 'success',
        data: rows.map(row => Bug.output(row)),
        pager: {
          page,
          limit,
          total,
        },
        hasMore: (page * limit + rows.length) < total ? true : false,
      }
    })
}

exports.loadBugs = async (req, res) => {

  let { page, limit, sort } = req.query;
  page = Number(page);
  limit = Number(limit);
  sort = JSON.parse(sort);
  
  const { uid: user_id } = getTokenInfo(req);

  const tblColumns = ['user_id', 'device_model', 'report', 'file', 'create_time', 'fixed'];

  let condObj = {};

  if (req.query.fixed !== undefined) {
    condObj.fixed = Number(req.query.fixed);
  }

  return Promise.all([
    Bug.pagination({
      page, limit,
      ...condObj,
      sort: { field: tblColumns[sort.col], desc: sort.desc },
    }),
    Bug.getTotal({ ...condObj })
  ])
    .then(async ([ rows, total ]) => {

      const user_ids = rows.map(row => row.user_id);
      const users = await User.getByIds(user_ids);
      const userObj = {};
      users.forEach(user => {
        userObj[user.id.toString()] = user;
      });

      return {
        status: true,
        message: 'success',
        data: rows.map(row => {
          return {
            user: User.output(userObj[row.user_id.toString()], 'SIMPLE'),
            ...(Bug.output(row)),
          };
          
        }),
        pager: {
          page,
          limit,
          total,
        },
        hasMore: (page * limit + rows.length) < total ? true : false,
      }
    })
}
