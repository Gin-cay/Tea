const PACKAGES = {
  experience: {
    key: "experience",
    name: "体验认养",
    subtitle: "单株茶树 · 轻门槛尝新",
    cover: "/images/banner-home.png",
    price: 199,
    priceNote: "199 元 / 季",
    periodLabel: "履约周期",
    period: "1 季度（约 90 天）",
    intro:
      "面向首次接触茶园认养的用户，绑定单株茶树档案，可在小程序内查看施肥、除草、采摘等节点记录，季末寄送代表性茶样，适合个人尝鲜与礼赠体验。",
    benefits: [
      "单株茶树电子认领牌与成长相册",
      "每季度至少 2 次农事节点推送（图文/短视频）",
      "季末茶样礼盒（约 50g 试饮装）包邮",
      "优先报名线下茶文化沙龙（名额有限）"
    ]
  },
  family: {
    key: "family",
    name: "家庭认养",
    subtitle: "三株茶树 · 全家共护一片园",
    cover: "/images/background.png",
    price: 699,
    priceNote: "699 元 / 年",
    periodLabel: "履约周期",
    period: "12 个月（按茶季拆分履约）",
    intro:
      "以家庭为单位认养三株茶树，支持多人绑定同一认养账户，孩子与家长可共同查看茶园日历；年度内安排春茶主批次寄送，并附手写产地明信片与采摘日记摘选。",
    benefits: [
      "三株茶树统一档案，支持 4 位家庭成员绑定",
      "春茶主批次干茶/茶饼任选其一（按合约克重）",
      "生长季每月一次「茶园日记」推送",
      "赠送采茶季一日游抵扣券（以园区公告为准）"
    ]
  },
  enterprise: {
    key: "enterprise",
    name: "企业认养",
    subtitle: "品牌露出 · 定制礼盒与团建",
    cover: "/images/banner-mall.png",
    price: 2999,
    priceNote: "2999 元 / 年",
    periodLabel: "履约周期",
    period: "12 个月，可签补充协议延长",
    intro:
      "面向企业与机构的共富茶园合作档：提供实体认养牌设计与安装、年度礼盒贴牌生产对接、员工团建/客户答谢采茶专场排期。部分认养款进入村集体公益科目，可按约公示。",
    benefits: [
      "园区指定区域认养牌（含设计沟通 2 轮）",
      "年度企业定制礼盒额度（数量与规格以合同为准）",
      "专属客服与履约台账导出（Excel/PDF）",
      "优先排期采茶体验与党建/团建专场"
    ]
  }
};

Page({
  data: {
    key: "",
    pkg: null
  },

  onLoad(options) {
    const key = options.key ? String(options.key) : "";
    const pkg = PACKAGES[key] || null;
    this.setData({ key, pkg });
  },

  onTapAdopt() {
    const key = this.data.key;
    if (!key) return;
    wx.navigateTo({
      url: `/pages/adopt-order/adopt-order?mode=package&packageId=${key}`
    });
  }
});
