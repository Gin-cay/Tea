/**
 * 红色溯源 / 研学 本地持久化（演示用）。
 * 生产环境请改为云数据库 + openid 维度，与支付订单表关联。
 */

const KEYS = {
  RECORDS: "tea_red_trace_records",
  POINTS: "tea_red_study_points",
  CHECKINS: "tea_red_study_checkins",
  MEDALS: "tea_red_study_medals"
};

function readJson(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    return v != null && v !== "" ? v : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJson(key, val) {
  try {
    wx.setStorageSync(key, val);
    return true;
  } catch (e) {
    return false;
  }
}

/** @returns {Array<object>} */
function getTraceRecords() {
  const list = readJson(KEYS.RECORDS, []);
  return Array.isArray(list) ? list : [];
}

/** @param {object} record */
function addTraceRecord(record) {
  const list = getTraceRecords();
  list.unshift(record);
  writeJson(KEYS.RECORDS, list);
  return list;
}

function getPoints() {
  const n = readJson(KEYS.POINTS, 0);
  return typeof n === "number" ? n : 0;
}

function addPoints(delta) {
  const next = getPoints() + delta;
  writeJson(KEYS.POINTS, next);
  return next;
}

/** @returns {boolean} 是否扣减成功 */
function spendPoints(amount) {
  const cur = getPoints();
  if (cur < amount) return false;
  writeJson(KEYS.POINTS, cur - amount);
  return true;
}

/** @returns {string[]} 已打卡景点 id */
function getCheckins() {
  const list = readJson(KEYS.CHECKINS, []);
  return Array.isArray(list) ? list : [];
}

/** @param {string} spotId */
function addCheckin(spotId) {
  const list = getCheckins();
  if (list.indexOf(spotId) >= 0) return list;
  list.push(spotId);
  writeJson(KEYS.CHECKINS, list);
  return list;
}

/** @returns {string[]} */
function getMedals() {
  const list = readJson(KEYS.MEDALS, []);
  return Array.isArray(list) ? list : [];
}

function unlockMedal(id) {
  const list = getMedals();
  if (list.indexOf(id) >= 0) return list;
  list.push(id);
  writeJson(KEYS.MEDALS, list);
  return list;
}

module.exports = {
  KEYS,
  getTraceRecords,
  addTraceRecord,
  getPoints,
  addPoints,
  spendPoints,
  getCheckins,
  addCheckin,
  getMedals,
  unlockMedal
};
