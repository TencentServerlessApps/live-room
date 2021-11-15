'use strict';

const errors = require('./errors');

// Check the auth by verify(user+token), return the decoded object.
// @remark We store {userId, sessionId} in token.
// @throw An error response object.
async function doAuthByUserToken(token, userId, secret, jwt) {
  if (!userId) throw errors.create(errors.UserTokenInvalid, `userId required`);

  // Check and get the decoded object.
  const decoded = await doAuthByJwtToken(token, secret, jwt);

  // Check user information.
  // @note The userId is not required for compatibility.
  if (userId !== decoded.userId) {
    console.log(`auth verify, token=${token}, userId=${userId}, secret=${secret.length}B, decoded=${JSON.stringify(decoded)}`);
    throw errors.create(errors.UserTokenInvalid, `invalid userId=${userId}, token=${token}`);
  }

  return decoded;
}

// Check the auth by verify(token), return the decoded object.
// @remark We store {userId, sessionId} in token.
// @throw An error response object.
async function doAuthByJwtToken(token, secret, jwt) {
  if (!secret) throw errors.create(errors.UserTokenInvalid, `secret required`);
  if (!token) throw errors.create(errors.UserTokenInvalid, `token required`);

  // Verify token first, @see https://www.npmjs.com/package/jsonwebtoken#errors--codes
  const decoded = await new Promise((resolve, reject) => {
    jwt.verify(token, secret, function (err, decoded) {
      if (!err) return resolve(decoded);
      if (err.name === 'TokenExpiredError') throw errors.create(errors.UserTokenExpired, `token expired, token=${token}, expiredAt=${err.expiredAt}, ${err.message}`);
      if (err.name === 'JsonWebTokenError') throw errors.create(errors.UserTokenInvalid, `token invalid, token=${token}, ${err.message}`);
      throw errors.create(errors.SystemError, `token verify, token=${token}, ${err.stack}`);
    });
  });

  // Check for v1.
  if (!decoded) throw errors.create(errors.UserTokenInvalid, `v required, token=${token}`);
  if (decoded.v !== 1.0) throw errors.create(errors.UserTokenInvalid, `v invalid, token=${token}, v=${decoded.v}`);
  if (decoded.v === 1.0) {
    if (!decoded.userId) throw errors.create(errors.UserTokenInvalid, `userId required, token=${token}`);
  }

  return decoded;
}

/*
The config SHOULD be config:Object for verify, with bellow fields:
    {jwtSecret}

For example:
    const config = {
        jwtSecret: process.env.JWT_SECRET,
    };
    const auth = require('js-core/auth').create({config});

    await auth.authByUserToken(q.token, q.userId);
 */
function create({config, jwt}) {
  if (!config) throw errors.create(errors.SystemVerifyError, `config required`);
  if (!jwt) throw errors.create(errors.SystemVerifyError, `jwt required`);

  return {
    authByUserToken: async function (token, userId) {
      if (!config.jwtSecret) throw errors.create(errors.SystemVerifyError, `config.jwtSecret required`);
      return doAuthByUserToken(token, userId, config.jwtSecret, jwt);
    },
    authByJwtToken: async function (token) {
      if (!config.jwtSecret) throw errors.create(errors.SystemVerifyError, `config.jwtSecret required`);
      return doAuthByJwtToken(token, config.jwtSecret, jwt);
    },
  };
}

module.exports = {
  create,
};

