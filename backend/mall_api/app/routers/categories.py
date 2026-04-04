from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MallCategory

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("")
def list_categories(db: Session = Depends(get_db)):
    rows = (
        db.query(MallCategory)
        .filter(MallCategory.status == 1)
        .order_by(MallCategory.sort_order, MallCategory.id)
        .all()
    )
    return [
        {
            "id": r.id,
            "parentId": r.parent_id,
            "name": r.name,
            "sortOrder": r.sort_order,
        }
        for r in rows
    ]
