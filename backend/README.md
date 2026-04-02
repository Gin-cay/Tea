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

## 4) 接口列表

- `GET /health`
- `GET /public-benefit/milestones`
- `GET /public-benefit/records/{recordId}`
- `POST /points/redeem`

## 5) 说明

- 当前数据为内存 mock，重启服务会重置积分余额。
- 可通过请求头 `X-User-Id` 区分用户积分（默认 `u-demo`）。
