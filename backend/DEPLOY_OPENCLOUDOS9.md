# OpenCloudOS 9（腾讯云轻量）部署说明

本文说明如何将 `backend` 目录下的 FastAPI 服务部署到**同机 MariaDB（MySQL 兼容）**，并通过 **Nginx + HTTPS** 对外提供 `https://你的域名` 接口，供微信小程序调用。

## 1. 准备

- 一台已安装 **OpenCloudOS 9** 的轻量服务器，安全组放行 **80、443**。
- 域名 `A` 记录解析到该服务器公网 IP（用于申请证书与小程序合法域名）。
- 本地已配置好小程序的 **AppID / AppSecret**（用于 `/api/auth/wechat`）。

## 2. 上传代码

将本仓库中的 **`backend` 目录内的全部文件**上传到服务器，例如：

```bash
/opt/tea-backend/
  app/
  requirements.txt
  deploy/
  fixtures/
  ...
```

确保存在 `/opt/tea-backend/app/main.py`。

## 3. 一键安装脚本

在服务器以 **root** 执行（先导出变量再运行脚本）：

```bash
cd /opt/tea-backend
export DOMAIN=api.你的域名.com
export EMAIL=你的邮箱@example.com
export MYSQL_ROOT_PASSWORD='MariaDB_root_强密码'
export MYSQL_TEA_PASSWORD='业务用户tea_强密码'
bash deploy/install_opencloudos9.sh
```

脚本会：

- 使用 `dnf` 安装 **Python 3、MariaDB、Nginx、Certbot** 等；
- 初始化数据库 **`tea`** 与用户 **`tea@localhost`**；
- 创建虚拟环境并 `pip install -r requirements.txt`；
- 若不存在 `.env` 则生成模板（含随机 `jwt_secret`）；
- 配置 Nginx 反代本机 **127.0.0.1:8000**；
- 使用 **Certbot** 申请并配置 **HTTPS**；
- 注册并启动 **`tea-api`** systemd 服务。

安装完成后自检：

```bash
curl -sS https://api.你的域名.com/health
```

应返回 JSON：`{"ok":true,...}`。

## 4. 必改配置：`/opt/tea-backend/.env`

至少填写或确认：

| 变量 | 说明 |
|------|------|
| `database_url` | 与脚本创建的 `tea` 用户、库名一致 |
| `jwt_secret` | 已随机生成，勿泄露 |
| `wechat_appid` / `wechat_secret` | 微信公众平台小程序凭据 |
| `public_base_url` | `https://api.你的域名.com`（与实际上传域名一致，**无尾斜杠**） |
| `trace_token_secret` | 与小程序 `app.js` 中 `globalData.traceTokenSecret` **一致** |
| `admin_token` | 非空则可通过请求头 `X-Admin-Token` 调用 `/api/admin/*` 做内容管理 |

修改后重启服务：

```bash
systemctl restart tea-api
```

## 5. 数据库与建表

- 库与用户可使用 `deploy/mysql_init.sql` 手工初始化（一键脚本已包含等价逻辑）。
- **所有业务表**（用户、商城、订单、故事、社区等）在应用启动时由 **SQLAlchemy `create_all`** 自动创建，**无需**再导入一份巨型 DDL。
- 首次启动会自动写入种子数据（公益里程碑、认养示例、商城分类与商品、故事 CMS 等）。

## 6. 微信小程序「合法域名」配置

登录 [微信公众平台](https://mp.weixin.qq.com/) → **开发** → **开发管理** → **开发设置** → **服务器域名**，将以下各项中的域名改为你的 API 域名（**仅 https**，需备案合规）：

| 配置项 | 填写示例 |
|--------|----------|
| **request 合法域名** | `https://api.你的域名.com` |
| **uploadFile 合法域名** | `https://api.你的域名.com` |
| **downloadFile 合法域名** | `https://api.你的域名.com`（若需下载服务端文件） |

说明：

- 域名须 **TLS 1.2+**，证书有效；微信会校验证书链。
- 本地调试可在开发者工具勾选「不校验合法域名」，真机预览/上线必须配置。
- 小程序内 `miniprogram/envList.js` 的 `cloudApiBaseUrl` 或 `app.js` 默认 `apiBaseUrl` 需指向同一 **https** 根地址（无末尾 `/`）。

## 7. 管理端 CRUD

设置 `.env` 中 `admin_token=一长串随机值`，请求时加请求头：

```http
X-Admin-Token: 一长串随机值
```

可对故事、商城分类、商品、商品溯源批次等进行增删改（见 `app/routers/admin_api.py`）。

## 8. 常见问题

- **502**：检查 `systemctl status tea-api`、`journalctl -u tea-api -f`，确认 `database_url` 正确且 MariaDB 已启动。
- **登录 503**：未配置 `wechat_appid` / `wechat_secret`。
- **上传图片外链打不开**：`public_base_url` 必须设为对外的 `https://域名`，且 Nginx 已反代 `/uploads`。
