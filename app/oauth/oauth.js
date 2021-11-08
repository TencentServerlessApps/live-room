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
  router.all('/base/v1/oauth/:api', async (ctx) => {
    utils.logKoa('oauth', ctx);

    await initdb.initialize();

    try {
      let res = null;
      if (ctx.params.api === 'signature') {
        res = await require('./signature').main_handler(ctx);
      } else if (ctx.params.api === 'register') {
        res = await require('./register').main_handler(ctx);
      } else {
        throw new Error(`invalid api ${ctx.params.api}`);
      }

      console.log(`oauth-ok api=${ctx.params.api}, res=${JSON.stringify(res)}`);
      ctx.body = res;
    } catch(err) {
      console.log(`oauth-err request ${JSON.stringify(ctx.request)} err ${errors.format(err)}`);
      ctx.body = errors.asResponse(err);
    }
  });
}

module.exports = {
  create,
};


