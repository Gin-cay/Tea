/**
 * 客服中心：展示可配置的联系方式；在线客服依赖公众平台「客服」能力
 */
function getServiceConfig() {
  try {
    const app = getApp();
    const c = app && app.globalData && app.globalData.customerService;
    if (c && c.phone) return c;
  } catch (e) {
    /* ignore */
  }
  return {
    phone: "400-000-0000",
    wechat: "tea_help_demo",
    hours: "工作日 9:00-18:00",
    notice: "咨询订单、物流时请准备好订单号；溯源与认养问题请说明茶园或批次信息。"
  };
}

Page({
  data: {
    service: {}
  },

  onLoad() {
    this.setData({ service: getServiceConfig() });
  },

  onCall() {
    const p = this.data.service.phone;
    if (!p) return;
    wx.makePhoneCall({ phoneNumber: String(p).replace(/\s/g, "") });
  },

  onCopyWechat() {
    const w = this.data.service.wechat;
    if (!w) return;
    wx.setClipboardData({
      data: String(w),
      success: () => wx.showToast({ title: "已复制", icon: "none" })
    });
  }
});
