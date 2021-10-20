const { Validator } = require("node-input-validator");
const models = require("../models");
const helperes = require("../helpers");
const CONSTS = require("../constants/socket.constant");
const NOTI_TYPES = require("../constants/socket.constant");
const { IMatchProfile, IUser } = require("../types");
const { timestamp } = require("../helpers/common.helpers");

const activity = {
  getUserMatchProfile: async (user_id) => {
    return models.MatchProfile.getByUserId(user_id).then((matchProfile) => {
      if (matchProfile) return matchProfile;
      const mMatchProfile = new models.MatchProfile({ user_id });
      return mMatchProfile.save();
    });
  },
};

exports.activity = activity;

exports.updateReq = (user_id, args) => {
  return activity.getUserMatchProfile(user_id)
    .then(matchProfile => {
      const mMatchProfile = new models.MatchProfile(matchProfile);
      ['name', 'height', 'drinking', 'smoking', 'relations'].forEach((key) => {
        if (mMatchProfile.hasOwnProperty(key) && args.hasOwnProperty(key)) {
          mMatchProfile[key] = args[key];
        }
      });
      return mMatchProfile.save();
    })
    .then(matchProfile => {
      const mMatchProfile = new models.MatchProfile(matchProfile);
      return {
        status: true,
        message: 'success',
        data: mMatchProfile.toJSON(),
      };
    });
};

exports.updatePreferenceReq = (user_id, args) => {
  return activity.getUserMatchProfile(user_id)
    .then(profile => {
      const mProfile = new models.MatchProfile(profile);
      mProfile.preference = args;
      return mProfile.save();
    })
    .then(profile => {
      const mProfile = new models.MatchProfile(profile);
      return {
        status: true,
        message: 'success',
        data: mProfile.toJSON().preference,
      };
    })
};

exports.getByUserReq = (user_id) => {
  return activity.getUserMatchProfile(user_id)
    .then(profile => {
      const mProfile = new models.MatchProfile(profile);
      return {
        status: true,
        message: 'success',
        data: mProfile.toJSON(),
      };
    });
}
