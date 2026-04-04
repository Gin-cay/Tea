from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import MallUser
from app.security import create_access_token
from app.services.wechat import code_to_session

router = APIRouter(prefix="/auth", tags=["auth"])


class WechatBody(BaseModel):
    code: str = Field(..., min_length=1)


@router.post("/wechat")
def login_wechat(body: WechatBody, db: Session = Depends(get_db)) -> Any:
    s = get_settings()
    data, err = code_to_session(s.wechat_appid, s.wechat_secret, body.code.strip())
    if err:
        if "未配置" in err:
            raise HTTPException(status_code=503, detail=err)
        raise HTTPException(status_code=400, detail=err)
    openid = str(data["openid"])
    unionid = data.get("unionid")
    u = db.query(MallUser).filter(MallUser.openid == openid).first()
    if not u:
        u = MallUser(openid=openid, unionid=unionid, nickname="茶友", avatar_url="")
        db.add(u)
        db.commit()
        db.refresh(u)
    elif unionid and not u.unionid:
        u.unionid = unionid
        db.commit()
    token = create_access_token(user_id=u.id, openid=u.openid)
    return {
        "token": token,
        "openid": u.openid,
        "expiresIn": s.jwt_expire_hours * 3600,
    }
