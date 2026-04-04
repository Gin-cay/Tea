const catalogApi = require("../../utils/catalogApi");
const http = require("../../utils/http");
const auth = require("../../utils/auth");
const { registerTraceAfterAdopt } = require("../../utils/redTraceService");

Page({
  data: {
    id: "",
    orderMode: "garden",
    goods: null,
    orderLabel: "认养商品",
    loadError: ""
  },

  async onLoad(options) {
    if (options.mode === "package" && options.packageId) {
      const packageId = String(options.packageId);
      await this.loadPackageOrder(packageId);
      return;
    }
    const id = options.id != null ? String(options.id) : "";
    this.setData({ id, orderMode: "garden", orderLabel: "认养商品" });
    if (!id) {
      this.setData({ loadError: "缺少商品信息" });
      return;
    }
    await this.loadGardenOrder(id);
  },

  async loadGardenOrder(id) {
    try {
      const detail = await catalogApi.fetchAdoptGardenDetail(id);
      const goods = {
        cover: detail.cover,
        name: detail.name,
        period: detail.period,
        cycleLabel: detail.cycleLabel,
        price: detail.price,
        id
      };
      this.setData({ goods, loadError: "" });
    } catch (e) {
      this.setData({ goods: null, loadError: "订单信息加载失败" });
    }
  },

  async loadPackageOrder(packageId) {
    try {
      const row = await catalogApi.fetchAdoptPackageDetail(packageId);
      const goods = {
        cover: row.cover,
        name: row.name,
        period: row.period,
        cycleLabel: row.cycleLabel,
        price: row.price,
        id: packageId
      };
      this.setData({
        id: packageId,
        orderMode: "package",
        goods,
        orderLabel: "认养套餐",
        loadError: ""
      });
    } catch (e) {
      this.setData({ goods: null, loadError: "套餐加载失败" });
    }
  },

  async onTapPay() {
    if (!this.data.id || !this.data.goods) return;

    const app = getApp();
    const state = app.getProfileGateState();
    if (!state || !state.complete) {
      const missing =
        state && state.missing && state.missing.length ? state.missing.join("、") : "必填信息";
      wx.showToast({ title: `请先完善：${missing}`, icon: "none" });
      const returnUrl = `/pages/adopt-order/adopt-order?mode=${encodeURIComponent(
        this.data.orderMode
      )}&id=${encodeURIComponent(this.data.id)}`;
      app.ensureProfileBeforePay({ redirect: "pay:adopt", returnUrl });
      return;
    }

    if (!http.getStoredToken()) {
      try {
        await auth.silentLogin();
      } catch (e) {
        wx.showToast({ title: "登录失败，请稍后重试", icon: "none" });
        return;
      }
    }

    const isPackage = this.data.orderMode === "package";
    wx.showLoading({ title: "请求支付..." });
    try {
      const body = await http.request({
        path: "/pay/unified",
        method: "POST",
        data: {
          adoptId: isPackage ? "" : this.data.id,
          packageId: isPackage ? this.data.id : "",
          orderMode: this.data.orderMode,
          amount: this.data.goods.price
        },
        needAuth: true
      });
      wx.hideLoading();
      const p = body.payment || body.payParams;
      if (p && p.timeStamp && p.nonceStr && p.package && p.paySign) {
        wx.requestPayment({
          timeStamp: String(p.timeStamp),
          nonceStr: String(p.nonceStr),
          package: String(p.package),
          signType: p.signType || "RSA",
          paySign: String(p.paySign),
          success: () => {
            wx.showToast({ title: "支付成功", icon: "success" });
            const gid = isPackage ? "1" : this.data.id;
            const rec = registerTraceAfterAdopt({
              gardenId: gid,
              orderId: body.orderId || `R${Date.now()}`,
              gardenName: this.data.goods && this.data.goods.name,
              orderMode: this.data.orderMode
            });
            setTimeout(() => {
              wx.showModal({
                title: "红色溯源已开通",
                content:
                  "已为本次认养生成「红色茶源溯源码」，可扫码展示茶园位置、茶农故事、红色历史与加工流程。是否立即查看？",
                confirmText: "查看溯源码",
                cancelText: "返回",
                success: (r) => {
                  if (r.confirm) {
                    wx.navigateTo({
                      url: `/pages/red-trace/trace-code/index?traceToken=${encodeURIComponent(
                        rec.traceToken
                      )}`
                    });
                  } else {
                    wx.navigateBack({ delta: 2 });
                  }
                }
              });
            }, 500);
          },
          fail: (err) => {
            wx.showToast({
              title: err.errMsg === "requestPayment:fail cancel" ? "已取消支付" : "支付未完成",
              icon: "none"
            });
          }
        });
      } else {
        let hint = "请配置微信支付商户参数，或开发环境设置 DEV_PAYMENT_STUB=true（真机仍会校验签名失败）。";
        const d = body && body.detail;
        if (typeof d === "string") hint = d;
        else if (d && typeof d === "object" && d.message) hint = String(d.message);
        wx.showModal({
          title: "发起支付失败",
          content: hint,
          showCancel: false
        });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showModal({
        title: "无法连接支付服务",
        content: "请检查网络、合法域名与 app.js 中 apiBaseUrl。",
        showCancel: false
      });
    }
  }
});
