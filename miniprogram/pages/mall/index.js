const catalogApi = require("../../utils/catalogApi");

Page({
  data: {
    keyword: "",
    categories: [{ id: "all", name: "全部" }],
    activeCategoryId: "all",
    products: [],
    loadError: ""
  },

  onLoad() {
    this.bootstrap();
  },

  async bootstrap() {
    await this.loadCategories();
    await this.loadProducts();
  },

  async loadCategories() {
    try {
      const rows = await catalogApi.fetchMallCategories();
      const list = (rows || []).map((c) => ({ id: String(c.id), name: c.name }));
      this.setData({ categories: [{ id: "all", name: "全部" }].concat(list) });
    } catch (e) {
      this.setData({ categories: [{ id: "all", name: "全部" }] });
    }
  },

  async loadProducts() {
    this.setData({ loadError: "" });
    try {
      const cid = this.data.activeCategoryId;
      const res = await catalogApi.fetchMallProducts({
        keyword: this.data.keyword,
        categoryId: cid === "all" ? undefined : Number(cid),
        pageSize: 100
      });
      this.setData({ products: (res && res.list) || [] });
    } catch (e) {
      this.setData({ loadError: "商品列表加载失败", products: [] });
    }
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearchConfirm() {
    this.loadProducts();
  },

  onTapCategory(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    this.setData({ activeCategoryId: id });
    this.loadProducts();
  },

  onTapProduct(e) {
    const id = e.currentTarget.dataset.id;
    if (id == null) return;
    wx.navigateTo({
      url: `/pages/mall-product-detail/index?id=${id}`
    });
  },

  goCart() {
    wx.navigateTo({ url: "/pages/mall-cart/index" });
  }
});
