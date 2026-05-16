# Next 易支付

Next 易支付是一个基于 Next.js App Router 的单商户易支付兼容程序，面向个人站长、小型业务和需要从传统易支付接口迁移到现代 TypeScript 技术栈的场景。

项目保留易支付常用接入方式和签名规则，同时提供现代化收银台、扫码支付页、后台订单管理、通道配置和系统设置能力。

## 特性

- 兼容易支付旧版 SDK：MD5 签名、参数 ASCII 升序、过滤 `sign` / `sign_type` / 空值。
- 兼容经典入口：
  - `GET/POST /submit.php`：页面跳转支付。
  - `GET/POST /mapi.php`：API 创建支付。
  - `GET/POST /api.php`：商户信息、订单查询、订单列表、退款、重新通知。
- 单商户模式：默认商户 `PID=1000`，适合自用部署和轻量业务。
- 支持支付方式：支付宝、微信支付。
- 支持官方通道：支付宝官方接口、微信支付 APIv3。
- 支持订单状态轮询：扫码页可自动显示等待支付、支付成功、订单关闭等状态。
- 支持商户通知：支付成功后按易支付参数格式通知 `notify_url` / `return_url`。
- 支持后台管理：订单、退款、补单、重新通知、通道启停、商户 KEY 重置、系统配置。
- 支持后台安全配置：密码登录、邮件验证码、TOTP、图形验证码、SMTP、订单成功邮件通知。
- 现代前后台 UI：Next.js + React + Tailwind CSS + shadcn/ui 风格组件。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 6
- MySQL
- shadcn/ui 风格组件
- jose / bcryptjs / zod / qrcode / nodemailer

## 快速开始

### 环境要求

- Node.js 20+
- MySQL 5.7+ / 8.0+
- npm

### 安装

```bash
git clone https://github.com/your-name/epay-next.git
cd epay-next
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

Windows PowerShell 可以使用：

```powershell
copy .env.example .env
```

默认开发地址：`http://localhost:3000`。

## 默认账号

种子数据会创建默认商户和后台账号：

| 项目 | 默认值 |
| --- | --- |
| 商户 PID | `1000` |
| 商户 KEY | `epay_default_key_change_me` |
| 后台账号 | `admin` |
| 后台密码 | `123456` |

首次部署后必须立即修改后台密码、商户 KEY、`ADMIN_SESSION_SECRET` 和支付通道密钥。

## 环境变量

`.env.example` 默认包含：

```env
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_USER="root"
DB_PASSWORD="password"
DB_NAME="epay_next"
APP_URL="http://localhost:3000"
PORT="3000"
ADMIN_SESSION_SECRET="change-this-secret-at-least-32-chars"
```

说明：

- `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`：MySQL 连接配置。
- `APP_URL`：项目对外访问地址，用于生成支付跳转、后台跳转和回调地址。生产环境应改为 HTTPS 域名。
- `PORT`：Next 服务监听端口。
- `ADMIN_SESSION_SECRET`：后台 session 签名密钥，生产环境必须使用足够长的随机字符串。
- 如果额外设置了 `DATABASE_URL`，Prisma 会优先使用 `DATABASE_URL`。

## 常用命令

```bash
npm run dev              # 开发模式
npm run build            # 生产构建
npm run start            # 生产启动
npm run lint             # ESLint 检查
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:push      # 同步数据库结构
npm run prisma:seed      # 写入初始数据
```

## 易支付接口兼容

### 页面支付：`/submit.php`

支持 `GET` / `POST`。

必填参数：

| 参数 | 说明 |
| --- | --- |
| `pid` | 商户 PID |
| `out_trade_no` | 商户订单号 |
| `notify_url` | 异步通知地址 |
| `return_url` | 同步跳转地址 |
| `name` | 商品名称 |
| `money` | 金额，单位元 |
| `sign` | MD5 签名 |
| `sign_type` | 签名类型，当前兼容 `MD5` |

可选参数：`type`、`param`。

`type` 为空时进入收银台，由用户选择支付方式；指定 `alipay` 或 `wxpay` 时直接创建对应支付。

