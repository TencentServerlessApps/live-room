'use strict';

const errors = require('./errors');

// Generate global unique ID by cond, for example, {phone, email}.
async function doGenerateId(cond, mysql, utils) {
  // Find key and value, match the first none null one.
  const [key, value] = utils.fetchAny(cond);
  if (!key || !value) {
    console.log(`generate id by cond=${JSON.stringify(cond)}, key=${key}, value=${value}`);
    throw errors.create(errors.SystemVerifyError, `cond=${JSON.stringify(cond)} required`);
  }

  // Try to generate a ID by cond, ignore if exists.
  await mysql.query(`INSERT IGNORE INTO id_generator(${key}) VALUES(?)`, [value]);

  // Get the generated id by phone/email.
  const [r0] = await mysql.query(`SELECT id FROM id_generator WHERE ${key}=?`, [value]);

  const rr0 = r0 && r0[0]; // r1.id, which is integer or bigint(20).
  if (!r0) throw errors.create(errors.ServiceDBFailed, `get id failed, cond=${cond}`);
  if (r0.length !== 1 || !rr0) throw errors.create(errors.SystemError, `id invalid, cond=${cond}, rows=${r0.length}`);

  // Note that the id is string or varchar(64), so we convert it here.
  return String(rr0.id);
}

function create({mysql, querystring}) {
  if (!mysql) throw errors.create(errors.SystemVerifyError, `mysql required`);

  return {
    generateId: async function (cond) {
      const utils = require('./utils').create({querystring});
      return doGenerateId(cond, mysql, utils);
    },
  };
}

module.exports = {
  create,
};

