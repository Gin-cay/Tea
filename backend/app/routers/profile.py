"""用户资料（与小程序完善资料页同步）。"""

import json
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser
from app.models import User

router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileOut(BaseModel):
    nickname: str
    avatarUrl: str
    phone: Optional[str] = None
    role: str = "customer"
    region: List[str] = []
    addressDetail: str = ""


class ProfileIn(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=64)
    avatarUrl: str = Field(..., min_length=1, max_length=1024)
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$")
    role: str = Field("customer", pattern=r"^(customer|farmer)$")
    region: List[str] = Field(..., min_length=3, max_length=3)
    addressDetail: str = Field(..., min_length=1, max_length=255)


def _out(u: User) -> dict:
    region = []
    if u.address_region_json:
        try:
            region = json.loads(u.address_region_json)
            if not isinstance(region, list):
                region = []
        except Exception:
            region = []
    return {
        "nickname": u.nickname or "茶友",
        "avatarUrl": u.avatar_url or "",
        "phone": u.phone or "",
        "role": u.role or "customer",
        "region": region if len(region) == 3 else ["", "", ""],
        "addressDetail": u.address_detail or "",
    }


@router.get("", response_model=None)
def get_profile(user: CurrentUser, db: Session = Depends(get_db)) -> Any:
    return _out(user)


@router.put("")
def put_profile(body: ProfileIn, user: CurrentUser, db: Session = Depends(get_db)):
    if not all(str(x).strip() for x in body.region):
        raise HTTPException(status_code=400, detail="请选择完整省市区")
    user.nickname = body.nickname
    user.avatar_url = body.avatarUrl
    user.phone = body.phone
    user.role = body.role
    user.address_region_json = json.dumps(body.region, ensure_ascii=False)
    user.address_detail = body.addressDetail
    db.commit()
    db.refresh(user)
    return {"ok": True, "profile": _out(user)}
