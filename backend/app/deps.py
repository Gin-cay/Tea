"""FastAPI 依赖：数据库会话、当前用户 openid。"""

from typing import Annotated, Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_token


def get_optional_openid(
    authorization: Annotated[Optional[str], Header()] = None,
    x_openid: Annotated[Optional[str], Header(alias="X-Openid")] = None,
    x_open_id: Annotated[Optional[str], Header(alias="X-Open-Id")] = None,
) -> Optional[str]:
    """优先 Bearer JWT；兼容旧版 X-Openid 头（社区接口）。"""
    if authorization and authorization.lower().startswith("bearer "):
        raw = authorization[7:].strip()
        data = decode_token(raw)
        if data and data.get("sub"):
            return str(data["sub"])
    oid = (x_openid or x_open_id or "").strip()
    return oid or None


def require_openid(
    openid: Annotated[Optional[str], Depends(get_optional_openid)],
) -> str:
    if not openid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录或令牌无效")
    return openid


def get_optional_user(
    db: Annotated[Session, Depends(get_db)],
    openid: Annotated[Optional[str], Depends(get_optional_openid)],
) -> Optional[User]:
    if not openid:
        return None
    return db.query(User).filter(User.openid == openid).first()


def require_user(
    db: Annotated[Session, Depends(get_db)],
    openid: Annotated[Optional[str], Depends(get_optional_openid)],
) -> User:
    if not openid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录或令牌无效")
    u = db.query(User).filter(User.openid == openid).first()
    if not u:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
    return u


DbSession = Annotated[Session, Depends(get_db)]
OptionalOpenid = Annotated[Optional[str], Depends(get_optional_openid)]
CurrentOpenid = Annotated[str, Depends(require_openid)]
CurrentUser = Annotated[User, Depends(require_user)]
