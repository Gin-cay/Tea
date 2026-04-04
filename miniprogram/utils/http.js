/**
 * 统一 HTTP：Bearer Token、加载态、错误提示、失败重试（5xx / 网络）。
 */

const TOKEN_STORAGE_KEY = "tea_api_jwt";

let _loadingDepth = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAppSafe() {
  try {
    return getApp();
  } catch (e) {
    return null;
  }
}

function getBaseUrl() {
  const app = getAppSafe();
  const base = (app && app.globalData && app.globalData.apiBaseUrl) || "";
  return String(base).replace(/\/$/, "");
}

function getStoredToken() {
  try {
    return wx.getStorageSync(TOKEN_STORAGE_KEY) || "";
  } catch (e) {
    return "";
  }
}

function setStoredToken(token) {
  try {
    if (token) wx.setStorageSync(TOKEN_STORAGE_KEY, token);
    else wx.removeStorageSync(TOKEN_STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }
}

function buildHeaders(options) {
  const h = Object.assign({}, options.header || {});
  if (!h["content-type"] && !h["Content-Type"] && options.method && options.method !== "GET") {
    h["content-type"] = "application/json";
  }
  if (options.needAuth !== false) {
    const t = getStoredToken();
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
}

function _pushLoading(title) {
  _loadingDepth += 1;
  if (_loadingDepth === 1) {
    wx.showLoading({ title: title || "加载中", mask: true });
  }
}

function _popLoading() {
  _loadingDepth = Math.max(0, _loadingDepth - 1);
  if (_loadingDepth === 0) {
    wx.hideLoading();
  }
}

function _toastError(err) {
  let msg = "请求失败";
  if (!err) {
    wx.showToast({ title: msg, icon: "none" });
    return;
  }
  if (err.message === "未配置 apiBaseUrl") msg = err.message;
  else if (err.statusCode === 401) msg = "请先登录";
  else if (err.statusCode === 403) msg = "无权限";
  else if (err.statusCode === 404) msg = "资源不存在";
  else if (err.data) {
    const d = err.data;
    if (typeof d.detail === "string") msg = d.detail;
    else if (Array.isArray(d.detail) && d.detail.length) {
      const first = d.detail[0];
      msg = (first && (first.msg || first.message)) || msg;
    }
  } else if (err.errMsg) msg = String(err.errMsg).replace(/^request:fail\s*/, "") || msg;
  wx.showToast({ title: String(msg).slice(0, 48), icon: "none" });
}

function _useAutoLoading(method, options) {
  if (options.showLoading === true) return true;
  if (options.showLoading === false) return false;
  const m = (method || "GET").toUpperCase();
  return m === "GET" || m === "HEAD";
}

/**
 * @param {object} options
 * @param {string} options.path 以 / 开头的路径
 * @param {string} [options.method]
 * @param {object} [options.data] GET 时作为 query
 * @param {boolean} [options.showLoading] 显式开关；未传时 GET/HEAD 默认显示加载
 * @param {string} [options.loadingTitle]
 * @param {boolean} [options.showError=true] 失败时 toast
 * @param {number} [options.retries=2]
 * @param {boolean} [options.needAuth=true]
 */
function request(options) {
  const base = getBaseUrl();
  if (!base) {
    const e = new Error("未配置 apiBaseUrl");
    if (options.showError !== false) _toastError(e);
    return Promise.reject(e);
  }
  const path = options.path || "";
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const retries = typeof options.retries === "number" ? options.retries : 2;
  const useLoad = _useAutoLoading(options.method, options);
  const loadingTitle = options.loadingTitle || "加载中";

  const run = (left) =>
    new Promise((resolve, reject) => {
      wx.request({
        url,
        method: options.method || "GET",
        data: options.data,
        header: buildHeaders(options),
        timeout: options.timeout || 20000,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
            return;
          }
          const retryable = res.statusCode >= 500 || res.statusCode === 408;
          if (left > 0 && retryable) {
            sleep(600 + Math.random() * 400)
              .then(() => run(left - 1))
              .then(resolve)
              .catch(reject);
            return;
          }
          const err = new Error(`HTTP ${res.statusCode}`);
          err.statusCode = res.statusCode;
          err.data = res.data;
          reject(err);
        },
        fail: (err) => {
          if (left > 0) {
            sleep(600 + Math.random() * 400)
              .then(() => run(left - 1))
              .then(resolve)
              .catch(reject);
            return;
          }
          reject(err);
        }
      });
    });

  if (useLoad) _pushLoading(loadingTitle);
  return run(retries)
    .then((data) => {
      if (useLoad) _popLoading();
      return data;
    })
    .catch((err) => {
      if (useLoad) _popLoading();
      if (options.showError !== false) _toastError(err);
      return Promise.reject(err);
    });
}

