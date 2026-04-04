"""公益里程碑、积分兑换（路径与旧 Flask 版对齐，便于小程序不改 URL）。"""

import logging
import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_optional_openid
from app.models import DonationRecord, Milestone, RedeemGood, User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["public-benefit"])


def _milestones_to_client(rows: List[Milestone]) -> List[dict]:
    out = []
    for m in sorted(rows, key=lambda x: x.sort_order):
        out.append(
            {
                "id": m.id,
                "name": m.name,
                "targetAmount": m.target_amount,
                "currentAmount": m.current_amount,
                "donateContent": m.donate_content,
                "status": m.status,
                "recordId": m.record_id or "",
            }
        )
    return out


def _summary_from_milestones(rows: List[Milestone]) -> dict:
    total = sum(m.current_amount for m in rows)
    completed = sum(1 for m in rows if m.status == "completed")
    pending = sum(1 for m in rows if m.status in ("in_progress", "locked"))
    current = next((m for m in rows if m.status == "in_progress"), None)
    if not current:
        current = next((m for m in reversed(rows) if m.status == "locked"), rows[-1] if rows else None)
    if not current:
        return {
            "totalAmount": 0,
            "currentMilestoneName": "",
            "currentMilestoneTarget": 0,
            "currentMilestoneProgress": 0,
            "completedCount": completed,
            "pendingCount": pending,
        }
    return {
        "totalAmount": total,
        "currentMilestoneName": current.name,
        "currentMilestoneTarget": current.target_amount,
        "currentMilestoneProgress": current.current_amount,
        "completedCount": completed,
        "pendingCount": pending,
    }


@router.get("/public-benefit/milestones")
def milestones_overview(
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    rows = db.query(Milestone).all()
    goods = db.query(RedeemGood).order_by(RedeemGood.id).all()
    user = db.query(User).filter(User.openid == openid).first() if openid else None
    balance = user.points_balance if user else 0
    expiring = user.points_expiring_at if user else ""
    return {
        "summary": _summary_from_milestones(rows),
        "points": {"balance": balance, "expiringAt": expiring},
        "milestones": _milestones_to_client(rows),
        "redeemGoods": [
            {"id": g.id, "title": g.title, "pointsCost": g.points_cost, "type": g.type}
            for g in goods
        ],
    }


@router.get("/public-benefit/records/{record_id}")
def donation_record(record_id: str, db: Session = Depends(get_db)) -> Any:
    r = db.query(DonationRecord).filter(DonationRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "record not found"})
    return {
        "recordId": r.id,
        "milestoneName": r.milestone_name,
        "donateDetail": r.donate_detail,
        "executionProgress": r.execution_progress,
        "feedbackList": r.feedback_list(),
        "certificate": r.certificate_dict(),
    }


class RedeemBody(BaseModel):
    goodsId: str = Field(..., min_length=1)
    pointsCost: int = Field(..., ge=1)


@router.post("/points/redeem")
def points_redeem(
    body: RedeemBody,
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    if not openid:
        raise HTTPException(status_code=401, detail="请先登录")
    user = db.query(User).filter(User.openid == openid).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    good = db.query(RedeemGood).filter(RedeemGood.id == body.goodsId).first()
    if not good or good.points_cost != body.pointsCost:
        return {"success": False, "code": "BAD_REQUEST", "message": "兑换商品不存在或积分不匹配"}
    bal = user.points_balance or 0
    if bal < body.pointsCost:
        return {"success": False, "code": "INSUFFICIENT_POINTS", "message": "积分不足"}
    user.points_balance = bal - body.pointsCost
    db.commit()
    return {
        "success": True,
        "redeemId": f"rdm-{openid}-{body.goodsId}-{uuid.uuid4().hex[:8]}",
        "message": "兑换成功，预计 3-5 个工作日发放。",
        "balance": user.points_balance,
    }
