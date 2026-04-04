const storage = require("../../../utils/userProfileStorage");
const http = require("../../../utils/http");
const shopApi = require("../../../utils/shopApi");
const auth = require("../../../utils/auth");

Page({
  data: {
    redirect: "tab:home",
    returnUrl: "",

    role: "customer",
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
    this.hydrateFromServer();
  },

  async hydrateFromServer() {
    if (!http.getStoredToken()) {
      try {
        await auth.silentLogin();
      } catch (e) {
        return;
      }
    }
    try {
      const prof = await shopApi.getProfile();
      if (!prof || !prof.phone) return;
      const region = Array.isArray(prof.region) && prof.region.length === 3 ? prof.region : ["", "", ""];
      const next = {
        ...storage.ensureProfileBase(),
        role: prof.role || "customer",
        avatarUrl: prof.avatarUrl || "",
        phone: prof.phone || "",
        nickname: prof.nickname || "",
        address: { region, detail: prof.addressDetail || "" },
        updatedAt: Date.now()
      };
      storage.setProfile(next);
      this.setData({
        role: next.role,
        avatarUrl: next.avatarUrl,
        phone: next.phone,
        nickname: next.nickname,
        region,
        regionText: this.formatRegionText(region),
        addressDetail: next.address.detail || ""
      });
    } catch (e) {
      /* 未登录或首次用户 */
    }
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

  async resolveAvatarUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    const data = await http.uploadFile({
      path: "/api/community/upload",
      filePath: path,
      showLoading: true,
      loadingTitle: "上传头像",
      needAuth: true
    });
    return (data && data.url) || "";
  },

  async onSubmit() {
    const role = this.data.role;
    let avatarUrl = String(this.data.avatarUrl || "").trim();
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

    if (!http.getStoredToken()) {
      try {
        await auth.silentLogin();
      } catch (e) {
        wx.showToast({ title: "请先登录", icon: "none" });
        return;
      }
    }

    try {
      avatarUrl = await this.resolveAvatarUrl(avatarUrl);
      if (!avatarUrl) {
        wx.showToast({ title: "头像上传失败", icon: "none" });
        return;
      }
    } catch (e) {
      return;
    }

    try {
      await shopApi.putProfile({
        nickname,
        avatarUrl,
        phone,
        role,
        region,
        addressDetail
      });
    } catch (e) {
      return;
    }

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
    this.setData({ avatarUrl });

    wx.showToast({ title: "保存成功", icon: "success" });

    const to = role === "farmer" ? "tab:farmer" : "tab:home";
    this.goAfterSubmit(to);
  },

  goAfterSubmit(target) {
    if (this.data.returnUrl) {
      wx.redirectTo({ url: this.data.returnUrl });
      return;
    }

    const t = target || this.data.redirect || "tab:home";

    if (t === "tab:home") return wx.switchTab({ url: "/pages/home/index" });
    if (t === "tab:adopt") return wx.switchTab({ url: "/pages/adopt/adopt" });
    if (t === "tab:mall") return wx.switchTab({ url: "/pages/mall/index" });
    if (t === "tab:mine") return wx.switchTab({ url: "/pages/mine/index" });
    if (t === "tab:farmer") return wx.redirectTo({ url: "/pages/farmer/index" });

    wx.switchTab({ url: "/pages/home/index" });
  }
});