/**
 * 上传文件（multipart），自动带 JWT；不默认全局 loading，由页面控制或传 showLoading。
 */
function uploadFile(options) {
  const base = getBaseUrl();
  if (!base) {
    const e = new Error("未配置 apiBaseUrl");
    if (options.showError !== false) _toastError(e);
    return Promise.reject(e);
  }
  const path = options.path || "/api/community/upload";
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const header = Object.assign({}, options.header || {});
  if (options.needAuth !== false) {
    const t = getStoredToken();
    if (t) header.Authorization = `Bearer ${t}`;
  }
  const useLoad = options.showLoading === true;
  if (useLoad) _pushLoading(options.loadingTitle || "上传中");

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url,
      filePath: options.filePath,
      name: options.name || "file",
      formData: options.formData || {},
      header,
      success: (res) => {
        if (useLoad) _popLoading();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
            resolve(data);
          } catch (e) {
            reject(new Error("解析上传响应失败"));
          }
          return;
        }
        const err = new Error(`HTTP ${res.statusCode}`);
        err.statusCode = res.statusCode;
        try {
          err.data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        } catch (e2) {
          err.data = null;
        }
        if (options.showError !== false) _toastError(err);
        reject(err);
      },
      fail: (err) => {
        if (useLoad) _popLoading();
        if (options.showError !== false) _toastError(err);
        reject(err);
      }
    });
  });
}

function requestAbsolute(options) {
  const retries = typeof options.retries === "number" ? options.retries : 2;
  const useLoad = _useAutoLoading(options.method, options);
  if (useLoad) _pushLoading(options.loadingTitle || "加载中");
  const run = (left) =>
    new Promise((resolve, reject) => {
      wx.request({
        url: options.url,
        method: options.method || "GET",
        data: options.data,
        header: buildHeaders(options),
        timeout: options.timeout || 20000,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
            return;
          }
          const retryable = res.statusCode >= 500 || res.statusCode === 408;
          if (left > 0 && retryable) {
            sleep(600 + Math.random() * 400)
              .then(() => run(left - 1))
              .then(resolve)
              .catch(reject);
            return;
          }
          const err = new Error(`HTTP ${res.statusCode}`);
          err.statusCode = res.statusCode;
          err.data = res.data;
          reject(err);
        },
        fail: (err) => {
          if (left > 0) {
            sleep(600 + Math.random() * 400)
              .then(() => run(left - 1))
              .then(resolve)
              .catch(reject);
            return;
          }
          reject(err);
        }
      });
    });
  return run(retries)
    .then((data) => {
      if (useLoad) _popLoading();
      return data;
    })
    .catch((err) => {
      if (useLoad) _popLoading();
      if (options.showError !== false) _toastError(err);
      return Promise.reject(err);
    });
}

module.exports = {
  TOKEN_STORAGE_KEY,
  getBaseUrl,
  getStoredToken,
  setStoredToken,
  request,
  requestAbsolute,
  uploadFile
};
