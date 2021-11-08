'use strict';

const errors = require('./errors');

// Insert a room with default values.
// @remark We use ignore to allow duplicated insert.
async function doRoomInsert(fields, mysql) {
  // Build the keys and values to update.
  const [flags, values] = [[], []];
  const keys = Object.keys(fields).map(k => {
    flags.push('?');
    values.push(fields[k]);
    return k;
  });

  // Insert roo, to DB.
  const [rows] = await mysql.query(`INSERT IGNORE INTO rooms(${keys.join(',')}) VALUES(${flags.join(',')})`, values);

  if (!rows) throw errors.create(errors.ServiceDBFailed, `create failed`);

  return rows;
}

// Update the room fields.
async function doRoomUpdate(roomId, fields, mysql) {
  // Build the keys and values to update.
  const values = [];
  const keys = Object.keys(fields).map(k => {
    values.push(fields[k]);
    return `${k}=?`;
  });

  // Last id for WHERE.
  values.push(roomId);

  // Insert roo, to DB.
  const [rows] = await mysql.query(`UPDATE rooms SET ${keys.join(',')} WHERE roomId=?`, values);

  if (!rows) throw errors.create(errors.ServiceDBFailed, `create failed`);
  if (rows.affectedRows !== 1) throw errors.create(errors.ServiceDBFailed, `create failed, affectedRows=${rows.affectedRows}`);
}

// Query room by cond, like {appId, type}
async function doRoomQuery(cond, mysql) {
  const values = [];
  const keys = Object.keys(cond).map(k => {
    values.push(cond[k]);
    return `${k}=?`;
  });

  const [rows] = await mysql.query(`SELECT * FROM rooms WHERE ${keys.join(' AND ')} order by updateUtc desc`, values);

  if (!rows) throw errors.create(errors.ServiceDBFailed, `query failed`);
  return rows;
}

// Destroy room by cond, like {roomId}
async function doRoomDestroy(cond, mysql) {
  const values = [];
  const keys = Object.keys(cond).map(k => {
    values.push(cond[k]);
    return `${k}=?`;
  });

  const [rows] = await mysql.query(`UPDATE rooms SET removed = 1 WHERE ${keys.join(' AND ')}`, values);

  if (!rows) throw errors.create(errors.ServiceDBFailed, `destroy failed`);
  return rows;
}

// Insert a user into room with necessarily fields, like the createUtc time.
async function doUsersInRoomInsert(fields, mysql) {
  // Build the keys and values to update.
  const [flags, values] = [[], []];
  const keys = Object.keys(fields).map(k => {
    flags.push('?');
    values.push(fields[k]);
    return k;
  });

  await mysql.query(
    `INSERT IGNORE INTO users_in_room(${keys.join(',')}) VALUES(${flags.join(',')})`, values,
  );
}

// Query guest(users in room) by cond, like {guestId}
async function doUsersInRoomQuery(cond, mysql) {
  const values = [];
  const keys = Object.keys(cond).map(k => {
    values.push(cond[k]);
    return `${k}=?`;
  });

  // We only return one record, however there might be more than one.
  const [rows] = await mysql.query(`SELECT * FROM users_in_room WHERE ${keys.join(' AND ')} ORDER BY createUtc ASC limit 1`, values);

  const guest = rows && rows[0];
  if (!rows) {
    console.log(`user query cond=${JSON.stringify(cond)}`);
    throw errors.create(errors.ServiceDBFailed, `get user failed, ${key}=${value}`);
  }
  if (rows.length !== 1 || !guest) {
    console.log(`user query cond=${JSON.stringify(cond)}, rows=${JSON.stringify(rows)}`);
    throw errors.create(errors.UserNotExists, `query invalid, cond=${JSON.stringify(cond)}`);
  }
  return guest;
}

// Get RoomsList by cond,like {category,removed}
async function doRoomListQuery({cond, ids, startUtc, endUtc, offset, limit, mysql}) {
  const values = [];
  const keys = Object.keys(cond).map(k => {
    values.push(cond[k]);
    return `${k}=?`;
  });
  if (ids && ids.length) {
    keys.push('roomId IN (?)');
    values.push(ids);
  }
  if (startUtc) {
    keys.push('createUtc>=?');
    values.push(startUtc);
  }
  if (endUtc) {
    keys.push('createUtc<?');
    values.push(endUtc);
  }
  values.push(offset);
  values.push(limit);

  // @remark Note that we MUST order by the createUtc desc, to get the latest rooms.
  const [rows] = await mysql.query(`SELECT * FROM rooms WHERE ${keys.join(' AND ')} ORDER BY createUtc DESC LIMIT ?,?`, values);

  if (!rows) {
    console.log(`rooms query cond=${JSON.stringify(cond)}`);
    throw errors.create(errors.ServiceDBFailed, `get rooms failed, ${keys}=${value}`);
  }
  return rows;
}

// Get list_users by cond,like {roomId}
async function doUserListQuery(limit, cond, mysql) {
  const values = [];
  const keys = Object.keys(cond).map(k => {
    values.push(cond[k]);
    return `ur.${k}=?`;
  });

  const [rows] = await mysql.query(`SELECT u.userId,u.name,u.avatar,ur.role FROM  users_in_room as ur join users as u on ur.userId = u.userId WHERE ${keys} LIMIT ?`, [values, limit]);

  if (!rows) {
    console.log(`user query cond=${JSON.stringify(cond)}`);
    throw errors.create(errors.ServiceDBFailed, `get userList failed, ${keys}=${value}`);
  }
  return rows;
}

