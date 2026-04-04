"""红色溯源、研学、季节孪生、服务端验签。"""

import json
import logging
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_optional_openid
from app.models import GardenProfile, SeasonTimeline, StudyBooking, StudyRoute, StudySpot
from app.trace_crypto import verify_trace_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["red-trace"])


def _month_season_key() -> str:
    m = datetime.utcnow().month
    if m in (3, 4, 5):
        return "spring"
    if m in (6, 7, 8):
        return "summer"
    if m in (9, 10, 11):
        return "autumn"
    return "winter"


@router.get("/red-trace/garden/{garden_id}")
def get_garden_profile(garden_id: str, db: Session = Depends(get_db)) -> Any:
    row = db.query(GardenProfile).filter(GardenProfile.garden_id == str(garden_id)).first()
    if not row:
        raise HTTPException(status_code=404, detail="garden not found")
    try:
        return json.loads(row.profile_json)
    except Exception:
        logger.exception("invalid garden json")
        raise HTTPException(status_code=500, detail="invalid profile data")


@router.get("/red-trace/study/spots")
def study_spots(db: Session = Depends(get_db)) -> List[dict]:
    rows = db.query(StudySpot).order_by(StudySpot.id).all()
    out = []
    for r in rows:
        try:
            out.append(json.loads(r.payload_json))
        except Exception:
            continue
    return out


@router.get("/red-trace/study/routes")
def study_routes(db: Session = Depends(get_db)) -> List[dict]:
    rows = db.query(StudyRoute).order_by(StudyRoute.id).all()
    out = []
    for r in rows:
        try:
            out.append(json.loads(r.payload_json))
        except Exception:
            continue
    return out


class BookingBody(BaseModel):
    routeId: str = Field(..., min_length=1)
    note: str = ""


@router.post("/api/red-study/booking")
def red_study_booking(
    body: BookingBody,
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    if not openid:
        raise HTTPException(status_code=401, detail="请先登录后再预约")
    b = StudyBooking(openid=openid, route_id=body.routeId, note=body.note[:500])
    db.add(b)
    db.commit()
    db.refresh(b)
    return {"ok": True, "bookingId": b.id}


class TraceVerifyBody(BaseModel):
    token: str = Field(..., min_length=1)


@router.post("/api/trace/verify")
def trace_verify(body: TraceVerifyBody) -> Any:
    s = get_settings()
    parsed = verify_trace_token(body.token.strip(), s.trace_token_secret)
    if not parsed:
        return {"valid": False}
    return {"valid": True, "parsed": parsed}


@router.get("/garden/season-timeline/{garden_id}")
def season_timeline(garden_id: str, db: Session = Depends(get_db)) -> Any:
    rows = (
        db.query(SeasonTimeline)
        .filter(SeasonTimeline.garden_id == str(garden_id))
        .order_by(SeasonTimeline.season_key)
        .all()
    )
    label_map = {"spring": "春", "summer": "夏", "autumn": "秋", "winter": "冬"}
    twin = []
    order = ["spring", "summer", "autumn", "winter"]
    by_key = {r.season_key: r for r in rows}
    for key in order:
        r = by_key.get(key)
        if r:
            twin.append(
                {
                    "key": key,
                    "label": label_map.get(key, key),
                    "image": r.image_url,
                    "diary": r.diary or "",
                }
            )
    return {"seasonTwin": twin, "currentSeasonKey": _month_season_key()}
