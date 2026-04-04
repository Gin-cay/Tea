# 腾讯云轻量应用服务器部署指南（Linux）

本文面向「茶叶助农」FastAPI 后端 + Nginx 反向代理 + HTTPS，可与微信小程序合法域名配合使用。

## 1. 服务器准备

- 系统：Ubuntu 22.04 / CentOS 7+ 等常见 Linux。
- 在腾讯云控制台 → **轻量应用服务器** → **防火墙 / 安全组**：放行 **22**（SSH）、**80**（HTTP）、**443**（HTTPS）。数据库若仅本机访问可不对外开放 3306。

## 2. 安装运行环境

### 2.1 系统依赖

```bash
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3-pip nginx certbot python3-certbot-nginx git
```

（CentOS 请用 `yum`/`dnf` 安装对应包。）

### 2.2 MySQL（可选，生产推荐）

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

创建库与用户：

```sql
CREATE DATABASE tea DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tea'@'localhost' IDENTIFIED BY '强密码';
GRANT ALL ON tea.* TO 'tea'@'localhost';
FLUSH PRIVILEGES;
```

后端连接串示例：

```text
DATABASE_URL=mysql+pymysql://tea:强密码@127.0.0.1:3306/tea?charset=utf8mb4
```

首次部署后启动服务会自动 `create_all` 并写入种子数据（若里程碑表为空）。

## 3. 部署项目代码

```bash
cd /opt
sudo git clone <你的仓库地址> tea-assist
cd tea-assist/backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
nano .env   # 填写 WECHAT_APPID、WECHAT_SECRET、JWT_SECRET、DATABASE_URL 等
```

### 3.1 systemd 服务（自动启动 / 崩溃重启）

`/etc/systemd/system/tea-api.service`：

```ini
[Unit]
Description=Tea Assist FastAPI
After=network.target mysql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/tea-assist/backend
EnvironmentFile=/opt/tea-assist/backend/.env
ExecStart=/opt/tea-assist/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tea-api
sudo systemctl status tea-api
```

> 生产环境请将 `DEV_PAYMENT_STUB` 设为 `false`，并接入微信支付 V3；开发联调可临时 `true`。

## 4. Nginx 反向代理

`/etc/nginx/sites-available/tea-api`：

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /opt/tea-assist/backend/uploads/;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tea-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 5. 域名解析

在域名 DNS 处添加 **A 记录**：`api.yourdomain.com` → 服务器公网 IP。等待解析生效后再申请证书。

## 6. HTTPS（Let’s Encrypt）

```bash
sudo certbot --nginx -d api.yourdomain.com
```

按提示完成验证；certbot 会自动写入 SSL 配置并续期任务。

## 7. 小程序「合法域名」

1. 登录 [微信公众平台](https://mp.weixin.qq.com) → 开发 → 开发管理 → 开发设置 → **服务器域名**。
2. **request 合法域名**：`https://api.yourdomain.com`（与证书域名一致，勿带路径）。
3. **uploadFile / downloadFile** 若使用本域上传图片，同样配置该域名。
4. 保存后重新编译小程序；开发者工具可勾选「不校验合法域名」做本地调试。

## 8. 安全建议

- `.env` 权限：`chmod 600 .env`，勿提交 Git。
- 定期 `apt upgrade`，仅开放必要端口。
- 生产 `JWT_SECRET`、`TRACE_TOKEN_SECRET` 使用高强度随机值，并与小程序 `traceTokenSecret` 对齐。
- 社区、上传接口可再加频率限制（Nginx `limit_req` 或云 WAF）。

## 9. 日志与维护

```bash
journalctl -u tea-api -f
sudo tail -f /var/log/nginx/access.log
```

更新代码后：

```bash
cd /opt/tea-assist && sudo git pull
sudo systemctl restart tea-api
```

数据库备份（MySQL 示例）：

```bash
mysqldump -u tea -p tea > tea_backup_$(date +%F).sql
```
