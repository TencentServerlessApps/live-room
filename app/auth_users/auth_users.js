'use strict';

const errors = require('js-core/errors');
const querystring = require('querystring');
const utils = require('js-core/utils').create({querystring});

// For DB initialize.
const config = require('js-kernel/config');
const mysql2 = require('mysql2/promise');
const mysql = require('js-core/mysql').create({config, mysql: mysql2});
const initdb = require('js-kernel/initdb').create({mysql, mysql2, config});

function create(router) {
  router.all('/base/v1/auth_users/:api', async (ctx) => {
    utils.logKoa('auth_users', ctx);

    await initdb.initialize();

    try {
      let res = null;
      if (ctx.params.api === 'user_login_signature') {
        res = await require('./user_login_signature').main_handler(ctx);
      } else if (ctx.params.api === 'user_login_token') {
        res = await require('./user_login_token').main_handler(ctx);
      } else if (ctx.params.api === 'user_query') {
        res = await require('./user_query').main_handler(ctx);
      } else if (ctx.params.api === 'user_keepalive') {
        res = await require('./user_keepalive').main_handler(ctx);
      } else if (ctx.params.api === 'user_update') {
        res = await require('./user_update').main_handler(ctx);
      } else if (ctx.params.api === 'user_logout') {
        res = await require('./user_logout').main_handler(ctx);
      } else if (ctx.params.api === 'user_delete') {
        res = await require('./user_delete').main_handler(ctx);
      } else {
        throw new Error(`invalid api ${ctx.params.api}`);
      }

      console.log(`auth_users-ok api=${ctx.params.api}, res=${JSON.stringify(res)}`);
      ctx.body = res;
    } catch (err) {
      console.log(`auth_users-err request ${JSON.stringify(ctx.request)} err ${errors.format(err)}`);
      ctx.body = errors.asResponse(err);
    }
  });
}

module.exports = {
  create,
};


