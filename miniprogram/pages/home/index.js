Page({
  data: {
    banners: [
      { id: 1, title: "春茶上新", image: "/images/background.png" },
      { id: 2, title: "助农直采", image: "/images/background.png" },
      { id: 3, title: "茶园认养季", image: "/images/background.png" }
    ],
    categories: [
      { id: 1, name: "绿茶" },
      { id: 2, name: "红茶" },
      { id: 3, name: "乌龙茶" },
      { id: 4, name: "白茶" }
    ],
    hotItems: [
      { id: 1, name: "高山龙井 250g", desc: "明前采摘，清香回甘", price: "98" },
      { id: 2, name: "武夷岩茶礼盒", desc: "岩骨花香，送礼优选", price: "168" }
    ],
    gardens: [
      { id: 1, name: "安溪生态茶园", status: "可认养" },
      { id: 2, name: "武夷山有机茶园", status: "认养中" }
    ],
    // 茶韵红史：茶叶故事卡片内嵌示例入口（后续可改为接口数据）
    teaStorySamples: [
      { id: "longjing", title: "龙井：明前茶的千年传承" },
      { id: "wuyi", title: "武夷岩茶：岩骨花香的匠心工艺" }
    ],
    // 茶韵红史：红色茶源卡片内嵌示例入口
    redStorySamples: [
      { id: "xinyang", title: "信阳毛尖：大别山的红色茶韵" },
      { id: "anxi", title: "安溪铁观音：闽西苏区的茶乡记忆" }
    ]
  },

  /**
   * 跳转茶叶故事列表页（路由预留，页面路径与 app.json 注册保持一致）
   */
  goTeaStoryList() {
    wx.navigateTo({
      url: "/pages/tea-story-list/index"
    });
  },

  /**
   * 跳转红色茶源故事列表页
   */
  goRedTeaStoryList() {
    wx.navigateTo({
      url: "/pages/red-tea-story-list/index"
    });
  },

  /**
   * 跳转故事详情：type=tea|red，id 与 story-detail 内文案映射一致
   */
  goStoryDetail(e) {
    const { type, id } = e.currentTarget.dataset;
    if (!type || !id) return;
    wx.navigateTo({
      url: `/pages/story-detail/index?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
    });
  },

  /** 茶韵红史内：进入红色溯源独立模块 */
  goRedTraceHub() {
    wx.navigateTo({ url: "/pages/red-trace/hub/index" });
  }
});
