'use strict';

/*
Create a error response for SCF to return, for example:
    const errors = require('js-core/errors');
    exports.main_handler = async (event, context) => {
        return errors.create(errors.UserCodeInvalid, 'invalid params');
    };
*/
function create(code, msg, errs) {
  let name = 'Error';
  errs = errs || module.exports;
  Object.keys(module.exports).map((k) => {
    if (module.exports[k] === code) {
      name = k;
    }
  });

  return {
    errorCode: code,
    codeStr: name,
    errorMessage: `${name}(${code}): ${msg}`,
    errorStack: `${new Error().stack}`,
  };
}

/*
Create a success response for SCE to return, for example:
    const errors = require('js-core/errors');
    exports.main_handler = async (event, context) => {
        return errors.data();
        return errors.data({sessionId: 'xxx'});
        return errors.data({sessionId: 'xxx'}, 'It works!');
        return errors.data({sessionId: 'xxx'}, 'It works!', 0);
    };
 */
function data(data, msg, code) {
  const r = {
    errorCode: code || module.exports.Success,
    errorMessage: msg || '',
  };

  if (data) {
    r.data = data;
  }

  return r;
}

/*
Parse err to error response object, for example:
    const errors = require('./errors');
    exports.main_handler = async (event, context) => {
        try {
            const data = yourFunction();
            return errors.data(data);
        } catch(err) {
            return errors.asResponse(err);
        }
    };
 */
function asResponse(err) {
  // The err or data is create by this module, return it directly.
  if (err instanceof Object && err.errorCode !== undefined) {
    return err;
  }

  // A standard Error object.
  if (err instanceof Error) {
    return create(module.exports.SystemError, `${err.stack}`);
  }

  // For error string.
  if (typeof (err) === 'string') {
    return create(module.exports.SystemError, err);
  }

  // Let SCF to handle the error.
  throw err;
}

// Get and return the scfRequestId(x-scf-request-id or x-api-requestid), and xRequestId(x-request-id) from koa ctx.
// Set the res.requestId if res is not empty.
function koaRequestId(ctx, res) {
  let scfRequestId = ctx.request.headers['x-api-requestid'];
  scfRequestId = scfRequestId || ctx.request.headers['x-scf-request-id'];

  const xRequestId = ctx.request.headers['x-request-id'];
  if ((xRequestId || scfRequestId) && res && typeof (res) === 'object') {
    res.requestId = xRequestId || scfRequestId;
  }

  return {xRequestId, scfRequestId};
}

// Format err in json, inline string.
function format(err) {
  return JSON.stringify(asResponse(err));
}

module.exports = {
  create,
  data,
  asResponse,
  koaRequestId,
  format,
  //
  // Error codes defines.
  Success: 0,
  //
  // System or Service @see https://docs.qq.com/doc/DR0JBU0d5TXhzdGhK
  SystemVerifyError: 98,
  SystemError: 99,
  ServiceUnavailable: 100,
  ServiceResponseInvalid: 101,
  ServiceSmsFailed: 102,
  ServiceDBFailed: 103,
  ServiceEmailFailed: 104,
  //
  // User or Auth @see https://docs.qq.com/doc/DR0JBU0d5TXhzdGhK
  UserCodeInvalid: 200,
  UserCodeExpired: 201,
  UserCodeConsumed: 202,
  UserTokenExpired: 203,
  UserTokenInvalid: 204,
  UserNameEmpty: 205,
  UserNotExists: 206,
  UserEmailInvalid: 207,
  UserQueryParams: 208,
  UserQueryLimit: 209,
  UserOAuthParams: 210,
  //
  // Music or songs @see https://docs.qq.com/doc/DR3h0QVhtRFdpUmh6
  MusicNotExists: 1000,
  MusicNotTheFirst: 1001,
  MusicIsPlaying: 1002,
  //
  // Room service @see https://docs.qq.com/doc/DR1F4dVlKbXpiVkJr
  RoomCreateParams: 2000,
  RoomDestroyParams: 2001,
  RoomQueryParams: 2002,
  RoomLeaveParams: 2003,
  RoomNotExists: 2004,
  RoomStarInvalid: 2005,
  //
  // Seat @see https://docs.qq.com/doc/DR1NIWWNKelV5aWxr
  SeatNotExists: 4000,
  SeatIdNotExists: 4002,
  SeatModeInvalid: 4100,
  SeatNumInvalid: 4101,
  SeatMuteInvalid: 4102,
  SeatLockInvalid: 4103,
  SeatOccupied: 4200,
  SeatLocked: 4201,
};

