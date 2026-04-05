/**
 * 管理端 API：使用 X-Admin-Token（与后端 ADMIN_TOKEN 一致）。
 * 开发时 vite 代理 /api → 后端；生产将 VITE_API_BASE 设为完整 API 根地址。
 */

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

const TOKEN_KEY = "tea_admin_token";

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAdminToken(t) {
  localStorage.setItem(TOKEN_KEY, t);
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    options.headers || {}
  );
  const tok = getAdminToken();
  if (tok) headers["X-Admin-Token"] = tok;
  const res = await fetch(url, Object.assign({}, options, { headers }));
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data.detail || res.statusText || "请求失败";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

export const api = {
  createBatch(productName) {
    return request("/api/trace/batch/create", {
      method: "POST",
      body: JSON.stringify({ productName: productName || "信阳毛尖" })
    });
  },
  batchList() {
    return request("/api/trace/batch/list");
  },
  batchDetail(batchNo) {
    return request(`/api/trace/batch/detail/${encodeURIComponent(batchNo)}`);
  },
  dataList(batchNo) {
    return request(`/api/trace/data/list/${encodeURIComponent(batchNo)}`);
  },
  audit(dataId, pass) {
    return request("/api/trace/data/audit", {
      method: "POST",
      body: JSON.stringify({ dataId, pass })
    });
  },
  roleList() {
    return request("/api/auth/role/list");
  },
  assignRole(userId, roleId) {
    return request("/api/auth/user/assign", {
      method: "POST",
      body: JSON.stringify({ userId, roleId })
    });
  },
  dataLog(dataId) {
    return request(`/api/trace/data/log/${dataId}`);
  },
  updateData(dataId, content, reason) {
    return request("/api/trace/data/update", {
      method: "POST",
      body: JSON.stringify({ dataId, content, reason })
    });
  }
};
