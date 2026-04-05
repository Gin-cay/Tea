/**
 * 溯源二维码 → 全流程监控（茶园—茶杯）
 *
 * 进入方式：
 * 1) 普通跳转：/pages/trace-chain/index?traceNo=XYMJ2026DEMO01
 * 2) 小程序码 scene（≤32 字符）：建议生成 scene 为 t=XYMJ2026DEMO01
 *    微信会在 onLoad 的 options.scene 中传入（需 decodeURIComponent）
 */
const traceChainApi = require("../../utils/traceChainApi");

/**
 * 从小程序码 scene 解析溯源编号
 * 支持：t=编号 & id=编号 & 或直接传编号字符串
 * @param {string} scene
 * @returns {string}
 */
function parseTraceNoFromScene(scene) {
  if (!scene) return "";
  let s = String(scene);
  try {
    s = decodeURIComponent(s);
  } catch (e) {
    /* 保持原样 */
  }
  if (s.indexOf("=") >= 0) {
    const parts = s.split("&");
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      const eq = seg.indexOf("=");
      if (eq < 0) continue;
      const k = seg.slice(0, eq).trim();
      const v = seg.slice(eq + 1).trim();
      if (k === "t" || k === "id" || k === "traceNo") {
        return v;
      }
    }
  }
  return s.trim();
}

/**
 * 为时间线节点附加 UI 状态
 * @param {object[]} nodes
 */
function withExpanded(nodes) {
  return (nodes || []).map((n, i) =>
    Object.assign({}, n, { expanded: i === 0 })
  );
}

Page({
  data: {
    loading: true,
    loadError: "",
    traceNo: "",
    product: null,
    nodes: [],
    footer: null
  },

  onLoad(options) {
    let traceNo =
      (options.traceNo || options.t || options.id || "").trim();
    if (options.scene) {
      const fromScene = parseTraceNoFromScene(options.scene);
      if (fromScene) {
        traceNo = fromScene;
      }
    }
    if (!traceNo) {
      traceNo = "XYMJ2026DEMO01";
    }
    this.setData({ traceNo });
    this.loadData(traceNo);
  },

  /** 拉取并渲染 */
  loadData(traceNo) {
    this.setData({ loading: true, loadError: "" });
    traceChainApi
      .fetchTraceChain(traceNo)
      .then((payload) => {
        const rawNodes = payload.nodes || [];
        const normalized = rawNodes.map((n) =>
          Object.assign({}, n, {
            fields: n.fields || [],
            images: n.images || [],
            videos: n.videos || [],
            subSteps: n.subSteps || []
          })
        );
        const nodes = withExpanded(normalized);
        this.setData({
          loading: false,
          product: payload.product || {},
          nodes,
          footer: payload.footer || {},
          traceNo: payload.traceNo || traceNo
        });
      })
      .catch(() => {
        this.setData({
          loading: false,
          loadError: "数据加载失败，请稍后重试"
        });
      });
  },

  /** 展开/收起某一流程节点 */
  toggleNode(e) {
    const index = e.currentTarget.dataset.index;
    const nodes = this.data.nodes.slice();
    if (index < 0 || index >= nodes.length) return;
    nodes[index].expanded = !nodes[index].expanded;
    this.setData({ nodes });
  },

  onRetry() {
    this.loadData(this.data.traceNo);
  },

  /** 预览图片（dataset 无法可靠传递数组，故用节点下标取图列表） */
  previewImage(e) {
    const nodeIndex = Number(e.currentTarget.dataset.nodeIndex);
    const current = e.currentTarget.dataset.src || "";
    const node = this.data.nodes[nodeIndex];
    const urls = (node && node.images) || [];
    if (!urls.length) return;
    wx.previewImage({ urls, current: current || urls[0] });
  },

  onPullDownRefresh() {
    const traceNo = this.data.traceNo;
    this.loadData(traceNo);
    wx.stopPullDownRefresh();
  }
});
