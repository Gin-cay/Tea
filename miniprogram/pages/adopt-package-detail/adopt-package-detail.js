const catalogApi = require("../../utils/catalogApi");

Page({
  data: {
    key: "",
    pkg: null,
    loadError: ""
  },

  onLoad(options) {
    const key = options.key ? String(options.key) : "";
    this.setData({ key });
    if (!key) {
      this.setData({ loadError: "缺少套餐 key" });
      return;
    }
    this.loadPackage(key);
  },

  async loadPackage(key) {
    try {
      const remote = await catalogApi.fetchAdoptPackageDetail(key);
      const pkg = Object.assign({}, remote, { key: remote.packageKey || key });
      this.setData({ pkg, loadError: "" });
    } catch (e) {
      this.setData({ pkg: null, loadError: "套餐加载失败" });
    }
  },

  onTapAdopt() {
    const key = this.data.key;
    if (!key) return;
    wx.navigateTo({
      url: `/pages/adopt-order/adopt-order?mode=package&packageId=${key}`
    });
  }
});
