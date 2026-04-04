/**
 * 红色故事富媒体页：图文 + 音频 + 短视频（URL 由后台下发）。
 */
const api = require("../../../utils/redTraceApi");
const analytics = require("../../../utils/analytics");

Page({
  data: {
    story: null,
    loadError: ""
  },

  onLoad(options) {
    this.shareGardenId = (options && options.gardenId) || "1";
    const gardenId = this.shareGardenId;
    wx.showLoading({ title: "加载中" });
    api
      .fetchGardenRedProfile(gardenId)
      .then((profile) => {
        const story = profile && profile.richStory ? profile.richStory : null;
        this.setData({ story, loadError: story ? "" : "暂无故事内容" });
        if (story) {
          const t = story.title;
          wx.setNavigationBarTitle({ title: t.length > 14 ? `${t.slice(0, 14)}…` : t });
          analytics.track(analytics.EVENTS.RED_STORY_VIEW, { gardenId });
        }
      })
      .catch(() => {
        this.setData({ story: null, loadError: "加载失败" });
        wx.showToast({ title: "网络异常", icon: "none" });
      })
      .finally(() => wx.hideLoading());
  },

  onShareAppMessage() {
    return {
      title: "红色茶源多媒体故事",
      path: `/pages/red-trace/story-rich/index?gardenId=${this.shareGardenId}`
    };
  }
});
