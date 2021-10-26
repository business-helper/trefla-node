const sql = require("./db");
const { bool2Int, timestamp, JSONParser, stringifyModel } = require("../helpers/common.helpers");
const { GALLERY_TYPE, LOGIN_MODE } = require('../constants/common.constant');
const { IMatchProfile } = require('../types');

const table = 'users';

const User = function (user) {
  this.user_name = user.user_name;
  this.email = user.email;
  this.active = lang.active;
  this.create_time = timestamp();
  this.update_time = timestamp();
};

User.create = (newUser) => {
  newUser.id !== undefined ? delete newUser.id : null;
  newUser = stringifyModel(newUser);
  return new Promise((resolve, reject) => {
    sql.query("INSERT INTO users SET ?", newUser, (err, res) => {
			err ? reject(err) : resolve({ ...newUser, id: res.insertId });
    });
  });
};

User.save = async (updateData) => {
  updateData = stringifyModel(updateData);
  updateData.update_time = timestamp();
  return new Promise((resolve, reject) => {
    sql.query("UPDATE users SET ? WHERE id=?", [updateData, updateData.id], (err, res) => {
      err ? reject(err) : resolve(User.getById(updateData.id));
    });
  });
}

User.getAll = () => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM users", (err, res) => {
			err ? reject(err) : resolve(res);
    });
  });
};

User.getById = (id) => {
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM users WHERE id=? LIMIT 1", [id], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    });
  });
}

User.getByIds = async (ids) => {
  ids.push(0);
  return new Promise((resolve, reject) => {
    sql.query("SELECT * FROM users WHERE id IN (?)", [ids], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

User.getByEmail = (email) => {
	return new Promise((resolve, reject) => {
		sql.query("SELECT * FROM users WHERE email=? LIMIT 1", [email], (err, res) => {
			err ? reject(err) : resolve(res[0]);
		});
	})
}

User.duplicatedByEmailSocial = (email, login_mode = LOGIN_MODE.NORMAL) => {
	return new Promise((resolve, reject) => {
		sql.query(`SELECT * FROM ${table} WHERE email=? AND login_mode=? LIMIT 1`, [email, login_mode], (err, res) => {
			err ? reject(err) : resolve(res[0]);
		});
	})
}

User.getByUserName = (user_name) => {
	return new Promise((resolve, reject) => {
		sql.query("SELECT * FROM users WHERE user_name=? LIMIT 1", [user_name], (err, res) => {
			err ? reject(err) : resolve(res[0]);
		});
	});
}

User.getByCard = (card_number, verified = null) => {
  let where = [];
  where.push(`card_number='${card_number}'`);
  if ([0, 1, true, false].includes(verified)) {
    where.push(`card_verified=${bool2Int(verified)}`);
  }
  const strWhere =  where.length > 0 ? ` WHERE ${where.join(' AND ')} ` : "";
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM users ${strWhere}`, [], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

User.getByLocationArea = (location_area) => {
  let where = [];
  if (location_area) {
    where.push(`location_area='${location_area}'`);
  }
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM users ${strWhere}`, [], (err, res) => {
      err ? reject(err) : resolve(res);
    })
  })
}

User.getBySocialPass = ({ platform, pass }) => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} WHERE JSON_EXTRACT(social_pass, "$.${platform}")=?`, [pass], (err, res) => {
      err ? reject(err) : resolve(res[0]);
    })
  })
}

User.pagination = ({ page, limit, location_area = null, sort: { field, desc } = {}, keyword = '', extraConditions = [] }) => {
  limit = Number(limit);
  const offset = Number(page * limit);
  const strLimit = limit > 0 ? ` LIMIT ${limit} OFFSET ?` : "";

  const wheres = extraConditions || [];
  if (location_area) {
    wheres.push(`location_area='${location_area}'`);
  }
  if (keyword) {
    wheres.push(`(user_name LIKE '${keyword}' OR email LIKE '${keyword}')`);
  }
  const strWhere = wheres.length > 0 ? ` WHERE ${wheres.join(' AND ')}` : '';

  let orderBy = `${field || 'id'} ${desc ? 'DESC' : 'ASC'}`;
  if (field === 'image') {
    const dir = desc ? 'desc' : 'asc';
    orderBy = `photo ${dir}, avatarIndex ${dir}`;
  }

  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM users ${strWhere} ORDER BY ${orderBy} ${strLimit}`, [ offset ], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

