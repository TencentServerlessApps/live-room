'use strict';

const errors = require('./errors');

/*
Invoke TIM server API.

@param SDKAppID is the sdkappid is of https://cloud.tencent.com/document/product/269/1519
@param administrator is the identifier of https://cloud.tencent.com/document/product/269/1519
@param SECRETKEY is used to generate the usersig of https://cloud.tencent.com/document/product/269/1519

For example:

    const tim = require('js-core/im').create({
      SDKAppID: process.env.SDKAppID,
      SECRETKEY: process.env.IM_SECRETKEY,
      administrator: process.env.IM_ADMINISTRATOR,
      url: require('url'),
      https: require('https'),
      TLSSigAPIv2: require('tls-sig-api-v2'),
    });

    tim.account_import(...);
    tim.create_group(...);
 */
function create({config, url, https, TLSSigAPIv2}) {
  if (!config.SDKAppID) throw errors.create(errors.SystemVerifyError, `config.SDKAppID required`);
  if (!config.SECRETKEY) throw errors.create(errors.SystemVerifyError, `config.SECRETKEY required`);
  if (!config.administrator) throw errors.create(errors.SystemVerifyError, `config.administrator required`);
  const SDKAppID = config.SDKAppID;
  const SECRETKEY = config.SECRETKEY;
  const administrator = config.administrator;

  // TODO: FIMXE: Cache the sig util expired.
  const administratorSig = function () {
    return new TLSSigAPIv2.Api(parseInt(SDKAppID), SECRETKEY).genSig(administrator, 1 * 24 * 3600);
  };

  // Do HTTP/HTTPS request.
  const apiRequest = async function (r, data) {
    const postData = JSON.stringify(data);
    const urlObj = url.parse(r);

    return await new Promise((resolve, reject) => {
      const req = https.request({
          method: 'POST',
          host: urlObj.host,
          path: urlObj.path,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve(JSON.parse(body));
          });
        }
      );

      req.on('error', (e) => {
        reject(e);
      });

      req.write(postData);
      req.end();
    });
  };

  // Generate the request url by api.
  const generateUrl = function (api) {
    const sigature = administratorSig();
    const randstr = Math.random().toString(10).slice(-8);
    return `https://console.tim.qq.com/${api}?sdkappid=${SDKAppID}&identifier=${administrator}&usersig=${sigature}&random=${randstr}&contenttype=json`;
  };

  // Export SDK API.
  return {
    // 导入单个帐号 @see https://cloud.tencent.com/document/product/269/1608
    account_import: async function (Identifier, Nick, FaceUrl) {
      const params = {Identifier: Identifier};
      if (Nick) params.Nick = Nick;
      if (FaceUrl) params.FaceUrl = FaceUrl;
      return apiRequest(generateUrl('v4/im_open_login_svc/account_import'), params);
    },
    // 创建群组 @see https://cloud.tencent.com/document/product/269/1615
    create_group: async function (OwnerAccount, Type, GroupId, Name) {
      const params = {Owner_Account: OwnerAccount};
      if (Type) params.Type = Type;
      if (GroupId) params.GroupId = GroupId;
      if (Name) params.Name = Name;
      return apiRequest(generateUrl('v4/group_open_http_svc/create_group'), params);
    },
    // 解散群组 @see https://cloud.tencent.com/document/product/269/1624
    destroy_group: async function (GroupId) {
      return apiRequest(generateUrl('v4/group_open_http_svc/destroy_group'), {
        GroupId: GroupId,
      });
    },
    // 增加群成员 @see https://cloud.tencent.com/document/product/269/1621
    add_group_member: async function (GroupId, Silence, MemberAccounts) {
      return apiRequest(generateUrl('v4/group_open_http_svc/add_group_member'), {
        GroupId: GroupId,
        Silence: Silence,
        MemberList: MemberAccounts.map(function (x) {
          return {
            Member_Account: x,
          };
        }),
      });
    },
    // 删除群成员 @see https://cloud.tencent.com/document/product/269/1622
    delete_group_member: async function (GroupId, Silence, MemberToDelAccounts) {
      return apiRequest(generateUrl('v4/group_open_http_svc/delete_group_member'), {
        GroupId: GroupId,
        Silence: Silence,
        MemberToDel_Account: MemberToDelAccounts,
      });
    },
    // 转让群主 @see https://cloud.tencent.com/document/product/269/1633
    change_group_owner: async function (GroupId, NewOwnerAccount) {
      return apiRequest(generateUrl('v4/group_open_http_svc/change_group_owner'), {
        GroupId: GroupId,
        NewOwner_Account: NewOwnerAccount,
      });
    },
    // 单发单聊消息 @see https://cloud.tencent.com/document/product/269/2282
    sendmsg: async function (FromAccount, SyncOtherMachine, ToAccount, MsgContent) {
      const data = {
        SyncOtherMachine: SyncOtherMachine,
        To_Account: ToAccount,
        MsgLifeTime: 1 * 3600, // in seconds
        MsgRandom: parseInt(Math.random() * 1000000),
        MsgTimeStamp: parseInt(new Date().getTime() / 1000), // timestamp in seconds
        MsgBody: [{
          MsgType: 'TIMTextElem',
          MsgContent: {
            Text: MsgContent,
          },
        }],
      };
      if (FromAccount) data.From_Account = FromAccount;
      return apiRequest(generateUrl('v4/openim/sendmsg'), data);
    },
    // 在群组中发送普通消息 @see https://cloud.tencent.com/document/product/269/1629
    send_group_msg: async function (FromAccount, GroupId, MsgContent) {
      const data = {
        GroupId: GroupId,
        MsgRandom: parseInt(Math.random() * 1000000),
        MsgBody: [{
          MsgType: 'TIMTextElem',
          MsgContent: {
            Text: MsgContent,
          },
        }],
      };
      if (FromAccount) data.From_Account = FromAccount;
      return apiRequest(generateUrl('v4/group_open_http_svc/send_group_msg'), data);
    },
    // 在群组中发送系统通知 @see https://cloud.tencent.com/document/product/269/1630
    send_group_system_notification: async function (GroupId, ToMembersAccounts, MsgContent) {
      return apiRequest(generateUrl('v4/group_open_http_svc/send_group_system_notification'), {
        GroupId: GroupId,
        ToMembers_Account: ToMembersAccounts,
        Content: MsgContent,
      });
    },
    // 获取群成员 @see https://cloud.tencent.com/document/product/269/1630
    get_group_member_info: async function (GroupId, MemberInfoFilter, Limit) {
      return apiRequest(generateUrl('v4/group_open_http_svc/get_group_member_info'), {
        GroupId: GroupId,
        MemberInfoFilter: MemberInfoFilter,
        Limit: Limit,
      });
    },
  };
}

module.exports = {
  create,
  // Enums and Consts.
  TYPES: {
    // GroupType @see https://cloud.tencent.com/document/product/269/1502#GroupType
    GRP_WORK: 'Private',
    GRP_PUBLIC: 'Public',
    GRP_MEETING: 'ChatRoom',
    GRP_AVCHATROOM: 'AVChatRoom',
  },
};

