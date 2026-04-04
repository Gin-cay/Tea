/**
 * 公益里程碑：统一走后端接口（需配置 app.globalData.apiBaseUrl）。
 */
const http = require("./http");

function fetchUserMilestoneOverview() {
  return http.request({
    path: "/public-benefit/milestones",
    method: "GET"
  });
}

function fetchDonationRecordDetail(recordId) {
  return http.request({
    path: `/public-benefit/records/${encodeURIComponent(recordId)}`,
    method: "GET"
  });
}

function redeemPoints(payload) {
  return http.request({
    path: "/points/redeem",
    method: "POST",
    data: payload,
    needAuth: true
  });
}

module.exports = {
  fetchUserMilestoneOverview,
  fetchDonationRecordDetail,
  redeemPoints
};
