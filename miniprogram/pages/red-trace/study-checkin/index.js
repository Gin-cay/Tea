/**
 * 线下红色研学打卡：扫码或口令匹配景点，发放积分与勋章。
 */
const mock = require("../../../utils/redTraceMockData");
const storage = require("../../../utils/redTraceStorage");
const analytics = require("../../../utils/analytics");

const MEDAL_FIRST = "红色茶旅先锋";

Page({
  data: {
    manualCode: "",
    medals: [],
    checkinCount: 0
  },

  onShow() {
    this.refreshMedals();
  },

  refreshMedals() {
    this.setData({
      medals: storage.getMedals(),
      checkinCount: storage.getCheckins().length
    });
  },

  onShareAppMessage() {
    return {
      title: "红色茶旅线下打卡",
      path: "/pages/red-trace/study-checkin/index"
    };
  },

  onInputCode(e) {
    this.setData({ manualCode: e.detail.value });
  },

  /** 根据口令或扫码结果匹配景点 */
  resolveSpot(raw) {
    const code = (raw || "").trim();
    if (!code) return null;
    return mock.STUDY_SPOTS.find((s) => code.indexOf(s.checkinCode) >= 0 || code === s.checkinCode) || null;
  },

  completeCheckin(spot) {
    const list = storage.getCheckins();
    if (list.indexOf(spot.id) >= 0) {
      wx.showToast({ title: "此处已打卡", icon: "none" });
      return;
    }
    storage.addCheckin(spot.id);
    storage.addPoints(spot.pointsReward || 0);
    storage.unlockMedal(MEDAL_FIRST);
    analytics.track(analytics.EVENTS.RED_CHECKIN, { spotId: spot.id, points: spot.pointsReward });
    wx.showModal({
      title: "打卡成功",
      content: `获得积分 +${spot.pointsReward}，已解锁勋章「${MEDAL_FIRST}」`,
      showCancel: false
    });
    this.refreshMedals();
  },

  onScan() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        const spot = this.resolveSpot(res.result);
        if (!spot) {
          wx.showToast({ title: "非研学打卡码", icon: "none" });
          return;
        }
        this.completeCheckin(spot);
      },
      fail: () => wx.showToast({ title: "已取消", icon: "none" })
    });
  },

  onManualSubmit() {
    const spot = this.resolveSpot(this.data.manualCode);
    if (!spot) {
      wx.showToast({ title: "口令无效", icon: "none" });
      return;
    }
    this.completeCheckin(spot);
  }
});
