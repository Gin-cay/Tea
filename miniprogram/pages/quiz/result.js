/**
 * 研学答题结果
 */
const studyQuizApi = require("../../utils/studyQuizApi");

Page({
  data: {
    loaded: false,
    score: 0,
    maxScore: 3,
    passMinScore: 0,
    passed: false,
    results: [],
    certificateId: ""
  },

  onLoad(options) {
    const attemptId = options.attemptId || "";
    if (!attemptId) {
      wx.showToast({ title: "缺少答题记录", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1600);
      return;
    }
    studyQuizApi
      .fetchAttempt(attemptId)
      .then((body) => {
        const cert = body && body.certificate;
        this.setData({
          loaded: true,
          score: body.score,
          maxScore: body.maxScore,
          passMinScore: body.passMinScore || 0,
          passed: !!body.passed,
          results: body.results || [],
          certificateId: cert && cert.id ? cert.id : ""
        });
      })
      .catch(() => {
        wx.navigateBack();
      });
  },

  goCertificate() {
    const id = this.data.certificateId;
    if (!id) return;
    wx.navigateTo({ url: `/pages/certificate/certificate?id=${id}` });
  },

  goBackCheckin() {
    wx.navigateBack({ delta: 1 });
  }
});
