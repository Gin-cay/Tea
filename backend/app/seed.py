"""首次启动时写入演示数据（表为空时执行）。"""

import json
import logging
import os
from typing import Any, Dict

from sqlalchemy.orm import Session

from app.models import (
    AdoptGarden,
    AdoptPackage,
    Banner,
    ContentStory,
    DonationRecord,
    GardenProfile,
    HomeGardenTeaser,
    HomeHotItem,
    Milestone,
    Product,
    RedeemGood,
    SeasonTimeline,
    ShopCategory,
    ShopProduct,
    ShopProductTrace,
    StudyRoute,
    StudySpot,
    TraceSysRole,
)

logger = logging.getLogger(__name__)

_FIXTURE = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "fixtures", "seed_bundle.json")
)


def _load_bundle() -> Dict[str, Any]:
    with open(_FIXTURE, encoding="utf-8") as f:
        return json.load(f)


def seed_shop_content_if_needed(db: Session) -> None:
    """商城分类、商品、溯源批次、故事 CMS（无分类时写入）。"""
    if db.query(ShopCategory).first():
        return
    logger.info("正在写入商城与故事种子数据…")
    for name, so in [("绿茶", 1), ("红茶", 2), ("礼盒", 3)]:
        db.add(ShopCategory(name=name, sort_order=so, status=1))
    db.flush()
    cats = db.query(ShopCategory).order_by(ShopCategory.sort_order).all()
    cid_green = cats[0].id if len(cats) > 0 else 1
    cid_red = cats[1].id if len(cats) > 1 else cid_green
    cid_box = cats[2].id if len(cats) > 2 else cid_green

    p1 = ShopProduct(
        category_id=cid_green,
        name="高山龙井 250g",
        subtitle="明前采摘，清香回甘",
        cover_url="/images/banner-home.png",
        gallery_json=json.dumps(["/images/banner-home.png"], ensure_ascii=False),
        price_fen=9800,
        original_price_fen=12800,
        stock=200,
        sales=36,
        detail_html="<p>绿茶商品详情，支持溯源查询。</p>",
        red_selling_tag="浙西高山茶园 · 红色助农基地直供",
        status=1,
    )
    p2 = ShopProduct(
        category_id=cid_red,
        name="武夷岩茶礼盒",
        subtitle="岩骨花香，送礼优选",
        cover_url="/images/banner-mall.png",
        gallery_json=json.dumps(["/images/banner-mall.png"], ensure_ascii=False),
        price_fen=16800,
        stock=80,
        sales=12,
        detail_html="<p>乌龙茶礼盒，批次可溯源。</p>",
        red_selling_tag="闽北丹霞山场 · 可追溯加工批次",
        status=1,
    )
    p3 = ShopProduct(
        category_id=cid_box,
        name="助农茶礼组合装",
        subtitle="多品类组合，企业团购优选",
        cover_url="/images/background.png",
        gallery_json=json.dumps(["/images/background.png"], ensure_ascii=False),
        price_fen=26800,
        stock=50,
        sales=5,
        detail_html="<p>组合装详情。</p>",
        red_selling_tag="公益茶园联名 · 每单部分捐赠公益里程碑",
        status=1,
    )
    db.add(p1)
    db.add(p2)
    db.add(p3)
    db.flush()

    chain = [
        {"title": "基地采摘", "time": "2026-03-10", "desc": "明前批次验收"},
        {"title": "加工封装", "time": "2026-03-18", "desc": "SC 车间质检"},
    ]
    db.add(
        ShopProductTrace(
            product_id=p1.id,
            batch_no="2026-SPRING-01",
            garden_id="1",
            garden_name="安溪生态茶园",
            cert_no="SC-TEA-2026-001",
            trace_chain_json=json.dumps(chain, ensure_ascii=False),
            verify_hint="微信扫一扫包装二维码或输入批次号查询",
        )
    )

    stories = [
        ContentStory(
            story_type="tea",
            slug="longjing",
            title="龙井：明前茶的千年传承",
            desc="江南春色与采摘时令中的茶文化",
            body_html="<p>明前龙井讲究「早、嫩、鲜」……（可在管理端修改正文）</p>",
            sort_order=1,
        ),
        ContentStory(
            story_type="tea",
            slug="wuyi",
            title="武夷岩茶：岩骨花香的匠心工艺",
            desc="炭焙与做青里的制茶智慧",
            body_html="<p>岩茶生于丹霞峭壁之间……</p>",
            sort_order=2,
        ),
        ContentStory(
            story_type="red",
            slug="xinyang",
            title="信阳毛尖：大别山的红色茶韵",
            desc="老区茶乡交织的红色记忆",
            body_html="<p>大别山革命老区与信阳茶乡……</p>",
            sort_order=1,
        ),
        ContentStory(
            story_type="red",
            slug="anxi",
            title="安溪铁观音：闽西苏区的茶乡记忆",
            desc="茶乡与苏区历史相互映照",
            body_html="<p>闽地茶乡……</p>",
            sort_order=2,
        ),
    ]
    for s in stories:
        db.add(s)

    db.commit()
    logger.info("商城与故事种子数据写入完成")


