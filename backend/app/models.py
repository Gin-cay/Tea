"""数据库 ORM 模型。"""

import json
import uuid
from datetime import datetime
from typing import Any, List, Optional

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _rid() -> str:
    return uuid.uuid4().hex


class User(Base):
    """微信用户（openid 唯一）。"""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_rid)
    openid: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    nickname: Mapped[str] = mapped_column(String(64), default="")
    avatar_url: Mapped[str] = mapped_column(String(512), default="")
    points_balance: Mapped[int] = mapped_column(Integer, default=860)
    points_expiring_at: Mapped[str] = mapped_column(String(32), default="2026-12-31")
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    role: Mapped[str] = mapped_column(String(16), default="customer")
    address_region_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    address_detail: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    target_amount: Mapped[int] = mapped_column(Integer)
    current_amount: Mapped[int] = mapped_column(Integer)
    donate_content: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), index=True)
    record_id: Mapped[str] = mapped_column(String(64), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class DonationRecord(Base):
    __tablename__ = "donation_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    milestone_name: Mapped[str] = mapped_column(String(200))
    donate_detail: Mapped[str] = mapped_column(Text)
    execution_progress: Mapped[str] = mapped_column(Text)
    feedback_json: Mapped[str] = mapped_column(Text, default="[]")
    certificate_json: Mapped[str] = mapped_column(Text, default="{}")

    def feedback_list(self) -> List[Any]:
        try:
            return json.loads(self.feedback_json or "[]")
        except Exception:
            return []

    def certificate_dict(self) -> dict:
        try:
            return json.loads(self.certificate_json or "{}")
        except Exception:
            return {}


class RedeemGood(Base):
    __tablename__ = "redeem_goods"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    points_cost: Mapped[int] = mapped_column(Integer)
    type: Mapped[str] = mapped_column(String(32), default="tea")


class GardenProfile(Base):
    """红色溯源茶园档案（JSON 与小程序原 mock 结构一致）。"""

    __tablename__ = "garden_profiles"

    garden_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    profile_json: Mapped[str] = mapped_column(Text)


class StudySpot(Base):
    __tablename__ = "study_spots"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload_json: Mapped[str] = mapped_column(Text)


class StudyRoute(Base):
    __tablename__ = "study_routes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload_json: Mapped[str] = mapped_column(Text)


class SeasonTimeline(Base):
    """茶树数字孪生：按茶园 + 季节键存图与日记。"""

    __tablename__ = "season_timelines"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_rid)
    garden_id: Mapped[str] = mapped_column(String(32), index=True)
    season_key: Mapped[str] = mapped_column(String(16), index=True)
    image_url: Mapped[str] = mapped_column(String(1024))
    diary: Mapped[str] = mapped_column(Text, default="")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    payload_json: Mapped[str] = mapped_column(Text)


class Banner(Base):
    __tablename__ = "banners"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200))
    image: Mapped[str] = mapped_column(String(1024))


class HomeHotItem(Base):
    __tablename__ = "home_hot_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    payload_json: Mapped[str] = mapped_column(Text)


class HomeGardenTeaser(Base):
    __tablename__ = "home_garden_teasers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    payload_json: Mapped[str] = mapped_column(Text)


class AdoptGarden(Base):
    """认养茶园详情（列表项 + 详情页 JSON）。"""

    __tablename__ = "adopt_gardens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    list_json: Mapped[str] = mapped_column(Text)
    detail_json: Mapped[str] = mapped_column(Text)


class AdoptPackage(Base):
    __tablename__ = "adopt_packages"

    package_key: Mapped[str] = mapped_column(String(32), primary_key=True)
    payload_json: Mapped[str] = mapped_column(Text)


