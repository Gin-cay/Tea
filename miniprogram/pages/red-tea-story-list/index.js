Page({
  data: {
    list: [
      {
        id: "xinyang",
        title: "信阳毛尖：大别山的红色茶韵",
        desc: "革命老区与茶乡记忆"
      },
      {
        id: "anxi",
        title: "安溪铁观音：闽西苏区的茶乡记忆",
        desc: "红色足迹与乌龙茶乡"
      }
    ]
  },

  goDetail(e) {
    const { type, id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/story-detail/index?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
    });
  }
});
