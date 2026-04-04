import json
import os
import re
import uuid
from datetime import datetime

from flask import Blueprint, jsonify, request, send_from_directory
from sqlalchemy import or_

from extensions import db
from models_community import (
    CommunityBlock,
    CommunityCollect,
    CommunityComment,
    CommunityLike,
    CommunityNotification,
    CommunityPost,
    CommunityReport,
)

community_bp = Blueprint("community", __name__, url_prefix="/api/community")

SENSITIVE_PATTERNS = [
    re.compile(r"赌博"),
    re.compile(r"色情"),
    re.compile(r"法轮功"),
    re.compile(r"枪支"),
    re.compile(r"代办发票"),
]

AUTO_APPROVE = os.getenv("COMMUNITY_AUTO_APPROVE", "true").lower() == "true"

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")


def _contains_sensitive(text):
    if not text:
        return False
    return any(p.search(text) for p in SENSITIVE_PATTERNS)


def _mask(text):
    if not text:
        return ""
    out = text
    for p in SENSITIVE_PATTERNS:
        out = p.sub("**", out)
    return out


def _openid():
    return (request.headers.get("X-Openid") or request.headers.get("X-Open-Id") or "").strip()


def _blocked_set(oid):
    if not oid:
        return set()
    rows = CommunityBlock.query.filter_by(blocker_id=oid).all()
    return {r.blocked_id for r in rows}


@community_bp.route("/feed", methods=["GET", "OPTIONS"])
def feed():
    oid = _openid()
    filter_type = request.args.get("filter", "latest")
    topic = request.args.get("topic", "").strip()
    blocked = _blocked_set(oid)

    q = CommunityPost.query.filter_by(status="approved")
    if filter_type == "featured":
        q = q.filter(or_(CommunityPost.featured == True, CommunityPost.is_official == True))
    rows = q.order_by(CommunityPost.created_at.desc()).limit(200).all()
    if topic:
        rows = [p for p in rows if topic in p.topics_list()]
    rows = [p for p in rows if p.author_id not in blocked or p.author_id == oid]
    if filter_type == "hot":
        rows.sort(key=lambda x: -(x.hot_score or 0))
    else:
        rows.sort(key=lambda x: x.created_at or datetime.min, reverse=True)
    pinned = [p for p in rows if p.featured]
    rest = [p for p in rows if not p.featured]
    return jsonify([p.to_dict() for p in pinned + rest])


@community_bp.route("/posts/<post_id>", methods=["GET", "OPTIONS"])
def get_post(post_id):
    p = CommunityPost.query.get(post_id)
    if not p:
        return jsonify(None)
    return jsonify(p.to_dict())


@community_bp.route("/posts/<post_id>/delete", methods=["POST", "OPTIONS"])
def delete_post(post_id):
    if request.method == "OPTIONS":
        return "", 204
    oid = _openid()
    if not oid:
        return jsonify({"ok": False, "message": "未登录"}), 401
    p = CommunityPost.query.get(post_id)
    if not p:
        return jsonify({"ok": False, "message": "动态不存在"}), 404
    if p.author_id != oid:
        return jsonify({"ok": False, "message": "无权删除"}), 403
    CommunityComment.query.filter_by(post_id=post_id).delete(synchronize_session=False)
    CommunityLike.query.filter_by(post_id=post_id).delete(synchronize_session=False)
    CommunityCollect.query.filter_by(post_id=post_id).delete(synchronize_session=False)
    CommunityNotification.query.filter(CommunityNotification.post_id == post_id).delete(
        synchronize_session=False
    )
    CommunityReport.query.filter_by(post_id=post_id).delete(synchronize_session=False)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"ok": True})


