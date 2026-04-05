/**
 * 当前登录用户已提交的溯源环节列表
 */
const traceWorkflowApi = require("../../utils/traceWorkflowApi");

function _auditText(s) {
  if (s === 1) return "已通过";
  if (s === 2) return "已驳回";
  return "待审核";
}

Page({
  data: {
    loading: true,
    list: []
  },

  onShow() {
    this.setData({ loading: true });
    traceWorkflowApi
      .fetchMySubmissions({ showError: true })
      .then((res) => {
        const raw = (res && res.list) || [];
        const list = raw.map((r) => {
          const c = r.content || {};
          return Object.assign({}, r, {
            summary: c.summary || "",
            auditText: _auditText(r.auditStatus)
          });
        });
        this.setData({ list, loading: false });
      })
      .catch(() => this.setData({ loading: false, list: [] }));
  }
});