class StudyBooking(Base):
    __tablename__ = "study_bookings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_rid)
    openid: Mapped[str] = mapped_column(String(64), index=True)
    route_id: Mapped[str] = mapped_column(String(64))
    note: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StudyCheckinRecord(Base):
    """研学线下打卡（服务端记录，与答题/证书关联）。"""

    __tablename__ = "study_checkin_records"
    __table_args__ = (UniqueConstraint("user_id", "spot_id", name="uq_study_checkin_user_spot"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_rid)
    user_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    spot_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    spot_name: Mapped[str] = mapped_column(String(200), default="")
    checked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StudyQuizAttempt(Base):
    """信阳毛尖研学答题记录（每场打卡一条）。"""

    __tablename__ = "study_quiz_attempts"
    __table_args__ = (UniqueConstraint("checkin_record_id", name="uq_study_quiz_one_per_checkin"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_rid)
    user_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    checkin_record_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    answers_json: Mapped[str] = mapped_column(Text, default="{}")
    score: Mapped[int] = mapped_column(Integer, default=0)
    max_score: Mapped[int] = mapped_column(Integer, default=3)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    results_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StudyQuizCertificate(Base):
    """答题达标电子证书。"""

    __tablename__ = "study_quiz_certificates"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_rid)
    user_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    checkin_record_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    quiz_attempt_id: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    cert_no: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    nickname: Mapped[str] = mapped_column(String(64), default="")
    spot_id: Mapped[str] = mapped_column(String(64), default="")
    spot_name: Mapped[str] = mapped_column(String(200), default="")
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PayOrder(Base):
    __tablename__ = "pay_orders"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_rid)
    openid: Mapped[str] = mapped_column(String(64), index=True, default="")
    adopt_id: Mapped[str] = mapped_column(String(32), default="")
    package_id: Mapped[str] = mapped_column(String(32), default="")
    order_mode: Mapped[str] = mapped_column(String(32), default="garden")
    amount_fen: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="created")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ---------- 社区（与原 Flask 版表名一致，便于数据迁移）----------


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_rid)
    author_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    author_name: Mapped[str] = mapped_column(String(64), default="茶友")
    avatar_url: Mapped[str] = mapped_column(String(512), default="")
    is_official: Mapped[bool] = mapped_column(Boolean, default=False)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    topics: Mapped[str] = mapped_column(Text, default="[]")
    title: Mapped[str] = mapped_column(String(200), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    media_type: Mapped[str] = mapped_column(String(16), default="image")
    cover_url: Mapped[str] = mapped_column(String(1024), default="")
    video_url: Mapped[str] = mapped_column(String(1024), default="")
    location_name: Mapped[str] = mapped_column(String(200), default="")
    lat: Mapped[float] = mapped_column(Float, default=0)
    lng: Mapped[float] = mapped_column(Float, default=0)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    collect_count: Mapped[int] = mapped_column(Integer, default=0)
    share_count: Mapped[int] = mapped_column(Integer, default=0)
    hot_score: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    extra_tag: Mapped[str] = mapped_column(String(32), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    def topics_list(self) -> List[str]:
        try:
            return json.loads(self.topics or "[]")
        except Exception:
            return []

    def to_dict(self) -> dict:
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


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_rid)
    post_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    author_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    author_name: Mapped[str] = mapped_column(String(64), default="茶友")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class CommunityLike(Base):
    __tablename__ = "community_likes"

    post_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    openid: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CommunityCollect(Base):
    __tablename__ = "community_collects"

    post_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    openid: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CommunityBlock(Base):
    __tablename__ = "community_blocks"

    blocker_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    blocked_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CommunityReport(Base):
    __tablename__ = "community_reports"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_rid)
    post_id: Mapped[str] = mapped_column(String(32), nullable=False)
    reporter_id: Mapped[str] = mapped_column(String(64), nullable=False)
    reason: Mapped[str] = mapped_column(String(32), default="other")
    status: Mapped[str] = mapped_column(String(16), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CommunityNotification(Base):
    __tablename__ = "community_notifications"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_rid)
    to_openid: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(16), default="msg")
    post_id: Mapped[str] = mapped_column(String(32), default="")
    from_openid: Mapped[str] = mapped_column(String(64), default="")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


# ---------- 商城（关系型，支持购物车/订单/溯源）----------


class ShopCategory(Base):
    __tablename__ = "shop_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[int] = mapped_column(Integer, default=1)


class ShopProduct(Base):
    __tablename__ = "shop_products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    subtitle: Mapped[str] = mapped_column(String(500), default="")
    cover_url: Mapped[str] = mapped_column(String(1024), default="")
    gallery_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price_fen: Mapped[int] = mapped_column(Integer, default=0)
    original_price_fen: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    sales: Mapped[int] = mapped_column(Integer, default=0)
    detail_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    red_selling_tag: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    status: Mapped[int] = mapped_column(Integer, default=1, index=True)


class ShopProductTrace(Base):
    __tablename__ = "shop_product_traces"
    __table_args__ = (UniqueConstraint("product_id", "batch_no", name="uq_shop_trace_product_batch"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    batch_no: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    garden_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    garden_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    cert_no: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    trace_chain_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verify_hint: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)


class ShopCartItem(Base):
    __tablename__ = "shop_cart_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_shop_cart_user_product"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    selected: Mapped[int] = mapped_column(Integer, default=1)


class ShopOrder(Base):
    __tablename__ = "shop_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_no: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    total_amount_fen: Mapped[int] = mapped_column(Integer, default=0)
    freight_fen: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="pending_pay", index=True)
    receiver_name: Mapped[str] = mapped_column(String(64), default="")
    receiver_phone: Mapped[str] = mapped_column(String(20), default="")
    province: Mapped[str] = mapped_column(String(32), default="")
    city: Mapped[str] = mapped_column(String(32), default="")
    district: Mapped[str] = mapped_column(String(32), default="")
    address: Mapped[str] = mapped_column(String(255), default="")
    remark: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pay_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ShopOrderItem(Base):
    __tablename__ = "shop_order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(Integer, nullable=False)
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    cover_url: Mapped[str] = mapped_column(String(1024), default="")
    price_fen: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)


class ContentStory(Base):
    """茶叶故事 / 红色茶源（CMS）。"""

    __tablename__ = "content_stories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    story_type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    desc: Mapped[str] = mapped_column(String(500), default="")
    body_html: Mapped[str] = mapped_column(Text, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class RealCarePost(Base):
    """茶农实时照看上传记录。"""

    __tablename__ = "real_care_posts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_rid)
    user_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    tree_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    image_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    diary: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class UserTraceRecord(Base):
    """用户认养后溯源码记录（云端）。"""

    __tablename__ = "user_trace_records"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_rid)
    user_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    trace_token: Mapped[str] = mapped_column(String(512), nullable=False)
    garden_id: Mapped[str] = mapped_column(String(32), default="")
    order_id: Mapped[str] = mapped_column(String(64), default="")
    garden_name: Mapped[str] = mapped_column(String(200), default="")
    order_mode: Mapped[str] = mapped_column(String(32), default="garden")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
