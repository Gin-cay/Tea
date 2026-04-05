"""
消费者溯源页：当批次已完成（status=2）时，用库内已审核环节数据组装与小程序一致的 JSON。
否则返回 None，由 trace_chain 路由回退到模板演示数据。
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models import TraceBatch, TraceData
from app.trace_workflow_core import STAGES_ORDER, STAGE_LABELS, content_to_dict


DEFAULT_FOOTER = {
    "enterprise": "信阳茶业合作社 · 溯源数据经审核发布",
    "tip": "本链路由企业多端上报，关键环节留痕可追溯。",
}


def _node_from_trace_row(row: TraceData) -> Dict[str, Any]:
    raw = content_to_dict(row.content)
    key = row.process_type
    title = raw.get("title") or STAGE_LABELS.get(key, key)
    return {
        "key": key,
        "title": title,
        "time": raw.get("time", ""),
        "summary": raw.get("summary", ""),
        "fields": raw.get("fields") if isinstance(raw.get("fields"), list) else [],
        "images": raw.get("images") if isinstance(raw.get("images"), list) else [],
        "videos": raw.get("videos") if isinstance(raw.get("videos"), list) else [],
        "subSteps": raw.get("subSteps") if isinstance(raw.get("subSteps"), list) else [],
    }


def _product_block(batch: TraceBatch, sales_content: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "traceNo": batch.batch_no,
        "name": sales_content.get("productName") or batch.product_name,
        "grade": sales_content.get("grade", ""),
        "spec": sales_content.get("spec", ""),
        "productionDate": sales_content.get("productionDate", ""),
        "coverImage": sales_content.get("coverImage", "/images/banner-home.png"),
        "brief": sales_content.get("brief", ""),
    }


def try_db_trace_payload(db: Session, trace_no: str) -> Optional[Dict[str, Any]]:
    safe = (trace_no or "").strip().replace("<", "").replace(">", "")[:64]
    if not safe:
        return None
    batch = db.query(TraceBatch).filter(TraceBatch.batch_no == safe).first()
    if not batch or batch.status != 2:
        return None

    rows = (
        db.query(TraceData)
        .filter(
            TraceData.batch_id == batch.batch_no,
            TraceData.audit_status == 1,
        )
        .all()
    )
    by_type = {r.process_type: r for r in rows}
    nodes: List[Dict[str, Any]] = []
    for st in STAGES_ORDER:
        r = by_type.get(st)
        if not r:
            return None
        nodes.append(_node_from_trace_row(r))

    sales_raw = content_to_dict(by_type["sales"].content)
    product = _product_block(batch, sales_raw)

    return {
        "traceNo": batch.batch_no,
        "product": product,
        "nodes": nodes,
        "footer": DEFAULT_FOOTER,
    }
