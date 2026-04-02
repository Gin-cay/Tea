const realCareStorage = require("../../../utils/realCareStorage");

Page({
  data: {
    role: "customer",
    userId: "",
    treeId: "",

    diary: "",
    picked: [],

    intervalOptions: [
      { label: "5 分钟", minutes: 5 },
      { label: "10 分钟", minutes: 10 },
      { label: "30 分钟", minutes: 30 }
    ],
    intervalIndex: 0,
    reminding: false
  },

  onLoad(query) {
    const ctx = realCareStorage.ensureUserContext();
    const treeIdFromQuery = query && query.treeId ? decodeURIComponent(query.treeId) : "";
    const treeId = treeIdFromQuery || (ctx.treeIds && ctx.treeIds[0]) || "TREE-001";
    this.setData({ role: ctx.role, userId: ctx.uid, treeId });
  },

  onShow() {
    // 茶农端上传页：如未完善资料，阻止上传并引导完善（属于关键动作页）
    const app = getApp();
    const state = app.getProfileGateState();
    if (!state || !state.complete) {
      const missing = state && state.missing && state.missing.length ? state.missing.join("、") : "必填信息";
      wx.showToast({ title: `请先完善：${missing}`, icon: "none" });
      app.ensureProfileBeforePay({
        redirect: "feature:realcare",
        returnUrl: "/pages/real-care/upload/index"
      });
    }
  },

  onUnload() {
    this.stopReminder();
  },

  onTapBack() {
    wx.navigateBack();
  },

  onTreeIdInput(e) {
    const val = e && e.detail ? e.detail.value : "";
    this.setData({ treeId: val });
  },

  onDiaryInput(e) {
    const val = e && e.detail ? e.detail.value : "";
    this.setData({ diary: val });
  },

  onChooseImages() {
    if (this.data.role !== "farmer") return;
    wx.chooseImage({
      count: 9,
      sizeType: ["compressed"],
      sourceType: ["album"],
      success: (res) => {
        const paths = (res && res.tempFilePaths) || [];
        this.setData({ picked: paths });
      }
    });
  },

  onChooseCamera() {
    if (this.data.role !== "farmer") return;
    wx.chooseImage({
      count: 9,
      sizeType: ["compressed"],
      sourceType: ["camera"],
      success: (res) => {
        const paths = (res && res.tempFilePaths) || [];
        this.setData({ picked: paths });
      }
    });
  },

  onSubmit() {
    if (this.data.role !== "farmer") return;
    const treeId = (this.data.treeId || "").trim();
    const picked = this.data.picked || [];
    if (!treeId) {
      wx.showToast({ title: "请填写茶树编号", icon: "none" });
      return;
    }
    if (!picked.length) {
      wx.showToast({ title: "请选择照片", icon: "none" });
      return;
    }

    const now = Date.now();
    const diary = (this.data.diary || "").trim() || "今日照看记录：生长良好，持续养护。";
    const uploaderId = this.data.userId || "farmer";

    const items = picked.map((p, i) => ({
      id: `care_${now}_${i}_${Math.floor(Math.random() * 1000)}`,
      treeId,
      uploaderId,
      uploaderRole: "farmer",
      imageUrl: p, // 演示：临时路径；生产应为 uploadFile 后的 https url
      diary,
      takenAt: now + i
    }));
    realCareStorage.appendItems(items);

    this.setData({ picked: [], diary: "" });
    wx.showToast({ title: "已发布", icon: "success" });
  },

  onIntervalPick(e) {
    const idx = e && e.detail ? Number(e.detail.value) : 0;
    this.setData({ intervalIndex: idx });
  },

  onStartReminder() {
    if (this.data.role !== "farmer") return;
    if (this.data.reminding) return;
    const opt = this.data.intervalOptions[this.data.intervalIndex] || this.data.intervalOptions[0];
    const ms = (opt.minutes || 10) * 60 * 1000;

    this._remindTimer = setInterval(() => {
      wx.showToast({ title: "到点啦：请上传实时照看照片", icon: "none", duration: 2000 });
    }, ms);

    this.setData({ reminding: true });
    wx.showToast({ title: "提醒已开启", icon: "success" });
  },

  onStopReminder() {
    this.stopReminder();
    wx.showToast({ title: "提醒已停止", icon: "success" });
  },

  stopReminder() {
    if (this._remindTimer) {
      clearInterval(this._remindTimer);
      this._remindTimer = null;
    }
    if (this.data.reminding) this.setData({ reminding: false });
  }
});

