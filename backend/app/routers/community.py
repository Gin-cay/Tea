"""茶友社区 API（由原 Flask community_routes 迁移）。"""

import json
import logging
import os
import re
import uuid
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_optional_openid
from app.models import (
    CommunityBlock,
    CommunityCollect,
    CommunityComment,
    CommunityLike,
    CommunityNotification,
    CommunityPost,
    CommunityReport,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/community", tags=["community"])

SENSITIVE_PATTERNS = [
    re.compile(r"赌博"),
    re.compile(r"色情"),
    re.compile(r"法轮功"),
    re.compile(r"枪支"),
    re.compile(r"代办发票"),
]

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "uploads")
UPLOAD_DIR = os.path.normpath(UPLOAD_DIR)


def _auto_approve() -> bool:
    return get_settings().community_auto_approve


def _contains_sensitive(text: str) -> bool:
    if not text:
        return False
    return any(p.search(text) for p in SENSITIVE_PATTERNS)


def _mask(text: str) -> str:
    if not text:
        return ""
    out = text
    for p in SENSITIVE_PATTERNS:
        out = p.sub("**", out)
    return out


def _blocked_set(db: Session, oid: str) -> set:
    if not oid:
        return set()
    rows = db.query(CommunityBlock).filter(CommunityBlock.blocker_id == oid).all()
    return {r.blocked_id for r in rows}


@router.get("/feed")
def feed(
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
    filter: str = "latest",
    topic: str = "",
) -> List[dict]:
    blocked = _blocked_set(db, openid or "")
    q = db.query(CommunityPost).filter(CommunityPost.status == "approved")
    if filter == "featured":
        q = q.filter(or_(CommunityPost.featured.is_(True), CommunityPost.is_official.is_(True)))
    rows = q.order_by(CommunityPost.created_at.desc()).limit(200).all()
    if topic.strip():
        rows = [p for p in rows if topic.strip() in p.topics_list()]
    oid = openid or ""
    rows = [p for p in rows if p.author_id not in blocked or p.author_id == oid]
    if filter == "hot":
        rows.sort(key=lambda x: -(x.hot_score or 0))
    else:
        rows.sort(key=lambda x: x.created_at or datetime.min, reverse=True)
    pinned = [p for p in rows if p.featured]
    rest = [p for p in rows if not p.featured]
    return [p.to_dict() for p in pinned + rest]


@router.get("/posts/{post_id}")
def get_post(post_id: str, db: Session = Depends(get_db)) -> Any:
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not p:
        return None
    return p.to_dict()


@router.post("/posts/{post_id}/delete")
def delete_post(
    post_id: str,
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    if not openid:
        raise HTTPException(status_code=401, detail={"ok": False, "message": "未登录"})
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"ok": False, "message": "动态不存在"})
    if p.author_id != openid:
        raise HTTPException(status_code=403, detail={"ok": False, "message": "无权删除"})
    db.query(CommunityComment).filter(CommunityComment.post_id == post_id).delete(
        synchronize_session=False
    )
    db.query(CommunityLike).filter(CommunityLike.post_id == post_id).delete(synchronize_session=False)
    db.query(CommunityCollect).filter(CommunityCollect.post_id == post_id).delete(
        synchronize_session=False
    )
    db.query(CommunityNotification).filter(CommunityNotification.post_id == post_id).delete(
        synchronize_session=False
    )
    db.query(CommunityReport).filter(CommunityReport.post_id == post_id).delete(
        synchronize_session=False
    )
    db.delete(p)
    db.commit()
    return {"ok": True}


class PublishBody(BaseModel):
    title: str = ""
    content: str = ""
    authorName: str = "茶友"
    avatarUrl: str = ""
    topics: List[str] = []
    mediaType: str = "image"
    coverUrl: str = ""
    videoUrl: str = ""
    locationName: str = ""
    lat: float = 0
    lng: float = 0


