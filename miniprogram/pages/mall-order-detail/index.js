const shopApi = require("../../utils/shopApi");
const auth = require("../../utils/auth");
const http = require("../../utils/http");

Page({
  data: {
    orderNo: "",
    order: null,
    loadError: ""
  },

  onLoad(options) {
    const orderNo = options.orderNo ? String(options.orderNo) : "";
    this.setData({ orderNo });
    if (!orderNo) {
      this.setData({ loadError: "缺少订单号" });
      return;
    }
    this.load();
  },

  async load() {
    if (!http.getStoredToken()) {
      try {
        await auth.silentLogin();
      } catch (e) {
        this.setData({ loadError: "请先登录" });
        return;
      }
    }
    try {
      const o = await shopApi.fetchOrderDetail(this.data.orderNo);
      const items = (o.items || []).map((it) =>
        Object.assign({}, it, { priceYuan: ((it.priceFen || 0) / 100).toFixed(2) })
      );
      this.setData({ order: Object.assign({}, o, { items }), loadError: "" });
    } catch (e) {
      this.setData({ order: null, loadError: "订单加载失败" });
    }
  },

  async onCancel() {
    const o = this.data.order;
    if (!o || o.status !== "pending_pay") return;
    wx.showModal({
      title: "取消订单",
      content: "确定取消该待支付订单？",
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await shopApi.cancelOrder(o.orderNo);
          wx.showToast({ title: "已取消", icon: "success" });
          setTimeout(() => wx.navigateBack(), 500);
        } catch (e) {
          /* toast */
        }
      }
    });
  }
});
