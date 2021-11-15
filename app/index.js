'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Koa = require('koa');
const Router = require('koa-router');
const Cors = require('koa2-cors');
const BodyParser = require('koa-bodyparser');
const errors = require('js-core/errors');
const pkg = require('./package.json');

// Default to local development env.
process.env.STAGE = process.env.STAGE || 'local';

// Try to read .env manually, for directly run node.
['.', '..'].map(envDir => {
  if (fs.existsSync(path.join(envDir, `.env.${process.env.STAGE}`))) {
    dotenv.config({path: path.join(envDir, `.env.${process.env.STAGE}`)});
  }
});

const app = new Koa();

app.use(async (ctx, next) => {
  // Check required config, user MUST set it in .env or serverless.yml
  const appid = process.env.TRTC_TIM_APPID;
  const secret = process.env.TRTC_TIM_SECRET;
  if (!appid || !secret || appid === 'xxxxxxxxxxxxxxxx' || secret === 'xxxxxxxxxxxxxxxx') {
    ctx.status = 503;
    ctx.body = errors.create(errors.SystemError, `Invalid TRTC config, please check .env file`);
    return;
  }

  await next();
});

app.use(async (ctx, next) => {
  await next();

  if (ctx.body) {
    const {scfRequestId, xRequestId} = errors.koaRequestId(ctx, ctx.body);
    if (scfRequestId && xRequestId && scfRequestId !== xRequestId) {
      console.log(`bind X-Scf-Request-Id ${scfRequestId} to X-Request-ID ${xRequestId}`);
    }
  }
});

// Define the HTTP 404 body.
app.use(async (ctx, next) => {
  await next();

  if (ctx.status === 404) {
    ctx.status = 404;
    ctx.body = errors.create(errors.SystemError, `${ctx.request.url} not found`);
  }
});

// Use HTTP 500 for application-level error.
app.use(async (ctx, next) => {
  await next();

  if (ctx.body && ctx.body.errorCode) {
    ctx.status = 500;
  }
});

// Append version for normal body.
app.use(async (ctx, next) => {
  await next();

  if (ctx.body && !ctx.body.version) {
    ctx.body.version = pkg.version;
  }
});

app.use(Cors());
app.use(BodyParser());

const router = new Router();
app.use(router.routes());

// Run all modules in one nodejs server.
require('oauth/oauth').create(router);
require('auth_users/auth_users').create(router);
require('rooms/rooms').create(router);

// For default path.
router.all('/', async (ctx) => {
  ctx.body = errors.data(null, 'ok');
});
router.all('/base/v1/', async (ctx) => {
  ctx.body = errors.data(null, 'ok');
});

// Redirect /${stage}/xxx to /xxx
app.use(new Router({prefix: `/${process.env.STAGE}`}).use(router.routes()).routes());
if (process.env.STAGE !== 'prod') app.use(new Router({prefix: `/prod`}).use(router.routes()).routes());

app.listen(9000, () => {
  console.log(`Server start on http://localhost:9000`);
});

