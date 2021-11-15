'use strict';

const moment = require('moment');
const jwt = require('jsonwebtoken');
const querystring = require('querystring');
const mysql2 = require('mysql2/promise');
const TLSSigAPIv2 = require('tls-sig-api-v2');
const config = require('js-kernel/config');
const errors = require('js-core/errors');
const utils = require('js-core/utils').create({querystring});
const mysql = require('js-core/mysql').create({config, mysql: mysql2});
const users = require('js-core/users').create({mysql, querystring});
const auth = require('js-kernel/auth').create({config, jwt, moment});
const consts = require('js-kernel/consts').create({moment});
const ioredis = require('ioredis');
const redis = require('js-core/redis').create({config: config.redis, redis: ioredis});

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.userId) throw errors.create(errors.UserTokenInvalid, `userId required`);
  if (!q.token) throw errors.create(errors.UserTokenInvalid, `token required`);

  // User login by phone/email and token.
  const decoded = await auth.authByUserToken(q.token, q.userId);
  const user = await users.userQuery({userId: decoded.userId});

  // Update user login time, ignore any error.
  const nowUtc = moment.utc().format(consts.MYSQL_DATETIME);
  await users.userUpdate(user.userId, {loginUtc: nowUtc});
  console.log(`user_login_token-update user=${JSON.stringify(user)}, nowUtc=${nowUtc}`);

  // Update the user info, @see https://www.npmjs.com/package/jsonwebtoken#usage
  const token = jwt.sign(
    {v: 1.0, userId: user.userId, sessionId: decoded.sessionId, phone: user.phone, email: user.email},
    config.jwtSecret, {expiresIn: consts.TOKEN_EXPIRE.asSeconds()},
  );
  const tokenExpire = moment.utc().add(consts.TOKEN_EXPIRE).format(consts.MYSQL_DATETIME);

  // Generate userSig for TRTC and TIM.
  const sdkAppId = parseInt(process.env.TRTC_TIM_APPID);
  const userSig = new TLSSigAPIv2.Api(
    sdkAppId, process.env.TRTC_TIM_SECRET,
  ).genSig(
    user.userId, consts.TRTC_EXPIRE.asSeconds(),
  );

  // Update online users.
  if (process.env.REDIS_HOST) {
    const r0 = await redis.hset(consts.redis.DEMOS_ONLINE_USERS, user.userId, nowUtc);
    console.log(`user_login_token-redis cache key=${consts.redis.DEMOS_ONLINE_USERS}, userId=${user.userId}, nowUtc=${nowUtc}, r0=${JSON.stringify(r0)}`);
  }

  // Done.
  console.log(`user_login_token-ok userId=${user.userId}, expire=${tokenExpire}, appid=${sdkAppId}, userSig=${userSig}, userSigExpire=${consts.TRTC_EXPIRE}, token=${token}`);
  return errors.data({
    userId: user.userId,
    apaasUserId: user.userId, // TODO: FIXME: Remove the userId for apaasUserId exists.
    sdkAppId: sdkAppId,
    userSig: userSig,
    sdkUserSig: userSig, // TODO: FIXME: Remove the userSig for sdkUserSig exists.
    token: token,
    expire: tokenExpire,
    phone: user.phone || '',
    email: user.email || '',
    name: user.name || '',
    avatar: user.avatar,
  }, `login done, userId=${user.userId}, token=${token}, expire=${tokenExpire}`);
};

