/**
 * 公益里程碑接口封装。
 * - 配置真实 apiBaseUrl 时走后端接口
 * - 未配置时使用本地 mock 数据，便于前端先联调
 */
const MOCK_OVERVIEW = {
  summary: {
    totalAmount: 2680,
    currentMilestoneName: "灌溉升级计划",
    currentMilestoneTarget: 3000,
    currentMilestoneProgress: 2680,
    completedCount: 2,
    pendingCount: 2
  },
  points: {
    balance: 860,
    expiringAt: "2026-12-31"
  },
  milestones: [
    {
      id: "ms-1000",
      name: "农具捐助计划",
      targetAmount: 1000,
      currentAmount: 1000,
      donateContent: "为茶农家庭捐助采茶篓、修枝剪与防护手套",
      status: "completed",
      recordId: "record-1000"
    },
    {
      id: "ms-2000",
      name: "茶园修护计划",
      targetAmount: 2000,
      currentAmount: 2000,
      donateContent: "修复茶垄步道并补充有机肥，降低雨季水土流失",
      status: "completed",
      recordId: "record-2000"
    },
    {
      id: "ms-3000",
      name: "灌溉升级计划",
      targetAmount: 3000,
      currentAmount: 2680,
      donateContent: "修缮茶园灌溉设施，新增节水滴灌管线",
      status: "in_progress",
      recordId: ""
    },
    {
      id: "ms-5000",
      name: "助学共建计划",
      targetAmount: 5000,
      currentAmount: 2680,
      donateContent: "支持茶乡留守儿童研学物资与公益课堂",
      status: "locked",
      recordId: ""
    }
  ],
  redeemGoods: [
    { id: "rd-tea-01", title: "50g 体验茶礼", pointsCost: 300, type: "tea" },
    { id: "rd-around-01", title: "茶乡帆布袋", pointsCost: 450, type: "around" },
    { id: "rd-coupon-01", title: "商城 30 元抵扣券", pointsCost: 600, type: "coupon" }
  ]
};

const MOCK_RECORDS = {
  "record-1000": {
    recordId: "record-1000",
    milestoneName: "农具捐助计划",
    donateDetail: "已向 6 户茶农家庭发放采茶工具包，覆盖春茶采摘关键节点。",
    executionProgress: "执行进度 100%，全部农具已签收并投入使用。",
    feedbackList: [
      { imageUrl: "/images/banner-home.png", text: "茶农领取农具后现场合影" },
      { imageUrl: "/images/background.png", text: "春茶采摘效率提升记录" }
    ],
    certificate: {
      certNo: "PB-2026-1000-01",
      issuer: "茶叶助农公益中心",
      issuedAt: "2026-03-10"
    }
  },
  "record-2000": {
    recordId: "record-2000",
    milestoneName: "茶园修护计划",
    donateDetail: "完成 1.2 公里茶垄步道修复及坡面植被加固，提升雨季通行与防护能力。",
    executionProgress: "执行进度 100%，第三方巡检已验收通过。",
    feedbackList: [
      { imageUrl: "/images/banner-mall.png", text: "茶垄步道修复前后对比" },
      { imageUrl: "/images/banner-home.png", text: "修护完成后现场验收" }
    ],
    certificate: {
      certNo: "PB-2026-2000-01",
      issuer: "茶叶助农公益中心",
      issuedAt: "2026-03-28"
    }
  }
};

function isRealApi(base) {
  return !!base && base.indexOf("your-api") < 0;
}

function fetchUserMilestoneOverview() {
  const app = getApp();
  const base = (app && app.globalData && app.globalData.apiBaseUrl) || "";
  if (!isRealApi(base)) {
    return Promise.resolve(JSON.parse(JSON.stringify(MOCK_OVERVIEW)));
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${base}/public-benefit/milestones`,
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data) resolve(res.data);
        else reject(new Error("fetch milestones failed"));
      },
      fail: reject
    });
  });
}

function fetchDonationRecordDetail(recordId) {
  const app = getApp();
  const base = (app && app.globalData && app.globalData.apiBaseUrl) || "";
  if (!isRealApi(base)) {
    return Promise.resolve(MOCK_RECORDS[recordId] || null);
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${base}/public-benefit/records/${encodeURIComponent(recordId)}`,
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data) resolve(res.data);
        else reject(new Error("fetch record detail failed"));
      },
      fail: reject
    });
  });
}

function redeemPoints(payload) {
  const app = getApp();
  const base = (app && app.globalData && app.globalData.apiBaseUrl) || "";
  if (!isRealApi(base)) {
    return Promise.resolve({
      success: true,
      redeemId: `mock-${Date.now()}`,
      message: "兑换成功，预计 3-5 个工作日发放。"
    });
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${base}/points/redeem`,
      method: "POST",
      header: { "content-type": "application/json" },
      data: payload,
      success: (res) => {
        if (res.statusCode === 200 && res.data) resolve(res.data);
        else reject(new Error("redeem failed"));
      },
      fail: reject
    });
  });
}

module.exports = {
  fetchUserMilestoneOverview,
  fetchDonationRecordDetail,
  redeemPoints
};
