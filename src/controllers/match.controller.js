const { Validator } = require("node-input-validator");
const models = require("../models");
const helpers = require('../helpers');
const { MATCH_STATUS } = require('../constants/common.constant');
const CONSTS = require('../constants/socket.constant');
const NOTI_TYPES = require('../constants/notification.constant');
const {
  IConfig,
  IGuess,
  IMatch,
  INotification,
  IUser
} = require("../types");
const { generateTZTimeString, timestamp } = require('../helpers/common.helpers');

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
  addNotificationForLike: async (match, socketClient) => {
    const iMatch = new IMatch(match);
    const user = await models.user.getById(iMatch.user_id2);
    const iUser = new IUser(user);
    const notiData = helpers.model.generateNotificationData({
      sender_id: 0,
      receiver_id: iMatch.user_id2,
      type: NOTI_TYPES.notiTypeMatchLiked,
      optional_val: iMatch.id,
      time: generateTZTimeString(),
      isFromAdmin: 1,
    });
    const notification = await models.notification.create(notiData);
    iUser.noti_num ++;
    await models.user.save(iUser.toDB());
    if (iUser.socket_id) {
      socketClient.emit(CONSTS.SKT_LTS_SINGLE, {
        to: user.socket_id,
        event: CONSTS.SKT_MATCH_LIKED,
        args: {
          match_id: iMatch.id,
        },
      });
      // send socket for notifcation update.
      await helpers.notification.socketOnNewNotification({ user_id: iUser.id, notification, socketClient });
    }
    activity.pushNotification4NewLike({ user, notification }).catch(() => {});
    return notification;
    
  },
  pushNotification4NewLike: ({ user, notification }) => {
    const title = {
      EN: 'Match',
      RO: 'Meci',
    };
    const body = {
      EN: `Someone just liked you on Match`,
      RO: `Cineva tocmai te-a plăcut pe Match`,
    };
    const data = {
      noti_id: String(notification.id || ""),
      optionalVal: String(notification.optional_val || ""),
      type: String(notification.type || ""),
      user_id: "0",
      user_name: 'Admin',
      avatar: '',
    };
    const lang = ['EN', 'RO'].includes(user.language.toUpperCase()) ? user.language.toUpperCase() : 'EN';
    if (user.device_token) {
      return helpers.common.sendSingleNotification({
        body: body[lang],
        title: title[lang],
        token: user.device_token,
        data,
      });
    }
  },
  addNotificationForPair: async (match, socketClient) => {
    const iMatch = new IMatch(match);
    const user = await models.user.getById(iMatch.user_id2);
    const iUser = new IUser(user);
    const user2 = await models.user.getById(iMatch.user_id1);
    const iUser2 = new IUser(user2);
    const notiData = helpers.model.generateNotificationData({
      sender_id: 0,
      receiver_id: iMatch.user_id2,
      type: NOTI_TYPES.notiTypeMatchPaired,
      optional_val: iMatch.user_id1,
      time: generateTZTimeString(),
      isFromAdmin: 1,
    });
    const notification = await models.notification.create(notiData);
    iUser.noti_num ++;
    await models.user.save(iUser.toDB());
    if (iUser.socket_id) {
      // get user2's gallery.
      const photos = await models.photo.getUserGallery(iUser2.id, 0);
      const matchedWith = iUser2.asNormal();
      matchedWith.photos = photos;

      socketClient.emit(CONSTS.SKT_LTS_SINGLE, {
        to: user.socket_id,
        event: CONSTS.SKT_MATCH_PAIRED,
        args: {
          user_id: iMatch.user_id1,
          data: matchedWith,
        },
      });
      // send socket for notifcation update.
      await helpers.notification.socketOnNewNotification({ user_id: iUser.id, notification, socketClient });
    }
    activity.pushNotification4NewPair({ user, notification }).catch(() => {});
    return notification;
  },
  pushNotification4NewPair: async ({ user, notification }) => {
    const iUser = new IUser(user);
    const iNotification = new INotification(notification);
    const user2 = await models.user.getById(iNotification.optional_val);
    const iUser2 = new IUser(user2);
    const title = {
      EN: 'Match',
      RO: 'Meci',
    };
    const body = {
      EN: `Congrats! You matched with ${iUser2.user_name}`,
      RO: `Felicitări! Te-ai asortat cu ${iUser2.user_name}`,
    };
    const data = {
      noti_id: String(iNotification.id || ""),
      optional_val: String(iNotification.optional_val || ""),
      type: String(notification.type || ""),
      user_id: '0',
      user_name: 'Admin',
      avatar: '',
    };
    const lang = ['EN', 'RO'].includes(iUser.language.toUpperCase()) ? iUser.language.toUpperCase() : 'EN';
    if (iUser.device_token) {
      return helpers.common.sendSingleNotification({
        body: body[lang],
        title: title[lang],
        token: iUser.device_token,
        data,
      });
    }
  },
};

/**
 * @description get matchable user list in the same area.
 *  @excludes 
 *    - the users that I touched within {config.match_skip_days} days.
 *    - the users who got liked within {config.match_guess_wait} minutes ago.
 * @param { Integer } last_id last id as offset.
 * @param { Integer } limit max users to load a time. 5 in default
 * @return { Array<User> }
 */
