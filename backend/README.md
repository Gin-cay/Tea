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

在云托管创建服务后，将 `backend` 目录作为构建目录部署即可：

- Dockerfile：`backend/Dockerfile`
- 入口：`python server.py`
- 端口：读取环境变量 `PORT`（已在代码支持）

部署后你会得到一个 HTTPS 访问域名，例如：
`https://<service-id>.tcloudbaseapp.com`

## 3) 小程序对接

将小程序 `miniprogram/app.js` 中 `globalData.apiBaseUrl` 改成云托管域名。

## 4) 接口列表

- `GET /health`
- `GET /public-benefit/milestones`
- `GET /public-benefit/records/{recordId}`
- `POST /points/redeem`

## 5) 说明

- 当前数据为内存 mock，重启服务会重置积分余额。
- 可通过请求头 `X-User-Id` 区分用户积分（默认 `u-demo`）。
