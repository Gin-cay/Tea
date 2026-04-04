-- 茶叶助农 · 商城 MySQL 建表脚本（utf8mb4）
-- 使用：mysql -u root -p < schema.sql  或 在 mysql 客户端 source 本文件

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `tea_mall` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tea_mall`;

-- ----------------------------
-- 用户表（微信 openid）
-- ----------------------------
DROP TABLE IF EXISTS `mall_users`;
CREATE TABLE `mall_users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `openid` VARCHAR(64) NOT NULL COMMENT '微信 openid',
  `unionid` VARCHAR(64) DEFAULT NULL COMMENT '微信 unionid',
  `nickname` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '昵称',
  `avatar_url` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '头像',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `gender` TINYINT DEFAULT NULL COMMENT '0未知1男2女',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`),
  KEY `idx_unionid` (`unionid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商城用户';

-- ----------------------------
-- 商品分类表
-- ----------------------------
DROP TABLE IF EXISTS `mall_categories`;
CREATE TABLE `mall_categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '父级分类，NULL为一级',
  `name` VARCHAR(64) NOT NULL COMMENT '分类名称',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序，越小越靠前',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1显示 0隐藏',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_status_sort` (`status`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品分类';

-- ----------------------------
-- 商品表
-- ----------------------------
DROP TABLE IF EXISTS `mall_products`;
CREATE TABLE `mall_products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` BIGINT UNSIGNED NOT NULL COMMENT '分类ID',
  `name` VARCHAR(200) NOT NULL COMMENT '商品名',
  `subtitle` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '副标题/卖点摘要',
  `cover_url` VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '封面图',
  `gallery_json` JSON DEFAULT NULL COMMENT '轮播图 URL 数组',
  `price_fen` INT NOT NULL DEFAULT 0 COMMENT '售价（分）',
  `original_price_fen` INT DEFAULT NULL COMMENT '划线价（分）',
  `stock` INT NOT NULL DEFAULT 0 COMMENT '库存',
  `sales` INT NOT NULL DEFAULT 0 COMMENT '销量',
  `detail_html` MEDIUMTEXT COMMENT '详情富文本',
  `red_selling_tag` VARCHAR(200) DEFAULT NULL COMMENT '红色溯源营销文案',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1上架 0下架',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category_status` (`category_id`, `status`),
  KEY `idx_status_sales` (`status`, `sales`),
  KEY `idx_name` (`name`),
  CONSTRAINT `fk_product_category` FOREIGN KEY (`category_id`) REFERENCES `mall_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品';

-- ----------------------------
-- 溯源表（一品一码 / 批次维度）
-- ----------------------------
DROP TABLE IF EXISTS `mall_product_trace`;
CREATE TABLE `mall_product_trace` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '商品ID',
  `batch_no` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '批次号，空字符串表示默认档',
  `garden_id` VARCHAR(64) DEFAULT NULL COMMENT '茶园/基地编号',
  `garden_name` VARCHAR(200) DEFAULT NULL COMMENT '茶园名称',
  `cert_no` VARCHAR(128) DEFAULT NULL COMMENT '检测或认证编号',
  `trace_chain_json` JSON DEFAULT NULL COMMENT '溯源环节：[{title,desc,time,media}]',
  `verify_hint` VARCHAR(512) DEFAULT NULL COMMENT '扫码验真说明',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_batch` (`product_id`, `batch_no`),
  KEY `idx_garden` (`garden_id`),
  CONSTRAINT `fk_trace_product` FOREIGN KEY (`product_id`) REFERENCES `mall_products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品溯源';

-- ----------------------------
-- 购物车
-- ----------------------------
DROP TABLE IF EXISTS `mall_cart_items`;
CREATE TABLE `mall_cart_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1 COMMENT '数量',
  `selected` TINYINT NOT NULL DEFAULT 1 COMMENT '1选中结算 0否',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_product` (`user_id`, `product_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `mall_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cart_product` FOREIGN KEY (`product_id`) REFERENCES `mall_products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='购物车';

-- ----------------------------
-- 订单主表
-- ----------------------------
DROP TABLE IF EXISTS `mall_order_items`;
DROP TABLE IF EXISTS `mall_orders`;
CREATE TABLE `mall_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no` VARCHAR(32) NOT NULL COMMENT '业务订单号',
  `user_id` BIGINT UNSIGNED NOT NULL,
  `total_amount_fen` INT NOT NULL DEFAULT 0 COMMENT '商品合计（分）',
  `freight_fen` INT NOT NULL DEFAULT 0 COMMENT '运费（分）',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending_pay' COMMENT 'pending_pay/paid/shipped/completed/cancelled',
  `receiver_name` VARCHAR(64) NOT NULL DEFAULT '',
  `receiver_phone` VARCHAR(20) NOT NULL DEFAULT '',
  `province` VARCHAR(32) NOT NULL DEFAULT '',
  `city` VARCHAR(32) NOT NULL DEFAULT '',
  `district` VARCHAR(32) NOT NULL DEFAULT '',
  `address` VARCHAR(255) NOT NULL DEFAULT '',
  `remark` VARCHAR(500) DEFAULT NULL,
  `pay_time` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user_created` (`user_id`, `created_at`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_order_user` FOREIGN KEY (`user_id`) REFERENCES `mall_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单';

-- ----------------------------
-- 订单明细
-- ----------------------------
CREATE TABLE `mall_order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL COMMENT '下单时商品ID快照',
  `product_name` VARCHAR(200) NOT NULL,
  `cover_url` VARCHAR(1024) NOT NULL DEFAULT '',
  `price_fen` INT NOT NULL COMMENT '成交单价（分）',
  `quantity` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  CONSTRAINT `fk_oi_order` FOREIGN KEY (`order_id`) REFERENCES `mall_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单明细';

SET FOREIGN_KEY_CHECKS = 1;

-- 可选演示数据（按需取消注释）
/*
INSERT INTO mall_categories (id, parent_id, name, sort_order, status) VALUES
(1, NULL, '绿茶', 10, 1),
(2, NULL, '红茶', 20, 1),
(3, NULL, '礼盒', 30, 1);

INSERT INTO mall_products (category_id, name, subtitle, cover_url, gallery_json, price_fen, original_price_fen, stock, sales, red_selling_tag, status)
VALUES
(1, '明前龙井 250g', '浙西共富茶园', '/images/banner-home.png', '["/images/banner-home.png"]', 12800, 15800, 999, 321, '一品一码·红色溯源', 1),
(2, '正山小种', '武夷产区', '/images/ai_example1.png', '["/images/ai_example1.png"]', 9600, NULL, 500, 210, '红色茶路赋能', 1),
(3, '春茶礼盒', '多产地拼配', '/images/banner-mall.png', '["/images/banner-mall.png"]', 19800, 22800, 200, 125, '附研学打卡指引', 1);

INSERT INTO mall_product_trace (product_id, batch_no, garden_id, garden_name, cert_no, trace_chain_json, verify_hint) VALUES
(1, '', 'G-001', '半亩塘·益龙芳茶园', 'SC-DEMO-001', '[{"title":"种植","desc":"有机肥管护"},{"title":"采摘","desc":"明前一芽一叶"}]', '微信扫码验证');
*/
