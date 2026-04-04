"""与小程序 utils/traceCrypto.js 一致的 djb2 溯源签名。"""

from typing import Optional


def _to_int32(n: int) -> int:
    n = n & 0xFFFFFFFF
    if n >= 2**31:
        return n - 2**32
    return n


def djb2(s: str) -> int:
    h = 5381
    for ch in s:
        h = _to_int32((h << 5) + h + ord(ch))
    return abs(h)


def to_base36(n: int) -> str:
    if n < 0:
        n = -n
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    if n == 0:
        return "0"
    out = []
    while n:
        n, r = divmod(n, 36)
        out.append(alphabet[r])
    return "".join(reversed(out))


def verify_trace_token(token: str, secret: str) -> Optional[dict]:
    if not token or "|" not in token:
        return None
    parts = token.split("|")
    if len(parts) != 6 or parts[0] != "v1":
        return None
    _, garden_id, order_id, ts_str, open_id_stub, sig = parts
    payload = "|".join(parts[:5])
    expect = to_base36(djb2(payload + secret))
    if sig != expect:
        return None
    try:
        ts = int(ts_str, 10)
    except ValueError:
        return None
    if not garden_id or not order_id:
        return None
    return {"gardenId": garden_id, "orderId": order_id, "ts": ts, "openIdStub": open_id_stub}
