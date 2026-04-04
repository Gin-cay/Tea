const catalogApi = require("../../utils/catalogApi");

Page({
  data: {
    categories: [
      "全部",
      "半亩塘茶园（益龙芳）认养系列",
      "云雾山有机茶园认养",
      "龙井原产地共富专区"
    ],
    activeCategory: "全部",
    sorts: ["综合", "销量", "距离", "人气"],
    activeSort: "综合",
    list: [],
    loadError: ""
  },

  onLoad() {
    this.loadList();
  },

  async loadList() {
    wx.showLoading({ title: "加载中" });
    this.setData({ loadError: "" });
    try {
      const list = await catalogApi.fetchAdoptGardens();
      this.setData({ list: list || [] });
    } catch (e) {
      this.setData({ loadError: "认养列表加载失败" });
      wx.showToast({ title: "网络异常", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  onTapCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.name });
  },

  onTapSort(e) {
    this.setData({ activeSort: e.currentTarget.dataset.name });
  },

  onTapEnroll(e) {
    const id = e.currentTarget.dataset.id;
    if (id == null || id === "") return;
    wx.navigateTo({
      url: `/pages/adopt-detail/adopt-detail?id=${id}`
    });
  }
});
