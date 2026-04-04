from typing import Annotated, Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MallUser
from app.security import decode_token


def get_optional_uid(
    authorization: Annotated[Optional[str], Header()] = None,
) -> Optional[int]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    raw = authorization[7:].strip()
    data = decode_token(raw)
    if not data or "uid" not in data:
        return None
    try:
        return int(data["uid"])
    except (TypeError, ValueError):
        return None


def require_uid(uid: Annotated[Optional[int], Depends(get_optional_uid)]) -> int:
    if uid is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录或令牌无效")
    return uid


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    uid: Annotated[int, Depends(require_uid)],
) -> MallUser:
    u = db.query(MallUser).filter(MallUser.id == uid).first()
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    return u


DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[MallUser, Depends(get_current_user)]