User.numberOfUsers = ({ location_area = null, keyword = '', extraConditions = [] } = {}) => {
  const wheres = extraConditions || [];
  if (location_area) {
    wheres.push(`location_area='${location_area}'`);
  }
  if (keyword) {
    wheres.push(`(user_name LIKE '${keyword}' OR email LIKE '${keyword}')`);
  }
  const strWhere = wheres.length > 0 ? ` WHERE ${wheres.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total FROM users ${strWhere}`, [], (err, res) => {
      err ? reject(err) : resolve(res[0].total);
    });
  });
}

User.cardPagination = ({ page, limit }) => {
  page = Number(page);
  limit = Number(limit);
  const strWhere = `card_number != '' OR card_img_url != ''`;
  const offset = page * limit;
  const strLimit = limit === 0 ? '' : ` LIMIT ${limit} OFFSET ${offset}`;
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM users WHERE ${strWhere} ORDER BY id DESC ${strLimit}`, [], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  })
}

User.getAreaUsers = ({ excludes, limit, last_id, location_area, matchProfile }) => {
  const galleryTypes = Object.values(GALLERY_TYPE);
  const str_galleryTypes = `'${galleryTypes.join("','")}'`;

  const where = [
    `users.id NOT IN (${excludes.join(',')})`,
    `location_area='${location_area}'`,
    `photos.type IN (${str_galleryTypes})`,
  ];
  if (last_id) {
    where.push(`users.id < ${last_id}`);
  }
  if (matchProfile) {
    const iMatchProfile = new IMatchProfile(matchProfile);
    where.push(`match_profiles.smoking=${iMatchProfile.preference.smoking}`);
    where.push(`match_profiles.drinking=${iMatchProfile.preference.drinking}`);
    where.push(`match_profiles.height >= ${iMatchProfile.preference.heightRange[0]} AND match_profiles.height <= ${iMatchProfile.preference.heightRange[1]}`);
    if (iMatchProfile.preference.relations.length > 0) {
      where.push(`(${
        iMatchProfile.preference.relations
        .map(relation => `JSON_CONTAINS(relations, '\"${relation}\"')=1`)
        .join(' OR ')
      })`);
    }
  }
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT users.*, COUNT(photos.id) as photo_num
      FROM ${table}
      JOIN photos ON users.id=photos.user_id
      JOIN match_profiles ON users.id=match_profiles.user_id
      ${strWhere}
      GROUP BY users.id
      ORDER BY users.create_time DESC LIMIT ${limit}`, [], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

User.getRandomUsersForGuess = ({ excludes = [], location_area, limit = 9, sex = null, matchProfile }) => {
  const galleryTypes = Object.values(GALLERY_TYPE);
  const str_galleryTypes = `'${galleryTypes.join("','")}'`;
  const where = [
    `photos.type IN (${str_galleryTypes})`,
  ];
  if (location_area) {
    where.push(`location_area='${location_area}'`);
  }
  if (excludes.length > 0) {
    where.push(`${table}.id NOT IN ('${excludes.join("','")}')`);
  }
  if (sex !== null) {
    where.push(`users.sex = ${sex}`);
  }
  if (matchProfile) {
    const iMatchProfile = new IMatchProfile(matchProfile);
    where.push(`match_profiles.smoking=${iMatchProfile.preference.smoking}`);
    where.push(`match_profiles.drinking=${iMatchProfile.preference.drinking}`);
    where.push(`match_profiles.height >= ${iMatchProfile.preference.heightRange[0]} AND match_profiles.height <= ${iMatchProfile.preference.heightRange[1]}`);
    if (iMatchProfile.preference.relations.length > 0) {
      where.push(`(${
        iMatchProfile.preference.relations
        .map(relation => `JSON_CONTAINS(relations, '\"${relation}\"')=1`)
        .join(' OR ')
      })`);
    }
  }
  const strWhere = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM (SELECT users.*, COUNT(photos.id) as photo_num
      FROM photos
      LEFT JOIN users ON users.id=photos.user_id
      JOIN match_profiles ON photos.user_id=match_profiles.user_id
      ${strWhere}
      GROUP BY users.id) usr
      WHERE photo_num > 0
      ORDER BY rand() LIMIT ?
      `, [limit], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

User.numberOfCard = () => {
  const strWhere = `card_number != '' OR card_img_url != ''`;
  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total FROM users WHERE ${strWhere}`, [], (err, res) => {
      err ? reject(err) : resolve(res[0].total);
    })
  })
}

