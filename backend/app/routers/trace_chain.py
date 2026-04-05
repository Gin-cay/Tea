"""茶叶全流程溯源（扫码公开查询）：已完成批次走数据库，否则回退 JSON 模板。"""

from __future__ import annotations

import json
import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.trace_chain_builder import try_db_trace_payload

router = APIRouter(tags=["trace-chain"])

_TEMPLATE_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "fixtures", "trace_chain_demo.template.json")
)


def _build_payload(trace_no: str) -> Any:
    if not os.path.isfile(_TEMPLATE_PATH):
        raise HTTPException(status_code=500, detail="trace chain template missing")
    safe = trace_no.strip().replace("<", "").replace(">", "")[:64]
    if not safe:
        raise HTTPException(status_code=400, detail="invalid traceNo")
    with open(_TEMPLATE_PATH, encoding="utf-8") as f:
        raw = f.read().replace("__TRACE_NO__", safe)
    return json.loads(raw)


@router.get("/api/trace/chain/{trace_no}")
def get_trace_chain(trace_no: str, db: Session = Depends(get_db)) -> Any:
    """无需登录；若 trace_no 对应批次已完成则返回已审核环节数据，否则使用演示模板。"""
    payload = try_db_trace_payload(db, trace_no)
    if payload:
        return payload
    return _build_payload(trace_no)
