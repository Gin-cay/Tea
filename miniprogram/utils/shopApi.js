/**
 * 购物车、订单、资料、溯源记录同步
 */
const http = require("./http");

function getCartItems() {
  return http.request({ path: "/api/mall/cart/items", method: "GET", needAuth: true });
}

function addCartItem(productId, quantity) {
  return http.request({
    path: "/api/mall/cart/items",
    method: "POST",
    data: { productId, quantity: quantity || 1 },
    needAuth: true,
    showLoading: true,
    loadingTitle: "加入中"
  });
}

function patchCartItem(itemId, quantity, selected) {
  return http.request({
    path: `/api/mall/cart/items/${encodeURIComponent(itemId)}`,
    method: "PATCH",
    data: { quantity, selected },
    needAuth: true,
    showLoading: false
  });
}

function deleteCartItem(itemId) {
  return http.request({
    path: `/api/mall/cart/items/${encodeURIComponent(itemId)}`,
    method: "DELETE",
    needAuth: true,
    showLoading: true,
    loadingTitle: "处理中"
  });
}

function createOrderFromCart(body) {
  return http.request({
    path: "/api/mall/orders/from-cart",
    method: "POST",
    data: body,
    needAuth: true,
    showLoading: true,
    loadingTitle: "提交订单"
  });
}

function createOrderDirect(body) {
  return http.request({
    path: "/api/mall/orders/direct",
    method: "POST",
    data: body,
    needAuth: true,
    showLoading: true,
    loadingTitle: "提交订单"
  });
}

function fetchOrderList(page) {
  return http.request({
    path: "/api/mall/orders",
    method: "GET",
    data: { page: page || 1, page_size: 20 },
    needAuth: true
  });
}

function fetchOrderDetail(orderNo) {
  return http.request({
    path: `/api/mall/orders/${encodeURIComponent(orderNo)}`,
    method: "GET",
    needAuth: true
  });
}

function cancelOrder(orderNo) {
  return http.request({
    path: `/api/mall/orders/${encodeURIComponent(orderNo)}`,
    method: "DELETE",
    needAuth: true,
    showLoading: true,
    loadingTitle: "取消中"
  });
}

function getProfile() {
  return http.request({ path: "/api/profile", method: "GET", needAuth: true, showError: false });
}

function putProfile(body) {
  return http.request({
    path: "/api/profile",
    method: "PUT",
    data: body,
    needAuth: true,
    showLoading: true,
    loadingTitle: "保存中"
  });
}

function postUserTraceRecord(body) {
  return http.request({
    path: "/api/user-trace-records",
    method: "POST",
    data: body,
    needAuth: true,
    showError: false,
    showLoading: false,
    retries: 0
  });
}

function fetchUserTraceRecords() {
  return http.request({
    path: "/api/user-trace-records",
    method: "GET",
    needAuth: true,
    showError: false
  });
}

module.exports = {
  getCartItems,
  addCartItem,
  patchCartItem,
  deleteCartItem,
  createOrderFromCart,
  createOrderDirect,
  fetchOrderList,
  fetchOrderDetail,
  cancelOrder,
  getProfile,
  putProfile,
  postUserTraceRecord,
  fetchUserTraceRecords
};
