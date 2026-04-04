"""首页 CMS、认养（不含商城商品，商城见 routers/shop.py）。"""

import json
import logging
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdoptGarden, AdoptPackage, Banner, ContentStory, HomeGardenTeaser, HomeHotItem, ShopCategory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["catalog"])


def _json_or_empty(s: str) -> dict:
    try:
        v = json.loads(s)
        return v if isinstance(v, dict) else {}
    except Exception:
        return {}


@router.get("/home/overview")
def home_overview(db: Session = Depends(get_db)) -> Any:
    banners = db.query(Banner).order_by(Banner.id).all()
    hot = db.query(HomeHotItem).order_by(HomeHotItem.id).all()
    gardens = db.query(HomeGardenTeaser).order_by(HomeGardenTeaser.id).all()
    cats = (
        db.query(ShopCategory)
        .filter(ShopCategory.status == 1)
        .order_by(ShopCategory.sort_order, ShopCategory.id)
        .limit(20)
        .all()
    )
    tea_stories = (
        db.query(ContentStory)
        .filter(ContentStory.story_type == "tea")
        .order_by(ContentStory.sort_order, ContentStory.id)
        .limit(10)
        .all()
    )
    red_stories = (
        db.query(ContentStory)
        .filter(ContentStory.story_type == "red")
        .order_by(ContentStory.sort_order, ContentStory.id)
        .limit(10)
        .all()
    )
    return {
        "banners": [{"id": b.id, "title": b.title, "image": b.image} for b in banners],
        "categories": [{"id": c.id, "name": c.name} for c in cats],
        "hotItems": [_json_or_empty(h.payload_json) for h in hot],
        "gardens": [_json_or_empty(g.payload_json) for g in gardens],
        "teaStorySamples": [{"id": s.slug, "title": s.title} for s in tea_stories],
        "redStorySamples": [{"id": s.slug, "title": s.title} for s in red_stories],
    }


@router.get("/adopt/gardens")
def adopt_gardens(db: Session = Depends(get_db)) -> List[dict]:
    rows = db.query(AdoptGarden).order_by(AdoptGarden.id).all()
    out = []
    for r in rows:
        try:
            d = json.loads(r.list_json)
            if isinstance(d, dict):
                d = {**d, "id": r.id}
                out.append(d)
        except Exception:
            continue
    return out


@router.get("/adopt/gardens/{garden_id}")
def adopt_garden_detail(garden_id: int, db: Session = Depends(get_db)) -> Any:
    r = db.query(AdoptGarden).filter(AdoptGarden.id == garden_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="garden not found")
    try:
        d = json.loads(r.detail_json)
        if isinstance(d, dict):
            return {**d, "id": garden_id}
    except Exception:
        pass
    raise HTTPException(status_code=500, detail="invalid detail")


@router.get("/adopt/packages")
def adopt_packages(db: Session = Depends(get_db)) -> List[dict]:
    rows = db.query(AdoptPackage).order_by(AdoptPackage.package_key).all()
    out = []
    for r in rows:
        try:
            d = json.loads(r.payload_json)
            if isinstance(d, dict):
                out.append({**d, "packageKey": r.package_key})
        except Exception:
            continue
    return out


@router.get("/adopt/packages/{package_key}")
def adopt_package_detail(package_key: str, db: Session = Depends(get_db)) -> Any:
    r = db.query(AdoptPackage).filter(AdoptPackage.package_key == package_key).first()
    if not r:
        raise HTTPException(status_code=404, detail="package not found")
    try:
        d = json.loads(r.payload_json)
        if isinstance(d, dict):
            return {**d, "packageKey": package_key}
    except Exception:
        pass
    raise HTTPException(status_code=500, detail="invalid package")
