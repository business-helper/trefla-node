const TreflaModel = require('./_TreflaModel');
const { DEFAULT_USER } = require('../constants/model.constant');

class IUser extends TreflaModel {
  constructor(args) {
    super(args);
    this.defineProperties();
    this.jsonFields = ['location_array', 'black_list', 'payments', 'social_pass', 'social_links'];
    // initialize properties by args.
    for (const key in DEFAULT_USER) {
      this[key] = args[key];
    }
    // convert the JSON feilds into object or array.
    this.jsonify();
  }

  asPartial(keys2Delete = []) {
    const user = this.toObject();
    keys2Delete.forEach(key => {
      delete user[key];
    });
    return user;
  }

  asNormal() {
    const keys2Delete = ['black_list', 'email', 'password', 'social_pass', 'login_mode', 'language', 'radiusAround', 'noti_num', 'location_array', 'postAroundCenterCoordinate', 'update_time', 'recovery_code'];
    return this.asPartial(keys2Delete);
  }

  asProfile() {
    const keys2Delete = ['black_list', 'password', 'social_pass', 'login_mode', 'update_time', 'recovery_code'];
    return this.asPartial(keys2Delete);
  }

  asPublic() {
    const keys2Delete = ['id', 'user_name', 'location_area', 'card_number', 'card_verified', 'sex', 'birthday', 'language', 'bio', 'isGuest', 'guestName', 'avatarIndex', 'photo', 'location_address', 'city', 'online', 'guest_mood_status', 'normal_mood_status', 'socket_id', 'active', 'profile_done', 'theme_color', 'create_time'];
    return this.asPartial(keys2Delete);
  }
  
  asSimple() {
    return {
      id: this.id,
      user_name: this.user_name,
      email: this.email,
      sex: this.sex,
      photo: this.photo,
    };
  }

  defineProperties() {
    this.id = DEFAULT_USER['id'];
    this.user_name = DEFAULT_USER['user_name'];
    this.email = DEFAULT_USER['email'];
    this.password = DEFAULT_USER['password'];
    this.social_pass = DEFAULT_USER['social_pass'];
    this.login_mode = DEFAULT_USER['login_mode'];
    this.sex = DEFAULT_USER['sex'];
    this.birthday = DEFAULT_USER['birthday'];
    this.language = DEFAULT_USER['language'];
    this.bio = DEFAULT_USER['bio'];
    this.black_list = DEFAULT_USER['black_list'];
    this.isGuest = DEFAULT_USER['isGuest'];
    this.guestName = DEFAULT_USER['guestName'];
    this.card_number = DEFAULT_USER['card_number'];
    this.card_img_url = DEFAULT_USER['card_img_url'];
    this.card_verified = DEFAULT_USER['card_verified'];
    this.id_verified = DEFAULT_USER['id_verified'];
    this.photo_verified = DEFAULT_USER['photo_verified'];
    this.points = DEFAULT_USER['points'];
    this.avatarIndex = DEFAULT_USER['avatarIndex'];
    this.photo = DEFAULT_USER['photo'];
    this.radiusAround = DEFAULT_USER['radiusAround'];
    this.device_token = DEFAULT_USER['device_token'];
    this.noti_num = DEFAULT_USER['noti_num'];
    this.unread_msg_num = DEFAULT_USER['unread_msg_num'];
    this.location_area = DEFAULT_USER['location_area'];
    this.location_coordinate = DEFAULT_USER['location_coordinate'];
    this.location_address = DEFAULT_USER['location_address'];
    this.location_array = DEFAULT_USER['location_array'];
    this.social_links = DEFAULT_USER['social_links'];
    this.postAroundCenterCoordinate = DEFAULT_USER['postAroundCenterCoordinate'];
    this.city = DEFAULT_USER['city'];
    this.ban_reason = DEFAULT_USER['ban_reason'];
    this.ban_reply = DEFAULT_USER['ban_reply'];
    this.recovery_code = DEFAULT_USER['recovery_code'];
    this.socket_id = DEFAULT_USER['socket_id'];
    this.current_chat = DEFAULT_USER['current_chat'];
    this.guest_mood_status = DEFAULT_USER['guest_mood_status'];
    this.normal_mood_status = DEFAULT_USER['normal_mood_status'];
    this.users_age_range = DEFAULT_USER['users_age_range'];
    this.users_around_radius = DEFAULT_USER['users_around_radius'];
    this.online = DEFAULT_USER['online'];
    this.active = DEFAULT_USER['active'];
    this.profile_done = DEFAULT_USER['profile_done'];
    this.theme_color = DEFAULT_USER['theme_color'];
    this.payments = DEFAULT_USER['payments'];
    this.create_time = DEFAULT_USER['create_time'];
    this.update_time = DEFAULT_USER['update_time'];
  }
}

module.exports = IUser;
