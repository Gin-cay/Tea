Page({
  data: {
    user: {
      nickname: "茶友",
      level: "普通会员",
      avatarUrl: ""
    },
    /**
     * 菜单项：url 以 / 开头则 navigateTo（非 tab 页）。
     * 红色溯源相关入口带 badge 突出展示。
     */
    menuList: [
      { title: "红色溯源", url: "/pages/red-trace/hub/index", badge: "溯源" },
      { title: "研学打卡", url: "/pages/red-trace/study-checkin/index", badge: "卡" },
      { title: "电子证书", url: "/pages/red-trace/certificate/index", badge: "证", needCert: true },
      { title: "公益里程碑", url: "/pages/public-benefit/milestone/index", badge: "益" },
      { title: "我的订单", url: "" },
      { title: "我的收藏", url: "" },
      { title: "收货地址", url: "" },
      { title: "客服中心", url: "" },
      // 设置入口：进入登录/注册/完善资料（按你要求）
      { title: "设置", url: "/pages/auth/profile/index?redirect=tab:mine" }
    ]
  },

  onShow() {
    const storage = require("../../utils/userProfileStorage");
    const p = storage.getProfile();
    if (p) {
      this.setData({
        user: {
          nickname: p.nickname || "茶友",
          level: p.role === "farmer" ? "茶农" : "普通会员",
          avatarUrl: p.avatarUrl || ""
        }
      });
      return;
    }
  },

  /** 点击头像卡片：进入登录/注册/完善资料 */
  goProfile() {
    wx.navigateTo({ url: "/pages/auth/profile/index?redirect=tab:mine" });
  },

  onMenuTap(e) {
    const ds = e.currentTarget.dataset;
    const url = ds.url;
    if (!url) {
      wx.showToast({ title: "功能开发中", icon: "none" });
      return;
    }
    if (ds.needcert) {
      const storage = require("../../utils/redTraceStorage");
      const list = storage.getTraceRecords();
      if (!list.length) {
        wx.showToast({ title: "认养成功后可查看证书", icon: "none" });
        return;
      }
      wx.navigateTo({
        url: `${url}?traceToken=${encodeURIComponent(list[0].traceToken)}`
      });
      return;
    }
    wx.navigateTo({ url });
  }
});
