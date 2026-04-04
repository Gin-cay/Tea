USE `tea_mall`;

INSERT INTO mall_categories (id, parent_id, name, sort_order, status) VALUES
(1, NULL, '绿茶', 10, 1),
(2, NULL, '红茶', 20, 1),
(3, NULL, '礼盒', 30, 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO mall_products (id, category_id, name, subtitle, cover_url, gallery_json, price_fen, original_price_fen, stock, sales, detail_html, red_selling_tag, status) VALUES
(1, 1, '明前龙井 250g', '浙西共富茶园', '/images/banner-home.png', '["/images/banner-home.png"]', 12800, 15800, 999, 321, '<p>明前采摘，清香回甘。</p>', '一品一码·红色溯源', 1),
(2, 2, '正山小种', '武夷产区', '/images/ai_example1.png', '["/images/ai_example1.png"]', 9600, NULL, 500, 210, '<p>红茶醇厚。</p>', '红色茶路赋能', 1),
(3, 3, '春茶礼盒', '多产地拼配', '/images/banner-mall.png', '["/images/banner-mall.png"]', 19800, 22800, 200, 125, '<p>礼盒装。</p>', '附研学打卡指引', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO mall_product_trace (product_id, batch_no, garden_id, garden_name, cert_no, trace_chain_json, verify_hint) VALUES
(1, '', 'G-001', '半亩塘·益龙芳茶园', 'SC-DEMO-001', '[{"title":"种植","desc":"有机肥管护"},{"title":"采摘","desc":"明前一芽一叶"}]', '微信小程序扫码验证')
ON DUPLICATE KEY UPDATE garden_name=VALUES(garden_name);
