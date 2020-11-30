const express = require("express");
const { Validator } = require("node-input-validator");
const adminRouters = express.Router();

const ctrls = require("../controllers");
const models = require("../models");
const helpers = require("../helpers");
const middlewares = require("../middlewares/basic.middleware");

const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require("../helpers/common.helpers");

adminRouters.post('/login', async (req, res) => {

  middlewares.basicMiddleware(req, res, () => {
    const validator = new Validator(req.body, {
      email_or_name: "required",
      password: "required|minLength:5"
    });

    return validator.check()
      .then(matched => {
        if (!matched) {
          throw Object.assign(new Error('Validation failed!'), { code: 400, details: validator.errors });
        }
        return ctrls.admin.loginReq(req, res);
      })
      .then((result) => {
        return res.json(result);
      })
      .catch(error => respondValidateError(res, error));
  })  
});

// Bearer authentication
adminRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

adminRouters.get('/profile', async (req, res) => {
  const { uid: user_id, role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  return ctrls.admin.getAdminById(user_id)
    .then(admin => {
      return res.json({
        status: true,
        message: 'success',
        data: models.admin.output(admin),
      });
    })
    .catch(error => respondValidateError(res, error));
})

adminRouters.get('/firebase', async (req, res) => {
  console.log('[GET] /admin/firebase');
  return ctrls.firebase.test()
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

adminRouters.get('/id-transfers', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  const validator = new Validator({
    ...req.query,
  }, {
    page: "required|integer",
    limit: "required|integer",
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      return ctrls.admin.getIdTransfersReq(req.query);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

adminRouters.get('/email-templates/:id', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!" });

  const validator = new Validator({
    ...req.params,
  }, {
    id: "required|integer",
  });

  validator.addPostRule(provider => {
    return models.emailTemplate.getById(provider.inputs.id)
      .then(et => {
        if (!et) provider.error('id', 'custom', 'Email template does not exist!');
      });
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      return ctrls.admin.getEmailTemplateById(req.params.id)
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
})

adminRouters.get('/email-templates', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  const validator = new Validator({
    ...req.query,
  }, {
    page: "required|integer",
    limit: "required|integer",
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors});
      return ctrls.admin.getEmailTemplateReq(req.query);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

adminRouters.post('/send-notification', async (req, res) => {
  const { uid } = getTokenInfo(req);
  const { user_id, title, body } = req.body;

  const validator = new Validator(req.body, {
    user_id: "required",
    title: "required",
    body: "required",
  });

  validator.addPostRule(async provider => 
    Promise.all([
      models.user.getById(user_id),
    ])
      .then(([ user ]) => {
        if (!user) {
          provider.error('user_id', 'custom', 'User does not exist with the given id!');
        }
      })  
  );

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error('Invalid requset!'), { code: 400, details: validator.errors });
      }
      return ctrls.firebase.sendNotification2UserReq({ user_id, title, body });
    })
    .then(() => res.json({ status: true, message: 'Notification has been sent!' }))
    .catch(error => respondValidateError(res, error));
});

adminRouters.post('/bulk-notifications', async (req, res) => {
  const { uid, role } = getTokenInfo(req);
  const { user_ids, title, body } = req.body;

  const validator = new Validator(req.body, {
    user_ids: "required",
    title: "required",
    body: "required",
  });

  return validator.check()
    .then(matched => {
      if (!matched) {
        throw Object.assign(new Error('Invalid requset!'), { code: 400, details: validator.errors });
      }
      return ctrls.firebase.sendBulkNotificationReq({ user_ids, title, body });
    })
    .then(() => res.json({ status: true, message: 'Notifications have been sent!' }))
    .catch(error => respondValidateError(res, error));
});

adminRouters.patch('/email-templates/:id', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  const validator = new Validator({
    ...req.params,
  }, {
    id: "required|integer",
  });

  validator.addPostRule(provider => {
    return models.emailTemplate.getById(provider.inputs.id)
      .then(et => {
        if (!et) provider.error('id', 'custom', `Email template with id "${provider.inputs.id}" does not exist!`);
      })
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors});
      return ctrls.admin.updateEmailTemplateById(req.params.id, req.body);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
})

adminRouters.patch('/profile', async (req, res) => {
  const { uid: user_id, role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  const validator = new Validator({
    user_id,
    ...req.body,
  }, {
    user_id: "required|integer",
    email: "required",
    user_name: "required",
  });

  validator.addPostRule(provider => {
    return models.admin.getById(provider.inputs.user_id)
      .then(admin => {
        if (!admin) provider.error('id', 'custom', 'Admin does not exist with the given id!');
      })
  })

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors});
      return ctrls.admin.updateProfileReq(user_id, req.body);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
})

adminRouters.patch('/update-password', async (req, res) => {
  const { role, uid: user_id } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!" });

  const validator = new Validator({
    user_id,
    ...req.body
  }, {
    old_pass: "required",
    password: "required",
  });

  validator.addPostRule(provider => {
    return models.admin.getById(user_id)
      .then(admin => {
        if (!admin) provider.error('id', 'custom', 'Admin does not exist!');
      });
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors() });
      return ctrls.admin.updateAdminPassword(user_id, req.body);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

module.exports = adminRouters;
