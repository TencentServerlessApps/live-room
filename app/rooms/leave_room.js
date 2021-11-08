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
const url = require('url');
const https = require('https');
const TLSSigAPIv2 = require('tls-sig-api-v2');
const tim = require('js-core/tim').create({config, url, https, TLSSigAPIv2});

async function leaveRoom(q) {
  // Get user's role in this room
  const params = {roomId: q.roomId, userId: q.userId};
  const role = await rooms.userRoleQuery(params);

  // Leave room information
  const r0 = await rooms.userLeave(params);
  console.log(`leave_room-params req=${JSON.stringify(params)}, role=${role}, res=${JSON.stringify(r0)}`);

  // Leave IM group
  const result = await tim.delete_group_member(q.roomId, 1, [q.userId]);
  console.log(`leave IM group,params=${JSON.stringify(params)} result=${JSON.stringify(result)}`);
}

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.userId) throw errors.create(errors.RoomLeaveParams, `userId required`);
  if (!q.token) throw errors.create(errors.RoomLeaveParams, `token required, userId=${q.userId}`);
  if (!q.roomId) throw errors.create(errors.RoomLeaveParams, `roomId required`);

  // Auth check, verify token.
  await auth.authByUserToken(q.token, q.userId);

  // Leave room
  await leaveRoom(q);

  // Done.
  console.log(`leave_room-ok userId=${q.userId}, roomId=${q.roomId}, token=${q.token}`);
  return errors.data(null, `leave_room ok`);
};