def _seed_core_bundle_if_empty(db: Session) -> None:
    if db.query(Milestone).first():
        logger.info("数据库已有里程碑数据，跳过公益/认养种子")
        return
    bundle = _load_bundle()
    logger.info("正在写入公益、认养、研学等种子数据…")

    milestones = [
        ("ms-1000", "农具捐助计划", 1000, 1000, "为茶农家庭捐助采茶篓、修枝剪与防护手套", "completed", "record-1000", 1),
        ("ms-2000", "茶园修护计划", 2000, 2000, "修复茶垄步道并补充有机肥，降低雨季水土流失", "completed", "record-2000", 2),
        ("ms-3000", "灌溉升级计划", 3000, 2680, "修缮茶园灌溉设施，新增节水滴灌管线", "in_progress", "", 3),
        ("ms-5000", "助学共建计划", 5000, 2680, "支持茶乡留守儿童研学物资与公益课堂", "locked", "", 4),
    ]
    for mid, name, tgt, cur, dc, st, rid, so in milestones:
        db.add(
            Milestone(
                id=mid,
                name=name,
                target_amount=tgt,
                current_amount=cur,
                donate_content=dc,
                status=st,
                record_id=rid,
                sort_order=so,
            )
        )

    r1 = DonationRecord(
        id="record-1000",
        milestone_name="农具捐助计划",
        donate_detail="已向 6 户茶农家庭发放采茶工具包，覆盖春茶采摘关键节点。",
        execution_progress="执行进度 100%，全部农具已签收并投入使用。",
        feedback_json=json.dumps(
            [
                {"imageUrl": "/images/banner-home.png", "text": "茶农领取农具后现场合影"},
                {"imageUrl": "/images/background.png", "text": "春茶采摘效率提升记录"},
            ],
            ensure_ascii=False,
        ),
        certificate_json=json.dumps(
            {
                "certNo": "PB-2026-1000-01",
                "issuer": "茶叶助农公益中心",
                "issuedAt": "2026-03-10",
            },
            ensure_ascii=False,
        ),
    )
    r2 = DonationRecord(
        id="record-2000",
        milestone_name="茶园修护计划",
        donate_detail="完成 1.2 公里茶垄步道修复及坡面植被加固，提升雨季通行与防护能力。",
        execution_progress="执行进度 100%，第三方巡检已验收通过。",
        feedback_json=json.dumps(
            [
                {"imageUrl": "/images/banner-mall.png", "text": "茶垄步道修复前后对比"},
                {"imageUrl": "/images/banner-home.png", "text": "修护完成后现场验收"},
            ],
            ensure_ascii=False,
        ),
        certificate_json=json.dumps(
            {
                "certNo": "PB-2026-2000-01",
                "issuer": "茶叶助农公益中心",
                "issuedAt": "2026-03-28",
            },
            ensure_ascii=False,
        ),
    )
    db.add(r1)
    db.add(r2)

    for gid, title, cost, typ in [
        ("rd-tea-01", "50g 体验茶礼", 300, "tea"),
        ("rd-around-01", "茶乡帆布袋", 450, "around"),
        ("rd-coupon-01", "商城 30 元抵扣券", 600, "coupon"),
    ]:
        db.add(RedeemGood(id=gid, title=title, points_cost=cost, type=typ))

    for gid, profile in bundle["gardens"].items():
        db.add(
            GardenProfile(
                garden_id=str(gid),
                profile_json=json.dumps(profile, ensure_ascii=False),
            )
        )

    for sp in bundle["studySpots"]:
        db.add(StudySpot(id=sp["id"], payload_json=json.dumps(sp, ensure_ascii=False)))

    for rt in bundle["studyRoutes"]:
        db.add(StudyRoute(id=rt["id"], payload_json=json.dumps(rt, ensure_ascii=False)))

    imgs = bundle["seasonImages"]
    diary_by_g = bundle["seasonDiary"]
    for gid, seasons in diary_by_g.items():
        for sk, diary in seasons.items():
            db.add(
                SeasonTimeline(
                    garden_id=str(gid),
                    season_key=sk,
                    image_url=imgs.get(sk, "/images/banner-home.png"),
                    diary=diary,
                )
            )

    for p in bundle["products"]:
        db.add(Product(id=p["id"], payload_json=json.dumps(p, ensure_ascii=False)))

    db.add(Banner(id=1, title="春茶上新", image="/images/background.png"))
    db.add(Banner(id=2, title="助农直采", image="/images/background.png"))
    db.add(Banner(id=3, title="茶园认养季", image="/images/background.png"))

    db.add(
        HomeHotItem(
            id=1,
            payload_json=json.dumps(
                {"id": 1, "name": "高山龙井 250g", "desc": "明前采摘，清香回甘", "price": "98"},
                ensure_ascii=False,
            ),
        )
    )
    db.add(
        HomeHotItem(
            id=2,
            payload_json=json.dumps(
                {"id": 2, "name": "武夷岩茶礼盒", "desc": "岩骨花香，送礼优选", "price": "168"},
                ensure_ascii=False,
            ),
        )
    )

    db.add(
        HomeGardenTeaser(
            id=1,
            payload_json=json.dumps({"id": 1, "name": "安溪生态茶园", "status": "可认养"}, ensure_ascii=False),
        )
    )
    db.add(
        HomeGardenTeaser(
            id=2,
            payload_json=json.dumps({"id": 2, "name": "武夷山有机茶园", "status": "认养中"}, ensure_ascii=False),
        )
    )

    details = bundle["adoptDetails"]
    for i in ("1", "2", "3"):
        d = details[i]
        lst = {k: v for k, v in d.items() if k not in ("faq", "redTraceUSP", "gardenIntro", "shipping", "benefits")}
        db.add(
            AdoptGarden(
                id=int(i),
                list_json=json.dumps(lst, ensure_ascii=False),
                detail_json=json.dumps(d, ensure_ascii=False),
            )
        )

    for key, pkg in bundle["adoptPackages"].items():
        db.add(
            AdoptPackage(
                package_key=key,
                payload_json=json.dumps(pkg, ensure_ascii=False),
            )
        )

    db.commit()
    logger.info("公益、认养、研学等种子数据写入完成")


def seed_trace_roles_if_needed(db: Session) -> None:
    """溯源角色（可扩展 permissions JSON 数组；[\"*\"] 为超级管理员）。"""
    if db.query(TraceSysRole).first():
        return
    roles = [
        ("溯源超级管理员", '["*"]'),
        ("茶园管理员", '["picking"]'),
        ("加工厂管理员", '["processing"]'),
        ("质检管理员", '["qc"]'),
        ("仓库管理员", '["warehouse", "logistics"]'),
        ("销售运营管理员", '["sales"]'),
    ]
    for name, perms in roles:
        db.add(TraceSysRole(role_name=name, permissions=perms))
    db.commit()
    logger.info("溯源角色种子数据已写入")


def run_seed(db: Session) -> None:
    _seed_core_bundle_if_empty(db)
    seed_shop_content_if_needed(db)
    seed_trace_roles_if_needed(db)
