"""请求依赖：数据库会话、可选/必填 JWT 用户。"""

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_token

security = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_optional_openid(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
) -> Optional[str]:
    if not credentials or not credentials.credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    sub = payload.get("sub")
    return str(sub) if sub else None


def get_optional_user(
    db: DbSession,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
) -> Optional[User]:
    if not credentials or not credentials.credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    uid = payload.get("uid")
    if not uid:
        return None
    return db.query(User).filter(User.id == str(uid)).first()


def get_current_user(
    db: DbSession,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效令牌")
    uid = payload.get("uid")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效令牌")
    user = db.query(User).filter(User.id == str(uid)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
