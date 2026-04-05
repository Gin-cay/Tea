/**
 * 微信云开发：填写 envId 后，app.js 会在 onLaunch 中 wx.cloud.init。
 *
 * 自建 API 根地址：https://你的域名（无末尾斜杠）。本地调试可写 http://127.0.0.1:5000
 * 留空则 app.js 默认使用 http://127.0.0.1:5000（与 README 中 uvicorn 示例一致）
 * 真机预览请改为电脑局域网 IP，如 http://192.168.1.3:5000，并勾选「不校验合法域名」
 */
const cloudApiBaseUrl = "";

const envList = [{ envId: "prod-6gpi92te3c93596e", alias: "prod" }];
const isMac = false;
module.exports = {
  envList,
  isMac,
  cloudApiBaseUrl
};
