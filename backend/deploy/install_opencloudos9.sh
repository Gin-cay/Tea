#!/usr/bin/env bash
#
# 腾讯云轻量 OpenCloudOS 9：一键安装 Python 虚拟环境、MariaDB（MySQL 兼容）、Nginx、Certbot HTTPS
#
# 用法（在服务器上 root 执行）：
#   export DOMAIN=api.example.com
#   export EMAIL=admin@example.com          # Let's Encrypt 邮箱
#   export MYSQL_ROOT_PASSWORD='...'        # MariaDB root 密码
#   export MYSQL_TEA_PASSWORD='...'         # 业务库 tea 用户密码
#   export APP_ROOT=/opt/tea-backend        # 可选，默认 /opt/tea-backend
#   bash install_opencloudos9.sh
#
# 前置：已将本仓库 backend 目录内容上传到 $APP_ROOT（该目录下须有 app/ 与 requirements.txt）

set -euo pipefail

DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-}"
MYSQL_TEA_PASSWORD="${MYSQL_TEA_PASSWORD:-}"
APP_ROOT="${APP_ROOT:-/opt/tea-backend}"

if [[ -z "$DOMAIN" || -z "$EMAIL" || -z "$MYSQL_ROOT_PASSWORD" || -z "$MYSQL_TEA_PASSWORD" ]]; then
  echo "请设置环境变量: DOMAIN EMAIL MYSQL_ROOT_PASSWORD MYSQL_TEA_PASSWORD"
  exit 1
fi

if [[ ! -f "$APP_ROOT/app/main.py" ]]; then
  echo "未找到 $APP_ROOT/app/main.py，请先将 backend 代码上传到 $APP_ROOT"
  exit 1
fi

echo ">>> 安装系统包..."
dnf update -y
dnf install -y python3 python3-pip mariadb-server mariadb nginx certbot python3-certbot-nginx firewalld curl

echo ">>> 启动 MariaDB / Nginx / 防火墙..."
systemctl enable --now mariadb
systemctl enable --now nginx
systemctl enable --now firewalld || true
firewall-cmd --permanent --add-service=http 2>/dev/null || true
firewall-cmd --permanent --add-service=https 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true

echo ">>> 配置数据库 tea 用户..."
mysql --protocol=socket -u root <<-SQL
ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';
FLUSH PRIVILEGES;
SQL

mysql --protocol=socket -u root -p"${MYSQL_ROOT_PASSWORD}" <<-SQL
CREATE DATABASE IF NOT EXISTS tea DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'tea'@'localhost' IDENTIFIED BY '${MYSQL_TEA_PASSWORD}';
GRANT ALL PRIVILEGES ON tea.* TO 'tea'@'localhost';
FLUSH PRIVILEGES;
SQL

echo ">>> Python 虚拟环境与依赖..."
python3 -m venv "${APP_ROOT}/venv"
# shellcheck source=/dev/null
source "${APP_ROOT}/venv/bin/activate"
pip install --upgrade pip
pip install -r "${APP_ROOT}/requirements.txt"

ENV_FILE="${APP_ROOT}/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo ">>> 生成 $ENV_FILE 模板（请务必编辑 jwt_secret / wechat_* / public_base_url）"
  cat >"$ENV_FILE" <<EOF
database_url=mysql+pymysql://tea:${MYSQL_TEA_PASSWORD}@127.0.0.1:3306/tea?charset=utf8mb4
jwt_secret=$(openssl rand -hex 32)
trace_token_secret=$(openssl rand -hex 16)
public_base_url=https://${DOMAIN}
wechat_appid=
wechat_secret=
admin_token=
EOF
fi

NGX_CONF="/etc/nginx/conf.d/tea-api.conf"
echo ">>> 写入 Nginx 配置 $NGX_CONF"
sed "s/YOUR_DOMAIN/${DOMAIN}/g" "${APP_ROOT}/deploy/nginx-tea-api.conf.template" >"$NGX_CONF"
nginx -t
systemctl reload nginx

echo ">>> 申请 HTTPS 证书（Let's Encrypt）..."
certbot --nginx --non-interactive --agree-tos -m "$EMAIL" -d "$DOMAIN" --redirect

echo ">>> systemd 服务 tea-api"
cp "${APP_ROOT}/deploy/tea-api.service" /etc/systemd/system/tea-api.service
systemctl daemon-reload
systemctl enable --now tea-api

echo ">>> 完成。健康检查: curl -sS https://${DOMAIN}/health"
echo "小程序 request 合法域名请配置: https://${DOMAIN}"
echo "勿忘：在微信公众平台配置 AppID/AppSecret，并编辑 $ENV_FILE"
