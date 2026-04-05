/**
 * 收货地址：读写 /api/profile（需登录），与资料页字段一致
 */
const shopApi = require("../../utils/shopApi");
const auth = require("../../utils/auth");
const http = require("../../utils/http");
const userProfileStorage = require("../../utils/userProfileStorage");
const mineAuth = require("../../utils/mineAuth");

Page({
  data: {
    region: ["", "", ""],
    regionText: "",
    addressDetail: "",
    /** 保存完整资料提交用 */
    nickname: "",
    avatarUrl: "",
    phone: "",
    role: "customer",
    saving: false
  },

  async onLoad() {
    if (!(await mineAuth.requireLoginForMine({ redirect: "tab:mine" }))) {
      return;
    }
    await this.hydrate();
  },

  formatRegionText(r) {
    if (!Array.isArray(r) || r.length !== 3) return "";
    if (r.some((x) => !String(x || "").trim())) return "";
    return r.join(" ");
  },

  async hydrate() {
    if (!http.getStoredToken()) {
      try {
        await auth.silentLogin();
      } catch (e) {
        return;
      }
    }
    try {
      const prof = await shopApi.getProfile();
      if (!prof) return;
      const region = Array.isArray(prof.region) && prof.region.length === 3 ? prof.region : ["", "", ""];
      this.setData({
        nickname: prof.nickname || "",
        avatarUrl: prof.avatarUrl || "",
        phone: prof.phone || "",
        role: prof.role === "farmer" ? "farmer" : "customer",
        region,
        regionText: this.formatRegionText(region),
        addressDetail: prof.addressDetail || ""
      });
    } catch (e) {
      const p = userProfileStorage.getProfile();
      if (p && p.address) {
        const region = p.address.region || ["", "", ""];
        this.setData({
          nickname: p.nickname || "",
          avatarUrl: p.avatarUrl || "",
          phone: p.phone || "",
          role: p.role || "customer",
          region,
          regionText: this.formatRegionText(region),
          addressDetail: p.address.detail || ""
        });
      }
    }
  },

  onRegionChange(e) {
    const v = (e.detail && e.detail.value) || ["", "", ""];
    this.setData({
      region: v,
      regionText: this.formatRegionText(v)
    });
  },

  onDetailInput(e) {
    this.setData({ addressDetail: (e.detail && e.detail.value) || "" });
  },

  async onSave() {
    const { nickname, avatarUrl, phone, role, region, addressDetail } = this.data;
    if (!Array.isArray(region) || region.length !== 3 || region.some((x) => !String(x || "").trim())) {
      wx.showToast({ title: "请选择完整省市区", icon: "none" });
      return;
    }
    if (!String(addressDetail || "").trim()) {
      wx.showToast({ title: "请填写详细地址", icon: "none" });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(String(phone || ""))) {
      wx.showToast({ title: "请先在「设置」完善有效手机号", icon: "none" });
      return;
    }
    if (!String(nickname || "").trim() || !String(avatarUrl || "").trim()) {
      wx.showToast({ title: "请先在「设置」完善昵称与头像", icon: "none" });
      return;
    }

    this.setData({ saving: true });
    try {
      await shopApi.putProfile({
        nickname: String(nickname).trim(),
        avatarUrl: String(avatarUrl).trim(),
        phone: String(phone).trim(),
        role: role === "farmer" ? "farmer" : "customer",
        region,
        addressDetail: String(addressDetail).trim()
      });
      const prev = userProfileStorage.ensureProfileBase();
      userProfileStorage.setProfile({
        ...prev,
        nickname: String(nickname).trim(),
        avatarUrl: String(avatarUrl).trim(),
        phone: String(phone).trim(),
        role: role === "farmer" ? "farmer" : "customer",
        address: { region, detail: String(addressDetail).trim() },
        updatedAt: Date.now()
      });
      wx.showToast({ title: "已保存", icon: "success" });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (e) {
      /* http 已 toast */
    } finally {
      this.setData({ saving: false });
    }
  }
});
