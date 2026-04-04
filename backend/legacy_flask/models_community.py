import json
import uuid
from datetime import datetime

from extensions import db


def _rid():
    return uuid.uuid4().hex


class CommunityPost(db.Model):
    __tablename__ = "community_posts"

    id = db.Column(db.String(32), primary_key=True, default=_rid)
    author_id = db.Column(db.String(64), nullable=False, index=True)
    author_name = db.Column(db.String(64), default="茶友")
    avatar_url = db.Column(db.String(512), default="")
    is_official = db.Column(db.Boolean, default=False)
    featured = db.Column(db.Boolean, default=False)
    topics = db.Column(db.Text, default="[]")  # JSON array string
    title = db.Column(db.String(200), default="")
    content = db.Column(db.Text, default="")
    media_type = db.Column(db.String(16), default="image")
    cover_url = db.Column(db.String(1024), default="")
    video_url = db.Column(db.String(1024), default="")
    location_name = db.Column(db.String(200), default="")
    lat = db.Column(db.Float, default=0)
    lng = db.Column(db.Float, default=0)
    like_count = db.Column(db.Integer, default=0)
    comment_count = db.Column(db.Integer, default=0)
    collect_count = db.Column(db.Integer, default=0)
    share_count = db.Column(db.Integer, default=0)
    hot_score = db.Column(db.Integer, default=0)
    status = db.Column(db.String(16), default="pending", index=True)
    extra_tag = db.Column(db.String(32), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def topics_list(self):
        try:
            return json.loads(self.topics or "[]")
        except Exception:
            return []

    def to_dict(self):
        return {
            "id": self.id,
            "authorId": self.author_id,
            "authorName": self.author_name,
            "avatarUrl": self.avatar_url,
            "isOfficial": self.is_official,
            "featured": self.featured,
            "topics": self.topics_list(),
            "title": self.title,
            "content": self.content,
            "mediaType": self.media_type,
            "coverUrl": self.cover_url,
            "videoUrl": self.video_url,
            "locationName": self.location_name,
            "lat": self.lat or 0,
            "lng": self.lng or 0,
            "likeCount": self.like_count or 0,
            "commentCount": self.comment_count or 0,
            "collectCount": self.collect_count or 0,
            "shareCount": self.share_count or 0,
            "hotScore": self.hot_score or 0,
            "status": self.status,
            "createdAt": self.created_at.isoformat() + "Z" if self.created_at else "",
            "extraTag": self.extra_tag or "",
        }


class CommunityComment(db.Model):
    __tablename__ = "community_comments"

    id = db.Column(db.String(32), primary_key=True, default=_rid)
    post_id = db.Column(db.String(32), nullable=False, index=True)
    author_id = db.Column(db.String(64), nullable=False, index=True)
    author_name = db.Column(db.String(64), default="茶友")
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)


class CommunityLike(db.Model):
    __tablename__ = "community_likes"

    post_id = db.Column(db.String(32), primary_key=True)
    openid = db.Column(db.String(64), primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class CommunityCollect(db.Model):
    __tablename__ = "community_collects"

    post_id = db.Column(db.String(32), primary_key=True)
    openid = db.Column(db.String(64), primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class CommunityBlock(db.Model):
    __tablename__ = "community_blocks"

    blocker_id = db.Column(db.String(64), primary_key=True)
    blocked_id = db.Column(db.String(64), primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class CommunityReport(db.Model):
    __tablename__ = "community_reports"

    id = db.Column(db.String(32), primary_key=True, default=_rid)
    post_id = db.Column(db.String(32), nullable=False)
    reporter_id = db.Column(db.String(64), nullable=False)
    reason = db.Column(db.String(32), default="other")
    status = db.Column(db.String(16), default="open")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class CommunityNotification(db.Model):
    __tablename__ = "community_notifications"

    id = db.Column(db.String(32), primary_key=True, default=_rid)
    to_openid = db.Column(db.String(64), nullable=False, index=True)
    type = db.Column(db.String(16), default="msg")
    post_id = db.Column(db.String(32), default="")
    from_openid = db.Column(db.String(64), default="")
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
