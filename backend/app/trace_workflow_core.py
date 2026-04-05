"""
溯源环节顺序、权限合并、前置环节校验（纯逻辑，便于单测）。
"""

from __future__ import annotations

import json
from typing import Any, List, Set

# 信阳毛尖全链路环节顺序（与需求表一一对应）
STAGES_ORDER: List[str] = [
    "picking",  # 茶园采摘
    "processing",  # 初制加工
    "qc",  # 品质质检
    "warehouse",  # 仓储入库
    "logistics",  # 物流发货
    "sales",  # 终端销售
]

STAGE_LABELS = {
    "picking": "茶园采摘",
    "processing": "初制加工",
    "qc": "品质质检",
    "warehouse": "仓储入库",
    "logistics": "物流发货",
    "sales": "终端销售",
}


def stage_index(process_type: str) -> int:
    try:
        return STAGES_ORDER.index(process_type)
    except ValueError:
        return -1


def parse_permissions_json(raw: str) -> List[str]:
    try:
        v = json.loads(raw or "[]")
        return v if isinstance(v, list) else []
    except Exception:
        return []


def merge_role_permissions(permission_lists: List[List[str]]) -> Set[str]:
    out: Set[str] = set()
    for pl in permission_lists:
        for p in pl:
            if p == "*":
                return {"*"}
            out.add(p)
    return out


def can_operate_stage(merged: Set[str], process_type: str) -> bool:
    if "*" in merged:
        return True
    return process_type in merged


def prev_stages_all_approved(approved_types: Set[str], process_type: str) -> bool:
    """已审核通过(set) 是否覆盖当前环节之前的所有环节。"""
    idx = stage_index(process_type)
    if idx < 0:
        return False
    for i in range(idx):
        need = STAGES_ORDER[i]
        if need not in approved_types:
            return False
    return True


def is_valid_process_type(process_type: str) -> bool:
    return process_type in STAGES_ORDER


def content_to_dict(content: Any) -> dict:
    if isinstance(content, dict):
        return content
    if isinstance(content, str):
        try:
            return json.loads(content or "{}")
        except Exception:
            return {}
    return {}
