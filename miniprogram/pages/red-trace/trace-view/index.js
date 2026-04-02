/**
 * 扫码或分享进入：校验溯源令牌并展示茶园/茶农/红色历史/流程数据。
 */
const { parseTraceToken } = require("../../../utils/traceCrypto");
const api = require("../../../utils/redTraceApi");
const analytics = require("../../../utils/analytics");
const seasonTwinMock = require("../../../utils/seasonTwinMock");

Page({
  data: {
    valid: false,
    parsed: null,
    profile: null,
    /** 四季茶树孪生数据 */
    seasonTwin: [],
    /** 当前选中季节 key：spring | summer | autumn | winter */
    activeSeasonKey: "",
    /** 横向滚动定位到 id="season-xxx" */
    twinScrollInto: ""
  },

  onLoad(options) {
    const code = options.code ? decodeURIComponent(options.code) : "";
    const parsed = parseTraceToken(code);
    if (!parsed) {
      this.setData({ valid: false });
      return;
    }
    api.fetchGardenRedProfile(parsed.gardenId).then((profile) => {
      if (!profile) {
        this.setData({ valid: false });
        return;
      }
      const seasonTwin = seasonTwinMock.getSeasonTwinConfig(profile.gardenId);
      const activeSeasonKey = seasonTwinMock.getCurrentSeasonKey();
      this.setData({
        valid: true,
        parsed,
        profile,
        seasonTwin,
        activeSeasonKey,
        twinScrollInto: `season-${activeSeasonKey}`
      });
      analytics.track(analytics.EVENTS.RED_TRACE_SCAN, {
        gardenId: parsed.gardenId
      });
    });
  },

  /** 点击季节标签：高亮 + 滚动到对应卡片 */
  onSeasonChipTap(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    this.setData({
      activeSeasonKey: key,
      twinScrollInto: `season-${key}`
    });
  },

  /** 点击卡片：与标签联动（便于用户点图时也切换高亮） */
  onSeasonCardTap(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    this.setData({ activeSeasonKey: key });
  },

  onShareAppMessage() {
    return {
      title: "红色茶源溯源详情",
      path: "/pages/red-trace/hub/index"
    };
  },

  goRichStory(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/red-trace/story-rich/index?gardenId=${id}`
    });
  },

  goHub() {
    wx.navigateTo({ url: "/pages/red-trace/hub/index" });
  }
});