exports.getAreaUsers = async ({ user_id, last_id = null, limit = 5 }) => {
  const config = await models.config.get();
  const iConfig = new IConfig(config);

  return models.user.getById(user_id)
    .then((me) => {
      const iMe = new IUser(me);
      if (!iMe.location_area) throw new Error("Location area is unavailable!");

      const timeAfter = timestamp() - iConfig.match_skip_days * 24 * 3600;
      return Promise.all([
        models.Match.recentMatches(user_id, timeAfter),
        models.Match.getRecentlyLikedUsers({ timeAfter: timestamp() - iConfig.match_guess_wait * 60 }),
      ])
        .then(([matches, recentlyLikedMatches]) => {
          const excludes = matches
            .map(match => match.user_id2)
            .concat(recentlyLikedMatches.map(match => match.user_id2))
            .filter(it => it);
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

exports.likeUser = ({ my_id, target_id }, socketClient) => {
  return activity.generateMatch({
    user_id1: my_id,
    user_id2: target_id,
    status: MATCH_STATUS.LIKE,
  })
    .then(match => {
      const iMatch = new IMatch(match);
      // check if the user pair will be matched.
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
        })
        .then(async match => {
          // process notification.
          const iMatch = new IMatch(match);
          if (iMatch.likewise === 1) {
            await activity.addNotificationForPair(match, socketClient);
            const matchR = await models.Match.getByUserIds(iMatch.user_id2, iMatch.user_id1);
            await activity.addNotificationForPair(matchR, socketClient);
          } else {
            await activity.addNotificationForLike(match, socketClient);
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

/**
 * @description get 10 users to guess who liked me(user_id).
 *  excludes if:
 *    - me
 *    - already matched.
 *    - already I liked.
 *    - the user that triggered the match(liker)
 *    - the users who get liked within 10 minutes ago.
 * @param { Integer } user_id
 * @param { Integer } match_id
 * @return { Array<User> }
 */
exports.getGuessList = async ({ user_id, match_id }) => {
  const me = await models.user.getById(user_id);
  const iMe = new IUser(me);
  return models.Match.getById(match_id).then(async match => {
    const iMatch = new IMatch(match);
    
    let excludes = [user_id];
    const likeds = await models.Match.getMatchesByTypes({ user_id, types: [MATCH_STATUS.LIKE] });
    excludes = excludes.concat(likeds.map(liked => liked.user_id2));
    const liker = await models.user.getById(iMatch.user_id1);
    excludes.push(liker.id);

    const time = timestamp();
    const config = await models.config.get();
    const iConfig = new IConfig(config);
    const likedMatches = await models.Match.getRecentlyLikedUsers({ timeAfter: time - iConfig.match_guess_wait * 60 });
    excludes = excludes
      .concat(likedMatches.map(match => match.user_id2))
      .filter((user_id, i, self) => self.indexOf(user_id) === i);
    const users = await models.user.getRandomUsersForGuess({ excludes, location_area: iMe.location_area, sex: 1 - iMe.sex });
    users.push(liker);
    return Promise.all(users.map(async user => {
      const iUser = new IUser(user);
      const photos = await models.photo.getUserGallery(iUser.id, 0);
      const nUser = iUser.asNormal();
      nUser.gallery = photos;
      return nUser;
    }));
  });
}

exports.guessSingleUser = async (user_id, { match_id, target_id }, socketClient) => {
  return Promise.all([
    models.user.getById(user_id),
    models.Match.getById(match_id),
    models.user.getById(target_id),
  ])
    .then(async ([me, match, targetUser]) => {
      const iMatch = new IMatch(match);
      let guess = await models.Guess.getByMatchId(match_id);
      if (!guess) {
        guess = await (new models.Guess({
          user_id, match_id,
        })).save();
      }
      const mGuess = new models.Guess(guess);
      mGuess.selected_users.push(target_id);
      mGuess.isCorrect = mGuess.isCorrect || (target_id === iMatch.user_id1 ? 1 : 0);
      return mGuess.save();
    })
    .then(guess => {
      const mGuess = new models.Guess(guess);
      this.likeUser({
        my_id: user_id,
        target_id,
      }, socketClient);
      return mGuess.toJSON();
    });
}

exports.geussMultipleUsers = async (user_id, { match_id, target_ids }, socketClient) => {
  return Promise.all([
    models.user.getById(user_id),
    models.Match.getById(match_id),
  ])
    .then(async ([me, match]) => {
      const mMatch = new models.Match(match);
      
      let guess = await models.Guess.getByMatchId(match_id);
      if (!guess) { // if doesn't exist, create one.
        guess = await (new models.Guess({
          user_id, match_id,
        })).save();
      }
      const mGuess = new models.Guess(guess);
      let selected_users = mGuess.selected_users;
      mGuess.selected_users = selected_users.concat(target_ids).filter((uid, i, self) => self.indexOf(uid) === i);
      mGuess.isCorrect = mGuess.selected_users.some(uid => uid === mMatch.user_id1);
      return Promise.all([
        mGuess.save(),
        match,
      ]);
    })
    .then(async ([guess, match]) => {
      const mGuess = new models.Guess(guess);
      await Promise.all(target_ids.map(target_id => this.likeUser({
        my_id: user_id,
        target_id,
      }, socketClient)));

      const user1 = await models.user.getById(match.user_id1);
      const iUser1 = new IUser(user1);
      const photos = await models.photo.getUserGallery(iUser1.id, 0);
      const nUser1 = iUser1.asNormal();
      nUser1.gallery = photos;
      return {
        guess: mGuess.toJSON(),
        matched: nUser1,
      };
    });
}
