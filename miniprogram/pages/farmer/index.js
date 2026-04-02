Page({
  goUpload() {
    wx.navigateTo({ url: "/pages/real-care/upload/index" });
  },

  goMine() {
    wx.navigateTo({ url: "/pages/auth/profile/index?redirect=tab:farmer" });
  }
});

