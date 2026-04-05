/**
 * 线下红色研学打卡：扫码或口令匹配景点，发放积分与勋章。
 */
const api = require("../../../utils/redTraceApi");
const storage = require("../../../utils/redTraceStorage");
const analytics = require("../../../utils/analytics");
const auth = require("../../../utils/auth");
const studyQuizApi = require("../../../utils/studyQuizApi");

const MEDAL_FIRST = "红色茶旅先锋";

Page({
  data: {
    manualCode: "",
    medals: [],
    checkinCount: 0,
    studySpots: []
  },

  onLoad() {
    this.loadSpots();
  },

  onShow() {
    this.refreshMedals();
  },

  async loadSpots() {
    try {
      const spots = await api.fetchStudySpots();
      this.setData({ studySpots: spots || [] });
    } catch (e) {
      wx.showToast({ title: "打卡点加载失败", icon: "none" });
    }
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

  resolveSpot(raw) {
    const code = (raw || "").trim();
    if (!code) return null;
    const spots = this.data.studySpots || [];
    return (
      spots.find((s) => code.indexOf(s.checkinCode) >= 0 || code === s.checkinCode) || null
    );
  },

  completeCheckin(spot) {
    const list = storage.getCheckins();
    if (list.indexOf(spot.id) >= 0) {
      wx.showModal({
        title: "此处已打卡",
        content: "您已在本景点打卡过。仍可参加信阳毛尖知识问答并领取电子证书。",
        confirmText: "开始答题",
        cancelText: "知道了",
        success: (res) => {
          if (res.confirm) {
            this.goQuizAfterCheckin(spot);
          }
        }
      });
      return;
    }
    storage.addCheckin(spot.id);
    storage.addPoints(spot.pointsReward || 0);
    storage.unlockMedal(MEDAL_FIRST);
    analytics.track(analytics.EVENTS.RED_CHECKIN, { spotId: spot.id, points: spot.pointsReward });
    wx.showModal({
      title: "打卡成功",
      content: `获得积分 +${spot.pointsReward}，已解锁勋章「${MEDAL_FIRST}」。是否参加信阳毛尖知识问答并领取电子证书？`,
      confirmText: "开始答题",
      cancelText: "稍后",
      success: (res) => {
        if (res.confirm) {
          this.goQuizAfterCheckin(spot);
        }
      }
    });
    this.refreshMedals();
  },

  goQuizAfterCheckin(spot) {
    wx.showLoading({ title: "准备中", mask: true });
    auth
      .silentLogin()
      .then(() => studyQuizApi.syncCheckin({ spotId: spot.id }))
      .then((body) => {
        wx.hideLoading();
        const cid = body && body.checkinRecordId;
        if (!cid) {
          wx.showToast({ title: "同步打卡失败", icon: "none" });
          return;
        }
        const name = encodeURIComponent(spot.name || "");
        wx.navigateTo({
          url: `/pages/quiz/quiz?checkinRecordId=${cid}&spotName=${name}`
        });
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: "请先登录后再答题", icon: "none" });
      });
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
  },

  /**
   * 页内入口：已打卡用户若上次点了「稍后」，可由此进入答题
   */
  onOpenQuizEntry() {
    const ids = storage.getCheckins();
    if (!ids.length) {
      wx.showToast({ title: "请先完成至少一次打卡", icon: "none" });
      return;
    }
    const spots = this.data.studySpots || [];
    const checkedSpots = ids
      .map((id) => spots.find((s) => s.id === id))
      .filter(Boolean);
    if (!checkedSpots.length) {
      wx.showToast({ title: "打卡点数据加载中，请稍后重试", icon: "none" });
      return;
    }
    if (checkedSpots.length === 1) {
      this.goQuizAfterCheckin(checkedSpots[0]);
      return;
    }
    wx.showActionSheet({
      itemList: checkedSpots.map((s) => s.name || s.id),
      success: (res) => {
        const spot = checkedSpots[res.tapIndex];
        if (spot) {
          this.goQuizAfterCheckin(spot);
        }
      }
    });
  }
});
