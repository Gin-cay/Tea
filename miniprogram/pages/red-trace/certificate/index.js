/**
 * 茶叶助农电子证书：官方模板底图 + 动态字段 + Canvas 导出。
 */
const { parseTraceToken } = require("../../../utils/traceCrypto");
const mock = require("../../../utils/redTraceMockData");
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
    const profile = mock.getGardenProfile(parsed.gardenId);
    const list = storage.getTraceRecords();
    const hit = list.find((r) => r.traceToken === token);
    const gardenName = (hit && hit.gardenName) || (profile && profile.gardenName) || "认养茶园";
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
  },

  onCertImageLoad() {
    this.initCanvasSize();
  },

  onReady() {
    if (this.data.cert) {
      this.initCanvasSize();
    }
  },

  initCanvasSize() {
    if (!this.data.cert || this._canvasInited) return;
    wx.getImageInfo({
      src: CERT_BG,
      success: (info) => {
        const W = 375;
        const H = Math.round((info.height / info.width) * W);
        this._canvasInited = true;
        this.setData({ canvasW: W, canvasH: H }, () => {
          this.drawCertCanvas();
        });
      },
      fail: () => {
        this._canvasInited = true;
        this.setData({ canvasW: 300, canvasH: 420 }, () => {
          this.drawCertCanvas();
        });
      }
    });
  },

  /**
   * 绘制离屏证书（底图 + 文字），供 canvasToTempFilePath
   */
  drawCertCanvas(done) {
    const c = this.data.cert;
    if (!c) return;
    const W = this.data.canvasW || 300;
    const H = this.data.canvasH || 420;
    const ctx = wx.createCanvasContext("certCanvas", this);
    ctx.drawImage(CERT_BG, 0, 0, W, H);

    const fs = Math.max(11, Math.floor(H / 38));
    const lh = Math.floor(fs * 1.35);
    let y = Math.floor(H * 0.57);
    const cx = W / 2;
    ctx.setTextAlign("center");
    ctx.setFillStyle("rgba(245, 240, 216, 0.98)");
    ctx.setFontSize(fs);
    ctx.fillText(`持证人：${c.holder}`, cx, y);
    y += lh;
    ctx.fillText(`认养编号：${c.orderId}`, cx, y);
    y += lh;
    ctx.setFontSize(Math.max(10, fs - 1));
    const gardenLine = `认养茶园：${c.gardenName}`;
    ctx.fillText(gardenLine.length > 22 ? `${gardenLine.slice(0, 21)}…` : gardenLine, cx, y);
    y += lh;
    ctx.setFontSize(fs);
    ctx.fillText(`签发日期：${c.dateStr}`, cx, y);

    ctx.draw(false, () => {
      if (typeof done === "function") done();
    });
  },

  onShareAppMessage() {
    const t = encodeURIComponent(this.data.traceToken);
    analytics.track(analytics.EVENTS.RED_CERT_SHARE, {});
    return {
      title: "我的茶叶助农电子证书",
      path: `/pages/red-trace/certificate/index?traceToken=${t}`
    };
  },

  onSaveImage() {
    wx.showLoading({ title: "生成图片" });
    this.drawCertCanvas(() => {
      setTimeout(() => {
        wx.canvasToTempFilePath(
          {
            canvasId: "certCanvas",
            destWidth: (this.data.canvasW || 300) * 2,
            destHeight: (this.data.canvasH || 420) * 2,
            success: (res) => {
              wx.hideLoading();
              wx.saveImageToPhotosAlbum({
                filePath: res.tempFilePath,
                success: () => wx.showToast({ title: "已保存到相册", icon: "success" }),
                fail: () => {
                  wx.showModal({
                    title: "需要相册权限",
                    content: "请在设置中允许保存到相册后重试。",
                    showCancel: false
                  });
                }
              });
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: "生成图片失败", icon: "none" });
            }
          },
          this
        );
      }, 120);
    });
  }
});
