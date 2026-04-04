#!/usr/bin/env bash
# Ubuntu 22.04+：一键安装 MySQL、创建库 mall 用户、导入建表 SQL
# 用法：sudo bash scripts/setup_mysql_ubuntu.sh
# 可通过环境变量覆盖： MALL_DB=tea_mall MALL_USER=tea MALL_PASS='强密码'

set -euo pipefail

MALL_DB="${MALL_DB:-tea_mall}"
MALL_USER="${MALL_USER:-tea}"
MALL_PASS="${MALL_PASS:-TeaMall$(openssl rand -hex 4)}"
ROOT_SQL="$(cd "$(dirname "$0")/.." && pwd)/sql/schema.sql"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "请使用 root 运行: sudo bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y mysql-server

systemctl enable --now mysql

mysql --protocol=socket -uroot <<EOF
CREATE DATABASE IF NOT EXISTS \`${MALL_DB}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${MALL_USER}'@'localhost' IDENTIFIED BY '${MALL_PASS}';
GRANT ALL PRIVILEGES ON \`${MALL_DB}\`.* TO '${MALL_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

mysql --protocol=socket -uroot "${MALL_DB}" < "${ROOT_SQL}"

echo "==== 完成 ===="
echo "数据库: ${MALL_DB}"
echo "用户: ${MALL_USER}"
echo "密码: ${MALL_PASS}"
echo ""
echo "请将 backend/mall_api/.env 中 DATABASE_URL 设为："
echo "mysql+pymysql://${MALL_USER}:${MALL_PASS}@127.0.0.1:3306/${MALL_DB}?charset=utf8mb4"