// User leave room by cond, like {roomId,userId}
async function doUserLeave(cond, mysql) {
  const values = [];
  const keys = Object.keys(cond).map(k => {
    values.push(cond[k]);
    return `${k}=?`;
  });

  const [rows] = await mysql.query(`DELETE FROM users_in_room WHERE ${keys.join(' AND ')}`, values);

  if (!rows) {
    console.log(`leave room cond=${JSON.stringify(cond)}`);
    throw errors.create(errors.ServiceDBFailed, `leave room failed, ${keys}=${value}`);
  }
  return rows;
}

// Destroy room by cond, like {roomId}
async function doUserInRoomDestroy(cond, mysql) {
  const values = [];
  const keys = Object.keys(cond).map(k => {
    values.push(cond[k]);
    return `${k}=?`;
  });

  // clear all user in this room
  const [rows] = await mysql.query(
    `DELETE FROM users_in_room WHERE ${keys.join(' AND ')}`, values
  );

  if (!rows) {
    console.log(`leave room cond=${JSON.stringify(cond)}`);
    throw errors.create(errors.ServiceDBFailed, `leave room failed, ${keys}=${value}`);
  }
  return rows;
}

// Change role by cond, like {roomId,userId}
async function doUserRoleChange(role, cond, mysql) {
  const values = [role];
  const keys = Object.keys(cond).map(k => {
    values.push(cond[k]);
    return `${k}=?`;
  });

  const [rows] = await mysql.query(`UPDATE users_in_room SET role = ? WHERE ${keys.join(' AND ')}`, values);

  if (!rows) {
    console.log(`change role cond=${JSON.stringify(cond)}`);
    throw errors.create(errors.ServiceDBFailed, `change role failed, ${keys}=${value}`);
  }
  return rows;
}

// Get second enter the room
async function doQueryNextUserIdInRoom(cond, mysql) {
  const values = [];
  const keys = Object.keys(cond).map(k => {
    values.push(cond[k]);
    return `${k}=?`;
  });

  const [rows] = await mysql.query(`SELECT userId FROM users_in_room WHERE roomId = ? ORDER BY updateUtc LIMIT 0,1`, cond["roomId"]);

  if (!rows) {
    console.log(`query second user in room  cond=${JSON.stringify(cond)}`);
    throw errors.create(errors.ServiceDBFailed, `leave room failed, ${keys}=${value}`);
  }

  let userId = null;
  if (rows.length !== 0) {
    userId = rows[0]["userId"];
  }

  return userId;
}

// Get user's role in this room
async function doUserRoleQuery(cond, mysql) {
  const values = [];
  const keys = Object.keys(cond).map(k => {
    values.push(cond[k]);
    return `${k}=?`;
  });

  const [rows] = await mysql.query(`SELECT role FROM users_in_room WHERE ${keys.join(' AND ')}`, values);

  if (!rows) {
    console.log(`query user role in room cond=${JSON.stringify(cond)}`);
    throw errors.create(errors.ServiceDBFailed, `leave room failed, ${keys}=${value}`);
  }
  if (rows.length !== 1) {
    console.log(`query user role in room  cond=${JSON.stringify(cond)}`);
    throw errors.create(errors.ServiceDBFailed, `leave room failed, ${keys}=${value}`);
  }

  return rows[0]["role"];
}

function create({mysql}) {
  if (!mysql) throw errors.create(errors.SystemVerifyError, `mysql required`);

  return {
    roomInsert: async function (fields) {
      return doRoomInsert(fields, mysql);
    },
    roomUpdate: async function (roomId, fields) {
      return doRoomUpdate(roomId, fields, mysql);
    },
    roomQuery: async function (cond) {
      return doRoomQuery(cond, mysql);
    },
    roomDestroy: async function (cond) {
      return doRoomDestroy(cond, mysql);
    },
    usersInRoomInsert: async function (fields) {
      return doUsersInRoomInsert(fields, mysql);
    },
    usersInRoomQuery: async function (cond) {
      return doUsersInRoomQuery(cond, mysql);
    },
    roomListQuery: async function ({cond, ids, startUtc, endUtc, offset, limit}) {
      return doRoomListQuery({cond, ids, startUtc, endUtc, offset, limit, mysql});
    },
    userListQuery: async function (limit, cond) {
      return doUserListQuery(limit, cond, mysql);
    },
    userLeave: async function (cond) {
      return doUserLeave(cond, mysql);
    },
    userInRoomDestroy: async function (cond) {
      return doUserInRoomDestroy(cond, mysql);
    },
    userRoleChange: async function (role, cond) {
      return doUserRoleChange(role, cond, mysql);
    },
    queryNextUserIdInRoom: async function (cond) {
      return doQueryNextUserIdInRoom(cond, mysql);
    },
    userRoleQuery: async function (cond) {
      return doUserRoleQuery(cond, mysql);
    }
  };
}

module.exports = {
  create,
};

