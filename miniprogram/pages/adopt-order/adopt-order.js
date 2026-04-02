const ORDER_MOCK = {
  1: {
    cover: "/images/banner-home.png",
    name: "半亩塘·益龙芳明前绿茶认养",
    period: "12 个月",
    cycleLabel: "认养周期：2026 春茶季",
    price: 699
  },
  2: {
    cover: "/images/banner-mall.png",
    name: "云雾山有机红茶认养套餐",
    period: "12 个月",
    cycleLabel: "认养周期：年度制茶全周期",
    price: 1280
  },
  3: {
    cover: "/images/background.png",
    name: "共富茶园·家庭共享认养",
    period: "3 个月/季",
    cycleLabel: "认养周期：按季开放",
    price: 399
  }
};

const { registerTraceAfterAdopt } = require("../../utils/redTraceService");

const PACKAGE_ORDER = {
  experience: {
    cover: "/images/banner-home.png",
    name: "体验认养套餐",
    period: "1 季度（约 90 天）",
    cycleLabel: "套餐周期：按季履约 · 单株茶树",
    price: 199
  },
  family: {
    cover: "/images/background.png",
    name: "家庭认养套餐",
    period: "12 个月（按茶季拆分履约）",
    cycleLabel: "套餐周期：年度 · 三株茶树",
    price: 699
  },
  enterprise: {
    cover: "/images/banner-mall.png",
    name: "企业认养套餐",
    period: "12 个月，可签补充协议延长",
    cycleLabel: "套餐周期：企业定制 · 认养牌与礼盒",
    price: 2999
  }
};

Page({
  data: {
    id: "",
    orderMode: "garden",
    goods: null,
    orderLabel: "认养商品"
  },

  onLoad(options) {
    if (options.mode === "package" && options.packageId) {
      const packageId = String(options.packageId);
      const row = PACKAGE_ORDER[packageId];
      if (row) {
        this.setData({
          id: packageId,
          orderMode: "package",
          goods: { ...row, id: packageId },
          orderLabel: "认养套餐"
        });
        return;
      }
    }
    const id = options.id != null ? String(options.id) : "";
    const goods = ORDER_MOCK[id] ? { ...ORDER_MOCK[id], id } : null;
    this.setData({
      id,
      orderMode: "garden",
      goods,
      orderLabel: "认养商品"
    });
  },

  onTapPay() {
    if (!this.data.id || !this.data.goods) return;

    // 仅在支付时强制完善资料（手机号/昵称/头像/地址/身份）
    const app = getApp();
    const state = app.getProfileGateState();
    if (!state || !state.complete) {
      const missing = state && state.missing && state.missing.length ? state.missing.join("、") : "必填信息";
      wx.showToast({ title: `请先完善：${missing}`, icon: "none" });
      const returnUrl = `/pages/adopt-order/adopt-order?mode=${encodeURIComponent(
        this.data.orderMode
      )}&id=${encodeURIComponent(this.data.id)}`;
      app.ensureProfileBeforePay({ redirect: "pay:adopt", returnUrl });
      return;
    }

    const api = app.globalData.apiBaseUrl;
    const isPackage = this.data.orderMode === "package";
    wx.showLoading({ title: "请求支付..." });
    wx.request({
      url: `${api}/pay/unified`,
      method: "POST",
      header: { "content-type": "application/json" },
      data: {
        adoptId: isPackage ? "" : this.data.id,
        packageId: isPackage ? this.data.id : "",
        orderMode: this.data.orderMode,
        amount: this.data.goods.price
      },
      success: (res) => {
        wx.hideLoading();
        const body = res.data || {};
        const p = body.payment || body.payParams;
        if (res.statusCode === 200 && p && p.timeStamp && p.nonceStr && p.package && p.paySign) {
          wx.requestPayment({
            timeStamp: String(p.timeStamp),
            nonceStr: String(p.nonceStr),
            package: String(p.package),
            signType: p.signType || "RSA",
            paySign: String(p.paySign),
            success: () => {
              wx.showToast({ title: "支付成功", icon: "success" });
              const isPackage = this.data.orderMode === "package";
              const gid = isPackage ? "1" : this.data.id;
              const rec = registerTraceAfterAdopt({
                gardenId: gid,
                orderId: `R${Date.now()}`,
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
          wx.showModal({
            title: "发起支付失败",
            content: "需服务端调用微信「统一下单」并返回 timeStamp、nonceStr、package、signType、paySign。请将 apiBaseUrl 配置为您的后端地址并实现 /pay/unified 接口。",
            showCancel: false
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showModal({
          title: "无法连接支付服务",
          content: "请检查网络与 app.js 中 globalData.apiBaseUrl 后端地址。",
          showCancel: false
        });
      }
    });
  }
});
