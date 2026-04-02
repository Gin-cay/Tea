/**
 * 故事详情：由首页 / 列表页传入 type（tea|red）与 id。
 * 文案为示例占位，后续可改为根据 id 请求接口。
 */
const STORIES = {
  tea: {
    longjing: {
      title: "龙井：明前茶的千年传承",
      subtitle: "茶叶故事 · 绿茶",
      body:
        "明前龙井讲究「早、嫩、鲜」，采摘于清明前，芽叶细嫩、香气清高。千百年来，江南茶农依时令而采、依火候而炒，形成了独特的扁形茶工艺与品饮文化。\n\n此处为示例正文，可替换为富文本或接口返回内容。"
    },
    wuyi: {
      title: "武夷岩茶：岩骨花香的匠心工艺",
      subtitle: "茶叶故事 · 乌龙茶",
      body:
        "岩茶生于丹霞峭壁之间，「岩骨花香」来自独特的山场与工艺。做青、炭焙环环相扣，既考验经验，也承载茶人对品质的坚持。\n\n此处为示例正文，可对接 CMS 或云数据库。"
    }
  },
  red: {
    xinyang: {
      title: "信阳毛尖：大别山的红色茶韵",
      subtitle: "红色茶源 · 信阳",
      body:
        "大别山革命老区与信阳茶乡交织，一片叶子连着乡土记忆与红色足迹。毛尖清香里，亦有薪火相传的家国故事。\n\n此处为示例正文，可补充史料与图文素材。"
    },
    anxi: {
      title: "安溪铁观音：闽西苏区的茶乡记忆",
      subtitle: "红色茶源 · 安溪",
      body:
        "闽地茶乡与苏区历史相互映照，铁观音的馥郁回甘中，沉淀着茶农与土地的深情，也见证着时代的变迁。\n\n此处为示例正文，可扩展为专题页内容。"
    }
  }
};

Page({
  data: {
    story: null
  },

  onLoad(options) {
    const type = options.type || "";
    const id = options.id || "";
    const bucket = STORIES[type];
    const story = bucket && bucket[id] ? bucket[id] : null;
    this.setData({ story });
    if (story && story.title) {
      wx.setNavigationBarTitle({ title: story.title });
    }
  }
});
