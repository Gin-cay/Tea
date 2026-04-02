/**
 * 红色溯源 / 研学 演示数据（茶园绑定红色故事、茶农、流程、多媒体占位）。
 * 后台接口就绪后，用 utils/redTraceApi.js 拉取并替换本模块导出。
 */

/** 按认养详情 id 关联茶园 */
const GARDEN_RED_PROFILE = {
  "1": {
    gardenId: "1",
    gardenName: "半亩塘·益龙芳明前绿茶认养",
    locationLabel: "浙江省杭州市 · 浙西绿色生态产区",
    coordinates: { lat: 29.89, lng: 119.52 },
    mapHint: "精准坐标仅向认养用户展示，已做脱敏处理；正式环境由服务端鉴权返回。",
    farmer: {
      name: "益龙芳合作社 · 王师傅",
      avatar: "/images/banner-home.png",
      story:
        "二十年守一片山，从手工杀青到电焙温控，每一锅茶都记着父辈传下来的火候口诀。合作社带动周边三十余户茶农统一标准、共享渠道。"
    },
    redHistory: {
      title: "茶区红色印记",
      paragraphs: [
        "浙西茶区在革命年代曾是重要的秘密交通线节点，乡亲们以茶棚为掩护传递情报、支援前线。",
        "今日茶园所在的村镇赓续红色基因，将「共富茶园」与红色研学结合，让青年在采茶制茶中读懂乡土中国。"
      ],
      cover: "/images/banner-home.png"
    },
    process: [
      { key: "plant", title: "生态种植", desc: "有机肥改良、生物防虫，农事台账每日上传。", pct: 100 },
      { key: "pick", title: "明前采摘", desc: "一芽一叶标准采摘，批次扫码入库。", pct: 85 },
      { key: "make", title: "杀青揉捻", desc: "传统工艺与现代温控结合，全程影像记录。", pct: 72 },
      { key: "pack", title: "分级包装", desc: "质检合格后贴溯源签，冷链/顺丰发出。", pct: 40 }
    ],
    richStory: {
      title: "半亩塘：一片叶子的红色与绿色",
      blocks: [
        { type: "text", content: "图文混排示例：以下为红色茶乡叙事正文，后台 CMS 可维护段落顺序。" },
        {
          type: "image",
          src: "/images/banner-home.png",
          caption: "春日茶园（示意图，可换实拍）"
        },
        {
          type: "audio",
          title: "茶农讲述：我的奋斗故事",
          src: "",
          durationLabel: "03:24",
          tip: "音频 URL 由管理后台上传后下发；演示环境无音频文件。"
        },
        {
          type: "video",
          title: "制茶短视频",
          src: "",
          poster: "/images/banner-home.png",
          tip: "短视频建议使用微信云存储或 CDN 链接。"
        }
      ]
    }
  },
  "2": {
    gardenId: "2",
    gardenName: "云雾山有机红茶认养套餐",
    locationLabel: "福建省南平市 · 武夷山脉云雾带",
    coordinates: { lat: 27.76, lng: 117.64 },
    mapHint: "有机认证产区，坐标已脱敏。",
    farmer: {
      name: "云雾山有机茶场 · 李姐",
      avatar: "/images/banner-mall.png",
      story: "坚持五年不打化学除草剂，人工锄草二十余次/年；红茶发酵室温湿度曲线全程可追溯。"
    },
    redHistory: {
      title: "闽北红色茶路",
      paragraphs: [
        "闽北苏区时期，茶农以茶叶贸易为掩护支援根据地经济建设。",
        "云雾山片区保留多处红色遗址，与当代茶旅研学线路联动开放。"
      ],
      cover: "/images/banner-mall.png"
    },
    process: [
      { key: "plant", title: "有机管护", desc: "国标有机投入品台账。", pct: 100 },
      { key: "pick", title: "适采期采摘", desc: "分批留样检测。", pct: 90 },
      { key: "make", title: "萎凋发酵", desc: "可视化温湿度曲线。", pct: 65 },
      { key: "pack", title: "礼盒封装", desc: "防伪溯源码绑定。", pct: 50 }
    ],
    richStory: {
      title: "云雾山：岩韵里的家国记忆",
      blocks: [
        { type: "text", content: "红色茶源与有机种植双叙事，支持后台富文本编辑。" },
        { type: "image", src: "/images/banner-mall.png", caption: "有机茶园巡园" }
      ]
    }
  },
  "3": {
    gardenId: "3",
    gardenName: "共富茶园·家庭共享认养",
    locationLabel: "多产地拼配 · 村集体统筹",
    coordinates: { lat: 30.25, lng: 120.15 },
    mapHint: "共富项目联合多村，地图展示为行政中心点。",
    farmer: {
      name: "共富茶园 · 村集体代表",
      avatar: "/images/background.png",
      story: "认养金按比例反哺道路养护与茶农培训，每季公示资金流向，接受村民与认养人监督。"
    },
    redHistory: {
      title: "共富路上的茶乡党支部",
      paragraphs: [
        "党支部牵头成立合作社，把分散茶农组织起来对接认养与市场。",
        "红色研学团队常到此开展「田间党课」与采茶劳动实践。"
      ],
      cover: "/images/background.png"
    },
    process: [
      { key: "plant", title: "分散种植统一管理", desc: "各户数据汇总看板。", pct: 100 },
      { key: "pick", title: "集中收购分级", desc: "按标准指导价收购。", pct: 80 },
      { key: "make", title: "合作茶厂代加工", desc: "全程录像存档。", pct: 70 },
      { key: "pack", title: "礼盒寄送", desc: "附明信片与溯源卡。", pct: 60 }
    ],
    richStory: {
      title: "共富茶园：一片叶子富一方人",
      blocks: [{ type: "text", content: "多形式内容块由后台配置，此处为示例。" }]
    }
  }
};

