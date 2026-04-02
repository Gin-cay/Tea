const api = require("../../../utils/publicBenefitApi");

function toDisplayMilestone(item) {
  const percent = Math.min(100, Math.floor((item.currentAmount / item.targetAmount) * 100));
  const statusMap = {
    completed: { text: "已完成", className: "status-completed" },
    in_progress: { text: "进行中", className: "status-progress" },
    locked: { text: "待解锁", className: "status-locked" }
  };
  const view = statusMap[item.status] || statusMap.locked;
  return {
    ...item,
    progressPercent: percent,
    statusText: view.text,
    statusClass: view.className
  };
}

Page({
  data: {
    summary: {
      totalAmount: 0,
      currentMilestoneName: "",
      currentMilestoneTarget: 0,
      currentMilestoneProgress: 0,
      completedCount: 0,
      pendingCount: 0
    },
    milestones: [],
    points: {
      balance: 0,
      expiringAt: ""
    },
    redeemGoods: [],
    showRedeem: false,
    activeRecord: null
  },

  onLoad() {
    this.loadOverview();
  },

  async loadOverview() {
    wx.showLoading({ title: "加载中" });
    try {
      const data = await api.fetchUserMilestoneOverview();
      this.setData({
        summary: data.summary || this.data.summary,
        milestones: (data.milestones || []).map(toDisplayMilestone),
        points: data.points || this.data.points,
        redeemGoods: data.redeemGoods || []
      });
    } catch (err) {
      wx.showToast({ title: "加载失败，请稍后重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  async onTapMilestone(e) {
    const idx = e.currentTarget.dataset.index;
    const row = this.data.milestones[idx];
    if (!row || row.status !== "completed" || !row.recordId) return;
    wx.showLoading({ title: "加载详情" });
    try {
      const detail = await api.fetchDonationRecordDetail(row.recordId);
      if (!detail) {
        wx.showToast({ title: "暂无详情", icon: "none" });
        return;
      }
      this.setData({ activeRecord: detail });
    } catch (err) {
      wx.showToast({ title: "详情加载失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  onCloseDetail() {
    this.setData({ activeRecord: null });
  },

  onOpenRedeem() {
    this.setData({ showRedeem: !this.data.showRedeem });
  },

  async onTapRedeem(e) {
    const goodsId = e.currentTarget.dataset.id;
    const title = e.currentTarget.dataset.title;
    const cost = Number(e.currentTarget.dataset.cost || 0);
    if (this.data.points.balance < cost) {
      wx.showToast({ title: "积分不足", icon: "none" });
      return;
    }
    wx.showLoading({ title: "兑换中" });
    try {
      const result = await api.redeemPoints({ goodsId, pointsCost: cost });
      if (result && result.success) {
        this.setData({
          points: {
            ...this.data.points,
            balance: this.data.points.balance - cost
          }
        });
        wx.showModal({
          title: "兑换成功",
          content: `${title} 兑换申请已提交。`,
          showCancel: false
        });
      } else {
        wx.showToast({ title: "兑换失败", icon: "none" });
      }
    } catch (err) {
      wx.showToast({ title: "兑换失败，请稍后重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  }
});
