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