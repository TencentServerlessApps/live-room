'use strict';

const jwt = require('jsonwebtoken');
const querystring = require('querystring');
const moment = require('moment');
const mysql2 = require('mysql2/promise');
const config = require('js-kernel/config');
const mysql = require('js-core/mysql').create({config, mysql: mysql2});
const users = require('js-core/users').create({mysql, querystring});
const errors = require('js-core/errors');
const utils = require('js-core/utils').create({querystring});
const auth = require('js-kernel/auth').create({config, jwt, moment});

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.userId) throw errors.create(errors.UserTokenInvalid, `userId required`);
  if (!q.token) throw errors.create(errors.UserTokenInvalid, `token required, userId=${q.userId}`);

  // Auth check, verify token.
  await auth.authByUserToken(q.token, q.userId);

  if (q.searchPhone && !q.searchPhone.startsWith('+')) q.searchPhone = `+${q.searchPhone}`;
  console.log(`user_query-params userId=${q.userId}, searchUserId=${q.searchUserId}, searchPhone=${q.searchPhone}`);

  let user = null;
  // Query user information.
  if (q.searchUserId) {
    user = await users.userQuery({userId: q.searchUserId});
  } else if (q.searchPhone) {
    user = await users.userQuery({phone: q.searchPhone});
  } else {
    user = await users.userQuery({userId: q.userId});
  }

  // Done.
  console.log(`user_query-ok user=${JSON.stringify(user)}, token=${q.token}`);
  return errors.data({
    userId: user.userId,
    apaasUserId: user.userId, // TODO: FIXME: Remove the userId for apaasUserId exists.
    name: user.name || '',
    avatar: user.avatar || '',
    tag: user.tag,
    tag2: user.tag2,
  }, `query ok`);
};

