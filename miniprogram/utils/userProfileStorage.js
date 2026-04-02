/**
 * 用户资料（登录/注册/完善信息）本地存储版
 * - 生产建议：改为服务端用户体系 + token，这里用于可运行演示与页面联调
 */

const KEY = "tea_user_profile_v1";

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

/**
 * profile 字段设计：
 * {
 *   userId: string,
 *   role: "farmer" | "customer",
 *   phone: string,
 *   nickname: string,
 *   avatarUrl: string, // 演示：本地临时路径；生产：云存储 https
 *   address: {
 *     region: [province, city, district],
 *     detail: string
 *   },
 *   createdAt: number,
 *   updatedAt: number
 * }
 */
function getProfile() {
  const p = safeGet(KEY, null);
  return p && typeof p === "object" ? p : null;
}

function setProfile(profile) {
  safeSet(KEY, profile);
}

function isProfileComplete(p) {
  if (!p) return false;
  if (p.role !== "farmer" && p.role !== "customer") return false;
  if (!/^1[3-9]\d{9}$/.test(String(p.phone || ""))) return false;
  if (!String(p.nickname || "").trim()) return false;
  if (!String(p.avatarUrl || "").trim()) return false;
  const region = p.address && p.address.region;
  if (!Array.isArray(region) || region.length !== 3 || region.some((x) => !String(x || "").trim())) return false;
  if (!String(p.address && p.address.detail ? p.address.detail : "").trim()) return false;
  return true;
}

function getMissingFields(p) {
  const missing = [];
  if (!p || typeof p !== "object") {
    return ["手机号", "昵称", "头像", "省市区", "详细地址", "身份"];
  }
  if (!/^1[3-9]\d{9}$/.test(String(p.phone || ""))) missing.push("手机号");
  if (!String(p.nickname || "").trim()) missing.push("昵称");
  if (!String(p.avatarUrl || "").trim()) missing.push("头像");
  if (p.role !== "farmer" && p.role !== "customer") missing.push("身份");
  const region = p.address && p.address.region;
  if (!Array.isArray(region) || region.length !== 3 || region.some((x) => !String(x || "").trim())) missing.push("省市区");
  if (!String(p.address && p.address.detail ? p.address.detail : "").trim()) missing.push("详细地址");
  return missing;
}

function ensureProfileBase() {
  let p = getProfile();
  if (!p) {
    p = {
      userId: `u_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      role: "customer",
      phone: "",
      nickname: "",
      avatarUrl: "",
      address: { region: ["", "", ""], detail: "" },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setProfile(p);
  }
  return p;
}

module.exports = {
  getProfile,
  setProfile,
  ensureProfileBase,
  isProfileComplete,
  getMissingFields
};

