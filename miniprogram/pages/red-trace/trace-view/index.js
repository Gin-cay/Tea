/**
 * 扫码或分享进入：校验溯源令牌并展示茶园/茶农/红色历史/流程数据。
 */
const { parseTraceToken } = require("../../../utils/traceCrypto");
const api = require("../../../utils/redTraceApi");
const analytics = require("../../../utils/analytics");

Page({
  data: {
    valid: false,
    parsed: null,
    profile: null,
    seasonTwin: [],
    activeSeasonKey: "",
    twinScrollInto: "",
    loadError: ""
  },

  onLoad(options) {
    const code = options.code ? decodeURIComponent(options.code) : "";
    const parsed = parseTraceToken(code);
    if (!parsed) {
      this.setData({ valid: false });
      return;
    }
    this.setData({ parsed });
    wx.showLoading({ title: "加载中" });
    api
      .fetchGardenRedProfile(parsed.gardenId)
      .then((profile) => {
        if (!profile) {
          this.setData({ valid: false, loadError: "茶园档案不存在" });
          return;
        }
        return api.fetchSeasonTimeline(profile.gardenId).then((st) => ({
          profile,
          st
        }));
      })
      .then((pack) => {
        if (!pack) return;
        const { profile, st } = pack;
        const seasonTwin = (st && st.seasonTwin) || [];
        const activeSeasonKey = (st && st.currentSeasonKey) || "spring";
        this.setData({
          valid: true,
          profile,
          seasonTwin,
          activeSeasonKey,
          twinScrollInto: `season-${activeSeasonKey}`,
          loadError: ""
        });
        analytics.track(analytics.EVENTS.RED_TRACE_SCAN, {
          gardenId: profile.gardenId
        });
      })
      .catch(() => {
        this.setData({ valid: false, loadError: "网络异常，请重试" });
        wx.showToast({ title: "加载失败", icon: "none" });
      })
      .finally(() => wx.hideLoading());
  },

  onSeasonChipTap(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    this.setData({
      activeSeasonKey: key,
      twinScrollInto: `season-${key}`
    });
  },

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
  }
});
