const { envList, cloudApiBaseUrl } = require("./envList");
const auth = require("./utils/auth");

const resolvedApiBaseUrl =
  cloudApiBaseUrl && String(cloudApiBaseUrl).trim().length > 0
    ? String(cloudApiBaseUrl).trim().replace(/\/$/, "")
    : "http://127.0.0.1:8000";

App({
  onLaunch() {
    if (envList && envList.length > 0 && envList[0].envId) {
      wx.cloud.init({
        env: envList[0].envId,
        traceUser: true
      });
    }
    auth.silentLogin().catch(() => {
      /* 未配置微信 AppSecret 时静默失败，公益页仍可浏览 */
    });
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
   * 仅在关键动作（如下单/支付）时强制完善资料
   */
  ensureProfileBeforePay(options = {}) {
    const state = this.getProfileGateState();
    if (state && state.complete) return true;

    const redirect = options.redirect || "";
    const returnUrl = options.returnUrl || "";
    wx.navigateTo({
      url: `/pages/auth/profile/index?redirect=${encodeURIComponent(
        redirect
      )}&returnUrl=${encodeURIComponent(returnUrl)}`
    });
    return false;
  },

  /**
   * 茶农端上传等场景：资料不完整则跳转完善页（与 ensureProfileBeforePay 行为一致）
   */
  ensureProfileOrRedirect(options = {}) {
    const state = this.getProfileGateState();
    if (state && state.complete) return true;
    const redirect = options.redirect || "";
    wx.navigateTo({
      url: `/pages/auth/profile/index?redirect=${encodeURIComponent(redirect)}`
    });
    return false;
  },
  globalData: {
    userInfo: null,
    sessionStorageKey: "tea_adopt_user",
    apiBaseUrl: resolvedApiBaseUrl,
    /** 须与后端环境变量 TRACE_TOKEN_SECRET 一致 */
    traceTokenSecret: "TEA_RED_TRACE_DEV_SECRET_REPLACE"
  }
});
