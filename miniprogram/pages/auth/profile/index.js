const storage = require("../../../utils/userProfileStorage");

Page({
  data: {
    redirect: "tab:home",
    returnUrl: "",

    role: "customer", // customer | farmer
    avatarUrl: "",
    phone: "",
    nickname: "",
    region: ["", "", ""],
    regionText: "",
    addressDetail: ""
  },

  onLoad(query) {
    const redirect = query && query.redirect ? decodeURIComponent(query.redirect) : "tab:home";
    const returnUrl = query && query.returnUrl ? decodeURIComponent(query.returnUrl) : "";
    const p = storage.ensureProfileBase();
    const region = (p.address && p.address.region) || ["", "", ""];
    this.setData({
      redirect,
      returnUrl,
      role: p.role || "customer",
      avatarUrl: p.avatarUrl || "",
      phone: p.phone || "",
      nickname: p.nickname || "",
      region,
      regionText: this.formatRegionText(region),
      addressDetail: (p.address && p.address.detail) || ""
    });
  },

  formatRegionText(r) {
    if (!Array.isArray(r) || r.length !== 3) return "";
    if (r.some((x) => !String(x || "").trim())) return "";
    return r.join(" ");
  },

  onRoleTap(e) {
    const role = e.currentTarget.dataset.role;
    if (role !== "customer" && role !== "farmer") return;
    this.setData({ role });
  },

  onChooseAvatarAlbum() {
    this.chooseAvatar(["album"]);
  },

  onChooseAvatarCamera() {
    this.chooseAvatar(["camera"]);
  },

  chooseAvatar(sourceType) {
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType,
      success: (res) => {
        const path = res && res.tempFilePaths && res.tempFilePaths[0] ? res.tempFilePaths[0] : "";
        this.setData({ avatarUrl: path });
      }
    });
  },

  onPhoneInput(e) {
    const v = e && e.detail ? e.detail.value : "";
    this.setData({ phone: v });
  },

  onNicknameInput(e) {
    const v = e && e.detail ? e.detail.value : "";
    this.setData({ nickname: v });
  },

  onRegionChange(e) {
    const v = e && e.detail ? e.detail.value : ["", "", ""];
    this.setData({ region: v, regionText: this.formatRegionText(v) });
  },

  onAddressDetailInput(e) {
    const v = e && e.detail ? e.detail.value : "";
    this.setData({ addressDetail: v });
  },

  onSubmit() {
    const role = this.data.role;
    const avatarUrl = String(this.data.avatarUrl || "").trim();
    const phone = String(this.data.phone || "").trim();
    const nickname = String(this.data.nickname || "").trim();
    const region = this.data.region || [];
    const addressDetail = String(this.data.addressDetail || "").trim();

    if (!avatarUrl) return wx.showToast({ title: "请上传头像", icon: "none" });
    if (!/^1[3-9]\d{9}$/.test(phone)) return wx.showToast({ title: "手机号格式不正确", icon: "none" });
    if (!nickname) return wx.showToast({ title: "请输入昵称", icon: "none" });
    if (!Array.isArray(region) || region.length !== 3 || region.some((x) => !String(x || "").trim()))
      return wx.showToast({ title: "请选择省市区", icon: "none" });
    if (!addressDetail) return wx.showToast({ title: "请输入详细地址", icon: "none" });

    const prev = storage.ensureProfileBase();
    const next = {
      ...prev,
      role,
      avatarUrl,
      phone,
      nickname,
      address: { region, detail: addressDetail },
      updatedAt: Date.now()
    };
    storage.setProfile(next);

    wx.showToast({ title: "保存成功", icon: "success" });

    // 根据角色进入对应首页
    const to = role === "farmer" ? "tab:farmer" : "tab:home";
    this.goAfterSubmit(to);
  },

  goAfterSubmit(target) {
    // 若携带 returnUrl（例如支付页），优先回跳继续流程
    if (this.data.returnUrl) {
      wx.redirectTo({ url: this.data.returnUrl });
      return;
    }

    // 否则进入对应首页
    const t = target || this.data.redirect || "tab:home";

    if (t === "tab:home") return wx.switchTab({ url: "/pages/home/index" });
    if (t === "tab:adopt") return wx.switchTab({ url: "/pages/adopt/adopt" });
    if (t === "tab:mall") return wx.switchTab({ url: "/pages/mall/index" });
    if (t === "tab:mine") return wx.switchTab({ url: "/pages/mine/index" });
    if (t === "tab:farmer") return wx.redirectTo({ url: "/pages/farmer/index" });

    // 兜底
    wx.switchTab({ url: "/pages/home/index" });
  }
});

