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

async function generateRoomId(q) {
  // Create roomId.
  const roomIdSeed = `${q.appId}-${q.userId}-${Math.random().toString(16).slice(-12)}`;
  const roomId = await ids.generateId({uuid: roomIdSeed});
  console.log(`generate_roomid-params roomId=${roomId} by seed=${roomIdSeed}`);

  // Always try to create it.
  const nowUtc = moment.utc().format(consts.MYSQL_DATETIME);
  const params = {roomId: roomId, createBy: q.userId, createUtc: nowUtc, updateUtc: nowUtc};
  await rooms.roomInsert(params);

  console.log(`generate_roomid-insert, params=${JSON.stringify(params)}, roomId=${roomId}`);
  return roomId;
}

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.userId) throw errors.create(errors.RoomCreateParams, `userId required`);
  if (!q.token) throw errors.create(errors.RoomCreateParams, `token required, userId=${q.userId}`);

  // Auth check, verify token.
  await auth.authByUserToken(q.token, q.userId);

  // Generate the room id.
  const roomId = await generateRoomId(q);

  // Done.
  console.log(`generate_roomid-ok userId=${q.userId}, roomId=${roomId}, token=${q.token}`);
  return errors.data({
    roomId: roomId,
  }, `generate_roomid ok`);
};

