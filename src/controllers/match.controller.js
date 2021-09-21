const { Validator } = require('node-input-validator');
const models = require('../models');

const {
  IUser,
} = require('../types');

exports.getAreaUsers = ({ user_id, last_id = null, limit = 5 }) => {
  return models.user.getById(user_id).then(user => {
    const iUser = new IUser(user);
    if (!iUser.location_area) throw new Error('Location area is unavailable!');
    return models.user.getAreaUsers({
      user_id,
      limit,
      last_id,
      location_area: iUser.location_area,
    })
      .then(users => {
        return users;
      })
  })
}
