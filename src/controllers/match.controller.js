const { Validator } = require("node-input-validator");
const models = require("../models");
const { MATCH_STATUS } = require('../constants/common.constant');

const { IUser } = require("../types");

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

exports.getAreaUsers = ({ user_id, last_id = null, limit = 5 }) => {
  return models.user.getById(user_id)
    .then((me) => {
      const iMe = new IUser(me);
      if (!iMe.location_area) throw new Error("Location area is unavailable!");
      return models.user.getAreaUsers({
        user_id,
        limit,
        last_id,
        location_area: iMe.location_area,
      });
    })
    .then(users => {
      return Promise.all(users.map(async user => {
        const iUser = new IUser(user);
        const photos = await models.photo.getUserGallery(iUser.id);
        const nUser = iUser.asNormal();
        nUser.gallery = photos;
        return nUser;
      }))
    });
};

exports.likeUser = ({ my_id, target_id }) => {
  return activity.generateMatch({
    user_id1: my_id,
    user_id2: target_id,
    status: MATCH_STATUS.LIKE,
  });
};

exports.dislikeUser = ({ my_id, target_id }) => {
  return activity.generateMatch({
    user_id1: my_id,
    user_id2: target_id,
    status: MATCH_STATUS.DISLIKE,
  });
}

exports.passUser = ({ my_id, target_id }) => {
  return activity.generateMatch({
    user_id1: my_id,
    user_id2: target_id,
    status: MATCH_STATUS.PASS,
  });
}
