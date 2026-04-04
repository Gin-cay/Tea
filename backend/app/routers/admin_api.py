"""管理端 CRUD（请求头 X-Admin-Token 须与 ADMIN_TOKEN 一致）。"""

from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import ContentStory, ShopCategory, ShopProduct, ShopProductTrace

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(x_admin_token: Annotated[Optional[str], Header()] = None):
    tok = (x_admin_token or "").strip()
    expected = (get_settings().admin_token or "").strip()
    if not expected or tok != expected:
        raise HTTPException(status_code=403, detail="无效管理令牌")


AdminDep = Depends(require_admin)


class StoryBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    story_type: str = Field(..., alias="type")
    slug: str
    title: str
    desc: str = ""
    body_html: str = Field("", alias="bodyHtml")
    sort_order: int = Field(0, alias="sortOrder")


# ---------- 故事 ----------
@router.post("/stories", dependencies=[AdminDep])
def admin_story_create(body: StoryBody, db: Session = Depends(get_db)):
    if db.query(ContentStory).filter(ContentStory.slug == body.slug).first():
        raise HTTPException(status_code=400, detail="slug 已存在")
    r = ContentStory(
        story_type=body.story_type,
        slug=body.slug,
        title=body.title,
        desc=body.desc,
        body_html=body.body_html,
        sort_order=body.sort_order,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"ok": True, "id": r.id}


@router.put("/stories/{slug}", dependencies=[AdminDep])
def admin_story_update(slug: str, body: StoryBody, db: Session = Depends(get_db)):
    r = db.query(ContentStory).filter(ContentStory.slug == slug).first()
    if not r:
        raise HTTPException(status_code=404, detail="不存在")
    r.story_type = body.story_type
    r.title = body.title
    r.desc = body.desc
    r.body_html = body.body_html
    r.sort_order = body.sort_order
    db.commit()
    return {"ok": True}


@router.delete("/stories/{slug}", dependencies=[AdminDep])
def admin_story_delete(slug: str, db: Session = Depends(get_db)):
    r = db.query(ContentStory).filter(ContentStory.slug == slug).first()
    if not r:
        raise HTTPException(status_code=404, detail="不存在")
    db.delete(r)
    db.commit()
    return {"ok": True}


# ---------- 分类 ----------
class CatBody(BaseModel):
    name: str
    parent_id: Optional[int] = Field(None, alias="parentId")
    sort_order: int = Field(0, alias="sortOrder")
    status: int = 1

    model_config = ConfigDict(populate_by_name=True)


@router.post("/shop/categories", dependencies=[AdminDep])
def admin_cat_create(body: CatBody, db: Session = Depends(get_db)):
    r = ShopCategory(
        name=body.name,
        parent_id=body.parent_id,
        sort_order=body.sort_order,
        status=body.status,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"ok": True, "id": r.id}


@router.put("/shop/categories/{cid}", dependencies=[AdminDep])
def admin_cat_update(cid: int, body: CatBody, db: Session = Depends(get_db)):
    r = db.query(ShopCategory).filter(ShopCategory.id == cid).first()
    if not r:
        raise HTTPException(status_code=404, detail="不存在")
    r.name = body.name
    r.parent_id = body.parent_id
    r.sort_order = body.sort_order
    r.status = body.status
    db.commit()
    return {"ok": True}


@router.delete("/shop/categories/{cid}", dependencies=[AdminDep])
def admin_cat_delete(cid: int, db: Session = Depends(get_db)):
    r = db.query(ShopCategory).filter(ShopCategory.id == cid).first()
    if not r:
        raise HTTPException(status_code=404, detail="不存在")
    db.delete(r)
    db.commit()
    return {"ok": True}


# ---------- 商品 ----------
class ProductBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    category_id: int = Field(alias="categoryId")
    name: str
    subtitle: str = ""
    cover_url: str = Field("", alias="coverUrl")
    gallery_json: Optional[str] = Field(None, alias="galleryJson")
    price_fen: int = Field(0, alias="priceFen")
    original_price_fen: Optional[int] = Field(None, alias="originalPriceFen")
    stock: int = 0
    sales: int = 0
    detail_html: str = Field("", alias="detailHtml")
    red_selling_tag: Optional[str] = Field(None, alias="redSellingTag")
    status: int = 1


@router.post("/shop/products", dependencies=[AdminDep])
def admin_product_create(body: ProductBody, db: Session = Depends(get_db)):
    p = ShopProduct(
        category_id=body.category_id,
        name=body.name,
        subtitle=body.subtitle,
        cover_url=body.cover_url,
        gallery_json=body.gallery_json,
        price_fen=body.price_fen,
        original_price_fen=body.original_price_fen,
        stock=body.stock,
        sales=body.sales,
        detail_html=body.detail_html,
        red_selling_tag=body.red_selling_tag,
        status=body.status,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"ok": True, "id": p.id}


@router.put("/shop/products/{pid}", dependencies=[AdminDep])
def admin_product_update(pid: int, body: ProductBody, db: Session = Depends(get_db)):
    p = db.query(ShopProduct).filter(ShopProduct.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="不存在")
    p.category_id = body.category_id
    p.name = body.name
    p.subtitle = body.subtitle
    p.cover_url = body.cover_url
    p.gallery_json = body.gallery_json
    p.price_fen = body.price_fen
    p.original_price_fen = body.original_price_fen
    p.stock = body.stock
    p.sales = body.sales
    p.detail_html = body.detail_html
    p.red_selling_tag = body.red_selling_tag
    p.status = body.status
    db.commit()
    return {"ok": True}


@router.delete("/shop/products/{pid}", dependencies=[AdminDep])
def admin_product_delete(pid: int, db: Session = Depends(get_db)):
    p = db.query(ShopProduct).filter(ShopProduct.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="不存在")
    db.query(ShopProductTrace).filter(ShopProductTrace.product_id == pid).delete()
    db.delete(p)
    db.commit()
    return {"ok": True}


class TraceBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    batch_no: str = Field("", alias="batchNo")
    garden_id: Optional[str] = Field(None, alias="gardenId")
    garden_name: Optional[str] = Field(None, alias="gardenName")
    cert_no: Optional[str] = Field(None, alias="certNo")
    trace_chain_json: Optional[str] = Field(None, alias="traceChainJson")
    verify_hint: Optional[str] = Field(None, alias="verifyHint")


@router.put("/shop/products/{pid}/trace", dependencies=[AdminDep])
def admin_trace_upsert(pid: int, body: TraceBody, db: Session = Depends(get_db)):
    if not db.query(ShopProduct).filter(ShopProduct.id == pid).first():
        raise HTTPException(status_code=404, detail="商品不存在")
    t = (
        db.query(ShopProductTrace)
        .filter(ShopProductTrace.product_id == pid, ShopProductTrace.batch_no == body.batch_no)
        .first()
    )
    if not t:
        t = ShopProductTrace(product_id=pid, batch_no=body.batch_no)
        db.add(t)
    t.garden_id = body.garden_id
    t.garden_name = body.garden_name
    t.cert_no = body.cert_no
    t.trace_chain_json = body.trace_chain_json
    t.verify_hint = body.verify_hint
    db.commit()
    return {"ok": True}
