Page({
  data: {
    list: [
      {
        id: "longjing",
        title: "龙井：明前茶的千年传承",
        desc: "江南春色与采摘时令中的茶文化"
      },
      {
        id: "wuyi",
        title: "武夷岩茶：岩骨花香的匠心工艺",
        desc: "炭焙与做青里的制茶智慧"
      }
    ]
  },

  /** 进入详情页，与首页 goStoryDetail 路由约定一致 */
  goDetail(e) {
    const { type, id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/story-detail/index?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
    });
  }
});
