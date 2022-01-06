'use strict';

const errors = require('./errors');

/*
The config SHOULD be config:Object for Redis db, with bellow fields:
    {host, port, password}
well, the password is optional, which might for redis without password.

For example:
    const config = {
        redis: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            password: process.env.REDIS_PASSWORD,
        }
    };
    const ioredis = require('ioredis');
    const redis = require('js-core/redis').create({config: config.redis, redis: ioredis});

    const r0 = await redis.set('KEY', 'VALUE');
 */
function create({config, redis}) {
  const connect = function() {
    if (!redis) throw errors.create(errors.SystemVerifyError, `redis required`);
    if (!config) throw errors.create(errors.SystemVerifyError, `config required`);
    if (!config.host) throw errors.create(errors.SystemVerifyError, `config.host required`);
    if (!config.port) throw errors.create(errors.SystemVerifyError, `config.port required`);

    const dbConfig = {
      port: config.port,
      host: config.host,
      family: 4,
      db: 0,
      password: config.password
    };

    const Redis = redis;
    const client = new Redis(dbConfig);
    return client;
  };

  return {
    // @see https://redis.io/commands/set
    set: async function (key, value) {
      const client = connect();
      return await client.set(key, value);
    },
    // @see https://redis.io/commands/hset
    hset: async function (key, field, value) {
      const client = connect();
      return await client.hset(key, field, value);
    },
    hget: async function (key, field) {
      const client = connect();
      return await client.hget(key, field);
    },
    hdel: async function (key, field) {
      const client = connect();
      return await client.hdel(key, field);
    },
    hscan: async function (key, cursor, match, count) {
      const client = connect();
      return await client.hscan(key, cursor, 'MATCH', match, 'COUNT', count);
    }
  };
}

module.exports = {
  create,
};

