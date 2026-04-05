/**
 * 我的收藏：基于本地收藏 id 列表，拉取商城商品详情展示
 */
const catalogApi = require("../../utils/catalogApi");
const favoriteStorage = require("../../utils/favoriteStorage");
const mineAuth = require("../../utils/mineAuth");

Page({
  data: {
    list: [],
    loadError: ""
  },

  onShow() {
    this.load();
  },

  async load() {
    if (!(await mineAuth.requireLoginForMine({ redirect: "tab:mine" }))) {
      this.setData({ list: [], loadError: "" });
      return;
    }
    const ids = favoriteStorage.getFavoriteProductIds();
    if (!ids.length) {
      this.setData({ list: [], loadError: "" });
      return;
    }
    this.setData({ loadError: "" });
    const list = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const p = await catalogApi.fetchMallProductDetail(String(id));
        if (p && p.id) {
          list.push({
            id: p.id,
            name: p.name || "商品",
            coverUrl: p.cover || p.coverUrl || "",
            priceYuan: p.price != null ? p.price : p.priceYuan != null ? p.priceYuan : "0"
          });
        }
      } catch (e) {
        /* 下架或失败则跳过 */
      }
    }
    this.setData({ list });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/mall-product-detail/index?id=${encodeURIComponent(id)}` });
  },

  onRemove(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    favoriteStorage.removeFavorite(id);
    this.load();
    wx.showToast({ title: "已移除", icon: "none" });
  },

  goMall() {
    wx.switchTab({ url: "/pages/mall/index" });
  }
});
