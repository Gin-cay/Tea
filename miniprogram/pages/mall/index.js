Page({
  data: {
    keyword: "",
    categories: ["全部", "绿茶", "红茶", "礼盒"],
    activeCategory: "全部",
    products: [
      {
        id: 1,
        name: "明前龙井",
        category: "绿茶",
        price: 128,
        sold: 321,
        cover: "/images/banner-home.png",
        redSelling: "红色溯源：一品一码，茶园档案与茶农故事可查"
      },
      {
        id: 2,
        name: "正山小种",
        category: "红茶",
        price: 96,
        sold: 210,
        cover: "/images/ai_example1.png",
        redSelling: "红色茶路赋能 · 礼盒附研学打卡指引"
      },
      {
        id: 3,
        name: "春茶礼盒",
        category: "礼盒",
        price: 198,
        sold: 125,
        cover: "/images/banner-mall.png",
        redSelling: "红色茶乡明信片 + 溯源导览入口"
      }
    ]
  },
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },
  onTapCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.category });
  },

  /** 进入商品详情（展示红色溯源卖点） */
  onTapProduct(e) {
    const id = e.currentTarget.dataset.id;
    if (id == null) return;
    wx.navigateTo({
      url: `/pages/mall-product-detail/index?id=${id}`
    });
  }
});
