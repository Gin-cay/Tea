"""商城 ORM（与 sql/schema.sql 一致）。"""

from datetime import datetime
from typing import Any, List, Optional

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MallUser(Base):
    __tablename__ = "mall_users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    openid: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    unionid: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    nickname: Mapped[str] = mapped_column(String(128), default="")
    avatar_url: Mapped[str] = mapped_column(String(512), default="")
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    gender: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MallCategory(Base):
    __tablename__ = "mall_categories"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    parent_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MallProduct(Base):
    __tablename__ = "mall_products"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("mall_categories.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    subtitle: Mapped[str] = mapped_column(String(500), default="")
    cover_url: Mapped[str] = mapped_column(String(1024), default="")
    gallery_json: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    price_fen: Mapped[int] = mapped_column(Integer, default=0)
    original_price_fen: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    sales: Mapped[int] = mapped_column(Integer, default=0)
    detail_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    red_selling_tag: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    status: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    traces: Mapped[List["MallProductTrace"]] = relationship(
        "MallProductTrace", back_populates="product"
    )


class MallProductTrace(Base):
    __tablename__ = "mall_product_trace"
    __table_args__ = (UniqueConstraint("product_id", "batch_no", name="uk_product_batch"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("mall_products.id", ondelete="CASCADE"))
    batch_no: Mapped[str] = mapped_column(String(64), default="")
    garden_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    garden_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    cert_no: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    trace_chain_json: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    verify_hint: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product: Mapped["MallProduct"] = relationship("MallProduct", back_populates="traces")


class MallCartItem(Base):
    __tablename__ = "mall_cart_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uk_user_product"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("mall_users.id", ondelete="CASCADE"))
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("mall_products.id", ondelete="CASCADE"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    selected: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MallOrder(Base):
    __tablename__ = "mall_orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_no: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("mall_users.id"))
    total_amount_fen: Mapped[int] = mapped_column(Integer, default=0)
    freight_fen: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="pending_pay")
    receiver_name: Mapped[str] = mapped_column(String(64), default="")
    receiver_phone: Mapped[str] = mapped_column(String(20), default="")
    province: Mapped[str] = mapped_column(String(32), default="")
    city: Mapped[str] = mapped_column(String(32), default="")
    district: Mapped[str] = mapped_column(String(32), default="")
    address: Mapped[str] = mapped_column(String(255), default="")
    remark: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pay_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items: Mapped[List["MallOrderItem"]] = relationship(
        "MallOrderItem", back_populates="order", cascade="all, delete-orphan"
    )


class MallOrderItem(Base):
    __tablename__ = "mall_order_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("mall_orders.id", ondelete="CASCADE"))
    product_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    cover_url: Mapped[str] = mapped_column(String(1024), default="")
    price_fen: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    order: Mapped["MallOrder"] = relationship("MallOrder", back_populates="items")
