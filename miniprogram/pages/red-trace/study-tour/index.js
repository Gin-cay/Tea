/**
 * 红色茶旅研学：景点、路线、预约占位、认养积分兑换研学名额（演示）。
 */
const mock = require("../../../utils/redTraceMockData");
const storage = require("../../../utils/redTraceStorage");
const analytics = require("../../../utils/analytics");

Page({
  data: {
    spots: [],
    routes: [],
    points: 0
  },

  onShow() {
    this.setData({
      spots: mock.STUDY_SPOTS,
      routes: mock.STUDY_ROUTES,
      points: storage.getPoints()
    });
    analytics.track(analytics.EVENTS.RED_STUDY_VIEW, {});
  },

  onShareAppMessage() {
    return {
      title: "红色茶旅研学 · 预约与积分兑换",
      path: "/pages/red-trace/study-tour/index"
    };
  },

  /** 预约接口预留：此处仅前端提示 */
  onBook(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "预约已登记（演示）",
      content: `路线 ${id} 将提交至后台 POST /api/red-study/booking，请接入真实服务。`,
      showCancel: false
    });
  },

  onExchange(e) {
    const need = parseInt(e.currentTarget.dataset.points, 10) || 500;
    const id = e.currentTarget.dataset.id;
    if (storage.getPoints() < need) {
      wx.showToast({ title: "积分不足，先去打卡", icon: "none" });
      return;
    }
    if (storage.spendPoints(need)) {
      analytics.track(analytics.EVENTS.RED_POINTS_EXCHANGE, { routeId: id, points: need });
      wx.showToast({ title: "已兑换研学名额（演示）", icon: "success" });
      this.setData({ points: storage.getPoints() });
    }
  },

  goCheckin() {
    wx.navigateTo({ url: "/pages/red-trace/study-checkin/index" });
  }
});
