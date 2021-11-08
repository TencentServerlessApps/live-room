'use strict';

const errors = require('js-core/errors');
const auth = require('js-core/auth');

// For autotest, to auth by secret, not by captcha or phone or sms.
async function doAuthBySecret(token, secret, jwt, consts) {
  const authBySecret = secret && token;
  if (!authBySecret) return null;

  // Verify token first, @see https://www.npmjs.com/package/jsonwebtoken#errors--codes
  const decoded = await new Promise((resolve, reject) => {
    jwt.verify(token, secret, function (err, decoded) {
      if (!err) return resolve(decoded);
      if (err.name === 'TokenExpiredError') throw errors.create(errors.UserTokenExpired, `token expired, token=${token}, expiredAt=${err.expiredAt}, ${err.message}`);
      if (err.name === 'JsonWebTokenError') throw errors.create(errors.UserTokenInvalid, `token invalid, token=${token}, ${err.message}`);
      throw errors.create(errors.SystemError, `token verify, token=${token}, ${err.stack}`);
    });
  });

  return decoded;
}

function create({config, jwt, moment}) {
  if (!config) throw errors.create(errors.SystemVerifyError, `config required`);
  if (!jwt) throw errors.create(errors.SystemVerifyError, `jwt required`);

  const exports = auth.create({config, jwt});
  const consts = require('./consts').create({moment});

  exports.authBySecret = async function (q) {
    if (!config.authSecret) throw errors.create(errors.SystemVerifyError, `config.authSecret required`);
    return await doAuthBySecret(q.authSignature, config.authSecret, jwt, consts);
  };

  return exports;
}

module.exports = {
  create,
};

