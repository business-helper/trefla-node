const express = require("express");
const { Validator } = require("node-input-validator");
const adminRouters = express.Router();

const ctrls = require("../controllers");
const models = require("../models");
const helpers = require("../helpers");
const middlewares = require("../middlewares/basic.middleware");
const config = require('../config/app.config');

const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require("../helpers/common.helpers");
const { ADMIN_NOTI_TYPES } = require("../constants/notification.constant");
const { ADMIN_ROLE } = require('../constants/common.constant');

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

adminRouters.get('/config', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  return ctrls.admin.getAdminConfigReq()
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

adminRouters.get('/firebase', async (req, res) => {
  console.log('[GET] /admin/firebase');
  return ctrls.firebase.test()
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

adminRouters.get('/id-transfers/:id', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required",
  });

  validator.addPostRule(provider => {
    return models.adminNotification.getById(provider.inputs.id)
      .then(adminNoti => {
        if (!adminNoti) provider.error('id', 'custom', 'Data does not exist!');
      })
  })

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      return ctrls.admin.getIdTransferById(req.params.id);
    })
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

adminRouters.get('/langs/:id/content', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, messsage: "Permission denied!" });

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required"
  });

  validator.addPostRule(provider => {
    return models.language.getById(provider.inputs.id)
      .then(lang => {
        if (!lang) {
          provider.error('id', 'custom', 'Lang does not exist!');
        } else if (!lang.url) {
          provider.error('url', 'custom', 'Language does not have url!');
        }        
      });
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      return ctrls.language.getFileContent(req.params.id);
    })
    .then(result => res.send(result))
    .catch(error => respondValidateError(res, error));
});

adminRouters.get('/langs/:id', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required",
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors});
      return ctrls.language.getByIdReq(req.params.id)
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

adminRouters.get('/langs', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!" });

  const validator = new Validator(req.query, {
    limit: "required|integer",
    page: "required|integer",
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors});
      return ctrls.language.paginationReq(req.query)
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

adminRouters.get('/stats', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!" });

  return Promise.all([
    ctrls.admin.recentPosts4Stats(),
    ctrls.admin.totalResource4Stats(),
    ctrls.admin.last7DayPosts(),
  ])
    .then(([ recentPosts, total, stats4Post ]) => {
      return res.json({
        status: true,
        message: 'success',
        recentPosts,
        total,
        stats4Post,
      });
    })
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
      return ctrls.admin.sendNotification2User({ user_id, title, body });
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
      return ctrls.admin.sendBulkNotification({ user_ids, title, body });
    })
    .then(() => res.json({ status: true, message: 'Notifications have been sent!' }))
    .catch(error => respondValidateError(res, error));
});

adminRouters.post('/langs/:id/sync', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required",
  });

  validator.addPostRule(provider => {
    return models.language.getById(provider.inputs.id)
      .then(lang => {
        if (!lang) provider.error('id', 'custom', 'Language does not exist!');
      });
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      return ctrls.language.syncLangReq(req.params.id);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

adminRouters.post('/langs', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!" });

  const validator = new Validator({
    ...req.body,
  }, {
    code: "required",
    name: "required",
    active: "required",
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors});
      return ctrls.language.create(req, res);
    })
    .catch(error => respondValidateError(res, error));
});

adminRouters.post('/upload-lang/:langCode', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  const validator = new Validator({
    langCode: req.params.langCode,
  }, {
    langCode: "required|string"
  });

  validator.addPostRule(provider => {
    return models.language.getByCode(provider.inputs.langCode)
      .then(lang => {
        if (!lang) provider.error('langCode', `custom', 'Language with code "${provider.inputs.langCode}" does not exist!`);
      });
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      // upload file
      return ctrls.language.uploadLangFileReq(req);
    })
    .then(result => {
      if (!result.status) throw Object.assign(new Error(result.message), { code: 400 });
      return Promise.all([
        result.url,
        models.language.getByCode(req.params.langCode),
      ]);
    })
    .then(([ url, lang ]) => {
      return models.language.save({ ...lang, url });
    })
    .then(lang => {
      return res.json({
        status: true,
        message: 'success',
        data: lang
      });
    })  
    .catch(error => respondValidateError(res, error));
});

adminRouters.post('/consent-email/:id', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required",
  });

  validator.addPostRule(provider => {
    return models.adminNotification.getById(provider.inputs.id)
      .then(adminNoti => {
        if (!adminNoti) provider.error('id', 'custom', 'Data does not exist!');
        const payload = JSON.parse(adminNoti.payload);
        if (!payload.from || !payload.to) {
          provider.error('users', 'custom', 'Invalid user settings!');
        }
        if (adminNoti.type !== ADMIN_NOTI_TYPES.ID_TRANSFER) {
          provider.error('type', 'custom', 'This is for only ID Transfer!');
        }
      })
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      return ctrls.admin.sendConsentEmail4Transfer(req.params.id);
    })
    .then(result => res.json(result))
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

