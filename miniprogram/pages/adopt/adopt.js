const realCareStorage = require("../../utils/realCareStorage");

Page({
  data: {
    plans: [
      {
        id: 1,
        packageKey: "experience",
        name: "体验认养",
        price: "199/季",
        desc: "单株茶树，季度回寄茶样"
      },
      {
        id: 2,
        packageKey: "family",
        name: "家庭认养",
        price: "699/年",
        desc: "三株茶树，全年采摘纪实"
      },
      {
        id: 3,
        packageKey: "enterprise",
        name: "企业认养",
        price: "2999/年",
        desc: "专属茶园牌，企业定制礼盒"
      }
    ],
    progressList: [
      { id: 1, title: "春茶采摘", time: "2026-03-25", status: "已完成" },
      { id: 2, title: "制茶发酵", time: "2026-03-29", status: "进行中" }
    ],

    /**
     * 茶树数字孪生（自动版）：
     * - 页面自动获取设备真实当前日期，不展示日期选择 UI
     * - 根据日期匹配茶季，右上角展示茶季标签，同时更新图片与底部文案
     */
    teaSeasonLabel: "",
    activeSeasonImage: "",
    activeSeasonDiary: "",
    imgOpacity: 1,

    // ========== 实时照看 ==========
    careRole: "customer", // farmer | customer
    careUserId: "",
    careTreeId: "", // 当前查看的认养茶树编号（顾客端：自己的；茶农端：上传关联）
    careFeed: [], // [{id,imageUrl,diary,takenAt,takenAtText,...}]
    // 茶农端上传已拆分为独立页面：认养页不再承载草稿/选图状态
  },

  /** 页面初始化：首次进入时按当天自动匹配茶季 */
  onLoad() {
    this.applyTeaSeasonForToday(true);
    this.initRealCare();
  },

  /** 每次回到页面都按“真实当天日期”无感刷新（跨天/前后台切换更准确） */
  onShow() {
    this.applyTeaSeasonForToday(false);
    // 回到页面时刷新实时照看列表
    this.loadRealCareFeed();
  },

  // onReady：模块为纯图片展示，不做额外初始化

  onTapAdoptList() {
    wx.navigateTo({
      url: "/pages/adopt-list/adopt-list"
    });
  },

  onTapPlan(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    wx.navigateTo({
      url: `/pages/adopt-package-detail/adopt-package-detail?key=${key}`
    });
  },

  /** 快捷进入红色溯源枢纽 */
  onTapRedTrace() {
    wx.navigateTo({ url: "/pages/red-trace/hub/index" });
  },

  /** 按当天日期匹配并更新 UI（带淡入切换，做到“无感知”） */
  applyTeaSeasonForToday(isFirstPaint) {
    const today = this.formatDate(new Date());
    const mapped = this.mapTeaSeasonByDate(today);

    // 首屏不做淡出，避免闪烁；后续回到页面可无感更新
    if (isFirstPaint) {
      this.setData({
        teaSeasonLabel: mapped.label,
        activeSeasonImage: mapped.image,
        activeSeasonDiary: mapped.diary,
        imgOpacity: 1
      });
      return;
    }

    this.setData({ imgOpacity: 0 });
    if (this._twinImgTimer) clearTimeout(this._twinImgTimer);
    this._twinImgTimer = setTimeout(() => {
      this.setData({
        teaSeasonLabel: mapped.label,
        activeSeasonImage: mapped.image,
        activeSeasonDiary: mapped.diary,
        imgOpacity: 1
      });
    }, 180);
  },

  /** 页面卸载时停止动画，避免内存/性能问题 */
  onUnload() {
    if (this._twinImgTimer) clearTimeout(this._twinImgTimer);
  },

  // ========== 实时照看：初始化/加载 ==========
  initRealCare() {
    const ctx = realCareStorage.ensureUserContext();
    // 顾客端默认看自己的第一棵茶树；茶农端也给一个默认值（可后续接后端/选择器）
    const treeId = ctx.treeIds && ctx.treeIds[0] ? ctx.treeIds[0] : "TREE-001";
    this.setData({
      careRole: ctx.role,
      careUserId: ctx.uid,
      careTreeId: treeId
    });
    this.loadRealCareFeed();
  },

  loadRealCareFeed() {
    const treeId = this.data.careTreeId;
    if (!treeId) return;
    const list = realCareStorage.listByTreeId(treeId).map((x) => ({
      ...x,
      takenAtText: this.formatDateTime(x.takenAt)
    }));
    this.setData({ careFeed: list });
  },

  // ========== 实时照看：顾客端预览 ==========
  onTapCarePreview(e) {
    const idx = e.currentTarget.dataset.index;
    const feed = this.data.careFeed || [];
    const urls = feed.map((x) => x.imageUrl).filter(Boolean);
    const current = feed[idx] && feed[idx].imageUrl ? feed[idx].imageUrl : urls[0];
    if (!urls.length || !current) return;
    wx.previewImage({ current, urls });
  },

  // ========== 实时照看：茶农端上传入口（独立页面） ==========
  onTapCareUploadPage() {
    if (this.data.careRole !== "farmer") return;
    const app = getApp();
    const ok = app.ensureProfileOrRedirect({ redirect: "tab:farmer" });
    if (!ok) return;
    const treeId = this.data.careTreeId || "";
    wx.navigateTo({
      url: `/pages/real-care/upload/index?treeId=${encodeURIComponent(treeId)}`
    });
  },

  /** yyyy-MM-dd */
  formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  },

  /** yyyy-MM-dd HH:mm */
  formatDateTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const ymd = this.formatDate(d);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${ymd} ${hh}:${mm}`;
  },

  /**
   * 根据日期匹配茶季与图片（占位路径，后续你给图再替换）
   *
   * 规则（按你提供的要求，尽量严格）：
   * - 3月-4月上旬：春茶（4/1-4/14）
   * - 4月中旬：雨前茶（优先级高）
   * - 5月-8月：夏茶
   * - 8月-9月：秋茶（与你的“夏茶 5-8”存在 8 月重叠；这里按“秋茶优先”处理：8-9 归秋茶）
   * - 11月-次年2月：冬茶
   * 注：10月未在规则中声明，这里默认归为秋茶（展示不断档）
   */
  mapTeaSeasonByDate(yyyyMMdd) {
    const m = parseInt(yyyyMMdd.slice(5, 7), 10);
    const d = parseInt(yyyyMMdd.slice(8, 10), 10);

    // 占位图片路径：你稍后给图后替换为真实资源
    const IMG = {
      spring: "/images/tea-spring.png",
      yuqian: "/images/tea-yuqian.png",
      summer: "/images/tea-summer.png",
      autumn: "/images/tea-autumn.png",
      winter: "/images/tea-winter.png"
    };

    // 4月中旬：雨前茶（按 4/15-4/20 作为“中旬”窗口；如需 4/11-4/20 我再改）
    if (m === 4 && d >= 15 && d <= 20) {
      return {
        key: "yuqian",
        label: "雨前茶",
        image: IMG.yuqian,
        diary: "雨前鲜爽：香气更扬，采摘窗口更短"
      };
    }

    // 冬茶：11-2
    if (m === 11 || m === 12 || m === 1 || m === 2) {
      return {
        key: "winter",
        label: "冬茶",
        image: IMG.winter,
        diary: "冬季修剪：整形修枝 + 清园归档"
      };
    }

    // 春茶：3月 + 4月上旬（排除上面的雨前茶窗口）
    if (m === 3 || (m === 4 && d <= 14)) {
      return {
        key: "spring",
        label: "春茶",
        image: IMG.spring,
        diary: "春季采摘：明前抽芽，芽叶标准记录"
      };
    }

    // 秋茶：8-9 + 10（补齐规则空档）；优先级高于“夏茶 5-8”
    if (m === 8 || m === 9 || m === 10) {
      return {
        key: "autumn",
        label: "秋茶",
        image: IMG.autumn,
        diary: "秋季制茶：适采秋梢，工艺流程可追溯"
      };
    }

    // 夏茶：5-7（8 月已按“秋茶优先”归为秋茶）
    if (m >= 5 && m <= 7) {
      return {
        key: "summer",
        label: "夏茶",
        image: IMG.summer,
        diary: "夏季养护：防虫巡园 + 叶片盛发台账"
      };
    }

    // 兜底：4月下旬（非雨前茶窗口）归春茶；其余归秋茶
    if (m === 4 && d >= 21) {
      return {
        key: "spring",
        label: "春茶",
        image: IMG.spring,
        diary: "春季采摘：明前抽芽，芽叶标准记录"
      };
    }
    return {
      key: "autumn",
      label: "秋茶",
      image: IMG.autumn,
      diary: "秋季制茶：适采秋梢，工艺流程可追溯"
    };
  }

});
