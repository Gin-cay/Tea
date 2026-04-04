/**
 * 红色茶旅研学：景点、路线、预约、认养积分兑换。
 */
const api = require("../../../utils/redTraceApi");
const storage = require("../../../utils/redTraceStorage");
const analytics = require("../../../utils/analytics");
const auth = require("../../../utils/auth");

Page({
  data: {
    spots: [],
    routes: [],
    points: 0,
    loadError: ""
  },

  onShow() {
    this.setData({ points: storage.getPoints() });
    this.loadData();
    analytics.track(analytics.EVENTS.RED_STUDY_VIEW, {});
  },

  async loadData() {
    try {
      const [spots, routes] = await Promise.all([api.fetchStudySpots(), api.fetchStudyRoutes()]);
      this.setData({ spots: spots || [], routes: routes || [], loadError: "" });
    } catch (e) {
      this.setData({ loadError: "研学数据加载失败" });
      wx.showToast({ title: "网络异常", icon: "none" });
    }
  },

  onShareAppMessage() {
    return {
      title: "红色茶旅研学 · 预约与积分兑换",
      path: "/pages/red-trace/study-tour/index"
    };
  },

  async onBook(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    try {
      await auth.silentLogin();
    } catch (err) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }
    wx.showLoading({ title: "提交中" });
    try {
      await api.submitStudyBooking({ routeId: id, note: "" });
      wx.showModal({
        title: "预约已提交",
        content: "我们已收到您的研学路线预约，工作人员将尽快联系您确认行程。",
        showCancel: false
      });
    } catch (err) {
      wx.showToast({ title: "预约失败，请重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
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
      wx.showToast({ title: "已兑换研学名额（本地积分已扣减）", icon: "success" });
      this.setData({ points: storage.getPoints() });
    }
  },

  goCheckin() {
    wx.navigateTo({ url: "/pages/red-trace/study-checkin/index" });
  }
});
