/**
 * 「我的」相关页：登录态（JWT）与静默登录，失败则引导完善资料
 */
const http = require("./http");
const auth = require("./auth");

/**
 * @returns {Promise<boolean>}
 */
function ensureLoggedIn() {
  if (http.getStoredToken()) return Promise.resolve(true);
  return auth.silentLogin().then(
    () => !!http.getStoredToken(),
    () => false
  );
}

/**
 * 需要登录时调用：成功返回 true；失败弹窗并可选跳转资料页
 * @param {{ redirect?: string }} [opts]
 * @returns {Promise<boolean>}
 */
async function requireLoginForMine(opts) {
  const ok = await ensureLoggedIn();
  if (ok) return true;
  const redirect = (opts && opts.redirect) || "tab:mine";
  wx.showModal({
    title: "需要登录",
    content: "请先完成微信登录与资料（手机号等），再使用该功能。",
    confirmText: "去完善",
    cancelText: "取消",
    success: (res) => {
      if (res.confirm) {
        wx.navigateTo({
          url: `/pages/auth/profile/index?redirect=${encodeURIComponent(redirect)}`
        });
      }
    }
  });
  return false;
}

module.exports = {
  ensureLoggedIn,
  requireLoginForMine
};
