/**
 * 红色茶源溯源码：客户端载荷签名与校验
 * 说明：当前为对称混淆 + 校验和，防篡改；生产环境请将 SECRET 置于云函数/后端，
 * 由服务端签发 JWT 或短链 token，小程序仅展示二维码，敏感茶园坐标等走接口按需下发。
 */

/** @returns {string} 从 globalData 读取，便于后续改为云配置 */
function getSecret() {
  let g = null;
  try {
    g = getApp().globalData;
  } catch (e) {
    g = null;
  }
  return (g && g.traceTokenSecret) || "TEA_RED_TRACE_DEV_SECRET_REPLACE";
}

/** djb2 哈希，转 36 进制缩短长度 */
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) + h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * 生成溯源令牌（仅含非敏感标识，便于印在二维码中）
 * @param {{ gardenId: string, orderId: string, openIdStub?: string }} p
 * @returns {string} 形如 v1|gardenId|orderId|ts|sig
 */
function buildTraceToken(p) {
  const ts = Math.floor(Date.now() / 1000);
  const oid = p.openIdStub || "local";
  const payload = ["v1", String(p.gardenId), String(p.orderId), String(ts), oid].join("|");
  const sig = djb2(payload + getSecret()).toString(36);
  return `${payload}|${sig}`;
}

/**
 * 解析并校验溯源令牌
 * @param {string} token
 * @returns {{ gardenId: string, orderId: string, ts: number, openIdStub: string } | null}
 */
function parseTraceToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split("|");
  if (parts.length !== 6 || parts[0] !== "v1") return null;
  const [v, gardenId, orderId, tsStr, openIdStub, sig] = parts;
  const payload = [v, gardenId, orderId, tsStr, openIdStub].join("|");
  const expect = djb2(payload + getSecret()).toString(36);
  if (sig !== expect) return null;
  const ts = parseInt(tsStr, 10);
  if (!gardenId || !orderId || Number.isNaN(ts)) return null;
  return { gardenId, orderId, ts, openIdStub };
}

/**
 * 简单异或混淆（可选二次封装 payload，非真正加密）
 * @param {string} plain
 */
function obfuscate(plain) {
  const key = getSecret();
  let out = "";
  for (let i = 0; i < plain.length; i++) {
    out += String.fromCharCode(plain.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  try {
    return wx.arrayBufferToBase64(stringToArrayBuffer(out));
  } catch (e) {
    return plain;
  }
}

function stringToArrayBuffer(str) {
  const buf = new ArrayBuffer(str.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) view[i] = str.charCodeAt(i) & 0xff;
  return buf;
}

module.exports = {
  buildTraceToken,
  parseTraceToken,
  obfuscate
};
