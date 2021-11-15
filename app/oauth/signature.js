'use strict';

const config = require('js-kernel/config');
const ioredis = require('ioredis');
const redis = require('js-core/redis').create({config: config.redis, redis: ioredis});
const moment = require('moment');
const consts = require('js-kernel/consts').create({moment});
const errors = require('js-core/errors');
const querystring = require('querystring');
const utils = require('js-core/utils').create({querystring});
const mysql2 = require('mysql2/promise');
const mysql = require('js-core/mysql').create({config, mysql: mysql2});
const users = require('js-core/users').create({mysql, querystring});
const md5 = require('md5');
const jwt = require('jsonwebtoken');
const TLSSigAPIv2 = require('tls-sig-api-v2');

async function resolveSecret(q) {
  const [r0] = await mysql.query(`SELECT salt FROM user_salts WHERE name=?`, [q.username]);
  if (!r0 || !r0.length) throw errors.create(errors.SystemVerifyError, `invalid username=${q.username}`);

  const [salt] = r0;
  if (!salt || !salt.salt) throw errors.create(errors.SystemVerifyError, `invalid salt for username=${q.username}`);

  return salt.salt;
}

async function createOrUpdateUser(q, userId) {
  // Current datetime in utc timezone.
  const nowUtc = moment.utc().format(consts.MYSQL_DATETIME);

  // Make sure there is always a user in DB.
  const avatar = consts.AVATARS[parseInt(Math.random() * 100) % consts.AVATARS.length];
  await users.userInsert({userId: userId, avatar: avatar, createUtc: nowUtc});

  // Update user information.
  const params = {
    updateUtc: nowUtc,
    loginUtc: nowUtc,
  };
  if (q.name) params.name = q.name;
  if (q.phone) params.phone = q.phone;
  if (q.email) params.email = q.email;
  if (q.tag) params.tag = q.tag;
  await users.userUpdate(userId, params);
}

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.username) throw errors.create(errors.SystemVerifyError, `username required`);

  const {username, hash} = q;
  const tag = q.tag || '';
  const ts = q.ts || '';
  const nonce = q.nonce || '';
  const signature = q.signature || '';

  const secret = await resolveSecret(q);
  const source = `${username}-${tag}-${ts}-${nonce}`;
  const verify = md5(`${source}-${secret}`);
  console.log(`signature-params username=${username}, hash=${hash}, tag=${tag}, ts=${ts}, nonce=${nonce}, source=${source}-${'x'.repeat(secret.length)}, signature=${signature}, verify=${verify}`);
  if (signature !== verify) throw errors.create(errors.SystemVerifyError, `invalid signature ${JSON.stringify(q)}`);

  // Covert the md5 of username and secret to int number.
  const userId = (md5(`${secret}-${username}-${tag}`)
    .split('').map((v, i) => v.charCodeAt(0)*Math.pow(10, i))
    .reduce((a, b) => a + b, 0) % 0x001ffffff)
    .toString();

  // Update the user info, @see https://www.npmjs.com/package/jsonwebtoken#usage
  const token = jwt.sign(
    {v: 1.0, userId: userId},
    config.jwtSecret, {expiresIn: consts.TOKEN_EXPIRE.asSeconds()},
  );
  const tokenExpire = moment.utc().add(consts.TOKEN_EXPIRE).format(consts.MYSQL_DATETIME);
  await createOrUpdateUser(q, userId);

  // Generate userSig for TRTC and TIM.
  const sdkAppId = parseInt(process.env.TRTC_TIM_APPID);
  const userSig = new TLSSigAPIv2.Api(
    sdkAppId, process.env.TRTC_TIM_SECRET,
  ).genSig(
    userId, consts.TRTC_EXPIRE.asSeconds(),
  );

  // Update online users.
  const nowUtc = moment.utc().format(consts.MYSQL_DATETIME);
  if (process.env.REDIS_HOST) {
    await redis.hset(consts.redis.DEMOS_ONLINE_USERS, userId, nowUtc);
  }

  console.log(`signature-ok userId=${userId}, expire=${tokenExpire}, appid=${sdkAppId}, userSig=${userSig}, userSigExpire=${consts.TRTC_EXPIRE}, token=${token}`);
  return errors.data({
    // User config.
    userId: userId,
    apaasUserId: userId, // TODO: FIXME: Remove the userId for apaasUserId exists.
    token: token,
    expire: tokenExpire,
    // TRTC/IM SDk configure.
    sdkAppId: sdkAppId,
    userSig: userSig,
    sdkUserSig: userSig, // TODO: FIXME: Remove the userSig for sdkUserSig exists.
  }, 'signature ok');
};

