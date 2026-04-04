const shopApi = require("../../utils/shopApi");
const auth = require("../../utils/auth");
const http = require("../../utils/http");

Page({
  data: {
    items: [],
    loadError: ""
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    if (!http.getStoredToken()) {
      try {
        await auth.silentLogin();
      } catch (e) {
        this.setData({ items: [], loadError: "请先登录" });
        return;
      }
    }
    try {
      const res = await shopApi.getCartItems();
      this.setData({ items: (res && res.items) || [], loadError: "" });
    } catch (e) {
      this.setData({ items: [], loadError: "购物车加载失败" });
    }
  },

  onQtyChange(e) {
    const id = e.currentTarget.dataset.id;
    const delta = Number(e.currentTarget.dataset.delta);
    const row = (this.data.items || []).find((x) => x.id === id);
    if (!row) return;
    const q = Math.max(1, Math.min(999, row.quantity + delta));
    if (q === row.quantity) return;
    shopApi
      .patchCartItem(id, q, row.selected)
      .then(() => this.refresh())
      .catch(() => {});
  },

  onToggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const row = (this.data.items || []).find((x) => x.id === id);
    if (!row) return;
    const sel = row.selected ? 0 : 1;
    shopApi
      .patchCartItem(id, row.quantity, sel)
      .then(() => this.refresh())
      .catch(() => {});
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    shopApi
      .deleteCartItem(id)
      .then(() => this.refresh())
      .catch(() => {});
  },

  goCheckout() {
    const has = (this.data.items || []).some((x) => x.selected);
    if (!has) {
      wx.showToast({ title: "请勾选商品", icon: "none" });
      return;
    }
    wx.navigateTo({ url: "/pages/mall-checkout/index?mode=cart" });
  }
});
