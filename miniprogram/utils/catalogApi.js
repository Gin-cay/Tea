/**
 * 首页 / 商城 / 认养 / 故事 列表与详情
 */
const http = require("./http");

function fetchHomeOverview() {
  return http.request({ path: "/api/home/overview", method: "GET", needAuth: false });
}

function fetchMallCategories() {
  return http.request({ path: "/api/mall/categories", method: "GET", needAuth: false });
}

/**
 * @param {{ categoryId?: number, keyword?: string, page?: number, pageSize?: number }} opts
 */
function fetchMallProducts(opts) {
  const o = opts || {};
  const data = {
    page: o.page || 1,
    page_size: o.pageSize || 50
  };
  if (o.categoryId != null && o.categoryId !== "") data.category_id = o.categoryId;
  if (o.keyword && String(o.keyword).trim()) data.keyword = String(o.keyword).trim();
  return http.request({ path: "/api/mall/products", method: "GET", data, needAuth: false });
}

function fetchMallProductDetail(id) {
  return http.request({
    path: `/api/mall/products/${encodeURIComponent(id)}`,
    method: "GET",
    needAuth: false
  });
}

function fetchAdoptGardens() {
  return http.request({ path: "/api/adopt/gardens", method: "GET", needAuth: false });
}

function fetchAdoptGardenDetail(id) {
  return http.request({
    path: `/api/adopt/gardens/${encodeURIComponent(id)}`,
    method: "GET",
    needAuth: false
  });
}

function fetchAdoptPackages() {
  return http.request({ path: "/api/adopt/packages", method: "GET", needAuth: false });
}

function fetchAdoptPackageDetail(key) {
  return http.request({
    path: `/api/adopt/packages/${encodeURIComponent(key)}`,
    method: "GET",
    needAuth: false
  });
}

function fetchStoryList(storyType) {
  return http.request({
    path: "/api/stories/list",
    method: "GET",
    data: { type: storyType },
    needAuth: false
  });
}

function fetchStoryDetail(storyType, slug) {
  return http.request({
    path: "/api/stories/detail",
    method: "GET",
    data: { type: storyType, id: slug },
    needAuth: false
  });
}

module.exports = {
  fetchHomeOverview,
  fetchMallCategories,
  fetchMallProducts,
  fetchMallProductDetail,
  fetchAdoptGardens,
  fetchAdoptGardenDetail,
  fetchAdoptPackages,
  fetchAdoptPackageDetail,
  fetchStoryList,
  fetchStoryDetail
};
