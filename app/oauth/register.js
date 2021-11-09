'use strict';

const config = require('js-kernel/config');
const moment = require('moment');
const consts = require('js-kernel/consts').create({moment});
const errors = require('js-core/errors');
const querystring = require('querystring');
const utils = require('js-core/utils').create({querystring});
const mysql2 = require('mysql2/promise');
const mysql = require('js-core/mysql').create({config, mysql: mysql2});

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.username) throw errors.create(errors.SystemVerifyError, `username required`);
  if (!q.salt) throw errors.create(errors.SystemVerifyError, `salt required`);
  if (q.salt.length < 32) throw errors.create(errors.SystemVerifyError, `salt must be 32B+`);
  console.log(`register-params username=${q.username}, salt=${q.salt}`);

  // Fail if user exists.
  const [r0] = await mysql.query(`SELECT name FROM user_salts WHERE name=?`, [q.username]);
  if (r0 && r0.length) throw errors.create(errors.SystemVerifyError, `user name=${q.username} exists`);

  // Register new user with salt.
  const nowUtc = moment.utc().format(consts.MYSQL_DATETIME);
  const [r1] = await mysql.query(
    `INSERT INTO user_salts (name,salt,createUtc,updateUtc) VALUES(?,?,?,?)`,
    [q.username, q.salt, nowUtc, nowUtc],
  );
  if (!r1 || r1.affectedRows !== 1) throw errors.create(errors.SystemVerifyError, `register name=${q.username} fail, r1=${JSON.stringify(r1)}`);

  console.log(`register-ok name=${q.username}, id=${r1.insertId}, r1=${JSON.stringify(r1)}`);
  return errors.data({
    name: q.username,
    id: r1.insertId,
  }, 'register ok');
};

