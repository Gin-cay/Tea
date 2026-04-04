from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MallProduct, MallProductTrace

router = APIRouter(prefix="/products", tags=["products"])


def _product_dict(p: MallProduct) -> dict:
    return {
        "id": p.id,
        "categoryId": p.category_id,
        "name": p.name,
        "subtitle": p.subtitle,
        "coverUrl": p.cover_url,
        "gallery": p.gallery_json if p.gallery_json is not None else [],
        "priceFen": p.price_fen,
        "priceYuan": round(p.price_fen / 100, 2),
        "originalPriceFen": p.original_price_fen,
        "stock": p.stock,
        "sales": p.sales,
        "redSellingTag": p.red_selling_tag,
    }


def _product_detail_dict(p: MallProduct) -> dict:
    d = _product_dict(p)
    d["detailHtml"] = p.detail_html or ""
    return d


@router.get("")
def product_list(
    db: Session = Depends(get_db),
    category_id: Optional[int] = Query(None, description="分类 ID，不传则不限"),
    keyword: Optional[str] = Query(None, description="搜索关键词，匹配名称/副标题"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    q = db.query(MallProduct).filter(MallProduct.status == 1)
    if category_id is not None:
        q = q.filter(MallProduct.category_id == category_id)
    if keyword and keyword.strip():
        kw = f"%{keyword.strip()}%"
        q = q.filter(or_(MallProduct.name.like(kw), MallProduct.subtitle.like(kw)))
    total = q.count()
    rows: List[MallProduct] = (
        q.order_by(MallProduct.sales.desc(), MallProduct.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "pageSize": page_size,
        "list": [_product_dict(p) for p in rows],
    }


@router.get("/{product_id}")
def product_detail(product_id: int, db: Session = Depends(get_db)):
    p = db.query(MallProduct).filter(MallProduct.id == product_id, MallProduct.status == 1).first()
    if not p:
        raise HTTPException(status_code=404, detail="商品不存在或已下架")
    return _product_detail_dict(p)


@router.get("/{product_id}/trace")
def product_trace(
    product_id: int,
    db: Session = Depends(get_db),
    batch_no: str = Query("", description="批次号，空则取默认档"),
):
    p = db.query(MallProduct).filter(MallProduct.id == product_id, MallProduct.status == 1).first()
    if not p:
        raise HTTPException(status_code=404, detail="商品不存在或已下架")
    t = (
        db.query(MallProductTrace)
        .filter(MallProductTrace.product_id == product_id, MallProductTrace.batch_no == batch_no)
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="暂无溯源信息")
    return {
        "productId": product_id,
        "batchNo": t.batch_no,
        "gardenId": t.garden_id,
        "gardenName": t.garden_name,
        "certNo": t.cert_no,
        "traceChain": t.trace_chain_json if t.trace_chain_json is not None else [],
        "verifyHint": t.verify_hint,
    }
