Page({
  data: {
    categories: [
      "全部",
      "半亩塘茶园（益龙芳）认养系列",
      "云雾山有机茶园认养",
      "龙井原产地共富专区"
    ],
    activeCategory: "全部",
    sorts: ["综合", "销量", "距离", "人气"],
    activeSort: "综合",
    list: [
      {
        id: 1,
        cover: "/images/banner-home.png",
        name: "半亩塘·益龙芳明前绿茶认养",
        cycleLabel: "认养周期：2026 春茶季",
        progress: 72,
        variety: "龙井群体种",
        period: "12 个月",
        yield: "预计鲜叶约 8kg/亩",
        price: 699,
        joinCount: 328
      },
      {
        id: 2,
        cover: "/images/banner-mall.png",
        name: "云雾山有机红茶认养套餐",
        cycleLabel: "认养周期：年度制茶全周期",
        progress: 45,
        variety: "金骏眉系",
        period: "12 个月",
        yield: "预计干茶约 3.5kg/份",
        price: 1280,
        joinCount: 156
      },
      {
        id: 3,
        cover: "/images/background.png",
        name: "共富茶园·家庭共享认养",
        cycleLabel: "认养周期：按季开放",
        progress: 88,
        variety: "多品种拼配",
        period: "3 个月/季",
        yield: "季末寄送茶样礼盒",
        price: 399,
        joinCount: 902
      }
    ]
  },

  onTapCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.name });
  },

  onTapSort(e) {
    this.setData({ activeSort: e.currentTarget.dataset.name });
  },

  onTapEnroll(e) {
    const id = e.currentTarget.dataset.id;
    if (id == null || id === "") return;
    wx.navigateTo({
      url: `/pages/adopt-detail/adopt-detail?id=${id}`
    });
  }
});
