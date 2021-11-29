# live-room

The backend for LiveRoom(小直播).

## Usage

首先，需要开通腾讯云资源：

* [开通API网关](https://console.cloud.tencent.com/apigateway/service?rid=1)，通过API网关访问云函数，提供HTTP API。
* [开通COS存储](https://console.cloud.tencent.com/cos5)，保存云函数代码用的。
* [开通SLS日志服务](https://console.cloud.tencent.com/cls/overview?region=ap-guangzhou)，云函数保存日志用的。
* [云函数授权](https://console.cloud.tencent.com/scf/list?rid=1&ns=default)，云函数访问其他云资源用的。

接着，安装云函数工具[serverless/sls](https://cloud.tencent.com/document/product/583/44753)，安装依赖库：

```bash
npm install -g serverless
npm install
```

> Note: 若安装sls有问题，请看官方说明文档[sls](https://cloud.tencent.com/document/product/583/44753)，有详细解决办法。

> Note: 关于Node安装，请参考[nodejs](https://nodejs.org/zh-cn/download/)，在Windows下请使用Administrator权限启动`Node.js command prompt`，不支持PowerShell。

然后，创建环境变量文件`.env`，注意需要修改下面所有的`xxx`的内容：

```bash
TRTC_TIM_APPID=xxxxxxxxxxxxxxxx
TRTC_TIM_SECRET=xxxxxxxxxxxxxxxx
```

> Note: TRTC的应用在[TRTC](https://console.cloud.tencent.com/trtc/app)创建，和IM使用同样的应用。

最后，发布云函数，需要扫码授权或配置[本地密钥授权](https://cloud.tencent.com/document/product/583/44786#.E6.9C.AC.E5.9C.B0.E5.AF.86.E9.92.A5.E6.8E.88.E6.9D.83)：

```bash
npm install
sls deploy
```

> Note: Windows用户，请使用Administrator权限启动`Node.js command prompt`，否则扫码认证会失败。

从发布日志中获取API网关地址，写入客户端，例如：https://service-xxxyyzzz-1001234567.gz.apigw.tencentcs.com

![image](https://user-images.githubusercontent.com/2777660/138798904-1435d703-db61-47cb-9044-c6d50424bfac.png)

> Note: 在浏览器中直接打开你的网关地址，也应该是成功的才对，如上图所示。

## FAQ

Q: 如何查看云函数的日志？

> A: 查看云函数的日志，请点[这里](https://console.cloud.tencent.com/scf/list-detail?rid=1&ns=default&id=application-prod-live-room&menu=log&tab=codeTab)

Q: 如何删除云函数？

> A: 若需要删除云函数，请执行命令：`sls remove`

Q: 为何网关返回的是`SystemError(99): Invalid TRTC config`？

> A: 请确认环境变量`.env`文件，请不要更改文件名，请检查是否正确配置了TRTC的SdkAppId(TRTC_TIM_APPID)和Secret(TRTC_TIM_SECRET)。

Q: 为何网关和函数无法访问？

> A：请确认是否开通服务，请确认是否账户欠费。

Q：为何Windows无法发布云函数？

> A: 请使用系统管理员(Administrator)启动`Node.js command prompt`，请不要用PowerShell。

Q: 如何确认网关创建成功？

> A: 若能在浏览器访问，则网关正常：https://service-xxxyyzzz-1001234567.gz.apigw.tencentcs.com/helloworld

Q: 如何确认函数创建成功？

> A: 若能在浏览器访问，则函数创建正常：https://service-xxxyyzzz-1001234567.gz.apigw.tencentcs.com

## DOC

### 错误码
| 错误码 | 描述 | 含义 |
| ---- | ---- | ---- |
| 0     |                   |                 |
| 2000  | RoomCreateParams  | 创建房间时参数错误 |
| 2001  | RoomDestroyParams | 删除房间时参数错误 |
| 2002  | RoomQueryParams   | 查询房间时参数错误 |
| 2003  | RoomLeaveParams   | 退出房间时参数错误 |
| 2004  | RoomNotExists     | 房间不存在        |
| 2006  | RoomsUserExists   | 用户已经在房间中   |

### 接口：Token登录
Token登录是更快捷的登录方式，可以实现客户端一定时间免登录。客户端可以将token存储在本地，下次使用token登录，避免每次都需要输验证码。

**接口地址：*/base/v1/auth_users/user_login_token***

**请求参数：用户（请参考用户信息），例如：**
```json
{
  // 用户(user)信息
  "userId": "xxx-1000019",
  "token": "dd243f4.......c32742af3bf6cb",
  "apaasUserId": "xxx-1000019" // 多租户
}
```

**特别说明：**
* apaasAppId：若登录到默认租户，可以不传。若非默认租户，必须设置为指定租户。
* userId和token是用户的账号（手机号或邮箱等）信息，后台会返回apaasUserId。
* token有效期是30天。

**返回值：错误码和鉴权信息（请参考用户信息）。**
* 若数据操作失败，返回ServiceDBFailed(103)。
* 若Token已过期，返回UserTokenExpired(203)。
* 若Token不正确，返回UserTokenInvalid(204)。
* 返回新的token和expire过期UTC时间。
* 这些信息给SDK鉴权使用，可以直接给SDK。
```json
{
  "errorCode": 0,
  "errorMessage": "login done",
  "data": {
    "userId": "xxx-1000019",
    "sdkAppId": 1400544182,
    "sdkUserSig": "eJwtjMEKwjA.............bKC9S",
    "token": "9d0dk28r31........c327id192k9f",
    "expire": "2021-08-22 06:42:54",
    "phone": "+8615800001111",
    "email": "xxx@xxx.com",
    "name": "",  // 新用户用户名为空字符串
    "avatar": "https://xxx",
    "apaasAppId": "xxx", // 多租户
    "apaasUserId": "xxx-1000019" // 多租户
  }
}
```

具体错误码请参考错误码信息。

### 接口：注销登录
客户端请求注销登录，会在数据库清除session和token等信息，但用户信息会保留。

**接口地址：*/base/v1/auth_users/user_logout***

**请求参数：用户（请参考用户信息），例如：**
```json
{
  "userId": "xxx-1000019",
  "token": "dd243f4.......c32742af3bf6cb",
  "apaasUserId": "xxx-1000019" // 多租户
}
```

**返回值：错误码和鉴权信息（请参考用户信息）。**
* 若数据操作失败，返回ServiceDBFailed(103)。
* 若用户不存在，Token过期，Token不存在，都返回成功（已经成功注销）。
```json
{
  "errorCode": 0,
  "errorMessage": "user logout ok"
}
```

具体错误码请参考错误码信息。

### 接口：删除用户
客户端请求删除账号，在数据库清除用户相关的账户和临时登录信息。

**接口地址：*/base/v1/auth_users/user_delete***

**请求参数：用户（请参考用户信息），例如：**
```json
{
  "userId": "xxx-1000019",
  "token": "dd243f4.......c32742af3bf6cb",
  "apaasUserId": "xxx-1000019" // 多租户
}
```

**返回值：错误码和鉴权信息（请参考用户信息）。**
* 若数据操作失败，返回ServiceDBFailed(103)。
* 若Token已过期，返回UserTokenExpired(203)。
* 若Token不正确，返回UserTokenInvalid(204)。
* 若用户不存在，返回成功（已经成功删除）。
```json
{
  "errorCode": 0,
  "errorMessage": "user delete ok"
}
```

具体错误码请参考错误码信息。

### 接口：修改用户信息
用户可以修改用户信息，比如设置用户名，或者绑定邮箱（手机登录），或设置手机号（邮箱登录）。新用户直接登录后，用户名为空，也可以用这个来判断用户是新用户。
客户端请求注销登录，用户的临时信息。

**接口地址：*/base/v1/auth_users/user_update***

**请求参数：用户（请参考用户信息），例如：**
```json
{
  "userId": "xxx-1000019",
  "token": "dd243f4.......c32742af3bf6cb",
  "name": "Alice", // 可选
  "tag": "im", // 可选
  "tag2": "mlvb", // 可选
  "avatar": "https://xxx", // 可选
  "apaasUserId": "xxx-1000019" // 多租户
}
```

**特别说明：**
* name，用户名，昵称。限制125个字符。可以是中文。
* tag，用户标签，用户类型等，用作分类用户。
* tag2，用户标签2，用户类型2等，用做分类用户。

**返回值：错误码和鉴权信息（请参考用户信息）。**
* 若数据操作失败，返回ServiceDBFailed(103)。
* 若Token已过期，返回UserTokenExpired(203)。
* 若Token不正确，返回UserTokenInvalid(204)。
* 若name/tag/tag2全部为空，返回UseInfoEmpty(205)。
* 若name和之前一致，返回成功（设置成功）。
```json
{
  "errorCode": 0,
  "errorMessage": "update ok"
}
```

具体错误码请参考错误码信息。

### 接口：获取用户信息
用户登录后，可以查询自己以及其他用户的信息。

**接口地址：*/base/v1/auth_users/user_query***

**请求参数：用户（请参考用户信息），例如：**
```json
{
  "userId": "xxx-1000019",
  "token": "dd243f4.......c32742af3bf6cb",
  "searchUserId": "200001", // 可选
  "searchPhone": "+8618500002222", // 可选
  "apaasUserId": "xxx-1000019" // 多租户 
}
```

**特别说明：**
* userId和token用来鉴权。若search参数没有指定，则获取用户自己的详细信息。
* searchUserId：获取指定的用户的信息，按用户ID（userId）查询。
* searchPhone：获取指定的用户的信息，按手机号（phone）查询。

**返回值：错误码和鉴权信息（请参考用户信息）。**
* 若数据操作失败，返回ServiceDBFailed(103)。
* 若Token已过期，返回UserTokenExpired(203)。
* 若Token不正确，返回UserTokenInvalid(204)。
* 注意：由于涉及数据安全，该接口不返回phone和email字段。
```json
{
  "errorCode": 0,
  "errorMessage": "query done",
  "data": {
    "userId": "xxx-1000019",
    "name": "",  // 新用户用户名为空字符串
    "avatar": "https://xxx",
    "apaasUserId": "xxx-1000019" // 多租户
  }
}
```

具体错误码请参考错误码信息。

### 接口：心跳和保活
用户登录后，每隔10秒向服务器保活(KeepAlive)。
* 用户若掉线，会根据不同的业务定义，更新相关的状态，比如KTV会在房主和主播掉线后，将房间设置为不可见。
*  IM用户状态回调，也会更新用户的在线状态。

**接口地址：*/base/v1/auth_users/user_keepalive***

**请求参数：用户（请参考用户信息），例如：**
```json
{
  "userId": "xxx-1000019",
  "token": "dd243f4.......c32742af3bf6cb",
  "apaasUserId": "xxx-1000019" // 多租户
}
```

**特别说明：**
* userId和token用来鉴权。

**返回值：错误码。**
* 若数据操作失败，返回ServiceDBFailed(103)。
* 若Token已过期，返回UserTokenExpired(203)。
* 若Token不正确，返回UserTokenInvalid(204)。
```json
{
  "errorCode": 0,
  "errorMessage": "keep alive done"
}
```

具体错误码请参考错误码信息。


### 接口：获取房间列表
客户端登录后，可以根据ID获取房间的详细数据。

**接口地址：*/base/v1/rooms/query_room***

**请求参数：用户（请参考用户信息）和房间，例如：**
```json
{
  // 用户(user)信息
  "appId": "1400000212",
  "userId": "xxx-110016",
  "token": "ju121772Kd1n39",
  // 房间查询信息
  "category": "liveRoom", // 可选
  "roomIds": ["xxx-905449688"], // 可选
  "startUtc": "2021-09-12 16:00:00",  // 可选
  "endUtc": "2021-09-13 16:00:00",  // 可选
  // 分页查询信息
  "offset": 0,  // 可选
  "limit": 100,  // 可选
  // 多租户
  "apaasUserId": "xxx-110016"
}
```

**特别说明**
* appId：为TRTC/TIM的sdkAppId。由于不同的sdkAppId之间的category可能重复，因此必须带sdkAppId参数。
* category，roomIds，startUtc/endUtc，查询参数。
* offset，查询的起始索引，默认0。
* limit，查询的最多房间数目，默认10，不超过100。

**返回值：错误码和房间ID。**
```json
{
  "errorCode":0,
  "errorMessage":"",
  "data": [
    {
      "roomId": "xxx-905449688",
      "category": "liveRoom",
      "title": "A live room",
      "ownBy": "xxx-110016",
      "createUtc": "2021-09-07 02:43:53",
      "updateUtc": "2021-09-07 02:43:54",
      "cover": "http://xxx",
      "subject": "生活",
      "description": "展示我的生活"
    }
  ]
}
```

具体错误码请参考错误码信息。

### 接口：获取房间详情
客户端登录后，可以根据ID获取房间的详细数据。

**接口地址：*/base/v1/rooms/room_detail***

**请求参数：用户（请参考用户信息）和房间，例如：**
```json
{
  // 用户(user)信息
  "userId": "xxx-110016",
  "token": "ju121772Kd1n39",
  // 房间信息
  "roomId": "xxx-905449688",
  // 多租户
  "apaasUserId": "xxx-110016"
}
```

**返回值：错误码和房间信息。**
```json
{
  "errorCode": 0,
  "errorMessage": "room_detail ok",
  "data": {
    "roomId": "xxx-905449688",
    "category": "liveRoom",
    "title": "A live room",
    "ownBy": "xxx-110016",
    "createUtc": "2021-09-07 02:43:53",
    "updateUtc": "2021-09-07 02:43:54",
    "cover": "http://xxx",
    "subject": "生活",
    "description": "展示我的生活",
    "nnUsers": 1
  }
}
```

**特别说明**
* 房间不存在，返回错误码RoomNotExists(2004)。
* nnUsers，房间的人数。

具体错误码请参考错误码信息。

### 接口：生成房间ID
客户端调用API生成房间ID，避免客户端生成房间ID冲突。注意该接口只是生成房间ID，不会创建房间等资源；生成房间ID后，需要调用接口进入房间。

**接口地址：*/base/v1/rooms/generate_roomid***

**请求参数：用户（请参考用户信息）和房间，例如：**
```json
{
  // 用户(user)信息
  "userId": "xxx-110016",
  "token": "ju121772Kd1n39",
  // 房间信息
  "category": "liveRoom",
  "title": "A live room",  // 可选
  // 多租户
  "apaasUserId": "xxx-110016"
}
```

**返回值：错误码和房间ID。**
```json
{
  "errorCode":0,
  "errorMessage":"",
  "data": {
    "roomId": "xxx-905449688"
  }
}
```

**特别说明**
* 后台生成的roomId会保证唯一。多租户场景，会加上apaasAppId前缀，避免冲突。

具体错误码请参考错误码信息。

### 接口：进入房间
客户端登录后，可以进入房间。

**接口地址：*/base/v1/rooms/enter_room***

**请求参数：用户（请参考用户信息）和房间，例如：**
```json
{
  // 用户(user)信息
  "appId": "1400000212",
  "userId": "xxx-110016",
  "token": "ju121772Kd1n39",
  // 房间信息
  "roomId": "xxx-905449688",
  "role": "xxx",
  "category": "liveRoom",  // 可选
  "title": "A live room",  // 可选
  // 多租户
  "apaasUserId": "xxx-110016"
}
```

**特别说明**
* appId：为TRTC/TIM的sdkAppId。由于房间有sdkAppId属性，因此进入房间时必须指定sdkAppId属性。
* roomId：房间ID。由客户生成，格式必须是apaasAppId-roomId，SDK会自动加上前缀，避免不同租户之间冲突。
* role：用户的角色。参考KTV用户角色、Timmerse用户角色部分。
* 需要指定房间ID。若房间不存在，则后端自动创建房间，仅作为测试用。

**返回值：错误码和房间ID。**
```json
{
  "errorCode":0,
  "errorMessage":"",
  "data": {
    "roomId": "xxx-905449688", 
    "role": "xxx"
  }
}
```

具体错误码请参考错误码信息。

### 接口：获取用户列表
客户端加入房间后，可以获取房间内的用户列表。

**接口地址：*/base/v1/rooms/list_users***

**请求参数：用户（请参考用户信息）和房间，例如：**
```json
{
  // 用户(user)信息
  "userId": "xxx-110016",
  "token": "ju121772Kd1n39",
  // 房间查询信息
  "roomId": "xxx-905449688",
  "limit": 100,  // 可选
  // 多租户
  "apaasUserId": "xxx-110016"
}
```

**特别说明**
* limit，查询的最多房间数目，默认10，不超过100。

**返回值：错误码和用户信息。**
```json
{
  "errorCode":0,
  "errorMessage":"",
  "data": [
    {
      "userId": "xxx-1000019",
      "name": "",  // 新用户用户名为空字符串
      "avatar": "https://xxx",
      "role" : "guest",
      // 多租户
      "apaasUserId": "xxx-110016"
    }
  ]
}
```

具体错误码请参考错误码信息。

### 接口：退出房间
客户可以退出房间。

**接口地址：*/base/v1/rooms/leave_room**

**请求参数：用户（请参考用户信息）和房间，例如：**

```json
{
  // 用户(user)信息
  "userId": "xxx-110016",
  "token": "ssju121772Kd1n39",
  // 退出的房间号
  "roomId": "xxx-905449688",
  // 多租户
  "apaasUserId": "xxx-110016"
}
```

**返回值：错误码和最新用户列表。**
```json
{
  "errorCode":0,
  "errorMessage":""
}
```

具体错误码请参考错误码信息。

### 接口：销毁房间
销毁房间，删除相关的资源，比如IM的群组。

**接口地址：*/base/v1/rooms/destroy_room***

**请求参数：用户（请参考用户信息）和房间，例如：**
```json
{
  // 用户(user)信息
  "userId": "xxx-110016",
  "token": "ju121772Kd1n39",
  // 退出的房间号
  "roomId": "xxx-905449688",
  // 多租户
  "apaasUserId": "xxx-110016"
}
```

**返回值：错误码和最新用户列表。**
```json
{
  "errorCode":0,
  "errorMessage":""
}
```

具体错误码请参考错误码信息。

### 接口：更新房间信息
进入房间后，可以更新房间相关的详细信息。

**接口地址：*/base/v1/rooms/update_room***

**请求参数：用户（请参考用户信息）和房间，例如：**
```json
{
  // 用户(user)信息
  "appId": "1400000212",
  "userId": "xxx-110016",
  "token": "ju121772Kd1n39",
  // 用户信息
  "role": "xxx", // 可选
  // 房间信息
  "roomId": "xxx-905449688",
  "category": "liveRoom",  // 可选
  "title": "A live room",  // 可选
  "cover": "http://xxx", // 可选
  "subject": "生活", // 可选
  "description": "展示我的生活", // 可选
  // 多租户
  "apaasUserId": "xxx-110016"
}
```

**特别说明**
* category：房间分类。
* role：用户在房间角色。
* titile：房间标题。
* cover：房间封面。
* subject：房间主题。
* description：房间详细描述。

**返回值：错误码和房间ID。**
```json
{
  "errorCode":0,
  "errorMessage":""
}
```

具体错误码请参考错误码信息。

### auth_users

### oauth