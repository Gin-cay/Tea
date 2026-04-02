const { envList, cloudApiBaseUrl } = require("./envList");

const resolvedApiBaseUrl =
  cloudApiBaseUrl && String(cloudApiBaseUrl).trim().length > 0
    ? String(cloudApiBaseUrl).trim().replace(/\/$/, "")
    : "http://127.0.0.1:5000";

App({
  onLaunch() {
    if (envList && envList.length > 0 && envList[0].envId) {
      wx.cloud.init({
        env: envList[0].envId,
        traceUser: true
      });
    }
  },
  /**
   * 检查资料是否完整（不直接跳转）
   */
  getProfileGateState() {
    const storage = require("./utils/userProfileStorage");
    const p = storage.getProfile();
    const complete = storage.isProfileComplete(p);
    const missing = storage.getMissingFields(p);
    return { complete, missing, profile: p };
  },

  /**
   * 仅在关键动作（如下单/支付）时强制完善资料：
   * - incomplete -> 跳转完善页
   * - complete   -> 返回 true
   */
  ensureProfileBeforePay(options = {}) {
    const state = this.getProfileGateState();
    if (state && state.complete) return true;

    const redirect = options.redirect || "";
    const returnUrl = options.returnUrl || ""; // 支付页回跳（可带参数）
    wx.navigateTo({
      url: `/pages/auth/profile/index?redirect=${encodeURIComponent(
        redirect
      )}&returnUrl=${encodeURIComponent(returnUrl)}`
    });
    return false;
  },
  globalData: {
    userInfo: null,
    sessionStorageKey: "tea_adopt_user",
    apiBaseUrl: resolvedApiBaseUrl,
    /** 溯源令牌签名密钥：务必改为服务端保管，与验签接口一致 */
    traceTokenSecret: "TEA_RED_TRACE_DEV_SECRET_REPLACE"
  }
});
