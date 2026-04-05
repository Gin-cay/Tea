/**
 * 溯源环节现场上报：扫码绑定批次、选环节、摘要+图片+定位写入 content JSON。
 */
const traceWorkflowApi = require("../../utils/traceWorkflowApi");
const http = require("../../utils/http");

function _nowMinute() {
  const d = new Date();
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}`;
}

Page({
  data: {
    batchNo: "",
    stages: [],
    stageLabels: [],
    stageIndex: 0,
    summary: "",
    images: [],
    locText: "",
    submitting: false
  },

  onLoad() {
    traceWorkflowApi
      .fetchPermission({ showError: true })
      .then((p) => {
        const stages = (p && p.stages) || [];
        const labels = stages.map((s) => s.label || s.key);
        this.setData({
          stages,
          stageLabels: labels,
          stageIndex: 0
        });
        if (!stages.length && !p.isSuper) {
          wx.showModal({
            title: "提示",
            content: "您暂无溯源上报权限，请联系管理员在后台分配角色。",
            showCancel: false
          });
        }
      })
      .catch(() => {});
    this._tryLocation();
  },

  onBatchInput(e) {
    this.setData({ batchNo: (e.detail.value || "").trim() });
  },

  onScan() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        const raw = (res.result || "").trim();
        const m = raw.match(/TB\d{8}[A-F0-9]{6}/i);
        this.setData({ batchNo: m ? m[0].toUpperCase() : raw });
      }
    });
  },

  onStageChange(e) {
    const i = Number(e.detail.value) || 0;
    this.setData({ stageIndex: i });
  },

  onSummaryInput(e) {
    this.setData({ summary: e.detail.value || "" });
  },

  onChooseImage() {
    const max = 6 - this.data.images.length;
    if (max <= 0) return;
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: max,
        mediaType: ["image"],
        success: (res) => {
          const files = (res.tempFiles || []).map((f) => f.tempFilePath).filter(Boolean);
          this._uploadImages(files);
        },
        fail: (e) => {
          const msg = (e && e.errMsg) || "";
          if (msg.indexOf("cancel") >= 0 || msg.indexOf("取消") >= 0) return;
          wx.showToast({ title: "选图失败，可重试", icon: "none" });
        }
      });
    } else {
      wx.chooseImage({
        count: max,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: (res) => {
          this._uploadImages(res.tempFilePaths || []);
        }
      });
    }
  },

  _uploadImages(paths) {
    if (!paths.length) return;
    const base = http.getBaseUrl();
    if (!base) {
      wx.showToast({ title: "未配置 API 地址：请改 envList.js 中 cloudApiBaseUrl", icon: "none" });
      return;
    }
    let promise = Promise.resolve(this.data.images.slice());
    paths.forEach((filePath) => {
      promise = promise.then((urls) =>
        http
          .uploadFile({
            filePath,
            path: "/api/community/upload",
            showLoading: true,
            loadingTitle: "上传中",
            showError: false
          })
          .then((data) => {
            const u = (data && data.url) || "";
            if (!u) {
              return Promise.reject(new Error("服务器未返回图片地址"));
            }
            return urls.concat([u]);
          })
      );
    });
    promise
      .then((urls) => {
        this.setData({ images: urls });
        wx.showToast({ title: "图片已上传", icon: "success" });
      })
      .catch((err) => {
        let msg = "上传失败";
        if (err && err.statusCode === 403) msg = "无权限或接口拒绝";
        else if (err && err.statusCode === 404) msg = "上传接口不存在，检查 API 地址与端口";
        else if (err && err.message) msg = String(err.message).slice(0, 36);
        else if (err && err.errMsg) msg = String(err.errMsg).slice(0, 36);
        wx.showModal({
          title: "溯源图片上传失败",
          content:
            msg +
            "\n\n请确认：1) 后端已启动且端口与小程序 apiBaseUrl 一致；2) 开发者工具已勾选「不校验合法域名」；3) 真机使用局域网 IP 非 127.0.0.1。",
          showCancel: false
        });
      });
  },

  onPreview(e) {
    const src = e.currentTarget.dataset.src;
    wx.previewImage({ urls: this.data.images, current: src });
  },

  _tryLocation() {
    wx.getLocation({
      type: "gcj02",
      success: (res) => {
        this.setData({
          locText: `${res.latitude.toFixed(5)}, ${res.longitude.toFixed(5)}`
        });
      },
      fail: () => {
        this.setData({ locText: "" });
      }
    });
  },

  onSubmit() {
    const batchNo = (this.data.batchNo || "").trim();
    if (!batchNo) {
      wx.showToast({ title: "请填写或扫描批次号", icon: "none" });
      return;
    }
    const stages = this.data.stages || [];
    if (!stages.length) {
      wx.showToast({ title: "无可用环节权限", icon: "none" });
      return;
    }
    const idx = this.data.stageIndex || 0;
    const st = stages[idx];
    const processType = st.key;
    const content = {
      title: st.label,
      time: _nowMinute(),
      summary: this.data.summary || "",
      fields: [],
      images: this.data.images || [],
      videos: [],
      subSteps: []
    };
    if (this.data.locText) {
      content.fields.push({ label: "定位打卡", value: this.data.locText });
    }
    this.setData({ submitting: true });
    traceWorkflowApi
      .submitStage(
        { batchId: batchNo, processType, content },
        { showError: true }
      )
      .then(() => {
        wx.showToast({ title: "已提交，待审核", icon: "success" });
        this.setData({ summary: "", images: [] });
      })
      .finally(() => this.setData({ submitting: false }));
  }
});
