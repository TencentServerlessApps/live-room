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
  router.all('/base/v1/rooms/:api', async (ctx) => {
    utils.logKoa('rooms', ctx);

    await initdb.initialize();

    try {
      let res = null;
      if (ctx.params.api === 'enter_room') {
        res = await require('./enter_room').main_handler(ctx);
      } else if (ctx.params.api === 'query_room') {
        res = await require('./query_room').main_handler(ctx);
      } else if (ctx.params.api === 'list_users') {
        res = await require('./list_users').main_handler(ctx);
      } else if (ctx.params.api === 'leave_room') {
        res = await require('./leave_room').main_handler(ctx);
      } else if (ctx.params.api === 'destroy_room') {
        res = await require('./destroy_room').main_handler(ctx);
      } else if (ctx.params.api === 'generate_roomid') {
        res = await require('./generate_roomid').main_handler(ctx);
      } else if (ctx.params.api === 'room_detail') {
        res = await require('./room_detail').main_handler(ctx);
      } else if (ctx.params.api === 'update_room') {
        res = await require('./update_room').main_handler(ctx);
      } else {
        throw new Error(`invalid api ${ctx.params.api}`);
      }

      console.log(`rooms-ok api=${ctx.params.api}, res=${JSON.stringify(res)}`);
      ctx.body = res;
    } catch (err) {
      console.log(`rooms-err request ${JSON.stringify(ctx.request)} err ${errors.format(err)}`);
      ctx.body = errors.asResponse(err);
    }
  });
}

module.exports = {
  create,
};


