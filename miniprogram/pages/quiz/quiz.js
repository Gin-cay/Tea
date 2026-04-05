/**
 * 信阳毛尖研学答题（题干来自后端，判分在后端）
 */
const studyQuizApi = require("../../utils/studyQuizApi");

const TOTAL_SEC = 180;

Page({
  data: {
    checkinRecordId: "",
    spotName: "",
    questions: [],
    answers: {},
    remainSec: TOTAL_SEC,
    maxScore: 3,
    submitting: false
  },

  timer: null,

  onLoad(options) {
    const cid = options.checkinRecordId || "";
    const spotName = decodeURIComponent(options.spotName || "");
    this.setData({ checkinRecordId: cid, spotName });
    if (!cid) {
      wx.showToast({ title: "缺少打卡记录", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1600);
      return;
    }
    studyQuizApi
      .fetchQuestions()
      .then((body) => {
        const qs = (body && body.questions) || [];
        this.setData({
          questions: qs,
          maxScore: body.maxScore || qs.length || 3,
          remainSec: TOTAL_SEC
        });
        this._startTimer();
      })
      .catch(() => {
        wx.showToast({ title: "题目加载失败", icon: "none" });
      });
  },

  onUnload() {
    this._clearTimer();
  },

  _clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  _startTimer() {
    this._clearTimer();
    this.timer = setInterval(() => {
      const s = this.data.remainSec - 1;
      if (s <= 0) {
        this._clearTimer();
        wx.showToast({ title: "时间到，自动提交", icon: "none" });
        this.onSubmit(true);
        return;
      }
      this.setData({ remainSec: s });
    }, 1000);
  },

  onPick(e) {
    const qid = e.currentTarget.dataset.qid;
    const val = e.currentTarget.dataset.val;
    const answers = Object.assign({}, this.data.answers, { [qid]: val });
    this.setData({ answers });
  },

  onSubmit(fromTimer) {
    if (this.data.submitting) return;
    const qs = this.data.questions || [];
    if (!qs.length) return;

    const ans = this.data.answers;
    if (!fromTimer) {
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        const v = ans[q.id];
        if (v === undefined || v === null || v === "") {
          wx.showToast({ title: "请完成全部题目", icon: "none" });
          return;
        }
      }
    }

    this._clearTimer();
    this.setData({ submitting: true });

    const payload = {};
    qs.forEach((q) => {
      payload[String(q.id)] = ans[q.id];
    });

    wx.showLoading({ title: "提交中", mask: true });
    studyQuizApi
      .submitQuiz({
        checkinRecordId: this.data.checkinRecordId,
        answers: payload
      })
      .then((body) => {
        wx.hideLoading();
        const aid = body && body.attemptId;
        if (aid) {
          wx.redirectTo({ url: `/pages/quiz/result?attemptId=${aid}` });
        } else {
          this.setData({ submitting: false });
        }
      })
      .catch(() => {
        wx.hideLoading();
        this.setData({ submitting: false });
      });
  }
});
