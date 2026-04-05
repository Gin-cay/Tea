/**
 * 全流程溯源 API：优先请求后端，失败或未配置 baseUrl 时使用模拟数据。
 */
const http = require("./http");
const { getMockTraceChain } = require("./traceChainMockData");

/**
 * @typedef {object} TraceChainField
 * @property {string} label
 * @property {string} value
 */

/**
 * @typedef {object} TraceSubStep
 * @property {string} name
 * @property {string} time
 * @property {string} operator
 * @property {string} remark
 */

/**
 * @typedef {object} TraceVideoItem
 * @property {string} [title]
 * @property {string} [poster]
 * @property {string} url
 */

/**
 * @typedef {object} TraceNode
 * @property {string} key
 * @property {string} title
 * @property {string} time
 * @property {string} summary
 * @property {TraceChainField[]} fields
 * @property {string[]} images
 * @property {TraceVideoItem[]} videos
 * @property {TraceSubStep[]} subSteps
 */

/**
 * @typedef {object} TraceChainPayload
 * @property {string} traceNo
 * @property {object} product
 * @property {TraceNode[]} nodes
 * @property {{enterprise:string, guarantee:string, antiFake:string}} footer
 */

/**
 * 拉取全流程溯源数据
 * GET /api/trace/chain/{traceNo}
 * @param {string} traceNo
 * @returns {Promise<TraceChainPayload>}
 */
function fetchTraceChain(traceNo) {
  const id = (traceNo || "").trim();
  if (!id) {
    return Promise.resolve(getMockTraceChain(""));
  }

  const base = http.getBaseUrl();
  if (!base) {
    return Promise.resolve(getMockTraceChain(id));
  }

  return http
    .request({
      path: `/api/trace/chain/${encodeURIComponent(id)}`,
      method: "GET",
      needAuth: false,
      showLoading: false,
      showError: false
    })
    .then((body) => {
      if (body && body.nodes && body.product) {
        return body;
      }
      return getMockTraceChain(id);
    })
    .catch(() => getMockTraceChain(id));
}

module.exports = {
  fetchTraceChain
};
