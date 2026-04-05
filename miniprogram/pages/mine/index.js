const traceWorkflowApi = require("../../utils/traceWorkflowApi");

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
    menuList: [],
    _menuBase: [
      { title: "红色溯源", url: "/pages/red-trace/hub/index", badge: "溯源" },
      { title: "研学打卡", url: "/pages/red-trace/study-checkin/index", badge: "卡" },
      { title: "电子证书", url: "/pages/red-trace/certificate/index", badge: "证", needCert: true },
      { title: "公益里程碑", url: "/pages/public-benefit/milestone/index", badge: "益" },
      { title: "我的订单", url: "/pages/mall-order-list/index" },
      { title: "我的收藏", url: "" },
      { title: "收货地址", url: "" },
      { title: "客服中心", url: "" },
      { title: "设置", url: "/pages/auth/profile/index?redirect=tab:mine" }
    ]
  },

  onLoad() {
    this.setData({ menuList: this.data._menuBase.slice() });
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
    }
    const base = this.data._menuBase;
    traceWorkflowApi
      .fetchPermission({ showError: false, needAuth: true })
      .then((perm) => {
        const ok = perm && (perm.isSuper || (perm.stages && perm.stages.length > 0));
        let list = base.slice();
        if (ok) {
          const extra = [
            { title: "溯源数据上报", url: "/pages/trace-report/index", badge: "溯" },
            { title: "我的溯源上报", url: "/pages/trace-report/my", badge: "报" }
          ];
          list = list.slice(0, 3).concat(extra).concat(list.slice(3));
        }
        this.setData({ menuList: list });
      })
      .catch(() => {
        this.setData({ menuList: base.slice() });
      });
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
