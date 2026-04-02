/**
 * 运营数据埋点：封装 wx.reportAnalytics，未开通自定义分析时降级为本地日志。
 * 在微信公众平台「统计 - 自定义分析」中配置同名事件后，即可在后台查看。
 */

const EVENTS = {
  RED_TRACE_HUB_VIEW: "red_trace_hub_view",
  RED_TRACE_QR_SHOW: "red_trace_qr_show",
  RED_TRACE_SCAN: "red_trace_scan",
  RED_STORY_VIEW: "red_story_view",
  RED_CERT_VIEW: "red_cert_view",
  RED_CERT_SHARE: "red_cert_share",
  RED_STUDY_VIEW: "red_study_view",
  RED_CHECKIN: "red_checkin",
  RED_POINTS_EXCHANGE: "red_points_exchange"
};

/**
 * @param {string} eventKey EVENTS 中的 key 或直接传事件名
 * @param {Record<string, string | number>} [params]
 */
function track(eventKey, params) {
  const name = EVENTS[eventKey] || eventKey;
  const payload = params || {};
  try {
    if (typeof wx.reportAnalytics === "function") {
      wx.reportAnalytics(name, payload);
    } else {
      console.log("[analytics]", name, payload);
    }
  } catch (e) {
    console.warn("[analytics] skip", name, e);
  }
}

module.exports = {
  EVENTS,
  track
};
