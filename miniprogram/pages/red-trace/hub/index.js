/**
 * 红色溯源独立模块枢纽：聚合溯源码、研学、证书入口。
 */
const analytics = require("../../../utils/analytics");
const storage = require("../../../utils/redTraceStorage");

Page({
  data: {
    recordCount: 0,
    points: 0
  },

  onShow() {
    const list = storage.getTraceRecords();
    this.setData({
      recordCount: list.length,
      points: storage.getPoints()
    });
    analytics.track(analytics.EVENTS.RED_TRACE_HUB_VIEW, { count: list.length });
  },

  onShareAppMessage() {
    return {
      title: "红色茶源可信溯源 · 茶叶助农",
      path: "/pages/red-trace/hub/index"
    };
  },

  goLatestCode() {
    const list = storage.getTraceRecords();
    if (!list.length) {
      wx.showToast({ title: "暂无溯源码", icon: "none" });
      return;
    }
    const token = list[0].traceToken;
    wx.navigateTo({
      url: `/pages/red-trace/trace-code/index?traceToken=${encodeURIComponent(token)}`
    });
  },

  goStudy() {
    wx.navigateTo({ url: "/pages/red-trace/study-tour/index" });
  },

  goCheckin() {
    wx.navigateTo({ url: "/pages/red-trace/study-checkin/index" });
  },

  goCertListHint() {
    const list = storage.getTraceRecords();
    if (!list.length) {
      wx.showModal({
        title: "电子证书",
        content: "认养支付成功后可从消息页进入证书，或先在「我的溯源码」生成记录。",
        showCancel: false
      });
      return;
    }
    const token = list[0].traceToken;
    wx.navigateTo({
      url: `/pages/red-trace/certificate/index?traceToken=${encodeURIComponent(token)}`
    });
  },

  goStory(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/red-trace/story-rich/index?gardenId=${id}`
    });
  },

  /** 调起微信扫一扫，识别溯源令牌文本 */
  onScanTrace() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ["qrCode", "barCode"],
      success: (res) => {
        const raw = (res.result || "").trim();
        if (!raw) return;
        wx.navigateTo({
          url: `/pages/red-trace/trace-view/index?code=${encodeURIComponent(raw)}`
        });
      },
      fail: () => {
        wx.showToast({ title: "已取消扫描", icon: "none" });
      }
    });
  }
});
