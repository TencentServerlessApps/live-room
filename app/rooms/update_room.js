'use strict';

const moment = require('moment');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const mysql2 = require('mysql2/promise');
const config = require('js-kernel/config');
const consts = require('js-kernel/consts').create({moment});
const mysql = require('js-core/mysql').create({config, mysql: mysql2});
const rooms = require('js-core/rooms').create({mysql});
const errors = require('js-kernel/errors');
const utils = require('js-core/utils').create({querystring});
const auth = require('js-kernel/auth').create({config, jwt, moment});

async function updateUserRoleInRoom(q) {
    // update the role of user
    const role = q.role;

    const params = {userId: q.userId, roomId: q.roomId};

    const rows = await rooms.userRoleChange(role, params);

    console.log(`update_room updateUserRoleInRoom userId=${q.userId}, roomId=${q.roomId}, role=${q.role}, req=${JSON.stringify(q)}, result=${rows}`);

    if (rows.affectedRows !== 1) throw errors.create(errors.ServiceDBFailed, `change role failed, affectedRows=${rows.affectedRows}`);
}

async function updateRoom(q) {
    const nowUtc = moment.utc().format(consts.MYSQL_DATETIME);
    const params = {updateUtc: nowUtc, updateBy: q.userId, removed: 0};

    if (q.hasOwnProperty('category')) params.category = q.category;
    if (q.hasOwnProperty('title')) params.title = q.title;
    if (q.hasOwnProperty('cover')) params.cover = q.cover;
    if (q.hasOwnProperty('subject')) params.subject = q.subject;
    if (q.hasOwnProperty('description')) params.description = q.description;

    await rooms.roomUpdate(q.roomId, params);
    console.log(`update_room room params=${JSON.stringify(params)}`);

    // get the room info
    const [room] = await rooms.roomQuery({roomId: q.roomId});
    if (!room || !room.roomId) {
        throw errors.create(errors.create(errors.RoomNotExists, `room = ${q.roomId} not exist`));
    }
    return room;
}

exports.main_handler = async (ctx) => {
    // Parse query params and check it.
    const q = utils.parseKoaRequest(ctx);

    if (!q.userId) throw errors.create(errors.RoomCreateParams, `userId required`);
    if (!q.token) throw errors.create(errors.RoomCreateParams, `token required, userId=${q.userId}`);
    if (!q.roomId) throw errors.create(errors.RoomCreateParams, `roomId required`);

    // Auth check, verify token.
    await auth.authByUserToken(q.token, q.userId);

    // if set the role
    if (q.hasOwnProperty('role')) {
        await updateUserRoleInRoom(q);
    }

    const room = await updateRoom(q);

    // Done.
    console.log(`update_room-ok userId=${q.userId}, token=${q.token}, req=${JSON.stringify(q)}, result=${JSON.stringify(room)}`);

    return errors.data({
        roomId: room.roomId,
        category: room.category,
        title: room.title,
        cover: room.cover,
        subject: room.subject,
        description: room.description,
    }, `update_room ok`);
};
