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
const consts = require('js-kernel/consts').create({moment});

async function destroyRoom(q) {
  // Update room information
  const params = {removeUtc: moment.utc().format(consts.MYSQL_DATETIME)};
  await rooms.roomUpdate(q.roomId, params);
  console.log(`destroy_room-update room=${q.roomId}, params=${JSON.stringify(params)}`);

  // Destroy room information
  const r1 = await rooms.userInRoomDestroy({roomId: q.roomId});

  // Destroy room.
  const r3 = await rooms.roomDestroy({roomId: q.roomId});

  // Destroy IM group
  const r2 = await tim.destroy_group(q.roomId);
  console.log(`destroy_room-remove roomId=${q.roomId}, user=${JSON.stringify(r1)}, room=${JSON.stringify(r3)}, im=${JSON.stringify(r2)}`);
}

exports.main_handler = async (ctx) => {
  // Parse query params and check it.
  const q = utils.parseKoaRequest(ctx);

  if (!q.userId) throw errors.create(errors.RoomDestroyParams, `userId required`);
  if (!q.token) throw errors.create(errors.RoomDestroyParams, `token required, userId=${q.userId}`);
  if (!q.roomId) throw errors.create(errors.RoomDestroyParams, `roomId required`);

  // Auth check, verify token.
  await auth.authByUserToken(q.token, q.userId);

  // Destroy room
  await destroyRoom(q);

  // Done.
  console.log(`destroy_room-ok userId=${q.userId}, roomId=${q.roomId}, token=${q.token}`);
  return errors.data(null, `destroy ok`);
};

