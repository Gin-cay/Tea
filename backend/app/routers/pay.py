"""认养订单统一下单（占位 / 开发桩 / 生产需对接微信支付 V3）。"""

import logging
import time
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_optional_openid
from app.models import PayOrder

logger = logging.getLogger(__name__)

router = APIRouter(tags=["pay"])


class UnifiedBody(BaseModel):
    adoptId: str = ""
    packageId: str = ""
    orderMode: str = "garden"
    amount: float = Field(..., ge=0.01, description="金额（元）")


@router.post("/pay/unified")
def pay_unified(
    body: UnifiedBody,
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    """
    小程序期望 200 + { payment: { timeStamp, nonceStr, package, signType, paySign } }。
    生产环境请配置商户号、证书并调用微信 V3 下单接口；此处提供订单落库与开发桩。
    """
    s = get_settings()
    oid = openid or ""
    amount_fen = int(round(body.amount * 100))
    order = PayOrder(
        id=uuid.uuid4().hex[:24],
        openid=oid,
        adopt_id=body.adoptId or "",
        package_id=body.packageId or "",
        order_mode=body.orderMode or "garden",
        amount_fen=amount_fen,
        status="pending_pay",
    )
    db.add(order)
    db.commit()

    if s.wechat_mchid and s.wechat_pay_apiv3_key and s.wechat_pay_private_key_path:
        logger.warning("已配置商户参数，但未内嵌完整 V3 签名下单；请接入 wechatpayv3 或自建签名逻辑")
        raise HTTPException(
            status_code=501,
            detail="PAY_V3_NOT_IMPLEMENTED: 请在 routers/pay.py 中完成商户证书签名与 prepay_id 换取",
        )

    if not s.dev_payment_stub:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "PAY_NOT_CONFIGURED",
                "message": "未开启支付：设置环境变量 DEV_PAYMENT_STUB=true 用于联调 UI，"
                "或配置微信支付商户参数并实现 V3 下单。",
            },
        )

    # 开发桩：字段格式对齐 wx.requestPayment，真机调用会因签名无效失败，仅用于前端流程调试
    ts = str(int(time.time()))
    nonce = uuid.uuid4().hex[:16]
    pkg = f"prepay_id=stub_{order.id}"
    logger.info("DEV_PAYMENT_STUB order=%s amount_fen=%s", order.id, amount_fen)
    return {
        "orderId": order.id,
        "payment": {
            "timeStamp": ts,
            "nonceStr": nonce,
            "package": pkg,
            "signType": "RSA",
            "paySign": "DEV_STUB_SIGN_REPLACE_IN_PRODUCTION",
        },
    }
