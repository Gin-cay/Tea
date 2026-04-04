from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_uid
from app.models import MallUser

router = APIRouter(prefix="/users", tags=["users"])


class UserPatch(BaseModel):
    nickname: Optional[str] = Field(None, max_length=128)
    avatarUrl: Optional[str] = Field(None, max_length=512)
    phone: Optional[str] = Field(None, max_length=20)
    gender: Optional[int] = Field(None, ge=0, le=2)


def _user_out(u: MallUser) -> dict:
    return {
        "id": u.id,
        "openid": u.openid,
        "nickname": u.nickname,
        "avatarUrl": u.avatar_url,
        "phone": u.phone,
        "gender": u.gender,
    }


@router.get("/me")
def me(db: Session = Depends(get_db), uid: int = Depends(require_uid)):
    u = db.query(MallUser).filter(MallUser.id == uid).first()
    if not u:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="用户不存在")
    return _user_out(u)


@router.patch("/me")
def patch_me(body: UserPatch, db: Session = Depends(get_db), uid: int = Depends(require_uid)):
    u = db.query(MallUser).filter(MallUser.id == uid).first()
    if not u:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="用户不存在")
    if body.nickname is not None:
        u.nickname = body.nickname
    if body.avatarUrl is not None:
        u.avatar_url = body.avatarUrl
    if body.phone is not None:
        u.phone = body.phone
    if body.gender is not None:
        u.gender = body.gender
    db.commit()
    db.refresh(u)
    return {"ok": True, "user": _user_out(u)}
