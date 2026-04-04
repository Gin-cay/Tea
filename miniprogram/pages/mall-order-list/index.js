const shopApi = require("../../utils/shopApi");
const auth = require("../../utils/auth");
const http = require("../../utils/http");

Page({
  data: {
    list: [],
    loadError: ""
  },

  onShow() {
    this.load();
  },

  async load() {
    if (!http.getStoredToken()) {
      try {
        await auth.silentLogin();
      } catch (e) {
        this.setData({ list: [], loadError: "请先登录" });
        return;
      }
    }
    try {
      const res = await shopApi.fetchOrderList(1);
      this.setData({ list: (res && res.list) || [], loadError: "" });
    } catch (e) {
      this.setData({ list: [], loadError: "订单加载失败" });
    }
  },

  goDetail(e) {
    const no = e.currentTarget.dataset.no;
    if (!no) return;
    wx.navigateTo({
      url: `/pages/mall-order-detail/index?orderNo=${encodeURIComponent(no)}`
    });
  }
});
