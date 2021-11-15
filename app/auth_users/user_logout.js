'use strict';

const moment = require('moment');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const mysql2 = require('mysql2/promise');
const config = require('js-kernel/config');
const mysql = require('js-core/mysql').create({config, mysql: mysql2});
const users = require('js-core/users').create({mysql, querystring});
const errors = require('js-core/errors');
const utils = require('js-core/utils').create({querystring});
const auth = require('js-kernel/auth').create({config, jwt, moment});
const consts = require('js-kernel/consts').create({moment});
const ioredis = require('ioredis');
const redis = require('js-core/redis').create({config: config.redis, redis: ioredis});

async function userLogout(q, user) {
  console.log(`logout params q=${JSON.stringify(q)}, user=${JSON.stringify(user)}`);

  // Clear sessions for user, by phone.
  if (user.phone) {
    await mysql.query('DELETE FROM sessions WHERE phone=?', [user.phone]);
  }

  // Clear sessions for user, by email.
  if (user.email) {
    await mysql.query('DELETE FROM sessions WHERE email=?', [user.email]);
  }

  return;
}

async function userOffline(q) {
  // TODO: FIXME: Cleanup rooms and music.
  // Remove online user from cache.
  if (process.env.REDIS_HOST) {
    await redis.hdel(consts.redis.DEMOS_ONLINE_USERS, q.userId);
  }
}

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.userId) throw errors.create(errors.UserTokenInvalid, `userId required`);
  if (!q.token) throw errors.create(errors.UserTokenInvalid, `token required, userId=${q.userId}`);

  // Auth check, verify token.
  try {
    await auth.authByUserToken(q.token, q.userId);
  } catch (err) {
    // Success if user exits but token invalid(already logout).
    if (err instanceof Object && err.errorCode === errors.UserTokenInvalid) {
      console.warn(`user already logout, userId=${q.userId}, token=${q.token}`);
      throw errors.data(null, 'already logout');
    }
    throw err;
  }

  // Query user information.
  const user = await users.userQuery({userId: q.userId});

  // User offline now.
  await userOffline(q);

  // User logout, clear sessions by phone/email.
  await userLogout(q, user);

  // Done.
  console.log(`logout done userId=${q.userId}, token=${q.token}`);
  return errors.data(null, `logout ok`);
};

