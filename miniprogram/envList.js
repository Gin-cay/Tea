/**
 * 微信云开发：填写 envId 后，app.js 会在 onLaunch 中 wx.cloud.init。
 *
 * 自建 API 根地址：https://你的域名（无末尾斜杠）。本地调试可写 http://127.0.0.1:8000
 * 留空则 app.js 默认使用 http://127.0.0.1:8000（与 uvicorn 默认端口一致）
 */
const cloudApiBaseUrl = "";

const envList = [{ envId: "prod-6gpi92te3c93596e", alias: "prod" }];
const isMac = false;
module.exports = {
  envList,
  isMac,
  cloudApiBaseUrl
};
