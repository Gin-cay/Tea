import secrets
import string
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_uid
from app.models import MallCartItem, MallOrder, MallOrderItem, MallProduct

router = APIRouter(prefix="/orders", tags=["orders"])


def _gen_order_no() -> str:
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    suf = "".join(secrets.choice(string.digits) for _ in range(6))
    return f"M{ts}{suf}"


class OrderCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    receiver_name: str = Field(..., min_length=1, max_length=64, alias="receiverName")
    receiver_phone: str = Field(..., min_length=6, max_length=20, alias="receiverPhone")
    province: str = ""
    city: str = ""
    district: str = ""
    address: str = Field(..., min_length=1, max_length=255)
    remark: Optional[str] = Field(None, max_length=500)
    freight_fen: int = Field(0, ge=0, alias="freightFen")
    from_cart: bool = Field(True, alias="fromCart")


class OrderItemIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    product_id: int = Field(alias="productId")
    quantity: int = Field(1, ge=1, le=999)


class OrderCreateDirect(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    receiver_name: str = Field(..., alias="receiverName")
    receiver_phone: str = Field(..., alias="receiverPhone")
    province: str = ""
    city: str = ""
    district: str = ""
    address: str = Field(..., min_length=1)
    remark: Optional[str] = None
    freight_fen: int = Field(0, ge=0, alias="freightFen")
    items: List[OrderItemIn]


def _order_summary(o: MallOrder, db: Session) -> dict:
    items = db.query(MallOrderItem).filter(MallOrderItem.order_id == o.id).all()
    return {
        "orderNo": o.order_no,
        "status": o.status,
        "totalAmountFen": o.total_amount_fen,
        "totalYuan": round(o.total_amount_fen / 100, 2),
        "freightFen": o.freight_fen,
        "receiverName": o.receiver_name,
        "receiverPhone": o.receiver_phone,
        "province": o.province,
        "city": o.city,
        "district": o.district,
        "address": o.address,
        "remark": o.remark,
        "payTime": o.pay_time.isoformat() if o.pay_time else None,
        "createdAt": o.created_at.isoformat() if o.created_at else None,
        "items": [
            {
                "productId": it.product_id,
                "productName": it.product_name,
                "coverUrl": it.cover_url,
                "priceFen": it.price_fen,
                "quantity": it.quantity,
            }
            for it in items
        ],
    }


@router.post("")
def order_create(body: OrderCreate, db: Session = Depends(get_db), uid: int = Depends(require_uid)):
    lines: List[tuple] = []
    if body.from_cart:
        carts = (
            db.query(MallCartItem)
            .filter(MallCartItem.user_id == uid, MallCartItem.selected == 1)
            .all()
        )
        if not carts:
            raise HTTPException(status_code=400, detail="购物车没有选中商品")
        for c in carts:
            p = db.query(MallProduct).filter(MallProduct.id == c.product_id, MallProduct.status == 1).first()
            if not p:
                raise HTTPException(status_code=400, detail=f"商品 {c.product_id} 已下架")
            if c.quantity > p.stock:
                raise HTTPException(status_code=400, detail=f"{p.name} 库存不足")
            lines.append((p, c.quantity, c))
    else:
        raise HTTPException(status_code=400, detail="请使用 POST /orders/direct 传入商品行")

    total = sum(p.price_fen * q for p, q, _ in lines)
    order = MallOrder(
        order_no=_gen_order_no(),
        user_id=uid,
        total_amount_fen=total,
        freight_fen=body.freight_fen,
        status="pending_pay",
        receiver_name=body.receiver_name,
        receiver_phone=body.receiver_phone,
        province=body.province,
        city=body.city,
        district=body.district,
        address=body.address,
        remark=body.remark,
    )
    db.add(order)
    db.flush()
    for p, qty, c in lines:
        db.add(
            MallOrderItem(
                order_id=order.id,
                product_id=p.id,
                product_name=p.name,
                cover_url=p.cover_url,
                price_fen=p.price_fen,
                quantity=qty,
            )
        )
        p.stock -= qty
        p.sales += qty
        db.delete(c)
    db.commit()
    db.refresh(order)
    return {"ok": True, "order": _order_summary(order, db)}


@router.post("/direct")
def order_create_direct(body: OrderCreateDirect, db: Session = Depends(get_db), uid: int = Depends(require_uid)):
    lines: List[tuple] = []
    for it in body.items:
        p = db.query(MallProduct).filter(MallProduct.id == it.product_id, MallProduct.status == 1).first()
        if not p:
            raise HTTPException(status_code=404, detail=f"商品 {it.product_id} 不存在")
        if it.quantity > p.stock:
            raise HTTPException(status_code=400, detail=f"{p.name} 库存不足")
        lines.append((p, it.quantity))
    total = sum(p.price_fen * q for p, q in lines)
    order = MallOrder(
        order_no=_gen_order_no(),
        user_id=uid,
        total_amount_fen=total,
        freight_fen=body.freight_fen,
        status="pending_pay",
        receiver_name=body.receiver_name,
        receiver_phone=body.receiver_phone,
        province=body.province,
        city=body.city,
        district=body.district,
        address=body.address,
        remark=body.remark,
    )
    db.add(order)
    db.flush()
    for p, qty in lines:
        db.add(
            MallOrderItem(
                order_id=order.id,
                product_id=p.id,
                product_name=p.name,
                cover_url=p.cover_url,
                price_fen=p.price_fen,
                quantity=qty,
            )
        )
        p.stock -= qty
        p.sales += qty
    db.commit()
    db.refresh(order)
    return {"ok": True, "order": _order_summary(order, db)}


@router.get("")
def order_list(
    db: Session = Depends(get_db),
    uid: int = Depends(require_uid),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
):
    q = db.query(MallOrder).filter(MallOrder.user_id == uid).order_by(MallOrder.id.desc())
    total = q.count()
    rows = q.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "pageSize": page_size,
        "list": [_order_summary(o, db) for o in rows],
    }


@router.get("/{order_no}")
def order_detail(order_no: str, db: Session = Depends(get_db), uid: int = Depends(require_uid)):
    o = db.query(MallOrder).filter(MallOrder.order_no == order_no, MallOrder.user_id == uid).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    return _order_summary(o, db)
