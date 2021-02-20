const express = require("express");
const { Validator } = require("node-input-validator");
const reportRouters = express.Router();

const ctrls = require('../controllers/index');
const models = require('../models/index');
const helpers = require('../helpers/index');

const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require("../helpers/common.helpers");
const { ADMIN_ROLE } = require('../constants/common.constant');

const activity = {
  checkAdminPermission: async (req, identifier) => {
    const { role, role2, uid } = getTokenInfo(req);
    
    if (role !== 'ADMIN') return false;
    if (role2 === ADMIN_ROLE.SUPER) return true;

    const permission = models.adminPermission.output(await models.adminPermission.getByUserId(uid));
    return activity.checkAllowed(permission, identifier);
  },
  checkAllowed: (permission, identifier = null) => {
    if (typeof identifier === 'boolean') return identifier;
    else if (identifier === null || identifier === '' || identifier === undefined) return true;
    
    const keys = identifier.split('.');
    if (keys.length === 1) return permission[keys[0]];
    else if (keys.length === 2) return permission[keys[0]][keys[1]];
    else if (keys.length === 3) return permission[keys[0]][keys[1]][keys[2]];
    else if (keys.length === 4) return permission[keys[0]][keys[1]][keys[2]][keys[3]];
    return false;
  },
};

reportRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

reportRouters.get('/:id', async (req, res) => {
  const validator = new Validator({
    id: req.params.id
  }, {
    id: 'required'
  });

  return validator.check()
    .then(matched => {
      if (!matched) { throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors })};
      return ctrls.report.getById(req.params.id);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

/**
 * @secured by admin types
 */
reportRouters.get('/', async (req, res) => {
  const permitted = await activity.checkAdminPermission(req, 'report.show');
  if (!permitted) return res.status(403).json({ status: false, message: "Permission denied!" });

  const validator = new Validator(req.query, {
    // type: 'required|string',
    limit: 'required|integer',
    page: "required|integer",
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), { code: 400, details: validator.errors });
      }
      return ctrls.report.paginationReq(req.query);
    })
    .then(result => res.json(result))
    .catch((error) => respondValidateError(res, error));
});

reportRouters.post('/email/:id', async (req, res) => {
  const { uid, email, role } = getTokenInfo(req);
  if (role !== 'ADMIN') {
    return res.json({
      status: false, message: 'Permission error!',
    });
  }

  const validator = new Validator({
    id: req.params.id,
    ...req.body,
  }, {
    id: "required",
    subject: "required",
    body: "required",
  });

  validator.addPostRule(async provider => Promise.all([
      models.report.getById(provider.inputs.id)
    ])
      .then(([ report ]) => {
        if (!report) {
          provider.error('id', 'custom', 'Report with the given id does not exist!');
        }
      })
  );

  let _reporter;

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors });
      }
      return models.report.getById(req.params.id);
    })
    .then(async report => {
      _reporter = await models.user.getById(report.user_id);
      const { subject, body } = req.body;
      return helpers.common.sendMail({
        from: email,
        to: _reporter.email,
        subject,
        body,
      })
    })
    .then(result => {
      return res.json({
        status: true,
        message: `Email has been sent to ${_reporter.user_name}`,
        data: result
      });
    })
    .catch(error => respondValidateError(res, error));
});

reportRouters.post('/', async (req, res) => {
  const { uid: user_id } = getTokenInfo(req);

  const validator = new Validator(req.body, {
    reason: "required",
    type: "required",
    target_id: "required|integer",
  });

  const TargetModel = req.body.type === 'COMMENT' ? models.comment : models.post;

  validator.addPostRule(async provider => {
    await Promise.all([
      TargetModel.getById(provider.inputs.target_id),
    ])
      .then(([target]) => {
        if (!target) {
          provider.error('target_id', 'custom', 'Target does not exist!');
        }
      })
  });

  return validator.check()
    .then(matched => {
      if (!matched) { throw Object.assign(new Error('INvalid request!'), { code: 400, details: validator.errors}); }
      return ctrls.report.createReq(req, res);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

reportRouters.patch('/:id', async (req, res) => {
  const validator = new Validator({
    id: req.params.id,
    ...req.body,
  }, {
    id: 'required',
    reason: "required"
  });

  return validator.check()
    .then(matched => {
      if (!matched) { throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors}); }
      return ctrls.report.updateById(req.params.id, req.body);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

reportRouters.delete('/:id', async (req, res) => {
  const validator = new Validator({
    id: req.params.id
  }, {
    id: 'required'
  });

  validator.addPostRule(async provider => {
    Promise.all([
      models.report.getById(provider.inputs.id)
    ])
      .then(([ report ]) => {
        if (!report) {
          provider.error('id', 'custom', `Report with id "${provider.inputs.id}" does not exist!`)
        }
      })
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors });
      }
      return ctrls.report.deleteByIdReq({ id: req.params.id })
    })
    .then(result => res.json(result))
    .catch(error => respondError(res, error));
});


module.exports = reportRouters;
