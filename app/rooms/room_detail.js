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

async function roomDetail(q) {
  // Query roomsList
  const params = {roomId: q.roomId, removed: 0};
  const rows = await rooms.roomQuery(params);
  console.log(`room_detail-params, req=${JSON.stringify(params)}, rooms=${JSON.stringify(rows)}`);

  if (!rows || rows.length !== 1) throw errors.create(errors.RoomNotExists, `room ${q.roomId} not exists`);

  return rows[0];
}

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.userId) throw errors.create(errors.RoomQueryParams, `userId required`);
  if (!q.token) throw errors.create(errors.RoomQueryParams, `token required, userId=${q.userId}`);
  if (!q.roomId) throw errors.create(errors.RoomQueryParams, `roomId required`);

  // Auth check, verify token.
  await auth.authByUserToken(q.token, q.userId);

  // Query room object.
  const room = await roomDetail(q);

  const [[{nn: nnUsers}]] = await mysql.query('SELECT count(1) AS nn FROM users_in_room WHERE roomId=?', [room.roomId]);

  // Done.
  console.log(`room_detail-ok userId=${q.userId}, room=${JSON.stringify(room)}, token=${q.token}`);
  return errors.data({
    roomId: room.roomId,
    title: room.title,
    category: room.category,
    removed: room.removed,
    createBy: room.createBy,
    updateBy: room.updateBy,
    ownBy: room.ownBy,
    createUtc: room.createUtc,
    updateUtc: room.updateUtc,
    status: room.status,
    nnUsers,
  }, `room_detail ok`);
};