@community_bp.route("/posts", methods=["POST", "OPTIONS"])
def publish():
    oid = _openid()
    if not oid:
        return jsonify({"ok": False, "message": "缺少 X-Openid，请先 wx.login 换 openid"}), 401
    body = request.get_json(silent=True) or {}
    title = str(body.get("title") or "").strip()
    content = str(body.get("content") or "").strip()
    if _contains_sensitive(title) or _contains_sensitive(content):
        return jsonify({"ok": False, "message": "内容包含敏感信息"}), 400
    if not title and not content:
        return jsonify({"ok": False, "message": "请填写内容"}), 400

    topics = body.get("topics") or []
    if not isinstance(topics, list):
        topics = []
    status = "approved" if AUTO_APPROVE else "pending"
    extra = "" if AUTO_APPROVE else "审核中"

    p = CommunityPost(
        author_id=oid,
        author_name=str(body.get("authorName") or "茶友")[:64],
        avatar_url=str(body.get("avatarUrl") or "")[:512],
        is_official=False,
        featured=False,
        topics=json.dumps(topics, ensure_ascii=False),
        title=_mask(title)[:200],
        content=_mask(content),
        media_type=str(body.get("mediaType") or "image")[:16],
        cover_url=str(body.get("coverUrl") or "")[:1024],
        video_url=str(body.get("videoUrl") or "")[:1024],
        location_name=str(body.get("locationName") or "")[:200],
        lat=float(body.get("lat") or 0),
        lng=float(body.get("lng") or 0),
        status=status,
        extra_tag=extra,
    )
    db.session.add(p)
    db.session.commit()
    return jsonify({"ok": True, "post": p.to_dict()}), 201


@community_bp.route("/posts/<post_id>/like", methods=["POST", "OPTIONS"])
def toggle_like(post_id):
    oid = _openid()
    if not oid:
        return jsonify({"error": "unauthorized"}), 401
    row = CommunityLike.query.filter_by(post_id=post_id, openid=oid).first()
    p = CommunityPost.query.get(post_id)
    if not p:
        return jsonify({"error": "not found"}), 404
    if row:
        db.session.delete(row)
        p.like_count = max(0, (p.like_count or 0) - 1)
        p.hot_score = max(0, (p.hot_score or 0) - 2)
        db.session.commit()
        return jsonify({"liked": False})
    db.session.add(CommunityLike(post_id=post_id, openid=oid))
    p.like_count = (p.like_count or 0) + 1
    p.hot_score = (p.hot_score or 0) + 2
    if p.author_id and p.author_id != oid:
        db.session.add(
            CommunityNotification(
                to_openid=p.author_id,
                type="like",
                post_id=post_id,
                from_openid=oid,
                read=False,
            )
        )
    db.session.commit()
    return jsonify({"liked": True})


@community_bp.route("/posts/<post_id>/collect", methods=["POST", "OPTIONS"])
def toggle_collect(post_id):
    oid = _openid()
    if not oid:
        return jsonify({"error": "unauthorized"}), 401
    row = CommunityCollect.query.filter_by(post_id=post_id, openid=oid).first()
    p = CommunityPost.query.get(post_id)
    if not p:
        return jsonify({"error": "not found"}), 404
    if row:
        db.session.delete(row)
        p.collect_count = max(0, (p.collect_count or 0) - 1)
        db.session.commit()
        return jsonify({"collected": False})
    db.session.add(CommunityCollect(post_id=post_id, openid=oid))
    p.collect_count = (p.collect_count or 0) + 1
    db.session.commit()
    return jsonify({"collected": True})


@community_bp.route("/posts/<post_id>/state", methods=["GET", "OPTIONS"])
def post_state(post_id):
    oid = _openid()
    liked = (
        CommunityLike.query.filter_by(post_id=post_id, openid=oid).first() is not None
        if oid
        else False
    )
    collected = (
        CommunityCollect.query.filter_by(post_id=post_id, openid=oid).first() is not None
        if oid
        else False
    )
    return jsonify({"liked": liked, "collected": collected})


