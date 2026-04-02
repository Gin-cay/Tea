/**
 * 展示认养用户的红色茶源溯源二维码（weapp-qrcode 绘制）。
 */
const drawQrcode = require("../../../utils/weapp.qrcode.min.js");
const analytics = require("../../../utils/analytics");
const storage = require("../../../utils/redTraceStorage");

Page({
  data: {
    traceToken: "",
    traceTokenShort: "",
    gardenName: ""
  },

  onLoad(options) {
    let token = options.traceToken ? decodeURIComponent(options.traceToken) : "";
    if (!token) {
      const list = storage.getTraceRecords();
      if (list[0]) token = list[0].traceToken;
    }
    const short = token.length > 48 ? `${token.slice(0, 24)}…` : token;
    let gardenName = "";
    const list = storage.getTraceRecords();
    const hit = list.find((r) => r.traceToken === token);
    if (hit) gardenName = hit.gardenName;
    this.setData({ traceToken: token, traceTokenShort: short, gardenName });
  },

  onReady() {
    const text = this.data.traceToken;
    if (!text) {
      wx.showToast({ title: "无溯源令牌", icon: "none" });
      return;
    }
    drawQrcode({
      width: 200,
      height: 200,
      canvasId: "traceQrCanvas",
      text,
      foreground: "#1f2937",
      _this: this,
      callback: () => {
        analytics.track(analytics.EVENTS.RED_TRACE_QR_SHOW, { len: text.length });
      }
    });
  },

  onShareAppMessage() {
    const code = encodeURIComponent(this.data.traceToken);
    return {
      title: "扫码查看我的茶园红色溯源",
      path: `/pages/red-trace/trace-view/index?code=${code}`
    };
  },

  goTraceView() {
    const t = this.data.traceToken;
    if (!t) return;
    wx.navigateTo({
      url: `/pages/red-trace/trace-view/index?code=${encodeURIComponent(t)}`
    });
  }
});
