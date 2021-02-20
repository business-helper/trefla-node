const express = require("express");
const { Validator } = require("node-input-validator");
const bugRouters = express.Router();

const bugCtrl = require("../controllers/bug.controller");
const Bug = require("../models/bug.model");
const User = require("../models/user.model");
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

// Bearer authentication
bugRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

bugRouters.get('/:id', async (req, res) => {
  const validator = new Validator({
    id: req.params.id
  }, {
    id: "required|integer",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Bug.getById(provider.inputs.id)
    ]).then(([bugById]) => {
      if (!bugById) {
        provider.error("id", "custom", `Bug report does not exist for the given id!`
        );
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
  .then(() => bugCtrl.getById(req, res))
  .then(result => res.json(result))
  .catch((error) => respondValidateError(res, error));
})

/**
 * @secured by admin types
 */
bugRouters.get('/', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role === 'ADMIN') {
    const permitted = await activity.checkAdminPermission(req, 'bug.show');
    if (!permitted) return res.status(403).json({ status: false, message: "Permission denied!" });
  }

  const validator = new Validator({...req.query}, {
    limit: 'required',
    page: "required",
  })

  return (role === 'ADMIN' ? bugCtrl.loadBugs(req, res) : bugCtrl.loadBugByUser(req, res))
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
})


bugRouters.post('/email/:id', async (req, res) => {
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
    Bug.getById(provider.inputs.id)
    ])
      .then(([ bug ]) => {
        if (!bug) {
          provider.error('id', 'custom', 'Bug report with the given id does not exist!');
        }
      })
  );

  let _reporter;

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors });
      }
      return Bug.getById(req.params.id);
    })
    .then(async bug => {
      _reporter = await models.user.getById(bug.user_id);
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

bugRouters.post('/', async (req, res) => {
  const validator = new Validator({
    ...req.body,
  }, {
    device_model: "required",
    report: "required",
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
    .then(() => bugCtrl.create(req, res))
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error))
});

bugRouters.patch('/:id', async (req, res) => {
  const { uid: user_id, role } = getTokenInfo(req);
  const validator = new Validator({
    ...req.body,
    id: req.params.id,
  }, {
    id: "required"
  });

  validator.addPostRule(provider => Promise.all([
    Bug.getById(provider.inputs.id),
  ])
    .then(([bugById]) => {
      if (!bugById) { provider.error("id", "custom", `Bug report with the given id does not exist!`) }
      else if (!(bugById.user_id === user_id || role === 'ADMIN')) { provider.error("user", "custom", "You have no permission to update this report!") }
    })
  );

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request!"), {
          code: 400, details: validator.errors,
        })
      }
      return bugCtrl.update(req, res);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

bugRouters.delete('/:id', async (req, res) => {
  const { uid: user_id, role } = getTokenInfo(req);
  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required"
  });

  validator.addPostRule(provider => Promise.all([
    Bug.getById(provider.inputs.id),
  ])
    .then(([bugById]) => {
      if (!bugById) { provider.error("id", "custom", `Bug report with the given id does not exist!`) }
      else if (!(bugById.user_id === user_id || role === 'ADMIN')) { provider.error("user", "custom", "You have no permission to delete this report!") }
    })
  );

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request!"), {
          code: 400, details: validator.errors,
        })
      }
      return bugCtrl.deleteById(req, res);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));

})

module.exports = bugRouters;
