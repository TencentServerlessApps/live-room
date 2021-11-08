'use strict';

// MySQL日期字段格式化字符串 @see https://stackoverflow.com/a/27381633
const MYSQL_DATETIME = 'YYYY-MM-DD HH:mm:ss';

// UTC timezone to CTS(+08:00) @see https://momentjs.com/docs/#/manipulating/timezone-offset/
//      moment().utc().utcOffset(consts.UTC2CTS)
const UTC2CTS = '+08:00';

module.exports = {
  MYSQL_DATETIME,
  UTC2CTS,
};

