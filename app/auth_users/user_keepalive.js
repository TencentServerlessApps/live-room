'use strict';

const moment = require('moment');
const querystring = require('querystring');
const mysql2 = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const config = require('js-kernel/config');
const consts = require('js-kernel/consts').create({moment});
const mysql = require('js-core/mysql').create({config, mysql: mysql2});
const users = require('js-core/users').create({mysql, querystring});
const errors = require('js-kernel/errors');
const utils = require('js-core/utils').create({querystring});
const auth = require('js-kernel/auth').create({config, jwt, moment});
const ioredis = require('ioredis');
const redis = require('js-core/redis').create({config: config.redis, redis: ioredis});

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.userId) throw errors.create(errors.UserTokenInvalid, `userId required`);
  if (!q.token) throw errors.create(errors.UserTokenInvalid, `token required, userId=${q.userId}`);

  // Auth check, verify token.
  await auth.authByUserToken(q.token, q.userId);

  // Update Redis cache.
  const nowUtc = moment.utc().format(consts.MYSQL_DATETIME);
  if (process.env.REDIS_HOST) {
    await redis.hset(consts.redis.DEMOS_ONLINE_USERS, q.userId, nowUtc);
  }

  // TODO: FIXME: Remove the updateUtc, use redis to store it.
  await users.userUpdate(q.userId, {updateUtc: nowUtc});

  // Update all rooms belong to user.
  mysql.query(`UPDATE rooms set updateUtc=? where ownBy=?`, [nowUtc, q.userId]);
  console.log(`user_keepalive-cache redis=${consts.redis.DEMOS_ONLINE_USERS}, userId=${q.userId}, nowUtc=${nowUtc}`);

  const res = {
    userId: q.userId,
    updateUtc: nowUtc,
  };

  // Done.
  console.log(`user_keepalive-ok, res is ${JSON.stringify(res)}`);
  return errors.data(res, `user_keepalive ok`);
};

