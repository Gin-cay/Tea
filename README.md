# 茶叶助农 · 微信小程序 + FastAPI 后端

认养、商城、红色溯源、公益里程碑、研学打卡等业务的一体化示例工程。后端已从 Flask + 内存 Mock 迁移为 **Python 3.11+ / FastAPI / SQLAlchemy**，数据落在 **SQLite（默认）或 MySQL**，小程序端统一通过 **HTTPS 域名** 调用 REST 接口，并支持 **JWT 登录态**、请求重试与错误提示。

## 目录结构

| 路径 | 说明 |
|------|------|
| `miniprogram/` | 微信小程序前端 |
| `backend/` | FastAPI 应用（`app/` 包）、依赖、`Dockerfile` |
| `backend/fixtures/seed_bundle.json` | 首次启动种子数据（茶园、商品、里程碑等） |
| `backend/legacy_flask/` | 旧版 Flask 实现（仅供参考，不再作为入口） |
| `docs/DEPLOY_TENCENT_CLOUD.md` | 腾讯云轻量服务器、Nginx、HTTPS、域名与白名单 |

## 快速开始（本地）

### 后端

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# 编辑 .env：至少配置 WECHAT_APPID / WECHAT_SECRET 才能真机登录；本地可仅开 DEV_PAYMENT_STUB=true
$env:DEV_PAYMENT_STUB="true"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

- 健康检查：<http://127.0.0.1:5000/health>
- 启动时会自动建表；若「里程碑」表为空，会导入 `fixtures/seed_bundle.json`。
- 旧版 `tea_data.db` 若结构冲突，可备份后删除再启动以全量重建（生产请用迁移方案）。

### 小程序

1. 用微信开发者工具打开 `miniprogram` 上级目录（含 `project.config.json` 的根）。
2. 编辑 `miniprogram/envList.js`：将 `cloudApiBaseUrl` 设为后端地址，例如本地调试：

   ```javascript
   const cloudApiBaseUrl = "http://127.0.0.1:5000";
   ```

3. 真机预览时，手机访问电脑局域网 IP 需在开发者工具中打开「不校验合法域名」，上线前必须改为 **HTTPS 备案域名** 并在公众平台配置白名单（见下文）。

4. `app.js` 中 `traceTokenSecret` 须与后端 `.env` 的 `TRACE_TOKEN_SECRET` **一致**，否则溯源码校验失败。

## 小程序配置与测试流程

1. **服务器域名**（微信公众平台 → 开发 → 开发设置）：  
   - request：`https://你的API域名`  
   - 若使用本地上传接口 `uploadFile`：同样添加该域名。
2. **TLS**：必须使用有效 HTTPS 证书（如 Let’s Encrypt）。
3. **测试建议**：  
   - 开发者工具：接口域指向测试环境，勾选不校验域名做联调。  
   - 体验版：关闭不校验，验证白名单与证书。  
   - 支付：开发桩仅用于流程联调；真实支付需商户号 + V3 密钥与证书（见 `backend/app/routers/pay.py` 说明）。

## 主要 API 一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/auth/wechat` | `code` 换 JWT + openid |
| GET | `/api/auth/me` | 当前用户（需 Bearer） |
| GET | `/public-benefit/milestones` | 公益总览（积分与登录关联） |
| GET | `/public-benefit/records/{id}` | 捐赠执行记录 |
| POST | `/points/redeem` | 积分兑换（需 Bearer） |
| GET | `/red-trace/garden/{id}` | 红色溯源茶园档案 |
| GET | `/red-trace/study/spots` `/routes` | 研学点 / 路线 |
| POST | `/api/red-study/booking` | 研学预约（需 Bearer） |
| GET | `/garden/season-timeline/{gardenId}` | 茶树季节孪生 |
| POST | `/api/trace/verify` | 服务端校验溯源 token |
| GET | `/api/home/overview` | 首页 CMS 数据 |
| GET | `/api/mall/products` | 商城列表 |
| GET | `/api/mall/products/{id}` | 商品详情 |
| GET | `/api/adopt/gardens` 等 | 认养列表 / 详情 / 套餐 |
| POST | `/pay/unified` | 统一下单（需 Bearer；生产接微信支付） |
| `/api/community/*` | 茶友社区（与原 Flask 路径兼容） |

完整 OpenAPI：启动后访问 `/docs`。

## 架构说明（后端）

- **认证**：小程序 `wx.login` → `jscode2session` → 签发 **JWT**，后续请求头 `Authorization: Bearer <token>`；社区接口同时兼容 `X-Openid`。
- **数据**：SQLAlchemy ORM，种子数据来自 JSON，便于替换为管理后台。
- **日志**：标准 logging；未捕获异常返回 500 JSON。
- **上传**：`POST /api/community/upload`，静态文件由 `/uploads` 提供；生产请配置 `PUBLIC_BASE_URL`。

## 附录：原项目中的 Mock / 死代码识别摘要

| 区域 | 原状 | 现状 |
|------|------|------|
| `utils/publicBenefitApi.js` | 本地 `MOCK_OVERVIEW` / `MOCK_RECORDS` | 已删除，全部走 HTTP |
| `utils/redTraceApi.js` | 失败回落 `redTraceMockData` | 已改为仅请求后端 |
| `utils/redTraceMockData.js` | 茶园 / 研学静态数据 | **保留文件**供参考，页面不再引用 |
| `utils/seasonTwinMock.js` | 季节孪生 | **保留**；认养页已优先请求 `/garden/season-timeline/...` |
| `pages/home` `mall` `adopt-*` 等 | 页内硬编码列表 | 已改为 `utils/catalogApi.js` |
| `pages/adopt-order` | 本地 `ORDER_MOCK` | 已改为 `catalogApi` + `/pay/unified` |
| `app.js` 默认 `127.0.0.1:5000` | 与 Flask 端口一致 | 仍默认 5000，与 uvicorn 示例一致 |
| `pages/example` | 云开发示例 | **未改**；若不上线可从 `app.json` 移除 |

## 许可与声明

示例代码仅供学习与二次开发；生产环境请自行完成等保、内容审核、支付合规与用户协议。