adminRouters.patch('/config', async (req, res) => {
  return ctrls.admin.updateAdminConfigReq(req.body)
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

adminRouters.patch('/langs/:id', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required|integer",
  });

  validator.addPostRule(provider => {
    return models.language.getById(provider.inputs.id)
      .then(lang => {
        if (!lang) provider.error('id', 'custom', `Language with id "${provider.inputs.id}" does not exist!`);
      });
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors});
      return ctrls.language.updateLangById(req.params.id, req.body);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
})

adminRouters.delete('/langs/:id', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required",
  });

  validator.addPostRule(provider => {
    return models.language.getById(provider.inputs.id)
      .then(lang => {
        if (!lang) provider.error('id', 'custom', 'Language does not exist!');
      });
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      return ctrls.language.deleteById(req.params.id);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
})

adminRouters.delete('/id-transfers/:id', async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!"});

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required",
  });

  validator.addPostRule(provider => {
    return models.adminNotification.getById(provider.inputs.id)
      .then(adminNoti => {
        if (!adminNoti) provider.error('id', 'custom', 'Data does not exist!');
      })
  })

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      return ctrls.admin.deleteIdTransferById(req.params.id);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});





adminRouters.route('/employee/:id').get(async (req, res) => {
  const { role, role2 } = getTokenInfo(req);
  if (!(role === 'ADMIN' && role2 === ADMIN_ROLE.SUPER ))
    return res.json({ status: false, message: 'Permission denied!' });

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required",
  });

  validator.addPostRule(provider => {
    return models.admin.getById(provider.inputs.id)
      .then(admin => {
        if (!admin) provider.error('id', 'custom', 'Data does not exist!');
      });
  })

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      return Promise.all([
        ctrls.admin.getAdminById(req.params.id),
        ctrls.admin.getPermissionOfAdmin(req.params.id),
      ]);
    })
    .then(([admin, permission]) => res.json({
      status: true,
      message: 'success',
      data: models.admin.output(admin),
      permission: models.adminPermission.output(permission),
    }))
});

adminRouters.route('/employee').get(async (req, res) => {
  const { role, role2 } = getTokenInfo(req);
  if (!(role === 'ADMIN' && role2 === ADMIN_ROLE.SUPER)) res.json({ status: false, message: "Permission denied!" });

  const validator = new Validator(req.query, {
    limit: "required",
    page: "required",
  });

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      return ctrls.admin.adminList({
        page: Number(req.query.page),
        limit: Number(req.query.limit),
      })
    })
    .then(resl => res.json(resl))
    .catch(error => respondValidateError(res, error))
});

adminRouters.route('/employee').post(async (req, res) => {
  const { role } = getTokenInfo(req);
  if (role !== 'ADMIN') return res.json({ status: false, message: "Permission denied!" });

  const validator = new Validator({
    ...req.body,
  }, {
    email: "required",
    user_name: "required",
    password: "required",
  });

  validator.addPostRule(provider => Promise.all([
    models.admin.getByEmail(req.body.email),
    models.admin.getByUsername(req.body.user_name),
  ])
    .then(([ byEmail, byUserName ]) => {
      if (byEmail) provider.error('email', 'custom', "Email already taken by other administrator!");
      if (byUserName) provider.error('user_name', 'custom', 'User name already taken by other administrator!');
    })
  )

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      return ctrls.admin.addEmployee(req.body);
    })
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error))
})

adminRouters.route('/employee/:id').delete(async (req, res) => {
  const { role, role2 } = getTokenInfo(req);
  if (!(role === 'ADMIN' && role2 === ADMIN_ROLE.SUPER)) return res.json({ status: false, message: 'Permission denied!' });

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required",
  });

  validator.addPostRule(provider => models.admin.getById(provider.inputs.id)
    .then(admin => {
      if (!admin) provider.error('id', 'custom', 'Employee does not exist with the given id!');
    }))

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      return ctrls.admin.deleteEmployee(req.params.id);
    })
    .then(resl => res.json(resl))
    .catch(error => respondValidateError(res, error))
})

adminRouters.route('/employee/:id/permission').patch(async(req, res) => {
  const { role, role2, uid: user_id } = getTokenInfo(req);
  if (!(role === 'ADMIN' && role2 === ADMIN_ROLE.SUPER)) return res.json({ status: false, message: "Permission denied!" });

  const validator = new Validator({
    id: req.params.id,
  }, {
    id: "required",
  });

  validator.addPostRule(provider => {
    return Promise.all([
      models.admin.getById(provider.inputs.id),
      models.adminPermission.getByUserId(provider.inputs.id),
    ])
      .then(([admin, permission]) => {
        if (!admin) provider.error('id', 'custom', 'Admin does not exist!');
        // if (!permission) provider.error('permission', 'custom', 'Admin does not have permission!');
      });
  })

  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error("Invalid request!"), { code: 400, details: validator.errors });
      return ctrls.admin.updateEmployeePermission(req.params.id, req.body.permission)      
    })
    .then(({ admin, permission }) => res.json({
      status: true,
      message: 'Permission has been updated!',
      data: admin, permission
    }))
    .catch(error => respondValidateError(res, error))
})



module.exports = adminRouters;
