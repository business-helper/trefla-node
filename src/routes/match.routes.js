const express = require('express');
const { Validator } = require("node-input-validator");

const { BearerMiddleware } = require('../middlewares/basic.middleware');
const ctrls = require('../controllers');
const models = require('../models');
const { IMatch, IGuess } = require('../types');
const { getTokenInfo } = require('../helpers/auth.helpers');
const { respondValidateError } = require('../helpers/common.helpers');


const routes = express.Router();

routes.route('/ping').get((req, res) => res.send('[Match] Pong!'));

// encapcule with bearer authentication.
routes.use((req, res, next) => BearerMiddleware(req, res, next));

routes.route('/area-users').post((req, res) => {
  const { uid: user_id } = getTokenInfo(req);

  return ctrls.match.getAreaUsers({
    user_id,
    last_id: req.body.last_id || 0,
    limit: req.body.limit,
  })
    .then(result => res.json({ status: true, message: 'success', data: result }))
    .catch(error => respondValidateError(res, error));
});

routes.route('/guess-list').post((req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(req.body, {
    match_id: "required",
  });

  return validator.check()
    .then(async matched => {
      if (!matched) throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors });
      const match = await models.Match.getById(req.body.match_id);
      if (!match) throw new Error('Not found the match!');
      if (match.user_id2 !== user_id) throw Object.assign(new Error('Permission denied!'), { code: 403, details: [] });
    })
    .then(() => ctrls.match.getGuessList({ user_id, ...req.body }))
    .then(result => res.json({ status: true, message: 'success', data: result }))
    .catch(error => respondValidateError(res, error));
});

routes.route('/guess/single').post((req, res) => {
  const socketClient = req.app.locals.socketClient;
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(req.body, {
    match_id: 'required',
    target_id: 'required',
  });

  return validator.check()
    .then(async matched => {
      if (!matched) throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors });
      const match = await models.Match.getById(req.body.match_id);
      if (!match) throw new Error('Not found the match!');
      const iMatch = new IMatch(match);
      if (iMatch.user_id2 !== user_id) throw new Error('Permission denied!');
      const guess = await models.Guess.getByMatchId(req.body.match_id);
      if (guess) {
        const iGuess = new IGuess(guess);
        if (iGuess.selected_users.length >= 3) {
          throw new Error('You already selected the maximum users!');
        }
        if (iGuess.selected_users.includes(req.body.target_id)) {
          throw new Error('You already selected this user!');
        }
      }
      const target_user = await models.user.getById(req.body.target_id);
      if (!target_user) throw new Error('Not found the target user!');
      return ctrls.match.guessSingleUser(user_id, req.body, socketClient);
    })
    .then(result => res.json({ status: true, message: 'success', data: result }))
    .catch(error => respondValidateError(res, error));
});

routes.route('/guess/multiple').post((req, res) => {
  const socketClient = req.app.locals.socketClient;
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(req.body, {
    match_id: 'required',
    target_ids: 'required|array',
    'target_ids.*': 'required|integer',
  });
  return validator.check()
    .then(async matched => {
      if (!matched) throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors });
      if (req.body.target_ids.length > 3) throw new Error('You can selectd 3 users at max!');

      const match = await models.Match.getById(req.body.match_id);
      if (!match) throw new Error('Not found the match!');
      const iMatch = new IMatch(match);

      if (iMatch.user_id2 !== user_id) throw new Error('Permission denied!');
      const guess = await models.Guess.getByMatchId(req.body.match_id);
      if (guess) {
        const mGuess = new models.Guess(guess);
        if (mGuess.selected_users.length >= 3) throw new Error('You already selected the maximum users!');
        if (mGuess.selected_users.length + req.body.target_ids.length > 3) throw new Error(`You can selected ${3 - mGuess.selected_users.length} more users in this match!`);
      }
      return ctrls.match.guessMultipleUsers(user_id, req.body, socketClient);
    })
    .then(({ guess, matched }) => res.json({ status: true, message: 'success', data: guess, matched }))
    .catch(error => respondValidateError(res, error));
});

