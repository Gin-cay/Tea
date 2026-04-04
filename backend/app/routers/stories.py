"""茶叶故事 / 红色茶源（数据库）。"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ContentStory

router = APIRouter(prefix="/api/stories", tags=["stories"])


def _one(r: ContentStory) -> dict:
    return {
        "id": r.slug,
        "slug": r.slug,
        "type": r.story_type,
        "title": r.title,
        "desc": r.desc,
        "body": r.body_html,
        "subtitle": r.desc,
        "bodyHtml": r.body_html,
    }


@router.get("/list")
def story_list(
    db: Session = Depends(get_db),
    story_type: str = Query(..., alias="type", description="tea 或 red"),
):
    if story_type not in ("tea", "red"):
        raise HTTPException(status_code=400, detail="type 须为 tea 或 red")
    rows: List[ContentStory] = (
        db.query(ContentStory)
        .filter(ContentStory.story_type == story_type)
        .order_by(ContentStory.sort_order, ContentStory.id)
        .all()
    )
    return {"list": [{"id": r.slug, "title": r.title, "desc": r.desc} for r in rows]}


@router.get("/detail")
def story_detail(
    db: Session = Depends(get_db),
    story_type: str = Query(..., alias="type"),
    story_id: str = Query(..., alias="id", description="slug"),
):
    r = (
        db.query(ContentStory)
        .filter(ContentStory.story_type == story_type, ContentStory.slug == story_id)
        .first()
    )
    if not r:
        raise HTTPException(status_code=404, detail="故事不存在")
    return _one(r)