### API 支付：`/mapi.php`

支持 `GET` / `POST`。

必填参数：

| 参数 | 说明 |
| --- | --- |
| `pid` | 商户 PID |
| `type` | 支付方式：`alipay` / `wxpay` |
| `out_trade_no` | 商户订单号 |
| `notify_url` | 异步通知地址 |
| `name` | 商品名称 |
| `money` | 金额，单位元 |
| `clientip` | 客户端 IP |
| `sign` | MD5 签名 |
| `sign_type` | 签名类型 |

成功响应示例：

```json
{
  "code": 1,
  "msg": "success",
  "trade_no": "2026051520300012345",
  "qrcode": "weixin://wxpay/bizpayurl?..."
}
```

### 商户 API：`/api.php`

常用调用：

```text
/api.php?act=query&pid=1000&key=...
/api.php?act=order&pid=1000&key=...&trade_no=...
/api.php?act=orders&pid=1000&key=...&limit=20&offset=0
/api.php?act=refund&pid=1000&key=...&trade_no=...&money=1.00
/api.php?act=notify&pid=1000&key=...&trade_no=...
```

## 签名规则

签名规则与常见易支付 SDK 保持一致：

1. 排除 `sign`、`sign_type` 和空值参数。
2. 按参数名 ASCII 升序排序。
3. 拼接为 `a=1&b=2&key=商户KEY`。
4. 对拼接字符串计算 MD5。

## 支付通道配置

后台路径：`/admin/channels`。

支付宝配置字段：

- `appId`
- `privateKey`
- `alipayPublicKey`
- `product`：建议 `pc`、`wap`、`qr`

支付宝网关固定为生产环境：`https://openapi.alipay.com/gateway.do`。

微信支付配置字段：

- `appId`
- `mchId`
- `apiV3Key`
- `merchantPrivateKey`
- `merchantSerialNo`
- `platformCertificate`
- `product`：建议 `native`、`h5`、`jsapi`、`miniprogram`、`app`

支付方式是否可用由通道启用状态控制。

## 订单状态

系统内部订单状态会覆盖常见支付流程：

- 待支付
- 支付中 / 等待扫码
- 已支付
- 已关闭 / 已过期
- 已退款 / 退款中 / 退款失败

扫码支付页会轮询订单状态。平台回调或主动查单确认成功后，页面会自动显示支付成功，并按订单配置跳转商户返回地址。

## 部署建议

生产部署前至少完成以下事项：

- 将 `APP_URL` 设置为正式 HTTPS 域名。
- 修改默认后台密码和商户 KEY。
- 设置强随机 `ADMIN_SESSION_SECRET`。
- 配置 MySQL 账号权限，避免使用 root 账号直连生产库。
- 配置支付宝 / 微信支付的正式商户参数和回调域名。
- 确认服务器时间同步，否则支付平台签名和回调校验可能失败。
- 使用反向代理提供 HTTPS，并正确转发 Host / Proto 相关头。

生产启动示例：

```bash
npm run build
npm run start
```

## 旧 SDK 接入

如果你已有易支付 SDK，只需要把 SDK 配置中的：

- `apiurl` 改为当前项目的 `APP_URL`
- `pid` 改为后台显示的商户 PID
- `key` 改为后台显示的商户 KEY

其他签名、跳转和通知参数保持旧方式即可。

## 项目状态

当前项目定位是“单商户易支付兼容程序”，不是完整多商户支付平台。

已保留：

- 单商户收款
- 易支付接口兼容
- 支付宝 / 微信官方通道
- 订单管理
- 退款
- 重新通知
- 后台配置

未包含：

- 多商户注册和审核
- 用户中心
- 插件市场
- 分账
- 企业付款
- 复杂代理商体系

## 安全说明

- 不要提交 `.env`、私钥、证书、商户 KEY、数据库密码到 GitHub。
- 开源前建议确认 `.gitignore` 已排除 `.env`、`.next`、`node_modules`、日志和临时文件。
- 默认账号仅用于初始化，生产环境必须修改。
- 支付回调必须通过平台验签和金额校验后再更新订单状态。

