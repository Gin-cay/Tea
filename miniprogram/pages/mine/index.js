/**
 * 我的：功能入口、订单快捷入口、溯源角色动态菜单
 * - 我的订单 / 收藏 / 收货地址：需登录（JWT），茶农隐藏「我的收藏」
 * - 客服中心：无需登录
 */
const traceWorkflowApi = require("../../utils/traceWorkflowApi");
const userProfileStorage = require("../../utils/userProfileStorage");
const mineAuth = require("../../utils/mineAuth");

const TRACE_EXTRA = [
  { title: "溯源数据上报", url: "/pages/trace-report/index", badge: "溯", requireAuth: true },
  { title: "我的溯源上报", url: "/pages/trace-report/my", badge: "报", requireAuth: true }
];

Page({
  data: {
    user: {
      nickname: "茶友",
      level: "普通会员",
      avatarUrl: ""
    },
    userRole: "customer",
    menuList: [],
    /**
     * 前 3 项为红色溯源相关；其后插入溯源工单（若有权限）；再后为其余入口。
     * customerOnly: 仅普通顾客显示（茶农不显示商城收藏）
     * requireAuth: 跳转前校验登录
     * needCert: 电子证书需认养记录
     */
    _menuBase: [
      { title: "红色溯源", url: "/pages/red-trace/hub/index", badge: "溯源" },
      { title: "研学打卡", url: "/pages/red-trace/study-checkin/index", badge: "卡" },
      { title: "电子证书", url: "/pages/red-trace/certificate/index", badge: "证", needCert: true },
      { title: "公益里程碑", url: "/pages/public-benefit/milestone/index", badge: "益" },
      { title: "我的订单", url: "/pages/mall-order-list/index", requireAuth: true },
      {
        title: "我的收藏",
        url: "/pages/mine-favorites/index",
        requireAuth: true,
        customerOnly: true
      },
      { title: "收货地址", url: "/pages/mine-address/index", requireAuth: true },
      { title: "客服中心", url: "/pages/mine-service/index" },
      { title: "设置", url: "/pages/auth/profile/index?redirect=tab:mine" }
    ]
  },

  onLoad() {
    this._syncUserRole();
    this.setData({ menuList: this._composeMenu(false) });
  },

  onShow() {
    this._syncUserRole();
    const base = this.data._menuBase;
    traceWorkflowApi
      .fetchPermission({ showError: false, needAuth: true })
      .then((perm) => {
        const ok = perm && (perm.isSuper || (perm.stages && perm.stages.length > 0));
        this.setData({ menuList: this._composeMenu(!!ok) });
      })
      .catch(() => {
        this.setData({ menuList: this._composeMenu(false) });
      });
  },

  /** @param {boolean} traceOk 是否插入溯源上报入口 */
  _composeMenu(traceOk) {
    const role = this.data.userRole;
    const base = this.data._menuBase;
    const head = base.slice(0, 3);
    let tail = base.slice(3);
    if (role === "farmer") {
      tail = tail.filter((it) => !it.customerOnly);
    }
    const mid = traceOk ? TRACE_EXTRA.slice() : [];
    return head.concat(mid).concat(tail);
  },

  _syncUserRole() {
    const p = userProfileStorage.getProfile();
    const role = p && p.role === "farmer" ? "farmer" : "customer";
    this.setData({
      userRole: role,
      user: {
        nickname: (p && p.nickname) || "茶友",
        level: role === "farmer" ? "茶农" : "普通会员",
        avatarUrl: (p && p.avatarUrl) || ""
      }
    });
  },

  goProfile() {
    wx.navigateTo({ url: "/pages/auth/profile/index?redirect=tab:mine" });
  },

  /**
   * 订单中心四宫格：带状态筛进入订单列表（与后端 status 字段对齐，无单时列表为空属正常）
   */
  onOrderTabTap(e) {
    const tab = e.currentTarget.dataset.tab || "all";
    const q = tab === "all" ? "" : `?tab=${encodeURIComponent(tab)}`;
    mineAuth.requireLoginForMine({ redirect: "tab:mine" }).then((ok) => {
      if (!ok) return;
      wx.navigateTo({ url: `/pages/mall-order-list/index${q}` });
    });
  },

  async onMenuTap(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const item = (this.data.menuList || [])[idx];
    if (!item || !item.url) {
      wx.showToast({ title: "功能不可用", icon: "none" });
      return;
    }
    if (item.requireAuth) {
      const ok = await mineAuth.requireLoginForMine({ redirect: "tab:mine" });
      if (!ok) return;
    }
    if (item.needCert) {
      const storage = require("../../utils/redTraceStorage");
      const list = storage.getTraceRecords();
      if (!list.length) {
        wx.showToast({ title: "认养成功后可查看证书", icon: "none" });
        return;
      }
      wx.navigateTo({
        url: `${item.url}?traceToken=${encodeURIComponent(list[0].traceToken)}`
      });
      return;
    }
    wx.navigateTo({ url: item.url });
  }
});
