/**
 * 茶叶助农电子证书：官方模板底图 + 动态字段 + Canvas 导出。
 */
const { parseTraceToken } = require("../../../utils/traceCrypto");
const api = require("../../../utils/redTraceApi");
const storage = require("../../../utils/redTraceStorage");
const analytics = require("../../../utils/analytics");

const CERT_BG = "/images/cert-tea-assist-official.png";

Page({
  data: {
    cert: null,
    traceToken: "",
    canvasW: 300,
    canvasH: 420
  },

  onLoad(options) {
    const token = options.traceToken ? decodeURIComponent(options.traceToken) : "";
    const parsed = parseTraceToken(token);
    if (!parsed) {
      this.setData({ cert: null });
      return;
    }
    wx.showLoading({ title: "加载中" });
    api
      .fetchGardenRedProfile(parsed.gardenId)
      .then((profile) => {
        const list = storage.getTraceRecords();
        const hit = list.find((r) => r.traceToken === token);
        const gardenName =
          (hit && hit.gardenName) || (profile && profile.gardenName) || "认养茶园";
        const farmerSign = profile && profile.farmer ? `${profile.farmer.name}（代签）` : "茶农委员会";
        const app = getApp();
        const u = (app && app.globalData && app.globalData.userInfo) || {};
        const nick = u.nickName || "认养用户";
        const d = new Date();
        const cert = {
          gardenName,
          orderId: parsed.orderId,
          holder: nick,
          farmerSign,
          dateStr: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
        };
        this.setData({ cert, traceToken: token });
        analytics.track(analytics.EVENTS.RED_CERT_VIEW, { gardenId: parsed.gardenId });
      })
      .catch(() => {
        wx.showToast({ title: "档案加载失败", icon: "none" });
        this.setData({ cert: null });
      })
      .finally(() => wx.hideLoading());
  },

  onCertImageLoad() {
    this.initCanvasSize();
  },

  onReady() {
    this.initCanvasSize();
  },

  initCanvasSize() {
    const query = wx.createSelectorQuery();
    query
      .select("#certStage")
      .boundingClientRect((rect) => {
        if (!rect) return;
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);
        this.setData({ canvasW: w, canvasH: h });
      })
      .exec();
  },

  onShareAppMessage() {
    const c = this.data.cert;
    return {
      title: c ? `${c.gardenName} · 电子认养证书` : "茶叶助农电子证书",
      path: "/pages/red-trace/hub/index"
    };
  },

  onSaveImage() {
    const cert = this.data.cert;
    if (!cert) return;
    wx.showLoading({ title: "生成图片" });
    const ctx = wx.createCanvasContext("certCanvas", this);
    const w = this.data.canvasW;
    const h = this.data.canvasH;
    ctx.drawImage(CERT_BG, 0, 0, w, h);
    ctx.setFillStyle("#1a3d2e");
    ctx.setFontSize(Math.max(12, Math.floor(w * 0.045)));
    ctx.fillText(`认养茶园：${cert.gardenName}`, w * 0.12, h * 0.42);
    ctx.fillText(`订单号：${cert.orderId}`, w * 0.12, h * 0.5);
    ctx.fillText(`持有人：${cert.holder}`, w * 0.12, h * 0.58);
    ctx.fillText(`茶农签章：${cert.farmerSign}`, w * 0.12, h * 0.66);
    ctx.setFontSize(Math.max(10, Math.floor(w * 0.035)));
    ctx.fillText(cert.dateStr, w * 0.12, h * 0.78);
    ctx.draw(false, () => {
      wx.canvasToTempFilePath(
        {
          canvasId: "certCanvas",
          success: (res) => {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => wx.showToast({ title: "已保存到相册", icon: "success" }),
              fail: () => wx.showToast({ title: "保存失败", icon: "none" })
            });
          },
          fail: () => wx.showToast({ title: "导出失败", icon: "none" }),
          complete: () => wx.hideLoading()
        },
        this
      );
    });
  }
});
