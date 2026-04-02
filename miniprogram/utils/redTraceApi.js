/**
 * 红色溯源后台接口预留层：统一封装 wx.request，便于替换为真实域名与鉴权。
 * 当前默认返回 null，由页面降级使用 redTraceMockData。
 */

const mock = require("./redTraceMockData");

/**
 * @param {string} gardenId
 * @returns {Promise<object|null>}
 */
function fetchGardenRedProfile(gardenId) {
  const app = getApp();
  const base = (app && app.globalData && app.globalData.apiBaseUrl) || "";
  if (!base || base.indexOf("your-api") >= 0) {
    return Promise.resolve(mock.getGardenProfile(gardenId));
  }
  return new Promise((resolve) => {
    wx.request({
      url: `${base}/red-trace/garden/${encodeURIComponent(gardenId)}`,
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data) resolve(res.data);
        else resolve(mock.getGardenProfile(gardenId));
      },
      fail: () => resolve(mock.getGardenProfile(gardenId))
    });
  });
}

/**
 * 管理员更新红色故事（预留）
 */
function adminUpdateStory(payload) {
  console.log("[redTraceApi] adminUpdateStory 预留", mock.ADMIN_API_STUB.stories, payload);
}

module.exports = {
  fetchGardenRedProfile,
  adminUpdateStory,
  ADMIN_API_STUB: mock.ADMIN_API_STUB
};