const STUDY_SPOTS = [
  {
    id: "spot_xihu",
    name: "浙西茶区红色交通线纪念馆",
    address: "杭州市临安区 · 示例地址",
    redBadge: "省级爱国主义教育基地",
    checkinCode: "CHK-XH-001",
    pointsReward: 50
  },
  {
    id: "spot_wuyi",
    name: "闽北苏区茶乡陈列馆",
    address: "南平市武夷山市 · 示例地址",
    redBadge: "研学合作站点",
    checkinCode: "CHK-WY-002",
    pointsReward: 80
  },
  {
    id: "spot_gongfu",
    name: "共富茶园田间党课实践点",
    address: "村集体示范园 · 示例地址",
    redBadge: "劳动教育实践",
    checkinCode: "CHK-GF-003",
    pointsReward: 60
  }
];

const STUDY_ROUTES = [
  {
    id: "route_a",
    name: "一日红色茶旅（浙西线）",
    days: "1 天",
    highlights: ["纪念馆参观", "生态茶园徒步", "明前茶采摘体验"],
    needPoints: 0,
    bookingHint: "预约接口：POST /api/red-study/booking（预留）"
  },
  {
    id: "route_b",
    name: "闽北苏区两日研学",
    days: "2 天 1 晚",
    highlights: ["陈列馆", "制茶所参观", "红色主题茶会"],
    needPoints: 500,
    bookingHint: "可使用认养积分抵扣部分名额费用（演示：积分≥500 解锁预约按钮）"
  }
];

const ADMIN_API_STUB = {
  stories: "/api/admin/red-stories",
  farmers: "/api/admin/farmers",
  studyRoutes: "/api/admin/study-routes",
  traceVerify: "/api/trace/verify"
};

function getGardenProfile(gardenId) {
  return GARDEN_RED_PROFILE[String(gardenId)] || null;
}

module.exports = {
  GARDEN_RED_PROFILE,
  STUDY_SPOTS,
  STUDY_ROUTES,
  ADMIN_API_STUB,
  getGardenProfile
};
