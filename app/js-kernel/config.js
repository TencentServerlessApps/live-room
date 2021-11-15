'use strict';

module.exports = {
  // For MySQL DB.
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  database: process.env.MYSQL_DB.replace(/-/g, '_'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  // For TRTC and IM.
  SDKAppID: process.env.TRTC_TIM_APPID,
  SECRETKEY: process.env.TRTC_TIM_SECRET,
  administrator: process.env.TIM_ADMINISTRATOR || 'administrator',
  // For Redis DB, optional.
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD
  },
  // For JWT verify, optional.
  jwtSecret: process.env.JWT_SECRET || 'default',
};

