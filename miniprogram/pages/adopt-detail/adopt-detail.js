const MOCK = {
  1: {
    cover: "/images/banner-home.png",
    name: "半亩塘·益龙芳明前绿茶认养",
    cycleLabel: "认养周期：2026 春茶季",
    progress: 72,
    variety: "龙井群体种",
    period: "12 个月",
    yield: "预计鲜叶约 8kg/亩",
    price: 699,
    joinCount: 328,
    benefits: [
      "专属电子认养证书与茶园档案",
      "生长季图文/短视频同步",
      "季末鲜叶或成品茶按比例寄送",
      "优先参与线下采茶体验活动"
    ],
    redTraceUSP:
      "认养完成后自动生成「红色茶源溯源码」，扫码可见茶园位置、茶农奋斗故事、茶区红色革命史与种植加工全流程数据；并可领取电子红色茶旅证书、参与线下研学打卡积分兑换。",
    gardenIntro:
      "半亩塘茶园位于浙西绿色生态产区，由益龙芳合作社统一管理，推行减药控肥与有机肥改良土壤。茶树多为本地群体种，春茶香气清透、滋味鲜爽，是「共富茶园」助农示范单元。",
    shipping:
      "认养收益茶叶默认以顺丰/京东包邮寄送（港澳台及偏远地区按实补差）。每批次发货前将通过小程序消息提醒，支持合并发货与指定收货人。鲜叶类按采摘日程冷链或顺丰特快发出。",
    faq: [
      {
        q: "认养后能否退款？",
        a: "未开始履约前可按规则申请退款；已开采或已寄出茶品按订单协议处理，详见认养合同。"
      },
      {
        q: "产量波动怎么办？",
        a: "若遇极端天气导致减产，将按合约置换等量茶品或顺延至下一季补给。"
      },
      {
        q: "可以开发票吗？",
        a: "支持开具电子普通发票，支付成功后于「我的-订单」提交抬头信息。"
      }
    ]
  },
  2: {
    cover: "/images/banner-mall.png",
    name: "云雾山有机红茶认养套餐",
    cycleLabel: "认养周期：年度制茶全周期",
    progress: 45,
    variety: "金骏眉系",
    period: "12 个月",
    yield: "预计干茶约 3.5kg/份",
    price: 1280,
    joinCount: 156,
    benefits: [
      "有机认证产区溯源信息可查",
      "一人一码绑定茶树档案",
      "制茶过程可视化记录",
      "年度礼盒装优先发货"
    ],
    redTraceUSP:
      "红色茶路与有机种植双叙事：溯源码串联闽北革命史、茶农档案与加工可视化；支持研学路线预约与积分兑换。",
    gardenIntro:
      "云雾山片区常年云雾缭绕、昼夜温差大，利于红茶内含物积累。茶园执行有机种植规范，人工除草与生物防虫相结合，茶汤甜醇带花香。",
    shipping:
      "干茶类产品常规快递包邮；易碎陶瓷礼盒加固包装。如需分批寄送可在确认订单页备注。",
    faq: [
      {
        q: "有机认证如何查验？",
        a: "详情页展示证书编号，认养成功后可于国家认监委查询平台核验。"
      },
      {
        q: "可以调整寄送周期吗？",
        a: "可在履约前联系客服改为按季度分三次寄出。"
      }
    ]
  },
  3: {
    cover: "/images/background.png",
    name: "共富茶园·家庭共享认养",
    cycleLabel: "认养周期：按季开放",
    progress: 88,
    variety: "多品种拼配",
    period: "3 个月/季",
    yield: "季末寄送茶样礼盒",
    price: 399,
    joinCount: 902,
    benefits: [
      "家庭共享账号多人查看进度",
      "每季茶样盲盒+产地明信片",
      "乡村公益积分可兑换周边",
      "认养金部分用于农村公路养护公示"
    ],
    redTraceUSP:
      "共富茶园绑定党支部领办合作社故事；认养即享红色溯源、田间党课实践点打卡与公益积分联动。",
    gardenIntro:
      "共富茶园项目链接村集体与茶农散户，通过统一标准与分级收购提升议价能力，认养金按比例反哺基础设施与茶农培训。",
    shipping:
      "每季度结束后 15 个工作日内发出茶样礼盒；遇节假日顺延并站内通知。",
    faq: [
      {
        q: "「共富」资金去向透明吗？",
        a: "每季在小程序公示认养金分配摘要，接受监督与审计。"
      },
      {
        q: "能升级年度认养吗？",
        a: "可在当季结束前补差价升级，权益按新档位重新核算。"
      }
    ]
  }
};

Page({
  data: {
    id: "",
    detail: null
  },

  onLoad(options) {
    const raw = options.id;
    const id = raw != null ? String(raw) : "";
    const detail = MOCK[id] ? { ...MOCK[id], id } : null;
    this.setData({ id, detail });
  },

  goConfirmOrder() {
    const id = this.data.id;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/adopt-order/adopt-order?id=${id}`
    });
  },

  onTapFooterAction() {
    const app = getApp();
    const key = app.globalData.sessionStorageKey;
    const session = wx.getStorageSync(key);
    if (session && session.nickName) {
      app.globalData.userInfo = session;
      this.goConfirmOrder();
      return;
    }
    wx.getUserProfile({
      desc: "用于认养报名与订单通知",
      success: (res) => {
        const u = res.userInfo || {};
        wx.setStorageSync(key, {
          nickName: u.nickName || "茶友",
          avatarUrl: u.avatarUrl || ""
        });
        app.globalData.userInfo = u;
        wx.login({
          success: () => {
            this.goConfirmOrder();
          },
          fail: () => {
            this.goConfirmOrder();
          }
        });
      },
      fail: () => {
        wx.showModal({
          title: "需要授权",
          content: "请先同意用户信息授权以完成认养报名",
          showCancel: false
        });
      }
    });
  },

  /** 跳转红色溯源枢纽 */
  goRedTraceHub() {
    wx.navigateTo({ url: "/pages/red-trace/hub/index" });
  },

  /** 当前茶园多媒体红色故事 */
  goRedStoryThisGarden() {
    const id = this.data.id || "1";
    wx.navigateTo({
      url: `/pages/red-trace/story-rich/index?gardenId=${id}`
    });
  }
});
