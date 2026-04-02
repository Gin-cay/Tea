# 公益里程碑后端

支持两种运行方式：
- 本地 Python 运行（开发调试）
- 微信云托管 Docker 部署（上线）

## 1) 本地运行

```bash
pip install -r requirements.txt
python server.py
```

默认监听：`http://127.0.0.1:5000`

## 2) 微信云托管部署

在云托管创建服务后，推荐使用 **仓库根目录** 作为构建目录（根目录 `Dockerfile` 会引用 `backend/`）：

- Dockerfile：仓库根目录 `Dockerfile` 或 `backend/Dockerfile`
- 容器内进程：**gunicorn** 加载 `server:app`
- 端口：运行时注入环境变量 `PORT`（默认 80，与控制台容器端口一致）

部署后你会得到一个 HTTPS 访问域名，例如：
`https://<service-id>.tcloudbaseapp.com`

## 3) 小程序对接

将小程序 `miniprogram/envList.js` 中 `cloudApiBaseUrl` 设为云托管 HTTPS 根地址（无末尾 `/`）；留空则仍为本地 `http://127.0.0.1:5000`。并在微信公众平台配置 **request 合法域名**。

## 4) 环境变量（云托管）

| 变量 | 说明 |
|------|------|
| `WECHAT_APPID` / `WECHAT_SECRET` | `POST /api/auth/wechat` 换 openid，**必填**（与小程序 AppID 一致） |
| `DATABASE_URL` | 可选；默认 SQLite 文件 `tea_data.db`（容器无持久盘时社区数据会丢，生产建议接云数据库） |
| `PUBLIC_BASE_URL` | 可选；社区上传返回的图片 URL 前缀（HTTPS 根地址） |
| `COMMUNITY_AUTO_APPROVE` | 可选；默认 `true`，发帖自动通过审核 |
| `PORT` | 监听端口，与云托管容器端口一致 |

## 5) 接口列表

**公益**

- `GET /health`
- `GET /public-benefit/milestones`
- `GET /public-benefit/records/{recordId}`
- `POST /points/redeem`

**微信与茶友社区**（小程序 `communityHttp.js` 依赖）

- `POST /api/auth/wechat`
- `GET/POST /api/community/*`（feed、posts、like、comments、notify、upload 等）

## 6) 说明

- 公益积分仍为内存 mock，重启会重置；社区帖子等在数据库中持久化（视 `DATABASE_URL` 与磁盘而定）。
- 可通过请求头 `X-User-Id` 区分公益积分用户（默认 `u-demo`）；社区接口使用 `X-Openid`。
