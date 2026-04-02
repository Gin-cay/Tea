Page({
  data: {
    redirected: false
  },
  onReady() {
    if (this.data.redirected) return;
    this.setData({ redirected: true });
    // Delay redirect to avoid launch-time page stack conflict.
    setTimeout(() => {
      const pages = getCurrentPages();
      const currentRoute = pages.length ? pages[pages.length - 1].route : "";
      if (currentRoute === "pages/home/index") return;
      wx.switchTab({
        url: "/pages/home/index",
        fail: () => {
          wx.reLaunch({ url: "/pages/home/index" });
        }
      });
    }, 50);
  }
});
