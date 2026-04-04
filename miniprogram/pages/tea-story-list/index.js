const catalogApi = require("../../utils/catalogApi");

Page({
  data: {
    list: [],
    loadError: ""
  },

  onLoad() {
    this.loadList();
  },

  async loadList() {
    try {
      const res = await catalogApi.fetchStoryList("tea");
      this.setData({ list: (res && res.list) || [], loadError: "" });
    } catch (e) {
      this.setData({ list: [], loadError: "加载失败" });
    }
  },

  goDetail(e) {
    const { type, id } = e.currentTarget.dataset;
    if (!type || !id) return;
    wx.navigateTo({
      url: `/pages/story-detail/index?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
    });
  }
});