@community_bp.route("/posts/<post_id>/comments", methods=["GET", "OPTIONS"])
def list_comments(post_id):
    rows = (
        CommunityComment.query.filter_by(post_id=post_id)
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
    return jsonify(out)


@community_bp.route("/posts/<post_id>/comments", methods=["POST"])
def add_comment(post_id):
    oid = _openid()
    if not oid:
        return jsonify({"ok": False, "message": "未登录"}), 401
    body = request.get_json(silent=True) or {}
    text = str(body.get("text") or "").strip()
    if not text:
        return jsonify({"ok": False, "message": "评论不能为空"}), 400
    if _contains_sensitive(text):
        return jsonify({"ok": False, "message": "评论包含敏感词"}), 400
    p = CommunityPost.query.get(post_id)
    if not p:
        return jsonify({"ok": False, "message": "动态不存在"}), 404
    safe = _mask(text)
    c = CommunityComment(
        post_id=post_id,
        author_id=oid,
        author_name=str(body.get("authorName") or "茶友")[:64],
        content=safe,
    )
    db.session.add(c)
    p.comment_count = (p.comment_count or 0) + 1
    p.hot_score = (p.hot_score or 0) + 3
    if p.author_id and p.author_id != oid:
        db.session.add(
            CommunityNotification(
                to_openid=p.author_id,
                type="comment",
                post_id=post_id,
                from_openid=oid,
                read=False,
            )
        )
    db.session.commit()
    return jsonify(
        {
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
    )


@community_bp.route("/posts/<post_id>/report", methods=["POST", "OPTIONS"])
def report(post_id):
    oid = _openid()
    if not oid:
        return jsonify({"error": "unauthorized"}), 401
    body = request.get_json(silent=True) or {}
    r = CommunityReport(
        post_id=post_id,
        reporter_id=oid,
        reason=str(body.get("reason") or "other")[:32],
    )
    db.session.add(r)
    db.session.commit()
    return jsonify({"ok": True})


@community_bp.route("/users/block", methods=["POST", "OPTIONS"])
def block():
    oid = _openid()
    if not oid:
        return jsonify({"error": "unauthorized"}), 401
    body = request.get_json(silent=True) or {}
    blocked = str(body.get("blockedId") or "").strip()
    if not blocked or blocked == oid:
        return jsonify({"error": "invalid"}), 400
    if not CommunityBlock.query.filter_by(blocker_id=oid, blocked_id=blocked).first():
        db.session.add(CommunityBlock(blocker_id=oid, blocked_id=blocked))
        db.session.commit()
    return jsonify({"ok": True})


@community_bp.route("/notify", methods=["GET", "OPTIONS"])
def notify_list():
    oid = _openid()
    if not oid:
        return jsonify([])
    rows = (
        CommunityNotification.query.filter_by(to_openid=oid)
        .order_by(CommunityNotification.created_at.desc())
        .limit(30)
        .all()
    )
    return jsonify(
        [
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
    )


@community_bp.route("/notify/unread-count", methods=["GET", "OPTIONS"])
def notify_unread():
    oid = _openid()
    if not oid:
        return jsonify({"count": 0})
    c = CommunityNotification.query.filter_by(to_openid=oid, read=False).count()
    return jsonify({"count": c})


@community_bp.route("/notify/read", methods=["POST", "OPTIONS"])
def notify_read():
    oid = _openid()
    if not oid:
        return jsonify({"ok": True})
    CommunityNotification.query.filter_by(to_openid=oid, read=False).update(
        {"read": True}, synchronize_session=False
    )
    db.session.commit()
    return jsonify({"ok": True})


@community_bp.route("/me/posts", methods=["GET", "OPTIONS"])
def my_posts():
    oid = _openid()
    if not oid:
        return jsonify([])
    rows = (
        CommunityPost.query.filter_by(author_id=oid)
        .order_by(CommunityPost.created_at.desc())
        .limit(50)
        .all()
    )
    return jsonify([p.to_dict() for p in rows])


@community_bp.route("/me/liked", methods=["GET", "OPTIONS"])
def my_liked():
    oid = _openid()
    if not oid:
        return jsonify([])
    likes = CommunityLike.query.filter_by(openid=oid).limit(100).all()
    out = []
    for lk in likes:
        p = CommunityPost.query.get(lk.post_id)
        if p:
            out.append(p.to_dict())
    return jsonify(out)


@community_bp.route("/me/comments", methods=["GET", "OPTIONS"])
def my_comments():
    oid = _openid()
    if not oid:
        return jsonify([])
    rows = (
        CommunityComment.query.filter_by(author_id=oid)
        .order_by(CommunityComment.created_at.desc())
        .limit(50)
        .all()
    )
    out = []
    for c in rows:
        p = CommunityPost.query.get(c.post_id)
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
    return jsonify(out)


@community_bp.route("/upload", methods=["POST", "OPTIONS"])
def upload():
    from werkzeug.utils import secure_filename

    if request.method == "OPTIONS":
        return "", 204
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "no file"}), 400
    raw = secure_filename(f.filename or "img.jpg")
    ext = os.path.splitext(raw)[1] or ".jpg"
    fname = f"{uuid.uuid4().hex}{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    path = os.path.join(UPLOAD_DIR, fname)
    f.save(path)
    public_base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
    if public_base:
        url = f"{public_base}/uploads/{fname}"
    else:
        url = request.url_root.rstrip("/") + f"/uploads/{fname}"
    return jsonify({"url": url})


def register_upload_static(app):
    @app.route("/uploads/<path:fname>")
    def serve_upload(fname):
        return send_from_directory(UPLOAD_DIR, fname, max_age=86400)
