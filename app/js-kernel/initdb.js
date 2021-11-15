'use strict';

let initialized = false;

// Initialize the DB for application.
async function doInitialize(mysql, mysql2, config) {
  if (initialized) {
    return;
  }

  const starttime = new Date();

  const dbConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  };

  // Try to detect DB.
  let conn = null;
  try {
    conn = await mysql2.createConnection(dbConfig);
    await conn.connect();
    const [rows] = await conn.query('SELECT NOW() as timestamp');

    const cost = new Date() - starttime;
    console.log(`initdb-ok check db ${config.database} ok, cost=${cost}ms, ${JSON.stringify(rows)}`);
    return;
  } catch (e) {
    if (e.code !== 'ER_BAD_DB_ERROR') {
      throw e;
    }
  } finally {
    if (conn) await conn.end();
  }

  // Create DB first.
  let r0 = null;
  try {
    delete dbConfig.database; // Remove the database field to create it.
    conn = await mysql2.createConnection(dbConfig);
    await conn.connect();
    const [result] = await conn.query(`CREATE DATABASE IF NOT EXISTS ${config.database}`);
    r0 = result;
  } catch (e) {
    const err = {name: e.name, message: e.message, stack: e.stack};
    console.log(`initdb-err connect, err=${JSON.stringify(err)}`);
    throw e;
  } finally {
    if (conn) await conn.end();
  }

  // Use mysql to create tables for database.
  const [r1] = await mysql.query(`
    CREATE TABLE id_generator (
      id int(20) NOT NULL AUTO_INCREMENT COMMENT '生成的ID',
      phone varchar(32) DEFAULT NULL COMMENT '手机号',
      email varchar(64) DEFAULT NULL COMMENT '用户邮箱',
      uuid varchar(128) DEFAULT NULL COMMENT '其他UUID或ID',
      createUtc datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'ID创建的时间',
      PRIMARY KEY (id),
      UNIQUE KEY by_phone (phone) USING BTREE,
      UNIQUE KEY by_email (email) USING BTREE,
      UNIQUE KEY by_uuid (uuid) USING BTREE
    ) ENGINE=InnoDB AUTO_INCREMENT=1046027 DEFAULT CHARSET=utf8 COMMENT='生成全局唯一自增的ID。'
  `);

  const [r2] = await mysql.query(`
    CREATE TABLE rooms (
      id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增的ID',
      roomId varchar(64) NOT NULL COMMENT '房间ID',
      apaasAppId bigint(20) DEFAULT NULL COMMENT '房间所属的aPaaS租户',
      title varchar(64) DEFAULT NULL COMMENT '房间名称或标题',
      category varchar(32) DEFAULT NULL COMMENT '房间标签或类型，例如liveRoom',
      appId varchar(32) DEFAULT NULL COMMENT '房间所属的AppID',
      createBy varchar(64) DEFAULT NULL COMMENT '房间创建者的ID',
      updateBy varchar(64) DEFAULT NULL COMMENT '房间最后更新的用户ID',
      ownBy varchar(64) DEFAULT NULL COMMENT '房间所有者或主播ID',
      createUtc datetime DEFAULT NULL COMMENT '房间创建时间',
      updateUtc datetime DEFAULT NULL COMMENT '房间更新时间',
      removeUtc datetime DEFAULT NULL COMMENT '房间删除时间',
      removed tinyint(4) NOT NULL DEFAULT '0' COMMENT '1表示已经被删除',
      status varchar(32) DEFAULT NULL COMMENT '房间状态',
      subject varchar(64) DEFAULT '' COMMENT '房间主题',
      description varchar(512) DEFAULT '' COMMENT '房间描述',
      cover varchar(512) DEFAULT '' COMMENT '房间封面地址',
      star bigint(20) unsigned DEFAULT '0' COMMENT '点赞数目',
      PRIMARY KEY (id),
      UNIQUE KEY by_roomid (roomId) USING BTREE,
      KEY by_appid (appId) USING BTREE,
      KEY by_apaasAppId (apaasAppId) USING BTREE
    ) ENGINE=InnoDB AUTO_INCREMENT=1001437 DEFAULT CHARSET=utf8
  `);

  const [r3] = await mysql.query(`
    CREATE TABLE sessions (
      id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '序号标识',
      sessionId varchar(64) NOT NULL COMMENT '用户的临时会话ID',
      phone varchar(32) DEFAULT NULL COMMENT '用户验证的手机号',
      email varchar(64) DEFAULT NULL COMMENT '用户邮箱',
      code varchar(16) NOT NULL DEFAULT '' COMMENT '发给用户的验证码',
      used int(8) NOT NULL DEFAULT '0' COMMENT '验证次数',
      done int(8) NOT NULL DEFAULT '0' COMMENT '验证成功的次数',
      tag varchar(32) DEFAULT NULL COMMENT '标签，比如deprecated兼容老客户端',
      createUtc datetime NOT NULL COMMENT '创建UTC时间',
      updateUtc datetime NOT NULL COMMENT '更新UTC时间',
      PRIMARY KEY (id),
      UNIQUE KEY by_sessionId (sessionId) USING BTREE
    ) ENGINE=InnoDB AUTO_INCREMENT=46668 DEFAULT CHARSET=utf8 COMMENT='用户验证，图片、短信和邮箱等验证码'
  `);

  const [r4] = await mysql.query(`
    CREATE TABLE users (
      userId varchar(64) NOT NULL COMMENT '用户的ID',
      name varchar(128) DEFAULT NULL COMMENT '用户名，空代表新用户',
      phone varchar(32) DEFAULT NULL COMMENT '手机号码',
      email varchar(64) DEFAULT NULL COMMENT '用户邮箱',
      avatar varchar(512) DEFAULT NULL COMMENT '头像地址',
      tag varchar(32) DEFAULT NULL COMMENT '标签，或业务类型，比如trtc,im',
      tag2 varchar(32) DEFAULT NULL COMMENT '标签2，小直播专用，比如mlvb',
      createUtc datetime DEFAULT NULL COMMENT '用户创建的时间',
      updateUtc datetime DEFAULT NULL COMMENT '用户更新的时间',
      loginUtc datetime DEFAULT NULL COMMENT '用户最后登录时间',
      PRIMARY KEY (userId),
      UNIQUE KEY by_phone (phone) USING BTREE,
      UNIQUE KEY by_email (email) USING BTREE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='用户信息表'
  `);

  const [r5] = await mysql.query(`
    CREATE TABLE users_in_room (
      guestId bigint(20) NOT NULL AUTO_INCREMENT COMMENT '房间的人叫嘉宾，嘉宾ID',
      appId varchar(32) DEFAULT NULL COMMENT '房间所属的AppID',
      roomId varchar(64) DEFAULT NULL COMMENT '用户所在的房间ID',
      userId varchar(64) DEFAULT NULL COMMENT '用户的ID',
      role varchar(32) DEFAULT NULL COMMENT '用户角色 anchor、guest',
      status varchar(32) DEFAULT NULL COMMENT '房间状态',
      createUtc datetime DEFAULT NULL COMMENT '房间创建时间',
      updateUtc datetime DEFAULT NULL COMMENT '房间更新时间',
      PRIMARY KEY (guestId),
      UNIQUE KEY by_roomId_userId (roomId,userId) USING BTREE
    ) ENGINE=InnoDB AUTO_INCREMENT=3079 DEFAULT CHARSET=utf8 COMMENT='房间的用户列表。'
  `);

  const [r6] = await mysql.query(`
    CREATE TABLE user_salts (
      saltId bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Salt的ID',
      name varchar(128) DEFAULT NULL COMMENT '用户名',
      salt varchar(256) DEFAULT NULL COMMENT '用户的SALT',
      ts varchar(32) DEFAULT NULL COMMENT '用户注册时间戳',
      nonce varchar(64) DEFAULT NULL COMMENT '用户随机数',
      createUtc datetime DEFAULT NULL COMMENT '房间创建时间',
      updateUtc datetime DEFAULT NULL COMMENT '房间更新时间',
      PRIMARY KEY (saltId),
      UNIQUE KEY by_name (name) USING BTREE
    ) ENGINE=InnoDB AUTO_INCREMENT=1024 DEFAULT CHARSET=utf8 COMMENT='用户的Salt。'
  `);

  initialized = true;

  const cost = new Date() - starttime;
  console.log(`initdb-ok create ${config.database}, cost=${cost}ms, db=${JSON.stringify(r0)} id_generator=${JSON.stringify(r1)}, rooms=${JSON.stringify(r2)}, sessions=${JSON.stringify(r3)}, users=${JSON.stringify(r4)}, users_in_room=${JSON.stringify(r5)}, salts=${JSON.stringify(r6)}`);
}

function create({mysql, mysql2, config}) {
  if (!mysql) throw errors.create(errors.SystemVerifyError, `mysql required`);
  if (!mysql2) throw errors.create(errors.SystemVerifyError, `mysql2 required`);
  if (!config) throw errors.create(errors.SystemVerifyError, `config required`);

  return {
    initialize: async function () {
      return doInitialize(mysql, mysql2, config);
    },
  };
}

module.exports = {
  create,
};