User.updateSocketSession = ({ id, socketId }) => {
  return new Promise((resolve, reject) => {
    sql.query("UPDATE users SET socket_id=? WHERE id=?", [socketId, id], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

User.getBlockers = (user_id) => {
  // let where = [sender_id, receiver_id].map(user_id => `(JSON_CONTAINS(user_ids, '${user_id}', '$')=1)`);
  where = [];
  where.push(`(JSON_CONTAINS(black_list, '${user_id}', '$')=1)`);

  const strWhere = ' WHERE ' + where.join(' AND ');

  return new Promise((resolve, reject) => {
    sql.query(`SELECT * FROM ${table} ${strWhere}`, [], (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
}

User.deleteById = async (user_id) => {
  return new Promise((resolve, reject) => {
    sql.query("DELETE FROM users WHERE id=?", [user_id], (err, res) => {
      err ? reject(err) : resolve(res.affectedRows > 0);
    })
  })
}

User.total = () => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT COUNT(id) as total FROM users`, [], (err, res) => {
      err ? reject(err) : resolve(res[0].total);
    })
  })
}

User.getAllIds = () => {
  return new Promise((resolve, reject) => {
    sql.query(`SELECT id FROM ${table}`, [], (err, res) => {
      err ? reject(err) : resolve(res);
    })
  });
}

User.output = (user, mode = 'NORMAL') => {
  if (!user) return null;
  try {
    if (typeof user.location_array === 'string') user.location_array = JSON.parse(user.location_array || "[]");
  } catch (e) {
    // console.log('[location array]', user.location_array);
    user.location_array = [];
  }
  
  if (user.black_list === "") user.black_list = [];
  else user.black_list = JSONParser(user.black_list);

  user.payments = JSONParser(user.payments);

  // keys to delete
  let delKeys = [];
  if (mode === 'NORMAL') {
    delKeys = ['black_list', 'email', 'password', 'social_pass', 'login_mode', 'language', 'radiusAround', 'noti_num', 'location_array', 'postAroundCenterCoordinate', 'update_time', 'recovery_code'];
  } else if (mode === 'PROFILE') {
    delKeys = ['black_list', 'password', 'social_pass', 'login_mode', 'update_time', 'recovery_code'];
  } else if (mode === 'SIMPLE') {
    return { 
      id: user.id,
      user_name: user.user_name,
      email: user.email,
      sex: user.sex,
      photo: user.photo,
    };
  } else if (mode === 'PUBLIC') {
    const fields = ['id', 'user_name', 'location_area', 'card_number', 'card_verified', 'sex', 'birthday', 'language', 'bio', 'isGuest', 'guestName', 'avatarIndex', 'photo', 'location_address', 'city', 'online', 'guest_mood_status', 'normal_mood_status', 'socket_id', 'active', 'profile_done', 'theme_color', 'create_time'];
    const toReturn = {};
    fields.forEach((key, i) => toReturn[key] = user[key]);
    toReturn.social_links = JSONParser(user.social_links);
    return toReturn;
  }
  // delete the given keys
  delKeys.forEach(field => {
    delete user[field];
  });
  return user;
}

module.exports = User;
