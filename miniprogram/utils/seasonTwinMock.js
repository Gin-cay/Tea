/**
 * 茶树数字孪生（轻量版）：按茶园 id 返回四季实景图 + 农事日记示例。
 * 正式环境可改为云接口 /api/garden/season-timeline 返回同结构 JSON。
 */

const IMG = {
  spring: "/images/banner-home.png",
  summer: "/images/banner-mall.png",
  autumn: "/images/background.png",
  winter: "/images/ai_example1.png"
};

const DIARY = {
  "1": {
    spring: "惊蛰后追肥一次，有机肥浅沟埋施；巡园记录新梢萌发密度，墒情正常。",
    summer: "高温高湿，早晚巡视防虫害，沟渠排水畅通；茶树适度遮阴，未摘夏茶以养树。",
    autumn: "秋梢停长，补施钾肥壮杆；拍摄固定机位对比图存档，备溯源展示。",
    winter: "深耕松土、覆盖保墒；修剪弱枝，园区清理枯枝落叶，准备春暖前管护。"
  },
  "2": {
    spring: "明前采摘批次开启，一芽一叶标准；采后立即摊晾，记录温湿度。",
    summer: "伏前修整茶行，人工除草一轮；有机认证区禁用化学除草剂。",
    autumn: "秋茶轻采养树为主，补足钙质叶面肥；红外相机记录夜间生物活动。",
    winter: "封园前防病一次（生物制剂）；台账归档全年投入品批号，备抽查。"
  },
  "3": {
    spring: "多片区同步春管，合作社统筹用工；认养区块立牌，拍照回传认养人。",
    summer: "抗旱保苗，滴灌试运行；党员带头值守，防火防盗巡查写入村台账。",
    autumn: "共富收购分级定点，认养户代表参与见证称重；收益公示草案起草。",
    winter: "茶园道路养护占用部分认养基金公示；茶农培训计划排期至次年清明前。"
  }
};

const DEFAULT_DIARY = {
  spring: "春季追肥与萌发观测，农事已按计划记入台账。",
  summer: "夏季防涝防暑，病虫害绿色防控。",
  autumn: "秋季补肥与园相记录，为来年采摘做准备。",
  winter: "冬季修剪与土壤休养，档案持续更新。"
};

/**
 * @param {string} gardenId
 * @returns {{ key: string, label: string, image: string, diary: string }[]}
 */
function getSeasonTwinConfig(gardenId) {
  const id = String(gardenId);
  const d = DIARY[id] || DEFAULT_DIARY;
  return [
    { key: "spring", label: "春", image: IMG.spring, diary: d.spring },
    { key: "summer", label: "夏", image: IMG.summer, diary: d.summer },
    { key: "autumn", label: "秋", image: IMG.autumn, diary: d.autumn },
    { key: "winter", label: "冬", image: IMG.winter, diary: d.winter }
  ];
}

/** 按公历月份估算当前季节（3–5春 6–8夏 9–11秋 其余冬） */
function getCurrentSeasonKey() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

module.exports = {
  getSeasonTwinConfig,
  getCurrentSeasonKey
};
