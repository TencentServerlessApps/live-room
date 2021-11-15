'use strict';

const moment = require('moment');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const mysql2 = require('mysql2/promise');
const config = require('js-kernel/config');
const mysql = require('js-core/mysql').create({config, mysql: mysql2});
const rooms = require('js-core/rooms').create({mysql});
const errors = require('js-kernel/errors');
const utils = require('js-core/utils').create({querystring});
const auth = require('js-kernel/auth').create({config, jwt, moment});

async function queryUsers(q) {
  // Query usersList
  const params = {roomId: q.roomId};
  const userList = await rooms.userListQuery(parseInt(q.limit), params);
  console.log(`list_users-params req=${JSON.stringify(params)}, users=${JSON.stringify(userList)}`);

  return userList;
}

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.userId) throw errors.create(errors.RoomQueryParams, `userId required`);
  if (!q.token) throw errors.create(errors.RoomQueryParams, `token required, userId=${q.userId}`);
  if (!q.roomId) throw errors.create(errors.RoomQueryParams, `roomID required`);
  if (q.limit > 100 || q.limit < 0) throw errors.create(errors.RoomQueryParams, `limit overflow`);
  q.limit = q.limit || 10;

  // Auth check, verify token.
  await auth.authByUserToken(q.token, q.userId);

  // Query userList
  const userList = await queryUsers(q);

  // TODO: FIXME: Remove the userId for apaasUserId exists.
  userList.map(user => {
    if (!user.apaasUserId) user.apaasUserId = user.userId;
  });

  // Done.
  console.log(`list_users-ok userId=${q.userId}, userList=${JSON.stringify(userList)}, token=${q.token}`);
  return errors.data(userList, `query_Users ok`);
};

