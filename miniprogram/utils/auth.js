/**
 * 微信登录 + 后端 JWT（/api/auth/wechat）
 */

const http = require("./http");

/**
 * 静默登录：换取 token 存本地，失败不抛 UI（由页面决定是否提示）
 */
function silentLogin() {
  const base = http.getBaseUrl();
  if (!base) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (!res.code) {
          reject(new Error("wx.login 无 code"));
          return;
        }
        http
          .request({
            path: "/api/auth/wechat",
            method: "POST",
            data: { code: res.code },
            needAuth: false,
            retries: 1,
            showLoading: false,
            showError: false
          })
          .then((body) => {
            if (body && body.token) {
              http.setStoredToken(body.token);
              resolve(body);
            } else {
              reject(new Error("登录响应无 token"));
            }
          })
          .catch(reject);
      },
      fail: reject
    });
  });
}

function logout() {
  http.setStoredToken("");
}

module.exports = {
  silentLogin,
  logout
};
