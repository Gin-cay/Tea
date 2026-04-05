/**
 * 溯源全流程上报 API（与 FastAPI trace_workflow 路由对应）
 */
const http = require("./http");

function fetchPermission(reqOpts) {
  return http.request(
    Object.assign(
      {
        path: "/api/auth/user/permission",
        method: "GET",
        needAuth: true,
        showLoading: false,
        showError: true
      },
      reqOpts || {}
    )
  );
}

function fetchBatchList(reqOpts) {
  return http.request(
    Object.assign(
      {
        path: "/api/trace/batch/list",
        method: "GET",
        needAuth: true,
        showLoading: true
      },
      reqOpts || {}
    )
  );
}

function fetchBatchDetail(batchNo, reqOpts) {
  return http.request(
    Object.assign(
      {
        path: `/api/trace/batch/detail/${encodeURIComponent(batchNo)}`,
        method: "GET",
        needAuth: true,
        showLoading: true
      },
      reqOpts || {}
    )
  );
}

function submitStage(payload, reqOpts) {
  return http.request(
    Object.assign(
      {
        path: "/api/trace/data/submit",
        method: "POST",
        data: payload,
        needAuth: true,
        showLoading: true
      },
      reqOpts || {}
    )
  );
}

function fetchMySubmissions(reqOpts) {
  return http.request(
    Object.assign(
      {
        path: "/api/trace/data/my",
        method: "GET",
        needAuth: true,
        showLoading: true
      },
      reqOpts || {}
    )
  );
}

module.exports = {
  fetchPermission,
  fetchBatchList,
  fetchBatchDetail,
  submitStage,
  fetchMySubmissions
};
