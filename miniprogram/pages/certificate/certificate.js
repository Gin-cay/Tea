/**
 * 研学答题电子证书：展示、分享、Canvas 导出相册
 */
const studyQuizApi = require("../../utils/studyQuizApi");

function formatTime(iso) {
  if (!iso) return "—";
  const s = String(iso).replace("Z", "");
  const d = s.split("T")[0] || "";
  const t = (s.split("T")[1] || "").slice(0, 8);
  return t ? `${d} ${t}` : d;
}

Page({
  data: {
    loaded: false,
    id: "",
    certNo: "",
    nickname: "",
    spotName: "",
    checkinAtText: "",
    issuedAtText: "",
    title: ""
  },

  onLoad(options) {
    const id = options.id || "";
    if (!id) {
      wx.showToast({ title: "缺少证书", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1600);
      return;
    }
    this._certId = id;
    studyQuizApi
      .fetchCertificate(id)
      .then((body) => {
        this.setData({
          loaded: true,
          id: body.id,
          certNo: body.certNo,
          nickname: body.nickname || "茶友",
          spotName: body.spotName || "",
          checkinAtText: formatTime(body.checkinAt),
          issuedAtText: formatTime(body.issuedAt),
          title: body.title || "信阳毛尖文化研学 · 电子证书"
        });
      })
      .catch(() => wx.navigateBack());
  },

  onShareAppMessage() {
    const id = this._certId || this.data.id;
    return {
      title: this.data.title || "我的研学电子证书",
      path: id ? `/pages/certificate/certificate?id=${id}` : "/pages/home/index"
    };
  },

  onSaveImage() {
    wx.showLoading({ title: "生成图片", mask: true });
    setTimeout(() => {
      this._drawCanvas()
        .then((tempPath) => {
          wx.hideLoading();
          return new Promise((resolve, reject) => {
            wx.saveImageToPhotosAlbum({
              filePath: tempPath,
              success: resolve,
              fail: reject
            });
          });
        })
        .then(() => {
          wx.showToast({ title: "已保存到相册", icon: "success" });
        })
        .catch((err) => {
          wx.hideLoading();
          if (err && err.errMsg && err.errMsg.indexOf("auth deny") >= 0) {
            wx.openSetting({});
          } else {
            wx.showToast({ title: "保存失败，请重试", icon: "none" });
          }
        });
    }, 120);
  },

  _drawCanvas() {
    const d = this.data;
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query
        .select("#certCanvas")
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            reject(new Error("no canvas"));
            return;
          }
          const canvas = res[0].node;
          const ctx = canvas.getContext("2d");
          const sys = wx.getSystemInfoSync();
          const dpr = sys.pixelRatio || 2;
          const w = 300;
          const h = 460;
          canvas.width = w * dpr;
          canvas.height = h * dpr;
          ctx.scale(dpr, dpr);

          ctx.fillStyle = "#fffef8";
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = "#2f8f3a";
          ctx.lineWidth = 4;
          ctx.strokeRect(10, 10, w - 20, h - 20);

          ctx.fillStyle = "#c9302c";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("信阳毛尖文化研学", w / 2, 42);

          ctx.fillStyle = "#1a1a1a";
          ctx.font = "bold 20px sans-serif";
          ctx.fillText("电 子 证 书", w / 2, 72);

          ctx.strokeStyle = "rgba(47,143,58,0.5)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(40, 88);
          ctx.lineTo(w - 40, 88);
          ctx.stroke();

          ctx.textAlign = "left";
          ctx.fillStyle = "#374151";
          ctx.font = "12px sans-serif";
          let y = 108;
          const line = (k, v) => {
            ctx.fillStyle = "#6b7280";
            ctx.fillText(k, 24, y);
            ctx.fillStyle = "#111";
            const vs = String(v || "—");
            ctx.fillText(vs.length > 22 ? vs.slice(0, 22) + "…" : vs, 100, y);
            y += 28;
          };
          line("获得者", d.nickname);
          line("证书编号", d.certNo);
          line("打卡时间", d.checkinAtText);
          if (d.spotName) line("打卡景点", d.spotName);
          line("颁发时间", d.issuedAtText);

          ctx.fillStyle = "#9ca3af";
          ctx.font = "11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("茶叶助农 · 红色茶旅研学项目", w / 2, h - 28);

          wx.canvasToTempFilePath({
            canvas,
            width: w,
            height: h,
            destWidth: w * dpr,
            destHeight: h * dpr,
            fileType: "png",
            quality: 1,
            success: (r) => resolve(r.tempFilePath),
            fail: reject
          });
        });
    });
  }
});
