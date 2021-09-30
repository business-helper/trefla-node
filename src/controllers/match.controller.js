const { Validator } = require("node-input-validator");
const models = require("../models");
const { MATCH_STATUS } = require('../constants/common.constant');

const {
  IConfig,
  IMatch,
  IUser
} = require("../types");

const activity = {
  generateMatch: ({ user_id1, user_id2, status }) => {
    const { Match } = models;
    return Match.getByUserIds(user_id1, user_id2)
      .then(exists => {
        let match;
        if (exists) {
          match = new Match(exists);
          match.status = status;
        } else {
          match = new Match({ user_id1, user_id2, status });
        }
        return match.save();
      });
  },
};

exports.getAreaUsers = async ({ user_id, last_id = null, limit = 5 }) => {
  const config = await models.config.get();
  const iConfig = new IConfig(config);

  return models.user.getById(user_id)
    .then((me) => {
      const iMe = new IUser(me);
      if (!iMe.location_area) throw new Error("Location area is unavailable!");

      const timeAfter = Math.floor(Date.now() / 1000) - iConfig.match_skip_days * 24 * 3600;
      return models.Match.recentMatches(user_id, timeAfter)
        .then(matches => {
          const excludes = matches.map(match => match.user_id2).filter(it => it);
          excludes.push(user_id);
          return models.user.getAreaUsers({
            excludes,
            limit,
            last_id,
            location_area: iMe.location_area,
          });
        });
    })
    .then(users => {
      return Promise.all(users.map(async user => {
        const iUser = new IUser(user);
        const photos = await models.photo.getUserGallery(iUser.id, 0);
        const nUser = iUser.asNormal();
        nUser.gallery = photos;
        return nUser;
      }))
    });
};

exports.getMatchedUsers = async ({ user_id, last_id = null, limit = 5 }) => {
  return models.Match.getMatches({ user_id, last_id, limit })
    .then(users => {
      return Promise.all(users.map(async user => {
        const iUser = new IUser(user);
        const photos = await models.photo.getUserGallery(iUser.id, 0);
        const nUser = iUser.asNormal();
        nUser.gallery = photos;
        return nUser;
      }));
    });
};

exports.likeUser = ({ my_id, target_id }) => {
  return activity.generateMatch({
    user_id1: my_id,
    user_id2: target_id,
    status: MATCH_STATUS.LIKE,
  })
    .then(match => {
      const iMatch = new IMatch(match);
      return models.Match.getByUserIds(iMatch.user_id2, iMatch.user_id1)
        .then(matchR => {
          if (matchR && matchR.status === MATCH_STATUS.LIKE) {
            matchR.likewise = 1;
            match.likewise = 1;

            const mdlMatch = new models.Match(match);
            const mdlMatchR = new models.Match(matchR);
            return Promise.all([
              mdlMatch.save(),
              mdlMatchR.save(),
            ])
              .then(([matchO]) => matchO);
          }
          return match;
        });
    });
};

exports.dislikeUser = ({ my_id, target_id }) => {
  return activity.generateMatch({
    user_id1: my_id,
    user_id2: target_id,
    status: MATCH_STATUS.DISLIKE,
  })
    .then(match => {
      const iMatch = new IMatch(match);
      if (!iMatch.likewise) return match;

      return models.Match.getByUserIds(iMatch.user_id2, iMatch.user_id1)
        .then(matchR => {
          matchR.likewise = match.likewise = 0;

          const mdlMatch = new models.Match(match);
          const mdlMatchR = new models.Match(matchR);

          return Promise.all([
            mdlMatch.save(),
            mdlMatchR.save(),
          ]);
        })
        .then(([match1]) => match1);
    });
}

exports.passUser = ({ my_id, target_id }) => {
  return activity.generateMatch({
    user_id1: my_id,
    user_id2: target_id,
    status: MATCH_STATUS.PASS,
  });
}
