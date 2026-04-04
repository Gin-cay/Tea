# 茶叶助农 API（FastAPI）

- 入口：`app.main:app`
- 本地运行：`python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 5000`
- 环境变量：见 `.env.example`
- 部署：见仓库根目录 `docs/DEPLOY_TENCENT_CLOUD.md`
- 旧 Flask 代码：`legacy_flask/`（已弃用）

Docker：

```bash
docker build -t tea-api .
docker run -p 8080:80 --env-file .env tea-api
```
