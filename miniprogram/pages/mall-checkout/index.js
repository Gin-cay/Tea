const shopApi = require("../../utils/shopApi");
const auth = require("../../utils/auth");
const http = require("../../utils/http");

Page({
  data: {
    mode: "cart",
    productId: "",
    quantity: 1,
    receiverName: "",
    receiverPhone: "",
    region: ["", "", ""],
    regionText: "",
    address: "",
    remark: ""
  },

  async onLoad(options) {
    const mode = options.mode === "direct" ? "direct" : "cart";
    const productId = options.productId ? String(options.productId) : "";
    const quantity = options.quantity ? Math.max(1, Number(options.quantity) || 1) : 1;
    this.setData({ mode, productId, quantity });

    if (!http.getStoredToken()) {
      try {
        await auth.silentLogin();
      } catch (e) {
        wx.showToast({ title: "请先登录", icon: "none" });
        return;
      }
    }

    try {
      const p = await shopApi.getProfile();
      if (p) {
        const region = Array.isArray(p.region) && p.region.length === 3 ? p.region : ["", "", ""];
        this.setData({
          receiverName: p.nickname || "",
          receiverPhone: p.phone || "",
          region,
          regionText: region.every((x) => String(x || "").trim()) ? region.join(" ") : "",
          address: p.addressDetail || ""
        });
      }
    } catch (e) {
      /* ignore */
    }
  },

  onNameInput(e) {
    this.setData({ receiverName: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ receiverPhone: e.detail.value });
  },

  onRegionChange(e) {
    const v = e.detail.value || ["", "", ""];
    const text = v.every((x) => String(x || "").trim()) ? v.join(" ") : "";
    this.setData({ region: v, regionText: text });
  },

  onAddressInput(e) {
    this.setData({ address: e.detail.value });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  async onSubmit() {
    const receiverName = String(this.data.receiverName || "").trim();
    const receiverPhone = String(this.data.receiverPhone || "").trim();
    const region = this.data.region || [];
    const address = String(this.data.address || "").trim();
    const remark = String(this.data.remark || "").trim();

    if (!receiverName) return wx.showToast({ title: "请填写收货人", icon: "none" });
    if (!/^1[3-9]\d{9}$/.test(receiverPhone)) return wx.showToast({ title: "手机号不正确", icon: "none" });
    if (!region[0] || !region[1] || !region[2]) return wx.showToast({ title: "请选择省市区", icon: "none" });
    if (!address) return wx.showToast({ title: "请填写详细地址", icon: "none" });

    const body = {
      receiverName,
      receiverPhone,
      province: region[0],
      city: region[1],
      district: region[2],
      address,
      remark,
      freightFen: 0
    };

    try {
      let order;
      if (this.data.mode === "direct") {
        const pid = Number(this.data.productId);
        if (!pid) {
          wx.showToast({ title: "商品无效", icon: "none" });
          return;
        }
        const res = await shopApi.createOrderDirect({
          ...body,
          items: [{ productId: pid, quantity: this.data.quantity || 1 }]
        });
        order = res.order;
      } else {
        const res = await shopApi.createOrderFromCart(body);
        order = res.order;
      }
      wx.showToast({ title: "下单成功", icon: "success" });
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/mall-order-detail/index?orderNo=${encodeURIComponent(order.orderNo)}`
        });
      }, 400);
    } catch (e) {
      /* toast */
    }
  }
});
