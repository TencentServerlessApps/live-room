'use strict';

// 用户默认的头像
const AVATARS = [
  'https://imgcache.qq.com/qcloud/public/static/avatar0_100.20191230.png',
  'https://imgcache.qq.com/qcloud/public/static/avatar1_100.20191230.png',
  'https://imgcache.qq.com/qcloud/public/static/avatar2_100.20191230.png',
  'https://imgcache.qq.com/qcloud/public/static/avatar3_100.20191230.png',
  'https://imgcache.qq.com/qcloud/public/static/avatar4_100.20191230.png',
  'https://imgcache.qq.com/qcloud/public/static/avatar5_100.20191230.png',
  'https://imgcache.qq.com/qcloud/public/static/avatar6_100.20191230.png',
  'https://imgcache.qq.com/qcloud/public/static/avatar7_100.20191230.png',
  'https://imgcache.qq.com/qcloud/public/static/avatar8_100.20191230.png',
  'https://imgcache.qq.com/qcloud/public/static/avatar9_100.20191230.png'
];

const REDIS_KEYS = {
  DEMOS_ONLINE_USERS: 'DEMOS_ONLINE_USERS',
};

function create({moment}) {
  if (!moment) throw errors.create(errors.SystemVerifyError, `moment required`);

  const consts = require('js-core/consts');
  const data = {
    MYSQL_DATETIME: consts.MYSQL_DATETIME,
    // Token超时时间 @see https://momentjs.com/docs/#/durations/
    TOKEN_EXPIRE: moment.duration(30, 'days'),
    // TRTC/TIM的UserSig的有效期
    TRTC_EXPIRE: moment.duration(48, 'hours'),
    // IM默认的房间类型
    IM_ROOM_TYPE: "AVChatRoom",
    // 用户默认的头像
    AVATARS,
    // Redis KEY
    redis: REDIS_KEYS,
  };

  // Improt consts from js-core/consts
  for (const k in consts) {
    data[k] = consts[k];
  }

  return data;
}

module.exports = {
  create,
};

