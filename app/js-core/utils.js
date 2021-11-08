'use strict';

const errors = require('./errors');

// Fetch any not null field of obj, return [key, value].
function fetchAny(obj) {
  for (const k in obj) {
    if (obj[k]) {
      return [k, obj[k]];
    }
  }
  return [null, null];
}

// Parse the query and body from koa.
function parseKoaRequest(ctx) {
  return parseRequestParams({
    queryString: ctx.request.query,
    body: ctx.request.body,
  });
}

// Parse object from event.queryString and event.body as JSON.
function parseRequestParams(event) {
  event = event || {};

  // Fill by body first.
  let q = {};
  if (event.body) {
    if (typeof (event.body) === 'object') {
      q = event.body;
    } else {
      q = JSON.parse(event.body);
    }
  }

  // Fill by query string.
  Object.keys(event.queryString || {}).map((k) => {
    q[k] = event.queryString[k];
  });

  // Alias userId as apaasUserId
  // TODO: FIXME: Move to application.
  // TODO: FIXME: Remove the userId for apaasUserId exists.
  if (q.userId && !q.apaasUserId) q.apaasUserId = q.userId;
  if (q.apaasUserId && !q.userId) q.userId = q.apaasUserId;

  return q;
}

// Parse object from event.queryString and event.body as kv.
function doParseRequestParamsKV(event, querystring) {
  event = event || {};

  // Fill by body first.
  const q = event.body ? querystring.parse(event.body) : {};

  // Fill by query string.
  Object.keys(event.queryString || {}).map((k) => {
    q[k] = event.queryString[k];
  });

  return q;
}

// If path=/prod/base/xxx and stage is prod, return /base/xxx
function filterPathWithoutStage(path, stage) {
  if (!path || !stage) return path;
  if (path.indexOf(`/${stage}`) !== 0) return path;
  return path.substr(stage.length + 1);
}

// See parseClientIp of https://github.com/winlinvip/http-gif-sls-writer/blob/master/main.go
function parseClientIp(q, headers, context) {
  const ctx = {request: {ip: context && context.sourceIp}};
  return parseKoaClientIp(q, headers, ctx);
}

// See parseClientIp of https://github.com/winlinvip/http-gif-sls-writer/blob/master/main.go
function parseKoaClientIp(q, headers, ctx) {
  if (q && q.clientip) return q.clientip;

  const fwd = headers && headers['x-forwarded-for'];
  if (fwd) {
    const index = fwd.indexOf(',');
    if (index !== -1) return fwd.substr(0, index);
    return fwd;
  }

  const rip = headers && headers['x-real-ip'];
  if (rip) return rip;

  return ctx && ctx.request.ip;
}

// Write log for KOA request.
function logKoa(tag, ctx, mask) {
  let msg = `${tag} ip=${parseKoaClientIp(null, ctx.headers, ctx)}, method=${ctx.request.method}, url=${ctx.request.url}`;
  if (mask) msg = mask(msg);
  console.log(msg);
}

function create({querystring}) {
  return {
    parseRequestParams,
    parseRequestParamsKV: function (event) {
      if (!querystring) throw errors.create(errors.SystemVerifyError, `querystring required`);
      return doParseRequestParamsKV(event, querystring);
    },
    parseKoaRequest,
    fetchAny,
    filterPathWithoutStage,
    parseClientIp,
    parseKoaClientIp,
    logKoa,
  };
}

module.exports = {
  create,
};

