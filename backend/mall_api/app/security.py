from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt

from app.config import get_settings


def create_access_token(*, user_id: int, openid: str) -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    exp = now + timedelta(hours=s.jwt_expire_hours)
    payload: dict[str, Any] = {
        "sub": openid,
        "uid": user_id,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=[get_settings().jwt_algorithm],
        )
    except JWTError:
        return None
