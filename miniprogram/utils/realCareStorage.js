/**
 * 实时照看（演示版本地存储）
 * - 生产建议：把图片上传到「云存储/对象存储」，这里只用本地 storage + 临时路径做可运行演示
 */

const KEY_CARE_FEED = "real_care_feed_v1";
const KEY_USER_ROLE = "real_care_user_role_v1"; // "farmer" | "customer"
const KEY_USER_ID = "real_care_user_id_v1";
const KEY_ADOPT_TREE_IDS = "real_care_adopt_tree_ids_v1"; // 顾客已认养茶树编号数组

function safeGet(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    return v === undefined || v === "" ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    // ignore
  }
}

function ensureUserContext() {
  // 角色：默认顾客（茶农端可在调试时手动写 storage 改成 farmer）
  const role = safeGet(KEY_USER_ROLE, "customer");
  safeSet(KEY_USER_ROLE, role);

  // 用户 id（演示）：不存在则生成一个轻量随机值
  let uid = safeGet(KEY_USER_ID, "");
  if (!uid) {
    uid = `u_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    safeSet(KEY_USER_ID, uid);
  }

  // 顾客认养茶树编号（演示默认 1 棵）
  let treeIds = safeGet(KEY_ADOPT_TREE_IDS, []);
  if (!Array.isArray(treeIds) || treeIds.length === 0) {
    treeIds = ["TREE-001"];
    safeSet(KEY_ADOPT_TREE_IDS, treeIds);
  }

  return { role, uid, treeIds };
}

/**
 * 数据结构（每条照片记录一条 item，便于时间线与网格展示）：
 * {
 *   id: string,
 *   treeId: string,
 *   uploaderId: string,
 *   uploaderRole: "farmer" | "customer",
 *   imageUrl: string,          // 演示：本地临时路径；生产：云存储 https url
 *   diary: string,             // 茶农日记/养护笔记
 *   takenAt: number            // 毫秒时间戳
 * }
 */
function listAll() {
  const arr = safeGet(KEY_CARE_FEED, []);
  return Array.isArray(arr) ? arr : [];
}

function listByTreeId(treeId) {
  return listAll()
    .filter((x) => x && x.treeId === treeId)
    .sort((a, b) => (b.takenAt || 0) - (a.takenAt || 0));
}

function appendItems(items) {
  const current = listAll();
  const next = current.concat(items || []);
  // 简单限量，避免 storage 过大（演示保留最近 300 条）
  safeSet(KEY_CARE_FEED, next.slice(-300));
}

module.exports = {
  ensureUserContext,
  listByTreeId,
  appendItems
};