routes.route('/like/:target_id').post((req, res) => {
  const socketClient = req.app.locals.socketClient;
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(req.params, {
    target_id: "required",
  });

  return validator.check()
    .then(async matched => {
      if (!matched) throw Object.assign(new Error('Invalid request'), { code: 400, details: validator.errors });
      const target_user = await models.user.getById(req.params.target_id);
      if (!target_user) throw new Error('Target user not found!');
    })
    .then(() => ctrls.match.likeUser({ my_id: user_id, target_id: Number(req.params.target_id) }, socketClient))
    .then(result => res.json({ status: true, message: 'success', data: result }))
    .catch(error => respondValidateError(res, error));
});

routes.route('/dislike/:target_id').post((req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(req.params, {
    target_id: "required",
  });
  return validator.check()
    .then(async matched => {
      if (!matched) throw Object.assign(new Error('Invalid request'), { code: 400, details: validator.errors });
      const target_user = await models.user.getById(req.params.target_id);
      if (!target_user) throw new Error('Target user not found!');
    })
    .then(() => ctrls.match.dislikeUser({ my_id: user_id, target_id: Number(req.params.target_id) }))
    .then((result) => res.json({ status: true, message: 'success', data: result }))
    .catch(error => respondValidateError(res, error));
});

routes.route('/pass/:target_id').post((req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(req.params, {
    target_id: "required",
  });
  return validator.check()
    .then(async matched => {
      if (!matched) throw Object.assign(new Error('Invalid request'), { code: 400, details: validator.errors });
      const target_user = await models.user.getById(req.params.target_id);
      if (!target_user) throw new Error('Target user not found!');
    })
    .then(() => ctrls.match.passUser({ my_id: user_id, target_id: Number(req.params.target_id) }))
    .then((result) => res.json({ status: true, message: 'success', data: result }))
    .catch(error => respondValidateError(res, error));
});

routes.route('/profile/me').get((req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  return ctrls.matchProfile.getByUserReq(user_id)
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

routes.route('/profile').patch((req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(req.body, {
    name: "required",
    smoking: "required",
    drinking: "required",
    height: "required",
    relations: "required|array",
  });
  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error('Invalid request!'), { code: 400, details: validator.errors });
    })
    .then(() => ctrls.matchProfile.updateReq(user_id, req.body))
    .then(result => res.json(result))
    .catch(error => respondValidateError(res, error));
});

routes.route('/profile/preference').patch((req, res) => {
  const { uid: user_id } = getTokenInfo(req);
  const validator = new Validator(req.body, {
    'drinking': 'required',
    'smoking': 'required',
    'heightRange': 'required|array',
    'ageRange': 'required|array',
    'relations': 'required|array',
  });
  return validator.check()
    .then(matched => {
      if (!matched) throw Object.assign(new Error('Invalid request|!'), { code: 400, details: validator.errors });
    })
    .then(() => ctrls.matchProfile.updatePreferenceReq(user_id, req.body))
    .then((result) => res.json(result))
    .catch(error => respondValidateError(res, error));
});

routes.route('/profile/fill-default').patch((req, res) => {
  return models.user.getAllIds()
    .then(users => Promise.all(users.map(({ id }) => ctrls.matchProfile.activity.getUserMatchProfile(id))))
    .then(matchProfiles => res.json({
      status: true,
      message: `Checked ${matchProfiles.length} users`,
    }))
    .catch(error => res.json({ status: false, message: error.message }));
});


routes.route('/').post((req, res) => {
  const { uid: user_id } = getTokenInfo(req);

  return ctrls.match.getMatchedUsers({
    user_id,
    last_id: req.body.last_id || 0,
    limit: req.body.limit,
  })
    .then(users => res.json({ status: true, message: 'success', data: users }))
    .catch(error => respondValidateError(res, error));
});

module.exports = routes;
