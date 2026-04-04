"""JWT 访问令牌。"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt

from app.config import get_settings


def create_access_token(*, openid: str, user_id: str, extra: Optional[dict] = None) -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    exp = now + timedelta(hours=s.jwt_expire_hours)
    payload: dict[str, Any] = {
        "sub": openid,
        "uid": user_id,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def decode_token(token: str) -> Optional[dict]:
    s = get_settings()
    try:
        return jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except JWTError:
        return None
