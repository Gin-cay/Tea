/**
 * 研学打卡 · 信阳毛尖答题与电子证书 API
 */
const http = require("./http");

function fetchQuestions() {
  return http.request({
    path: "/api/study/quiz/questions",
    method: "GET",
    needAuth: false,
    showLoading: false,
    showError: false
  });
}

function syncCheckin(payload) {
  return http.request({
    path: "/api/study/checkin",
    method: "POST",
    data: payload,
    needAuth: true,
    showLoading: false,
    showError: false
  });
}

function submitQuiz(payload) {
  return http.request({
    path: "/api/study/quiz/submit",
    method: "POST",
    data: payload,
    needAuth: true,
    showLoading: false
  });
}

function fetchAttempt(attemptId) {
  return http.request({
    path: `/api/study/quiz/attempt/${encodeURIComponent(attemptId)}`,
    method: "GET",
    needAuth: true,
    showLoading: true
  });
}

function fetchCertificate(certId) {
  return http.request({
    path: `/api/study/certificate/${encodeURIComponent(certId)}`,
    method: "GET",
    needAuth: true,
    showLoading: true
  });
}

module.exports = {
  fetchQuestions,
  syncCheckin,
  submitQuiz,
  fetchAttempt,
  fetchCertificate
};
