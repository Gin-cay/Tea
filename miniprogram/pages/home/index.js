const catalogApi = require("../../utils/catalogApi");

Page({
  data: {
    banners: [],
    categories: [],
    hotItems: [],
    gardens: [],
    teaStorySamples: [],
    redStorySamples: [],
    loadError: ""
  },

  onLoad() {
    this.loadHome();
  },

  async loadHome() {
    this.setData({ loadError: "" });
    try {
      const data = await catalogApi.fetchHomeOverview();
      this.setData({
        banners: data.banners || [],
        categories: data.categories || [],
        hotItems: data.hotItems || [],
        gardens: data.gardens || [],
        teaStorySamples: data.teaStorySamples || [],
        redStorySamples: data.redStorySamples || []
      });
    } catch (e) {
      this.setData({ loadError: "首页数据加载失败，请下拉重试" });
    }
  },

  onPullDownRefresh() {
    this.loadHome().finally(() => wx.stopPullDownRefresh());
  },

  goTeaStoryList() {
    wx.navigateTo({
      url: "/pages/tea-story-list/index"
    });
  },

  goRedTeaStoryList() {
    wx.navigateTo({
      url: "/pages/red-tea-story-list/index"
    });
  },

  goStoryDetail(e) {
    const { type, id } = e.currentTarget.dataset;
    if (!type || !id) return;
    wx.navigateTo({
      url: `/pages/story-detail/index?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
    });
  },

  goRedTraceHub() {
    wx.navigateTo({ url: "/pages/red-trace/hub/index" });
  }
});
