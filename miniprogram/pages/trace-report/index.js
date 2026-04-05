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
    wx.chooseMedia({
      count: 6 - this.data.images.length,
      mediaType: ["image"],
      success: (res) => {
        const files = (res.tempFiles || []).map((f) => f.tempFilePath);
        this._uploadImages(files);
      }
    });
  },

  _uploadImages(paths) {
    if (!paths.length) return;
    if (!http.getBaseUrl()) {
      wx.showToast({ title: "未配置 apiBaseUrl", icon: "none" });
      return;
    }
    let promise = Promise.resolve(this.data.images.slice());
    paths.forEach((filePath) => {
      promise = promise.then((urls) =>
        http
          .uploadFile({ filePath, showLoading: true, loadingTitle: "上传中" })
          .then((data) => {
            const u = (data && data.url) || "";
            return u ? urls.concat([u]) : urls;
          })
      );
    });
    promise.then((urls) => this.setData({ images: urls })).catch(() => {});
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
