/**
 * 红色故事富媒体页：图文 + 音频 + 短视频（URL 由后台下发）。
 */
const mock = require("../../../utils/redTraceMockData");
const analytics = require("../../../utils/analytics");

Page({
  data: {
    story: null
  },

  onLoad(options) {
    /** @type {string} 分享路径携带 */
    this.shareGardenId = (options && options.gardenId) || "1";
    const gardenId = this.shareGardenId;
    const profile = mock.getGardenProfile(gardenId);
    const story = profile && profile.richStory ? profile.richStory : null;
    this.setData({ story });
    if (story) {
      const t = story.title;
      wx.setNavigationBarTitle({ title: t.length > 14 ? `${t.slice(0, 14)}…` : t });
      analytics.track(analytics.EVENTS.RED_STORY_VIEW, { gardenId });
    }
  },

  onShareAppMessage() {
    return {
      title: "红色茶源多媒体故事",
      path: `/pages/red-trace/story-rich/index?gardenId=${this.shareGardenId}`
    };
  }
});
