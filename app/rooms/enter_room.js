'use strict';

const moment = require('moment');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const mysql2 = require('mysql2/promise');
const config = require('js-kernel/config');
const consts = require('js-kernel/consts').create({moment});
const mysql = require('js-core/mysql').create({config, mysql: mysql2});
const ids = require('js-core/ids').create({mysql, querystring});
const url = require('url');
const https = require('https');
const TLSSigAPIv2 = require('tls-sig-api-v2');
const tim = require('js-core/tim').create({config, url, https, TLSSigAPIv2});
const rooms = require('js-core/rooms').create({mysql});
const errors = require('js-kernel/errors');
const utils = require('js-core/utils').create({querystring});
const auth = require('js-kernel/auth').create({config, jwt, moment});

async function roomInsert(q, params) {
  const rows = await rooms.roomInsert(params);
  console.log(`enter_room-insert room params=${JSON.stringify(params)}`);

  // Create IM group
  const result = await tim.create_group("", consts.IM_ROOM_TYPE, q.roomId, q.roomId);

  if (result["ErrorCode"] === 0 || result["ErrorCode"] === 10021) {
    console.log(`enter_room-im create group roomId=${q.roomId}, res=${JSON.stringify(result)}`);
  } else {
    throw errors.create(errors.RoomCreateParams, `create IM error ${JSON.stringify(result)}`);
  }

  return rows;
}

async function enterRoom(q) {
  // Create roomId if not exists.
  // TDDO: FIXME: Remove it because now, roomId is required.
  if (!q.roomId) {
    const roomIdSeed = `${q.appId}-${q.userId}-${Math.random().toString(16).slice(-12)}`;
    q.roomId = await ids.generateId({uuid: roomIdSeed});
    console.log(`enter_room-generate roomId=${q.roomId} by seed=${roomIdSeed}`);
  }

  // Always try to create it.
  const nowUtc = moment.utc().format(consts.MYSQL_DATETIME);
  let params = {roomId: q.roomId, createBy: q.userId, ownBy: q.userId, createUtc: nowUtc, updateUtc: nowUtc};
  const rows = await roomInsert(q, params);

  // Update room information
  params = {
    appId: q.appId,
    updateBy: q.userId,
    updateUtc: nowUtc,
    removed: 0,
  };
  if (q.hasOwnProperty('title')) params.title = q.title;
  if (q.hasOwnProperty('category')) params.category = q.category;

  await rooms.roomUpdate(q.roomId, params);
  console.log(`enter_room-update room params=${JSON.stringify(params)}`);

  // User enter room.
  params = {
    appId: q.appId,
    roomId: q.roomId,
    userId: q.userId,
    role: q.role,
    createUtc: nowUtc,
    updateUtc: nowUtc,
  };
  await rooms.usersInRoomInsert(params);
  console.log(`enter_room-enter room params=${JSON.stringify(params)}`);

  // Join IM group
  const result = await tim.add_group_member(q.roomId, 1, [q.userId]);
  console.log(`enter_room-im join group, roomId=${q.roomId}, userId=${q.userId}, result=${JSON.stringify(result)}`);

  const guest = await rooms.usersInRoomQuery({roomId: q.roomId, userId: q.userId});
  console.log(`enter_room-query guest by roomId=${q.roomId}, userId=${q.userId}, guest=${JSON.stringify(guest)}`);
  return guest;
}

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.userId) throw errors.create(errors.RoomCreateParams, `userId required`);
  if (!q.token) throw errors.create(errors.RoomCreateParams, `token required, userId=${q.userId}`);
  if (!q.appId) throw errors.create(errors.RoomCreateParams, `appId required`);
  // TODO: FIXME: If ok, the roomId and role is required.
  // if (!q.roomId) throw errors.create(errors.RoomCreateParams, `roomId required`);
  // if (!q.role) throw errors.create(errors.RoomCreateParams, `role required`);

  // Auth check, verify token.
  await auth.authByUserToken(q.token, q.userId);

  // User enter room, get the guest(user in room) object.
  const guest = await enterRoom(q);

  // Done.
  console.log(`enter_room-ok userId=${q.userId}, guest=${JSON.stringify(guest)}, token=${q.token}`);
  return errors.data({
    roomId: guest.roomId,
    role: guest.role,
  }, `enter_room ok`);
};

