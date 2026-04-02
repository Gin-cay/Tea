import os
from copy import deepcopy

from flask import Flask, jsonify, request


MOCK_OVERVIEW = {
    "summary": {
        "totalAmount": 2680,
        "currentMilestoneName": "灌溉升级计划",
        "currentMilestoneTarget": 3000,
        "currentMilestoneProgress": 2680,
        "completedCount": 2,
        "pendingCount": 2,
    },
    "points": {"balance": 860, "expiringAt": "2026-12-31"},
    "milestones": [
        {
            "id": "ms-1000",
            "name": "农具捐助计划",
            "targetAmount": 1000,
            "currentAmount": 1000,
            "donateContent": "为茶农家庭捐助采茶篓、修枝剪与防护手套",
            "status": "completed",
            "recordId": "record-1000",
        },
        {
            "id": "ms-2000",
            "name": "茶园修护计划",
            "targetAmount": 2000,
            "currentAmount": 2000,
            "donateContent": "修复茶垄步道并补充有机肥，降低雨季水土流失",
            "status": "completed",
            "recordId": "record-2000",
        },
        {
            "id": "ms-3000",
            "name": "灌溉升级计划",
            "targetAmount": 3000,
            "currentAmount": 2680,
            "donateContent": "修缮茶园灌溉设施，新增节水滴灌管线",
            "status": "in_progress",
            "recordId": "",
        },
        {
            "id": "ms-5000",
            "name": "助学共建计划",
            "targetAmount": 5000,
            "currentAmount": 2680,
            "donateContent": "支持茶乡留守儿童研学物资与公益课堂",
            "status": "locked",
            "recordId": "",
        },
    ],
    "redeemGoods": [
        {"id": "rd-tea-01", "title": "50g 体验茶礼", "pointsCost": 300, "type": "tea"},
        {"id": "rd-around-01", "title": "茶乡帆布袋", "pointsCost": 450, "type": "around"},
        {"id": "rd-coupon-01", "title": "商城 30 元抵扣券", "pointsCost": 600, "type": "coupon"},
    ],
}

MOCK_RECORDS = {
    "record-1000": {
        "recordId": "record-1000",
        "milestoneName": "农具捐助计划",
        "donateDetail": "已向 6 户茶农家庭发放采茶工具包，覆盖春茶采摘关键节点。",
        "executionProgress": "执行进度 100%，全部农具已签收并投入使用。",
        "feedbackList": [
            {"imageUrl": "/images/banner-home.png", "text": "茶农领取农具后现场合影"},
            {"imageUrl": "/images/background.png", "text": "春茶采摘效率提升记录"},
        ],
        "certificate": {
            "certNo": "PB-2026-1000-01",
            "issuer": "茶叶助农公益中心",
            "issuedAt": "2026-03-10",
        },
    },
    "record-2000": {
        "recordId": "record-2000",
        "milestoneName": "茶园修护计划",
        "donateDetail": "完成 1.2 公里茶垄步道修复及坡面植被加固，提升雨季通行与防护能力。",
        "executionProgress": "执行进度 100%，第三方巡检已验收通过。",
        "feedbackList": [
            {"imageUrl": "/images/banner-mall.png", "text": "茶垄步道修复前后对比"},
            {"imageUrl": "/images/banner-home.png", "text": "修护完成后现场验收"},
        ],
        "certificate": {
            "certNo": "PB-2026-2000-01",
            "issuer": "茶叶助农公益中心",
            "issuedAt": "2026-03-28",
        },
    },
}

USER_POINTS = {"u-demo": 860}

app = Flask(__name__)


@app.after_request
def add_cors_headers(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-User-Id"
    return resp


def user_id():
    return request.headers.get("X-User-Id") or "u-demo"


@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    return jsonify({"ok": True, "service": "tea-public-benefit-api"})


@app.route("/public-benefit/milestones", methods=["GET", "OPTIONS"])
def public_benefit_milestones():
    uid = user_id()
    data = deepcopy(MOCK_OVERVIEW)
    data["points"]["balance"] = USER_POINTS.get(uid, data["points"]["balance"])
    return jsonify(data)


@app.route("/public-benefit/records/<record_id>", methods=["GET", "OPTIONS"])
def public_benefit_record(record_id):
    detail = MOCK_RECORDS.get(record_id)
    if not detail:
        return jsonify({"code": "NOT_FOUND", "message": "record not found"}), 404
    return jsonify(detail)


@app.route("/points/redeem", methods=["POST", "OPTIONS"])
def points_redeem():
    uid = user_id()
    body = request.get_json(silent=True) or {}
    points_cost = int(body.get("pointsCost") or 0)
    goods_id = body.get("goodsId") or ""
    if not goods_id or points_cost <= 0:
        return jsonify({"success": False, "code": "BAD_REQUEST", "message": "invalid payload"}), 400

    balance = USER_POINTS.get(uid, 0)
    if balance < points_cost:
        return jsonify({"success": False, "code": "INSUFFICIENT_POINTS", "message": "积分不足"})

    USER_POINTS[uid] = balance - points_cost
    return jsonify(
        {
            "success": True,
            "redeemId": f"rdm-{uid}-{goods_id}-{USER_POINTS[uid]}",
            "message": "兑换成功，预计 3-5 个工作日发放。",
            "balance": USER_POINTS[uid],
        }
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
