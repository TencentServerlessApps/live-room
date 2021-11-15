'use strict';

const moment = require('moment');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const mysql2 = require('mysql2/promise');
const config = require('js-kernel/config');
const mysql = require('js-core/mysql').create({config, mysql: mysql2});
const errors = require('js-core/errors');
const utils = require('js-core/utils').create({querystring});
const users = require('js-core/users').create({mysql, querystring});
const auth = require('js-kernel/auth').create({config, jwt, moment});

async function userUpdate(q, fields) {
  console.log(`update params q=${JSON.stringify(q)}, fields=${JSON.stringify(fields)}`);

  // Build the keys and values to update.
  const keys = Object.keys(fields).map(k => `${k}=?`).join(',');
  const values = Object.keys(fields).map(k => fields[k]);
  values.push(q.userId);
  console.log(`update by keys=${keys}, values=${values}`);

  // Update fields to DB.
  const [rows] = await mysql.query(`UPDATE users SET ${keys} WHERE userId=?`, values);
  console.log(`update query rows=${JSON.stringify(rows)}`);

  if (!rows) throw errors.create(errors.ServiceDBFailed, `update failed`);
  if (rows.affectedRows !== 1) throw errors.create(errors.ServiceDBFailed, `update failed, affectedRows=${rows.affectedRows}`);

  return;
}

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.name && !q.tag && !q.tag2) throw errors.create(errors.UserNameEmpty, `name/tag/tag2 required`);

  // Auth check, verify token.
  await auth.authByUserToken(q.token, q.userId);

  // Update user information by fields.
  // @remark Should NOT use the q directly as fields, because security risk such as setting the id.
  const fields = {};
  if (q.name) fields.name = q.name;
  if (q.tag) fields.tag = q.tag;
  if (q.tag2) fields.tag2 = q.tag2;
  await users.userUpdate(q.userId, fields);

  // Done.
  console.log(`user_update-ok userId=${q.userId}, fields=${JSON.stringify(fields)}, token=${q.token}`);
  return errors.data(null, `update ${Object.keys(fields).join(',')} ok`);
};

