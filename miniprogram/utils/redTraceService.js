/**
 * 认养支付成功后登记溯源记录、生成令牌等业务编排。
 */

const { buildTraceToken } = require("./traceCrypto");
const storage = require("./redTraceStorage");
const mock = require("./redTraceMockData");

/**
 * 支付成功后写入本地溯源档案（演示）
 * @param {{ gardenId: string, orderId: string, gardenName?: string, orderMode?: string }} p
 */
function registerTraceAfterAdopt(p) {
  const gid = String(p.gardenId);
  const profile = mock.getGardenProfile(gid);
  const gardenName = p.gardenName || (profile && profile.gardenName) || `茶园 #${gid}`;
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
  return record;
}

module.exports = {
  registerTraceAfterAdopt
};