@router.post("/posts", status_code=201)
def publish(
    body: PublishBody,
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    if not openid:
        raise HTTPException(
            status_code=401,
            detail={"ok": False, "message": "缺少登录信息，请先 wx.login 并在请求头携带 token"},
        )
    title = body.title.strip()
    content = body.content.strip()
    if _contains_sensitive(title) or _contains_sensitive(content):
        raise HTTPException(status_code=400, detail={"ok": False, "message": "内容包含敏感信息"})
    if not title and not content:
        raise HTTPException(status_code=400, detail={"ok": False, "message": "请填写内容"})
    topics = body.topics if isinstance(body.topics, list) else []
    ap = _auto_approve()
    status = "approved" if ap else "pending"
    extra = "" if ap else "审核中"
    p = CommunityPost(
        author_id=openid,
        author_name=str(body.authorName or "茶友")[:64],
        avatar_url=str(body.avatarUrl or "")[:512],
        topics=json.dumps(topics, ensure_ascii=False),
        title=_mask(title)[:200],
        content=_mask(content),
        media_type=str(body.mediaType or "image")[:16],
        cover_url=str(body.coverUrl or "")[:1024],
        video_url=str(body.videoUrl or "")[:1024],
        location_name=str(body.locationName or "")[:200],
        lat=float(body.lat or 0),
        lng=float(body.lng or 0),
        status=status,
        extra_tag=extra,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"ok": True, "post": p.to_dict()}


@router.post("/posts/{post_id}/like")
def toggle_like(
    post_id: str,
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    if not openid:
        raise HTTPException(status_code=401, detail={"error": "unauthorized"})
    row = (
        db.query(CommunityLike)
        .filter(CommunityLike.post_id == post_id, CommunityLike.openid == openid)
        .first()
    )
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": "not found"})
    if row:
        db.delete(row)
        p.like_count = max(0, (p.like_count or 0) - 1)
        p.hot_score = max(0, (p.hot_score or 0) - 2)
        db.commit()
        return {"liked": False}
    db.add(CommunityLike(post_id=post_id, openid=openid))
    p.like_count = (p.like_count or 0) + 1
    p.hot_score = (p.hot_score or 0) + 2
    if p.author_id and p.author_id != openid:
        db.add(
            CommunityNotification(
                to_openid=p.author_id,
                type="like",
                post_id=post_id,
                from_openid=openid,
                read=False,
            )
        )
    db.commit()
    return {"liked": True}


@router.post("/posts/{post_id}/collect")
def toggle_collect(
    post_id: str,
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    if not openid:
        raise HTTPException(status_code=401, detail={"error": "unauthorized"})
    row = (
        db.query(CommunityCollect)
        .filter(CommunityCollect.post_id == post_id, CommunityCollect.openid == openid)
        .first()
    )
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": "not found"})
    if row:
        db.delete(row)
        p.collect_count = max(0, (p.collect_count or 0) - 1)
        db.commit()
        return {"collected": False}
    db.add(CommunityCollect(post_id=post_id, openid=openid))
    p.collect_count = (p.collect_count or 0) + 1
    db.commit()
    return {"collected": True}


@router.get("/posts/{post_id}/state")
def post_state(
    post_id: str,
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    oid = openid or ""
    liked = False
    collected = False
    if oid:
        liked = (
            db.query(CommunityLike)
            .filter(CommunityLike.post_id == post_id, CommunityLike.openid == oid)
            .first()
            is not None
        )
        collected = (
            db.query(CommunityCollect)
            .filter(CommunityCollect.post_id == post_id, CommunityCollect.openid == oid)
            .first()
            is not None
        )
    return {"liked": liked, "collected": collected}


@router.get("/posts/{post_id}/comments")
def list_comments(post_id: str, db: Session = Depends(get_db)) -> List[dict]:
    rows = (
        db.query(CommunityComment)
        .filter(CommunityComment.post_id == post_id)
        .order_by(CommunityComment.created_at.desc())
        .limit(80)
        .all()
    )
    out = []
    for c in rows:
        out.append(
            {
                "id": c.id,
                "postId": c.post_id,
                "authorId": c.author_id,
                "authorName": c.author_name,
                "content": c.content,
                "createdAt": c.created_at.isoformat() + "Z" if c.created_at else "",
            }
        )
    return out


class CommentBody(BaseModel):
    text: str = Field(..., min_length=1)
    authorName: str = "茶友"


@router.post("/posts/{post_id}/comments")
def add_comment(
    post_id: str,
    body: CommentBody,
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    if not openid:
        raise HTTPException(status_code=401, detail={"ok": False, "message": "未登录"})
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail={"ok": False, "message": "评论不能为空"})
    if _contains_sensitive(text):
        raise HTTPException(status_code=400, detail={"ok": False, "message": "评论包含敏感词"})
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail={"ok": False, "message": "动态不存在"})
    safe = _mask(text)
    c = CommunityComment(
        post_id=post_id,
        author_id=openid,
        author_name=str(body.authorName or "茶友")[:64],
        content=safe,
    )
    db.add(c)
    p.comment_count = (p.comment_count or 0) + 1
    p.hot_score = (p.hot_score or 0) + 3
    if p.author_id and p.author_id != openid:
        db.add(
            CommunityNotification(
                to_openid=p.author_id,
                type="comment",
                post_id=post_id,
                from_openid=openid,
                read=False,
            )
        )
    db.commit()
    db.refresh(c)
    return {
        "ok": True,
        "comment": {
            "id": c.id,
            "postId": c.post_id,
            "authorId": c.author_id,
            "authorName": c.author_name,
            "content": c.content,
            "createdAt": c.created_at.isoformat() + "Z" if c.created_at else "",
        },
    }


class ReportBody(BaseModel):
    reason: str = "other"


@router.post("/posts/{post_id}/report")
def report(
    post_id: str,
    body: ReportBody,
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    if not openid:
        raise HTTPException(status_code=401, detail={"error": "unauthorized"})
    db.add(
        CommunityReport(
            post_id=post_id,
            reporter_id=openid,
            reason=str(body.reason or "other")[:32],
        )
    )
    db.commit()
    return {"ok": True}


class BlockBody(BaseModel):
    blockedId: str = Field(..., min_length=1)


@router.post("/users/block")
def block(
    body: BlockBody,
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    if not openid:
        raise HTTPException(status_code=401, detail={"error": "unauthorized"})
    blocked = body.blockedId.strip()
    if not blocked or blocked == openid:
        raise HTTPException(status_code=400, detail={"error": "invalid"})
    exists = (
        db.query(CommunityBlock)
        .filter(CommunityBlock.blocker_id == openid, CommunityBlock.blocked_id == blocked)
        .first()
    )
    if not exists:
        db.add(CommunityBlock(blocker_id=openid, blocked_id=blocked))
        db.commit()
    return {"ok": True}


@router.get("/notify")
def notify_list(
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> List[dict]:
    if not openid:
        return []
    rows = (
        db.query(CommunityNotification)
        .filter(CommunityNotification.to_openid == openid)
        .order_by(CommunityNotification.created_at.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "id": n.id,
            "type": n.type,
            "postId": n.post_id,
            "fromOpenid": n.from_openid,
            "read": n.read,
            "createdAt": n.created_at.isoformat() + "Z" if n.created_at else "",
        }
        for n in rows
    ]


@router.get("/notify/unread-count")
def notify_unread(
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    if not openid:
        return {"count": 0}
    c = (
        db.query(CommunityNotification)
        .filter(CommunityNotification.to_openid == openid, CommunityNotification.read.is_(False))
        .count()
    )
    return {"count": c}


@router.post("/notify/read")
def notify_read(
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> Any:
    if not openid:
        return {"ok": True}
    rows = (
        db.query(CommunityNotification)
        .filter(
            CommunityNotification.to_openid == openid,
            CommunityNotification.read.is_(False),
        )
        .all()
    )
    for n in rows:
        n.read = True
    db.commit()
    return {"ok": True}


@router.get("/me/posts")
def my_posts(
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> List[dict]:
    if not openid:
        return []
    rows = (
        db.query(CommunityPost)
        .filter(CommunityPost.author_id == openid)
        .order_by(CommunityPost.created_at.desc())
        .limit(50)
        .all()
    )
    return [p.to_dict() for p in rows]


@router.get("/me/liked")
def my_liked(
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> List[dict]:
    if not openid:
        return []
    likes = db.query(CommunityLike).filter(CommunityLike.openid == openid).limit(100).all()
    out = []
    for lk in likes:
        p = db.query(CommunityPost).filter(CommunityPost.id == lk.post_id).first()
        if p:
            out.append(p.to_dict())
    return out


@router.get("/me/comments")
def my_comments(
    db: Session = Depends(get_db),
    openid: Optional[str] = Depends(get_optional_openid),
) -> List[dict]:
    if not openid:
        return []
    rows = (
        db.query(CommunityComment)
        .filter(CommunityComment.author_id == openid)
        .order_by(CommunityComment.created_at.desc())
        .limit(50)
        .all()
    )
    out = []
    for c in rows:
        p = db.query(CommunityPost).filter(CommunityPost.id == c.post_id).first()
        title = ""
        if p:
            title = p.title or (p.content or "")[:20]
        out.append(
            {
                "id": c.id,
                "postId": c.post_id,
                "postTitle": title,
                "content": c.content,
                "createdAt": c.created_at.isoformat() + "Z" if c.created_at else "",
            }
        )
    return out


@router.post("/upload")
async def upload(request: Request, file: UploadFile = File(...)) -> Any:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    raw = file.filename or "img.jpg"
    ext = os.path.splitext(raw)[1] or ".jpg"
    fname = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, fname)
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    s = get_settings()
    public_base = (s.public_base_url or "").rstrip("/")
    if public_base:
        url = f"{public_base}/uploads/{fname}"
    else:
        base = str(request.base_url).rstrip("/")
        url = f"{base}/uploads/{fname}"
    return {"url": url}
