import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional, Tuple

logger = logging.getLogger(__name__)


def code_to_session(appid: str, secret: str, code: str) -> Tuple[Optional[dict], Optional[str]]:
    if not appid or not secret:
        return None, "未配置 WECHAT_APPID / WECHAT_SECRET"
    q = urllib.parse.urlencode(
        {
            "appid": appid,
            "secret": secret,
            "js_code": code,
            "grant_type": "authorization_code",
        }
    )
    url = f"https://api.weixin.qq.com/sns/jscode2session?{q}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            raw = resp.read().decode("utf-8")
        data: Any = json.loads(raw)
    except Exception as e:
        logger.warning("jscode2session error: %s", e)
        return None, str(e)
    if data.get("errcode"):
        return None, data.get("errmsg", "wechat error")
    openid = data.get("openid")
    if not openid:
        return None, "no openid"
    return data, None
