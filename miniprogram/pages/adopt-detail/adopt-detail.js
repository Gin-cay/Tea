const catalogApi = require("../../utils/catalogApi");

Page({
  data: {
    id: "",
    detail: null,
    loadError: ""
  },

  onLoad(options) {
    const raw = options.id;
    const id = raw != null ? String(raw) : "";
    this.setData({ id });
    if (!id) {
      this.setData({ loadError: "缺少茶园 id" });
      return;
    }
    this.loadDetail(id);
  },

  async loadDetail(id) {
    wx.showLoading({ title: "加载中" });
    try {
      const detail = await catalogApi.fetchAdoptGardenDetail(id);
      this.setData({ detail, loadError: "" });
    } catch (e) {
      this.setData({ detail: null, loadError: "详情加载失败" });
      wx.showToast({ title: "网络异常", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  goConfirmOrder() {
    const id = this.data.id;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/adopt-order/adopt-order?id=${id}`
    });
  },

  onTapFooterAction() {
    const app = getApp();
    const key = app.globalData.sessionStorageKey;
    const session = wx.getStorageSync(key);
    if (session && session.nickName) {
      app.globalData.userInfo = session;
      this.goConfirmOrder();
      return;
    }
    wx.getUserProfile({
      desc: "用于认养报名与订单通知",
      success: (res) => {
        const u = res.userInfo || {};
        wx.setStorageSync(key, {
          nickName: u.nickName || "茶友",
          avatarUrl: u.avatarUrl || ""
        });
        app.globalData.userInfo = u;
        wx.login({
          success: () => {
            this.goConfirmOrder();
          },
          fail: () => {
            this.goConfirmOrder();
          }
        });
      },
      fail: () => {
        wx.showModal({
          title: "需要授权",
          content: "请先同意用户信息授权以完成认养报名",
          showCancel: false
        });
      }
    });
  },

  goRedTraceHub() {
    wx.navigateTo({ url: "/pages/red-trace/hub/index" });
  },

  goRedStoryThisGarden() {
    const id = this.data.id || "1";
    wx.navigateTo({
      url: `/pages/red-trace/story-rich/index?gardenId=${id}`
    });
  }
});
