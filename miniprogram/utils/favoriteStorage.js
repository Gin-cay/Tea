/**
 * 商城商品收藏（本地持久化，无后端表时可用；后续可对接服务端收藏接口）
 */
const KEY = "tea_mall_favorites_v1";

function _read() {
  try {
    const raw = wx.getStorageSync(KEY);
    if (!raw) return [];
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function _write(arr) {
  try {
    wx.setStorageSync(KEY, arr);
  } catch (e) {
    /* ignore */
  }
}

/** @returns {number[]} 商品 id 列表，新在前 */
function getFavoriteProductIds() {
  return _read()
    .filter((x) => x && x.id != null)
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .map((x) => Number(x.id));
}

function isFavorite(productId) {
  const id = Number(productId);
  return _read().some((x) => Number(x.id) === id);
}

function addFavorite(productId) {
  const id = Number(productId);
  if (!id) return;
  const list = _read().filter((x) => Number(x.id) !== id);
  list.unshift({ id, ts: Date.now() });
  _write(list.slice(0, 200));
}

function removeFavorite(productId) {
  const id = Number(productId);
  _write(_read().filter((x) => Number(x.id) !== id));
}

function toggleFavorite(productId) {
  if (isFavorite(productId)) {
    removeFavorite(productId);
    return false;
  }
  addFavorite(productId);
  return true;
}

module.exports = {
  getFavoriteProductIds,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite
};
