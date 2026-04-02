/**
 * 微信云开发环境：填写 envId 后，app.js 会在 onLaunch 中 wx.cloud.init。
 *
 * 云托管 / 自建 API 根地址（https，无末尾 /）。留空则 apiBaseUrl 使用本机 http://127.0.0.1:5000。
 */
const cloudApiBaseUrl = "";

const envList = [{ envId: "prod-6gpi92te3c93596e", alias: "prod" }];
const isMac = false;
module.exports = {
  envList,
  isMac,
  cloudApiBaseUrl
};
