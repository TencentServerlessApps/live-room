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
const consts = require('js-core/consts');

async function queryRoom(q) {
  // Query roomsList
  const cond = {removed: 0};
  if (q.category) cond.category = q.category;

  const params = {
    cond: cond,
    ids: q.roomIds,
    startUtc: q.startUtc ? q.startUtc.utc().format(consts.MYSQL_DATETIME) : null,
    endUtc: q.endUtc ? q.endUtc.utc().format(consts.MYSQL_DATETIME) : null,
    offset: q.offset,
    limit: q.limit
  };
  const roomList = await rooms.roomListQuery(params);
  console.log(`query_room-params req=${JSON.stringify(params)}, res=${JSON.stringify(roomList)}`);

  return roomList.map(e => {
    return {
      roomId: e.roomId,
      category: e.category,
      title: e.title,
      ownBy: e.ownBy,
      createUtc: e.createUtc,
      updateUtc: e.updateUtc,
    };
  });
}

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.userId) throw errors.create(errors.RoomQueryParams, `userId required`);
  if (!q.token) throw errors.create(errors.RoomQueryParams, `token required, userId=${q.userId}`);
  if (!q.appId) throw errors.create(errors.RoomQueryParams, `appId required`);

  if (q.limit > 100 || q.limit < 0) throw errors.create(errors.RoomQueryParams, `limit ${q.limit} overflow`);
  q.limit = q.limit ? parseInt(q.limit) : 10;

  if (q.offset > q.limit || q.offset < 0) throw errors.create(errors.RoomQueryParams, `offset ${q.offset} overflow`);
  q.offset = q.offset ? parseInt(q.offset) : 0;

  // Convert to array with one elem.
  if (q.roomIds && !Array.isArray(q.roomIds)) q.roomIds = [q.roomIds];

  // Parse the time range.
  if (q.startUtc) q.startUtc = moment.utc(q.startUtc, consts.MYSQL_DATETIME);
  if (q.endUtc) q.endUtc = moment.utc(q.endUtc, consts.MYSQL_DATETIME);

  // Auth check, verify token.
  await auth.authByUserToken(q.token, q.userId);

  // Query roomsList
  const roomList = await queryRoom(q);

  // Done.
  console.log(`query_room-ok userId=${q.userId}, rooms=${JSON.stringify(roomList)}, token=${q.token}`);
  return errors.data(roomList, `query_room ok`);
};

