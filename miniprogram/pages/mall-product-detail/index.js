/**
 * 商城商品详情
 */
const catalogApi = require("../../utils/catalogApi");
const shopApi = require("../../utils/shopApi");
const auth = require("../../utils/auth");
const http = require("../../utils/http");
const favoriteStorage = require("../../utils/favoriteStorage");

Page({
  data: {
    product: null,
    loadError: "",
    isFavorite: false
  },

  onLoad(options) {
    const id = options.id != null ? String(options.id) : "";
    if (!id) {
      this.setData({ loadError: "缺少商品 id" });
      return;
    }
    this.loadProduct(id);
  },

  async loadProduct(id) {
    this.setData({ loadError: "" });
    try {
      const product = await catalogApi.fetchMallProductDetail(id);
      this.setData({
        product,
        isFavorite: favoriteStorage.isFavorite(id)
      });
    } catch (e) {
      this.setData({ loadError: "商品加载失败", product: null, isFavorite: false });
    }
  },

  async ensureLogin() {
    if (http.getStoredToken()) return true;
    try {
      await auth.silentLogin();
      return !!http.getStoredToken();
    } catch (e) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return false;
    }
  },

  async onAddCart() {
    const p = this.data.product;
    if (!p) return;
    if (!(await this.ensureLogin())) return;
    try {
      await shopApi.addCartItem(p.id, 1);
      wx.showToast({ title: "已加入购物车", icon: "success" });
    } catch (e) {
      /* toast */
    }
  },

  async onBuyNow() {
    const p = this.data.product;
    if (!p) return;
    if (!(await this.ensureLogin())) return;
    wx.navigateTo({
      url: `/pages/mall-checkout/index?mode=direct&productId=${encodeURIComponent(p.id)}&quantity=1`
    });
  },

  goCart() {
    wx.navigateTo({ url: "/pages/mall-cart/index" });
  },

  onShareAppMessage() {
    const p = this.data.product;
    return {
      title: p ? `${p.name} · 红色溯源好茶` : "茶叶助农商城",
      path: p ? `/pages/mall-product-detail/index?id=${p.id}` : "/pages/mall/index"
    };
  },

  goRedHub() {
    wx.navigateTo({ url: "/pages/red-trace/hub/index" });
  },

  async onToggleFavorite() {
    const p = this.data.product;
    if (!p) return;
    if (!(await this.ensureLogin())) return;
    const now = favoriteStorage.toggleFavorite(p.id);
    this.setData({ isFavorite: now });
    wx.showToast({ title: now ? "已加入收藏" : "已取消收藏", icon: "none" });
  }
});
