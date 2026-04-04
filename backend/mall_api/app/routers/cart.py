from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_uid
from app.models import MallCartItem, MallProduct

router = APIRouter(prefix="/cart", tags=["cart"])


class CartAdd(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    product_id: int = Field(..., alias="productId")
    quantity: int = Field(1, ge=1, le=999)


class CartPatch(BaseModel):
    quantity: int = Field(..., ge=1, le=999)
    selected: int = Field(1, ge=0, le=1)


def _item_out(row: MallCartItem, p: MallProduct) -> dict:
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


@router.get("")
def cart_list(db: Session = Depends(get_db), uid: int = Depends(require_uid)):
    rows: List[MallCartItem] = (
        db.query(MallCartItem).filter(MallCartItem.user_id == uid).order_by(MallCartItem.id.desc()).all()
    )
    out = []
    for row in rows:
        p = db.query(MallProduct).filter(MallProduct.id == row.product_id).first()
        if not p:
            continue
        out.append(_item_out(row, p))
    return {"items": out}


@router.post("/items")
def cart_add(body: CartAdd, db: Session = Depends(get_db), uid: int = Depends(require_uid)):
    p = db.query(MallProduct).filter(MallProduct.id == body.product_id, MallProduct.status == 1).first()
    if not p:
        raise HTTPException(status_code=404, detail="商品不存在或已下架")
    if p.stock < body.quantity:
        raise HTTPException(status_code=400, detail="库存不足")
    row = db.query(MallCartItem).filter(MallCartItem.user_id == uid, MallCartItem.product_id == body.product_id).first()
    if row:
        nq = row.quantity + body.quantity
        if nq > p.stock:
            raise HTTPException(status_code=400, detail="库存不足")
        row.quantity = nq
    else:
        row = MallCartItem(user_id=uid, product_id=body.product_id, quantity=body.quantity, selected=1)
        db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "item": _item_out(row, p)}


@router.patch("/items/{item_id}")
def cart_patch(item_id: int, body: CartPatch, db: Session = Depends(get_db), uid: int = Depends(require_uid)):
    row = db.query(MallCartItem).filter(MallCartItem.id == item_id, MallCartItem.user_id == uid).first()
    if not row:
        raise HTTPException(status_code=404, detail="购物车项不存在")
    p = db.query(MallProduct).filter(MallProduct.id == row.product_id).first()
    if not p or p.status != 1:
        raise HTTPException(status_code=400, detail="商品已失效")
    if body.quantity > p.stock:
        raise HTTPException(status_code=400, detail="库存不足")
    row.quantity = body.quantity
    row.selected = body.selected
    db.commit()
    db.refresh(row)
    return {"ok": True, "item": _item_out(row, p)}


@router.delete("/items/{item_id}")
def cart_delete(item_id: int, db: Session = Depends(get_db), uid: int = Depends(require_uid)):
    row = db.query(MallCartItem).filter(MallCartItem.id == item_id, MallCartItem.user_id == uid).first()
    if not row:
        raise HTTPException(status_code=404, detail="购物车项不存在")
    db.delete(row)
    db.commit()
    return {"ok": True}
