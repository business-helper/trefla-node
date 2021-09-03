const { generateTZTimeString, timestamp } = require('../helpers/common.helpers');
const { ADMIN_NOTI_TYPES } = require("./notification.constant");
const { ADMIN_ROLE, LOGIN_MODE } = require('./common.constant');

exports.DEFAULT_ADMIN = {
  id: '',
  user_name: '',
  email: '',
  password: '',
  avatar: '',
  role: ADMIN_ROLE.ADMIN,
  last_login: '',
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_ADMIN_PERMISSION = {
  id: '',
  admin_id: 0,
  user: {
    list: {
      show: true,
      edit: true,
      ban: true,
      delete: true,
    },
    nationalId: {
      show: true,
      verify: true,
    },
    idTransfer: {
      show: true,
      judge: true,
      email: true,
      delete: true,
    },
    sendNotification: {
      show: true,
    },
  },
  post: {
    show: true,
    edit: true,
    delete: true,
  },
  comment: {
    show: true,
    edit: true,
    delete: true,
  },
  report: {
    show: true,
    email: true,
    delete: true,
  },
  bug: {
    show: true,
    mark: true,
    email: true,
    delete: true,
  },
  lang: {
    show: true,
    add: true,
    edit: true,
    delete: true,
    async: true,
  },
  settings: {
    emailTemplate: true,
    config: true,
    // admins: true,
  },
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_ADMIN_NOTIFICATION = {
  id: '',
  type: ADMIN_NOTI_TYPES.ID_TRANSFER,
  payload: JSON.stringify({}),
  emails: JSON.stringify([]),
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_APPLE_TOKEN = {
  // id: '',
  name: '',
  email: '',
  token: 0,
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_BUG = {
  id: '',
  user_id: 0,
  device_model: '',
  report: '',
  file: '',
  fixed: 0,
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_CHAT = {
  id: '',
  user_ids: "",
  accept_status: 1,
  sources: '[]',
  isForCard: 0,
  card_number: '',
  card_verified: 0,
  profile_revealed: JSON.stringify([0,0]),
  from_where: 'NONE',
  target_id: "0",
  unread_nums: JSON.stringify([]),
  online_status: JSON.stringify({}),
  last_messages: JSON.stringify([]),
  isTransfered: 0,
  lastMsgIdOnTransfer: JSON.stringify([]),
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_COMMENT = {
  id: '',
  user_id: 0,
  comment: '',
  target_id: 0,
  type: 'POST',
  comment_num: 0,
  isGuest: 0,
  like_1_num: 0,
  like_2_num: 0,
  like_3_num: 0,
  like_4_num: 0,
  like_5_num: 0,
  like_6_num: 0,
  active: 1,
  time: generateTZTimeString(),
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_COMMENTLIKE = {
  id: '',
  user_id: 0,
  comment_id: 0,
  type: 0,
  create_time: timestamp(),
  update_time: timestamp(),
}

exports.DEFAULT_CONFIG = {
  id: '',
  admin_email: "",
  aroundSearchPeriod: 100,
  aroundSearchDays: 1,
  defaultAroundRadius: 100,
  defaultUserRadiusAround: 100,
  lang_version: "",
  default_zone: "",
  apply_default_zone: 0,
  android_version: '1.0',
  android_link: '',
  apple_version: '1.0',
  apple_link: '',
  enable_top_music: false,
  post_point: 2,
  daily_post_limit: 1,
  comment_point: 1,
  daily_comment_limit: 1,
  chat_point: 1,
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_IDENTITY = {
  id: '',
  user_id: 0,
  photo_id: '',
  photo_person: '',
  verified: 0,
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_MESSAGE = {
  id: '',
  chat_id: 0,
  message: '',
  sender_id: 0,
  receiver_id: 0,
  isOnlyEmoji: 0,
  numEmoji: 0,
  sizeEmoji: 0,
  optional: '',
  type: 0,
  status: 1,
  time: generateTZTimeString(),
  create_time: timestamp(),
  update_time: timestamp()
};

exports.DEFAULT_NOTIFICATION = {
  id: '',
  sender_id: 0,
  receiver_id: 0,
  type: 0,
  optional_val: '',
  time: generateTZTimeString(),
  is_read: 0,
  isFromAdmin: 0,
  isGuest: 0,
  text: '',
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_PHOTO = {
  id: "",
  user_id: 0,
  url: '',
  type: 'normal',
  ratio: '',
  thumbnail: '',
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_POINT_TRANSACTION = {
  id: '',
  user_id: 0,
  amount: 0,
  src_type: 'POST',
  src_id: 0,
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_POST = {
  id: '',
  user_id: 0,
  post_name: '',
  feed: '',
  isGuest: 0,
  type: "1",
  target_date: "",
  option_val: '',
  comment_num: 0,
  liked: 0,
  like_1_num: 0,
  like_2_num: 0,
  like_3_num: 0,
  like_4_num: 0,
  like_5_num: 0,
  like_6_num: 0,
  location_area: '',
  location_address: '',
  location_coordinate: '',
  city: '',
  active: 1,
  post_time: '2020-01-01-00-00-00:180',
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_POSTLIKE = {
  id: '',
  user_id: 0,
  post_id: 0,
  type: 0,
  create_time: timestamp(),
  update_time: timestamp(),
}

exports.DEFAULT_REPORT = {
  id: '',
  user_id: 0,
  type: '',
  target_id: 0,
  reason: '',
  time: generateTZTimeString(),
  create_time: timestamp(),
  update_time: timestamp(),
};

exports.DEFAULT_USER = {
  id: 0,
  user_name: '',
  email: '',
  password: '',
  social_pass: '{}',
  login_mode: LOGIN_MODE.NORMAL,
  sex: 0,
  birthday: '',
  language: 'English',
  bio: '',
  black_list: JSON.stringify([]),
  isGuest: 0,
  guestName: '',
  card_number: '',
  card_img_url: '',
  card_verified: 0,
  id_verified: 0,
  photo_verified: 0,
  points: 0,
  avatarIndex: 0,
  photo: '',
  radiusAround: 100,
  device_token: '',
  noti_num: 0,   // when add noti
  unread_msg_num: 0,  // send message
  location_area: '',
  location_coordinate: '',
  location_address: '',
  location_array: JSON.stringify([]),
  social_links: JSON.stringify([]),
  postAroundCenterCoordinate: '',
  city: '',
  ban_reason: "",
  ban_reply: "",
  recovery_code: '',
  socket_id: "",
  current_chat: 0,
  guest_mood_status: 'offline',
  normal_mood_status: 'offline',
  users_age_range: '15-60',
  users_around_radius: 400,
  online: 0,
  active: 0,
  profile_done: 0,
  theme_color: '',
  payments: {
    bank: null,
    card: null,
    paypal: null,
  },
  create_time: timestamp(),
  update_time: timestamp()
};
