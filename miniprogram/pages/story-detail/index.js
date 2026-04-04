const catalogApi = require("../../utils/catalogApi");

Page({
  data: {
    story: null,
    storyHtml: "",
    loadError: ""
  },

  onLoad(options) {
    const type = options.type || "";
    const id = options.id || "";
    if (!type || !id) {
      this.setData({ loadError: "参数不完整" });
      return;
    }
    this.loadStory(type, id);
  },

  async loadStory(type, id) {
    try {
      const s = await catalogApi.fetchStoryDetail(type, id);
      const html = s.bodyHtml || s.body || "";
      this.setData({
        story: {
          title: s.title,
          subtitle: s.subtitle || s.desc || ""
        },
        storyHtml: html,
        loadError: ""
      });
      if (s.title) wx.setNavigationBarTitle({ title: s.title });
    } catch (e) {
      this.setData({ story: null, storyHtml: "", loadError: "故事不存在或加载失败" });
    }
  }
});
