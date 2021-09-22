const { Validator } = require("node-input-validator");
const models = require("../models");

const { IUser } = require("../types");

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
