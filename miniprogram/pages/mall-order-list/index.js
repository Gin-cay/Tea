const shopApi = require("../../utils/shopApi");
const auth = require("../../utils/auth");
const http = require("../../utils/http");

/**
 * 与 mine 页订单中心 tab 对应；仅演示环境可能多为 pending_pay，其它 tab 可能为空
 */
const TAB_MATCH = {
  pay: ["pending_pay"],
  ship: ["paid", "to_ship", "pending_ship", "paid_pending_ship"],
  recv: ["shipped", "delivering", "received", "done"],
  after: ["refund", "after_sale", "closed"]
};

const TAB_TITLE = {
  pay: "待付款",
  ship: "待发货",
  recv: "待收货",
  after: "售后/退款"
};

Page({
  data: {
    list: [],
    loadError: "",
    filterHint: ""
  },

  onLoad(options) {
    this._tab = (options && options.tab) || "";
  },

  onShow() {
    this.load();
  },

  async load() {
    if (!http.getStoredToken()) {
      try {
        await auth.silentLogin();
      } catch (e) {
        this.setData({ list: [], loadError: "请先登录", filterHint: "" });
        return;
      }
    }
    const tab = this._tab || "";
    const allow = tab && TAB_MATCH[tab] ? TAB_MATCH[tab] : null;
    const filterHint = tab && TAB_TITLE[tab] ? `当前筛选：${TAB_TITLE[tab]}` : "";

    try {
      const res = await shopApi.fetchOrderList(1);
      let list = (res && res.list) || [];
      if (allow && allow.length) {
        list = list.filter((o) => allow.indexOf(o.status) >= 0);
      }
      this.setData({ list, loadError: "", filterHint });
    } catch (e) {
      this.setData({ list: [], loadError: "订单加载失败", filterHint: "" });
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
