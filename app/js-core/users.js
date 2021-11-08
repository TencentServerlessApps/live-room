'use strict';

const errors = require('./errors');

// Get the user object by one of cond, for example, {userId, phone, email}.
// @throw An error response object.
async function doUserQuery(cond, mysql, utils) {
  // Find key and value, match the first none null one.
  const [key, value] = utils.fetchAny(cond);
  if (!key || !value) {
    console.log(`user query cond=${JSON.stringify(cond)}, key=${key}, value=${value}`);
    throw errors.create(errors.SystemVerifyError, `cond=${JSON.stringify(cond)} required`);
  }

  // Note that the key should format in sql, not in values.
  const [r1] = await mysql.query(`SELECT * FROM users WHERE ${key}=?`, [value]);

  const rr1 = r1 && r1[0];
  if (!r1) {
    console.log(`user query cond=${JSON.stringify(cond)}`);
    throw errors.create(errors.ServiceDBFailed, `get user failed, ${key}=${value}`);
  }
  if (r1.length !== 1 || !rr1) {
    console.log(`user query cond=${JSON.stringify(cond)}, r1=${JSON.stringify(r1)}`);
    throw errors.create(errors.UserNotExists, `query invalid, ${key}=${value}`);
  }

  return rr1;
}

// Update user with fields like {name,phone,email}, identify by userId.
async function doUserUpdate(userId, fields, mysql) {
  // Build the keys and values to update.
  const values = [];
  const keys = Object.keys(fields).map(k => {
    values.push(fields[k]);
    return `${k}=?`;
  });

  // Last id for WHERE.
  values.push(userId);

  // Update fields to DB.
  const [rows] = await mysql.query(`UPDATE users SET ${keys.join(',')} WHERE userId=?`, values);

  if (!rows) throw errors.create(errors.ServiceDBFailed, `update failed`);
  if (rows.affectedRows !== 1) {
    console.log(`user update userId=${userId}, fields=${JSON.stringify(fields)}, rows=${JSON.stringify(rows)}`);
    throw errors.create(errors.ServiceDBFailed, `update failed, affectedRows=${rows.affectedRows}`);
  }
}

// Insert a default user with necessarily fields, like the createUtc time.
// @remark We use ignore to allow duplicated insert.
async function doUserInsert(fields, mysql) {
  // Build the keys and values to update.
  const [flags, values] = [[], []];
  const keys = Object.keys(fields).map(k => {
    flags.push('?');
    values.push(fields[k]);
    return k;
  });

  await mysql.query(`INSERT IGNORE INTO users(${keys.join(',')}) VALUES(${flags.join(',')})`, values);
}

function create({mysql, querystring}) {
  if (!mysql) throw errors.create(errors.SystemVerifyError, `mysql required`);

  return {
    userQuery: async function (cond) {
      const utils = require('./utils').create({querystring});
      return doUserQuery(cond, mysql, utils);
    },
    userUpdate: async function (userId, fields) {
      return doUserUpdate(userId, fields, mysql);
    },
    userInsert: async function (fields) {
      return doUserInsert(fields, mysql);
    },
    userGenerateId: async function (cond) {
      const ids = require('./ids').create({mysql, querystring});
      return ids.generateId(cond);
    },
  };
}

module.exports = {
  create,
};

