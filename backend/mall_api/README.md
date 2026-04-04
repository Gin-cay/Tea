# 茶叶助农 · 商城 FastAPI 后端

独立商城服务：商品、分类、搜索、溯源、微信登录、购物车、订单（MySQL）。

## 1. 数据库

建表脚本：`sql/schema.sql`（含 `tea_mall` 库与全部表）。

演示数据（可选）：`sql/seed_demo.sql`

```bash
# 本机已有 MySQL 时
mysql -u root -p < sql/schema.sql
mysql -u root -p < sql/seed_demo.sql
```

## 2. 配置

```bash
cp .env.example .env
# 编辑 DATABASE_URL、WECHAT_APPID、WECHAT_SECRET、JWT_SECRET
```

`DATABASE_URL` 示例：

`mysql+pymysql://tea:密码@127.0.0.1:3306/tea_mall?charset=utf8mb4`

## 3. 本地启动

**Windows**

```powershell
cd backend\mall_api
.\start.ps1
```

**Linux / macOS**

```bash
cd backend/mall_api
chmod +x start.sh && ./start.sh
```

**手动**

```bash
cd backend/mall_api
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8100
```

文档：<http://127.0.0.1:8100/docs>

## 4. 腾讯云轻量服务器部署（简要）

```bash
# 1) 上传代码到 /opt/tea-mall-api
# 2) 一键 MySQL（Ubuntu）
sudo bash scripts/setup_mysql_ubuntu.sh

# 3) 虚拟环境与依赖
cd /opt/tea-mall-api
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env && nano .env

# 4) systemd（示例）
sudo tee /etc/systemd/system/tea-mall-api.service <<'EOF'
[Unit]
Description=Tea Mall API
After=network.target mysql.service

[Service]
WorkingDirectory=/opt/tea-mall-api
EnvironmentFile=/opt/tea-mall-api/.env
ExecStart=/opt/tea-mall-api/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8100 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now tea-mall-api
```

Nginx 反代 `https://你的域名` → `127.0.0.1:8100`，并在小程序后台配置 **request 合法域名**。

## 5. API 一览（前缀 `/api/mall`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/categories` | 分类列表 |
| GET | `/products` | 商品列表 `?category_id=&keyword=&page=&page_size=` |
| GET | `/products/{id}` | 商品详情 |
| GET | `/products/{id}/trace` | 溯源 `?batch_no=` |
| POST | `/auth/wechat` | `{ "code": "wx.login" }` → JWT |
| GET/PATCH | `/users/me` | 用户信息（需 `Authorization: Bearer`） |
| GET | `/cart` | 购物车 |
| POST | `/cart/items` | 加入购物车 `{ "productId", "quantity" }` |
| PATCH | `/cart/items/{id}` | 修改数量/选中 |
| DELETE | `/cart/items/{id}` | 删除 |
| POST | `/orders` | 从**选中**购物车项下单 `{ receiverName, receiverPhone, address, fromCart: true }` |
| POST | `/orders/direct` | 直接传 `items: [{productId,quantity}]` |
| GET | `/orders` | 订单列表 |
| GET | `/orders/{orderNo}` | 订单详情 |

## 6. 一键安装 MySQL（复制执行）

Ubuntu / Debian（需 root）：

```bash
sudo bash -c 'apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server && systemctl enable --now mysql'
```

然后执行本仓库 `scripts/setup_mysql_ubuntu.sh` 完成建库、用户、导表。
