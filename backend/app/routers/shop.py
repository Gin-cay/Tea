"""商城：分类、商品、溯源、购物车、订单。"""

import json
import secrets
import string
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser
from app.models import ShopCartItem, ShopCategory, ShopOrder, ShopOrderItem, ShopProduct, ShopProductTrace

router = APIRouter(prefix="/api/mall", tags=["mall-shop"])


def _cat_name(db: Session, cid: int) -> str:
    c = db.query(ShopCategory).filter(ShopCategory.id == cid).first()
    return c.name if c else ""


def _product_list_item(db: Session, p: ShopProduct) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "category": _cat_name(db, p.category_id),
        "categoryId": p.category_id,
        "price": round(p.price_fen / 100, 2),
        "priceFen": p.price_fen,
        "sold": p.sales,
        "cover": p.cover_url,
        "redSelling": p.red_selling_tag or "",
    }


def _product_detail(db: Session, p: ShopProduct) -> dict:
    gal = []
    if p.gallery_json:
        try:
            gal = json.loads(p.gallery_json)
            if not isinstance(gal, list):
                gal = []
        except Exception:
            gal = []
    return {
        "id": p.id,
        "name": p.name,
        "category": _cat_name(db, p.category_id),
        "categoryId": p.category_id,
        "price": round(p.price_fen / 100, 2),
        "priceFen": p.price_fen,
        "sold": p.sales,
        "cover": p.cover_url,
        "gallery": gal,
        "subtitle": p.subtitle,
        "detailHtml": p.detail_html or "",
        "redUSP": p.red_selling_tag or "",
        "redSelling": p.red_selling_tag or "",
        "origin": "",
        "traceFeature": "",
        "stock": p.stock,
    }


@router.get("/categories")
def mall_categories(db: Session = Depends(get_db)):
    rows = (
        db.query(ShopCategory)
        .filter(ShopCategory.status == 1)
        .order_by(ShopCategory.sort_order, ShopCategory.id)
        .all()
    )
    return [{"id": r.id, "parentId": r.parent_id, "name": r.name, "sortOrder": r.sort_order} for r in rows]


