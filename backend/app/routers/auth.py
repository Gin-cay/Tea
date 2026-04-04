"""微信登录与当前用户。"""

import logging
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_optional_openid
from app.models import User
from app.security import create_access_token
from app.services.wechat import code_to_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class WechatLoginBody(BaseModel):
    code: str = Field(..., min_length=1, description="wx.login 返回的 code")


@router.post("/wechat")
def auth_wechat(body: WechatLoginBody, db: Session = Depends(get_db)) -> Any:
    settings = get_settings()
    data, err = code_to_session(settings.wechat_appid, settings.wechat_secret, body.code.strip())
    if err:
        if "未配置" in err:
            raise HTTPException(status_code=503, detail=err)
        raise HTTPException(status_code=400, detail=err)
    openid = str(data.get("openid"))
    user = db.query(User).filter(User.openid == openid).first()
    if not user:
        user = User(
            id=uuid.uuid4().hex,
            openid=openid,
            nickname="茶友",
            avatar_url="",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token(openid=user.openid, user_id=user.id)
    return {
        "token": token,
        "openid": user.openid,
        "expiresIn": settings.jwt_expire_hours * 3600,
        "session_key": data.get("session_key", ""),
    }


class MeOut(BaseModel):
    id: str
    openid: str
    nickname: str
    avatar_url: str
    points_balance: int


@router.get("/me", response_model=MeOut)
def auth_me(
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    if not openid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录")
    user = db.query(User).filter(User.openid == openid).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return MeOut(
        id=user.id,
        openid=user.openid,
        nickname=user.nickname or "茶友",
        avatar_url=user.avatar_url or "",
        points_balance=user.points_balance or 0,
    )
