"""茶农实时照看：上传图、列表、删除。"""

import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import CurrentUser
router = APIRouter(prefix="/api/real-care", tags=["real-care"])

_UPLOAD_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))


def _upload_dir():
    os.makedirs(_UPLOAD_ROOT, exist_ok=True)
    return _UPLOAD_ROOT


@router.get("")
def list_feed(
    tree_id: str = Query(..., alias="treeId"),
    db: Session = Depends(get_db),
):
    from app.models import RealCarePost

    rows = (
        db.query(RealCarePost)
        .filter(RealCarePost.tree_id == tree_id)
        .order_by(RealCarePost.created_at.desc())
        .limit(100)
        .all()
    )
    return {
        "list": [
            {
                "id": r.id,
                "treeId": r.tree_id,
                "userId": r.user_id,
                "imageUrl": r.image_url,
                "diary": r.diary,
                "takenAt": int(r.created_at.timestamp() * 1000) if r.created_at else 0,
            }
            for r in rows
        ]
    }


@router.post("/upload")
async def upload(
    request: Request,
    user: CurrentUser,
    tree_id: str = Form(..., alias="treeId"),
    diary: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    from app.models import RealCarePost

    if user.role != "farmer":
        raise HTTPException(status_code=403, detail="仅茶农可上传")
    ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
    fname = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(_upload_dir(), fname)
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    s = get_settings()
    base = (s.public_base_url or "").rstrip("/")
    if base:
        url = f"{base}/uploads/{fname}"
    else:
        url = f"{str(request.base_url).rstrip('/')}/uploads/{fname}"
    post = RealCarePost(user_id=user.id, tree_id=tree_id, image_url=url, diary=diary[:2000] or "")
    db.add(post)
    db.commit()
    db.refresh(post)
    return {"ok": True, "id": post.id, "url": url}


@router.delete("/{post_id}")
def delete_post(post_id: str, user: CurrentUser, db: Session = Depends(get_db)):
    from app.models import RealCarePost

    r = db.query(RealCarePost).filter(RealCarePost.id == post_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="不存在")
    if r.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权删除")
    db.delete(r)
    db.commit()
    return {"ok": True}
