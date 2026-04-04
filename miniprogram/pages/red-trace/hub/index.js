/**
 * 红色溯源独立模块枢纽：聚合溯源码、研学、证书入口。
 */
const analytics = require("../../../utils/analytics");
const storage = require("../../../utils/redTraceStorage");
const shopApi = require("../../../utils/shopApi");

function mergeTraceRecords(local, remoteList) {
  const out = [];
  const seen = new Set();
  (remoteList || []).forEach((r) => {
    const t = r.traceToken;
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push({
        traceToken: t,
        gardenId: r.gardenId,
        orderId: r.orderId,
        gardenName: r.gardenName || "",
        orderMode: r.orderMode || "garden",
        createdAt: r.createdAt ? Date.parse(r.createdAt.replace("Z", "")) : Date.now()
      });
    }
  });
  (local || []).forEach((r) => {
    if (r.traceToken && !seen.has(r.traceToken)) {
      seen.add(r.traceToken);
      out.push(r);
    }
  });
  return out;
}

Page({
  data: {
    traceList: [],
    recordCount: 0,
    points: 0
  },

  onShow() {
    const local = storage.getTraceRecords();
    shopApi
      .fetchUserTraceRecords()
      .then((body) => {
        const remote = (body && body.list) || [];
        const merged = mergeTraceRecords(local, remote);
        this.setData({
          traceList: merged,
          recordCount: merged.length,
          points: storage.getPoints()
        });
        analytics.track(analytics.EVENTS.RED_TRACE_HUB_VIEW, { count: merged.length });
      })
      .catch(() => {
        this.setData({
          traceList: local,
          recordCount: local.length,
          points: storage.getPoints()
        });
        analytics.track(analytics.EVENTS.RED_TRACE_HUB_VIEW, { count: local.length });
      });
  },

  onShareAppMessage() {
    return {
      title: "红色茶源可信溯源 · 茶叶助农",
      path: "/pages/red-trace/hub/index"
    };
  },

  goLatestCode() {
    const list = this.data.traceList || [];
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
    const list = this.data.traceList || [];
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
