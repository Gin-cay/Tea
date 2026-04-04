-- 在服务器上以 root 执行一次（请修改密码）：
-- mysql -u root -p < deploy/mysql_init.sql

CREATE DATABASE IF NOT EXISTS tea
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- MySQL 8 / MariaDB 10.6+ 可使用 IF NOT EXISTS；旧版请手工删用户后执行
CREATE USER IF NOT EXISTS 'tea'@'localhost' IDENTIFIED BY '请改为强密码';
GRANT ALL PRIVILEGES ON tea.* TO 'tea'@'localhost';
FLUSH PRIVILEGES;

-- 业务表（users、milestones、shop_products 等）由 FastAPI 首次启动时
-- SQLAlchemy Base.metadata.create_all() 自动创建，无需手工导入整库 DDL。
