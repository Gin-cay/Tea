/**
 * 红色溯源、研学、季节孪生：真实接口封装。
 */
const http = require("./http");

/**
 * @param {string} gardenId
 * @returns {Promise<object>}
 */
function fetchGardenRedProfile(gardenId) {
  return http.request({
    path: `/red-trace/garden/${encodeURIComponent(gardenId)}`,
    method: "GET",
    needAuth: false
  });
}

function fetchStudySpots() {
  return http.request({
    path: "/red-trace/study/spots",
    method: "GET",
    needAuth: false
  });
}

function fetchStudyRoutes() {
  return http.request({
    path: "/red-trace/study/routes",
    method: "GET",
    needAuth: false
  });
}

/**
 * @param {string} gardenId
 */
function fetchSeasonTimeline(gardenId) {
  return http.request({
    path: `/garden/season-timeline/${encodeURIComponent(gardenId)}`,
    method: "GET",
    needAuth: false
  });
}

/**
 * @param {{ routeId: string, note?: string }} payload
 */
function submitStudyBooking(payload) {
  return http.request({
    path: "/api/red-study/booking",
    method: "POST",
    data: payload,
    needAuth: true
  });
}

/**
 * @param {string} token
 */
function verifyTraceToken(token) {
  return http.request({
    path: "/api/trace/verify",
    method: "POST",
    data: { token },
    needAuth: false
  });
}

module.exports = {
  fetchGardenRedProfile,
  fetchStudySpots,
  fetchStudyRoutes,
  fetchSeasonTimeline,
  submitStudyBooking,
  verifyTraceToken
};
