/**
 * 商城商品详情：突出「红色溯源」核心卖点，跳转溯源枢纽。
 */
const CATALOG = {
  1: {
    id: 1,
    name: "明前龙井",
    category: "绿茶",
    price: 128,
    sold: 321,
    cover: "/images/banner-home.png",
    origin: "浙西共富茶园基地",
    redUSP: "一品一码绑定茶园档案，扫码可见茶农故事与红色茶乡历史。",
    traceFeature: "支持认养用户同步生成红色茶源溯源二维码，全流程种植加工可视化。"
  },
  2: {
    id: 2,
    name: "正山小种",
    category: "红茶",
    price: 96,
    sold: 210,
    cover: "/images/ai_example1.png",
    origin: "武夷山脉云雾产区",
    redUSP: "红色茶路文化赋能，礼盒附研学打卡指引。",
    traceFeature: "有机产区 + 红色叙事双认证展示（演示数据）。"
  },
  3: {
    id: 3,
    name: "春茶礼盒",
    category: "礼盒",
    price: 198,
    sold: 125,
    cover: "/images/banner-mall.png",
    origin: "多产地优选拼配",
    redUSP: "礼盒内含红色茶乡明信片与溯源导览入口。",
    traceFeature: "企业团购可批量开通溯源与电子证书服务（接口预留）。"
  }
};

Page({
  data: {
    product: null
  },

  onLoad(options) {
    const id = options.id != null ? String(options.id) : "";
    const product = CATALOG[id] || null;
    this.setData({ product });
  },

  onShareAppMessage() {
    const p = this.data.product;
    return {
      title: p ? `${p.name} · 红色溯源好茶` : "茶叶助农商城",
      path: p ? `/pages/mall-product-detail/index?id=${p.id}` : "/pages/mall/index"
    };
  },

  goRedHub() {
    wx.navigateTo({ url: "/pages/red-trace/hub/index" });
  }
});
