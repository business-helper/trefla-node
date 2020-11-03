const { timestamp } = require('../helpers/common.helpers');

exports.DEFAULT_USER = {
  id: 0,
  user_name: '',
  email: '',
  password: '',
  sex: 0,
  birthday: '',
  language: 'English',
  bio: '',
  isGuest: 0,
  guestName: '',
  card_number: '',
  card_verified: 0,
  avatarIndex: 0,
  photo: '',
  radiusAround: 100,
  device_token: '',
  noti_num: 0,
  location_coordinate: '',
  location_address: '',
  location_array: JSON.stringify([]),
  postAroundCenterCoordinate: '',
  city: '',
  active: 0,
  create_time: timestamp(),
  update_time: timestamp()
};
