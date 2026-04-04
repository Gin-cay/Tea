/**
 * 认养支付成功后登记溯源记录，并同步到服务端。
 */

const { buildTraceToken } = require("./traceCrypto");
const storage = require("./redTraceStorage");
const shopApi = require("./shopApi");

/**
 * @param {{ gardenId: string, orderId: string, gardenName?: string, orderMode?: string }} p
 */
function registerTraceAfterAdopt(p) {
  const gid = String(p.gardenId);
  const gardenName = p.gardenName || `茶园 #${gid}`;
  const orderId = p.orderId || `R${Date.now()}`;
  const traceToken = buildTraceToken({
    gardenId: gid,
    orderId,
    openIdStub: "local"
  });
  const record = {
    traceToken,
    gardenId: gid,
    orderId,
    gardenName,
    orderMode: p.orderMode || "garden",
    createdAt: Date.now()
  };
  storage.addTraceRecord(record);
  shopApi
    .postUserTraceRecord({
      traceToken: record.traceToken,
      gardenId: record.gardenId,
      orderId: record.orderId,
      gardenName: record.gardenName,
      orderMode: record.orderMode
    })
    .catch(() => {});
  return record;
}

module.exports = {
  registerTraceAfterAdopt
};