@router.get("/products")
def mall_products(
    db: Session = Depends(get_db),
    category_id: Optional[int] = Query(None),
    keyword: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    q = db.query(ShopProduct).filter(ShopProduct.status == 1)
    if category_id is not None:
        q = q.filter(ShopProduct.category_id == category_id)
    if keyword and keyword.strip():
        kw = f"%{keyword.strip()}%"
        q = q.filter(or_(ShopProduct.name.like(kw), ShopProduct.subtitle.like(kw)))
    total = q.count()
    rows = (
        q.order_by(ShopProduct.sales.desc(), ShopProduct.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "pageSize": page_size,
        "list": [_product_list_item(db, p) for p in rows],
    }


@router.get("/products/{product_id}")
def mall_product_detail(product_id: int, db: Session = Depends(get_db)):
    p = db.query(ShopProduct).filter(ShopProduct.id == product_id, ShopProduct.status == 1).first()
    if not p:
        raise HTTPException(status_code=404, detail="商品不存在")
    return _product_detail(db, p)


@router.get("/products/{product_id}/trace")
def mall_product_trace(
    product_id: int,
    db: Session = Depends(get_db),
    batch_no: str = Query(""),
):
    p = db.query(ShopProduct).filter(ShopProduct.id == product_id, ShopProduct.status == 1).first()
    if not p:
        raise HTTPException(status_code=404, detail="商品不存在")
    t = (
        db.query(ShopProductTrace)
        .filter(ShopProductTrace.product_id == product_id, ShopProductTrace.batch_no == batch_no)
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="暂无溯源信息")
    chain = []
    if t.trace_chain_json:
        try:
            chain = json.loads(t.trace_chain_json)
            if not isinstance(chain, list):
                chain = []
        except Exception:
            chain = []
    return {
        "productId": product_id,
        "batchNo": t.batch_no,
        "gardenId": t.garden_id,
        "gardenName": t.garden_name,
        "certNo": t.cert_no,
        "traceChain": chain,
        "verifyHint": t.verify_hint,
    }


class CartAdd(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    product_id: int = Field(alias="productId")
    quantity: int = Field(1, ge=1, le=999)


class CartPatch(BaseModel):
    quantity: int = Field(..., ge=1, le=999)
    selected: int = Field(1, ge=0, le=1)


def _cart_line(db: Session, row: ShopCartItem, p: ShopProduct) -> dict:
    return {
        "id": row.id,
        "productId": row.product_id,
        "quantity": row.quantity,
        "selected": row.selected,
        "product": {
            "id": p.id,
            "name": p.name,
            "coverUrl": p.cover_url,
            "priceFen": p.price_fen,
            "priceYuan": round(p.price_fen / 100, 2),
            "stock": p.stock,
            "status": p.status,
        },
    }


@router.get("/cart/items")
def cart_list(user: CurrentUser, db: Session = Depends(get_db)):
    rows: List[ShopCartItem] = (
        db.query(ShopCartItem).filter(ShopCartItem.user_id == user.id).order_by(ShopCartItem.id.desc()).all()
    )
    out = []
    for row in rows:
        p = db.query(ShopProduct).filter(ShopProduct.id == row.product_id).first()
        if not p:
            continue
        out.append(_cart_line(db, row, p))
    return {"items": out}


@router.post("/cart/items")
def cart_add(body: CartAdd, user: CurrentUser, db: Session = Depends(get_db)):
    p = db.query(ShopProduct).filter(ShopProduct.id == body.product_id, ShopProduct.status == 1).first()
    if not p:
        raise HTTPException(status_code=404, detail="商品不存在或已下架")
    if body.quantity > p.stock:
        raise HTTPException(status_code=400, detail="库存不足")
    row = (
        db.query(ShopCartItem)
        .filter(ShopCartItem.user_id == user.id, ShopCartItem.product_id == body.product_id)
        .first()
    )
    if row:
        nq = row.quantity + body.quantity
        if nq > p.stock:
            raise HTTPException(status_code=400, detail="库存不足")
        row.quantity = nq
    else:
        row = ShopCartItem(user_id=user.id, product_id=body.product_id, quantity=body.quantity, selected=1)
        db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "item": _cart_line(db, row, p)}


@router.patch("/cart/items/{item_id}")
def cart_patch(item_id: int, body: CartPatch, user: CurrentUser, db: Session = Depends(get_db)):
    row = db.query(ShopCartItem).filter(ShopCartItem.id == item_id, ShopCartItem.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="购物车项不存在")
    p = db.query(ShopProduct).filter(ShopProduct.id == row.product_id).first()
    if not p or p.status != 1:
        raise HTTPException(status_code=400, detail="商品已失效")
    if body.quantity > p.stock:
        raise HTTPException(status_code=400, detail="库存不足")
    row.quantity = body.quantity
    row.selected = body.selected
    db.commit()
    db.refresh(row)
    return {"ok": True, "item": _cart_line(db, row, p)}


@router.delete("/cart/items/{item_id}")
def cart_delete(item_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    row = db.query(ShopCartItem).filter(ShopCartItem.id == item_id, ShopCartItem.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="购物车项不存在")
    db.delete(row)
    db.commit()
    return {"ok": True}


def _order_no() -> str:
    return "S" + datetime.utcnow().strftime("%Y%m%d%H%M%S") + "".join(secrets.choice(string.digits) for _ in range(5))


class OrderCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    receiver_name: str = Field(..., alias="receiverName")
    receiver_phone: str = Field(..., alias="receiverPhone")
    province: str = ""
    city: str = ""
    district: str = ""
    address: str = Field(..., min_length=1)
    remark: Optional[str] = None
    freight_fen: int = Field(0, ge=0, alias="freightFen")


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


def _order_out(db: Session, o: ShopOrder) -> dict:
    items = db.query(ShopOrderItem).filter(ShopOrderItem.order_id == o.id).all()
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


@router.post("/orders/from-cart")
def order_from_cart(body: OrderCreate, user: CurrentUser, db: Session = Depends(get_db)):
    carts = db.query(ShopCartItem).filter(ShopCartItem.user_id == user.id, ShopCartItem.selected == 1).all()
    if not carts:
        raise HTTPException(status_code=400, detail="请先勾选购物车商品")
    lines = []
    for c in carts:
        p = db.query(ShopProduct).filter(ShopProduct.id == c.product_id, ShopProduct.status == 1).first()
        if not p:
            raise HTTPException(status_code=400, detail="存在已下架商品")
        if c.quantity > p.stock:
            raise HTTPException(status_code=400, detail=f"{p.name} 库存不足")
        lines.append((p, c.quantity, c))
    total = sum(p.price_fen * q for p, q, _ in lines)
    o = ShopOrder(
        order_no=_order_no(),
        user_id=user.id,
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
    db.add(o)
    db.flush()
    for p, qty, c in lines:
        db.add(
            ShopOrderItem(
                order_id=o.id,
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
    db.refresh(o)
    return {"ok": True, "order": _order_out(db, o)}


@router.post("/orders/direct")
def order_direct(body: OrderCreateDirect, user: CurrentUser, db: Session = Depends(get_db)):
    lines = []
    for it in body.items:
        p = db.query(ShopProduct).filter(ShopProduct.id == it.product_id, ShopProduct.status == 1).first()
        if not p:
            raise HTTPException(status_code=404, detail="商品不存在")
        if it.quantity > p.stock:
            raise HTTPException(status_code=400, detail="库存不足")
        lines.append((p, it.quantity))
    total = sum(p.price_fen * q for p, q in lines)
    o = ShopOrder(
        order_no=_order_no(),
        user_id=user.id,
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
    db.add(o)
    db.flush()
    for p, qty in lines:
        db.add(
            ShopOrderItem(
                order_id=o.id,
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
    db.refresh(o)
    return {"ok": True, "order": _order_out(db, o)}


@router.get("/orders")
def order_list(
    user: CurrentUser,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
):
    q = db.query(ShopOrder).filter(ShopOrder.user_id == user.id).order_by(ShopOrder.id.desc())
    total = q.count()
    rows = q.offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "pageSize": page_size, "list": [_order_out(db, o) for o in rows]}


@router.get("/orders/{order_no}")
def order_detail(order_no: str, user: CurrentUser, db: Session = Depends(get_db)):
    o = db.query(ShopOrder).filter(ShopOrder.order_no == order_no, ShopOrder.user_id == user.id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    return _order_out(db, o)


@router.delete("/orders/{order_no}")
def order_cancel(order_no: str, user: CurrentUser, db: Session = Depends(get_db)):
    """待支付订单可取消（演示：直接删除未支付单，生产请用状态机）。"""
    o = db.query(ShopOrder).filter(ShopOrder.order_no == order_no, ShopOrder.user_id == user.id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    if o.status != "pending_pay":
        raise HTTPException(status_code=400, detail="仅待支付订单可取消")
    items = db.query(ShopOrderItem).filter(ShopOrderItem.order_id == o.id).all()
    for it in items:
        p = db.query(ShopProduct).filter(ShopProduct.id == it.product_id).first()
        if p:
            p.stock += it.quantity
            p.sales = max(0, (p.sales or 0) - it.quantity)
    db.query(ShopOrderItem).filter(ShopOrderItem.order_id == o.id).delete()
    db.delete(o)
    db.commit()
    return {"ok": True}
