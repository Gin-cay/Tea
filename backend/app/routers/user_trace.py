"""认养溯源记录（云端，与小程序证书/枢纽同步）。"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser
from app.models import UserTraceRecord

router = APIRouter(prefix="/api/user-trace-records", tags=["user-trace"])


class TraceIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trace_token: str = Field(..., alias="traceToken")
    garden_id: str = Field(..., alias="gardenId")
    order_id: str = Field(..., alias="orderId")
    garden_name: str = Field("", alias="gardenName")
    order_mode: str = Field("garden", alias="orderMode")


@router.post("")
def create_record(body: TraceIn, user: CurrentUser, db: Session = Depends(get_db)):
    r = UserTraceRecord(
        user_id=user.id,
        trace_token=body.trace_token[:512],
        garden_id=body.garden_id,
        order_id=body.order_id,
        garden_name=body.garden_name,
        order_mode=body.order_mode,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"ok": True, "id": r.id}


@router.get("")
def list_records(user: CurrentUser, db: Session = Depends(get_db)):
    rows: List[UserTraceRecord] = (
        db.query(UserTraceRecord)
        .filter(UserTraceRecord.user_id == user.id)
        .order_by(UserTraceRecord.created_at.desc())
        .limit(50)
        .all()
    )
    return {
        "list": [
            {
                "traceToken": r.trace_token,
                "gardenId": r.garden_id,
                "orderId": r.order_id,
                "gardenName": r.garden_name,
                "orderMode": r.order_mode,
                "createdAt": r.created_at.isoformat() if r.created_at else "",
            }
            for r in rows
        ]
    }


@router.delete("/{record_id}")
def delete_record(record_id: str, user: CurrentUser, db: Session = Depends(get_db)):
    r = db.query(UserTraceRecord).filter(UserTraceRecord.id == record_id, UserTraceRecord.user_id == user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="不存在")
    db.delete(r)
    db.commit()
    return {"ok": True}
