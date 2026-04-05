"""
溯源全流程：角色/批次/环节上报/审核/留痕。
- 管理操作：请求头 X-Admin-Token（与 ADMIN_TOKEN 一致）
- 小程序一线：Authorization Bearer JWT + trace_user_role 环节权限
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Annotated, Any, Optional, Set, Tuple

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import CurrentUser, DbSession, get_optional_user
from app.models import TraceBatch, TraceData, TraceDataLog, TraceSysRole, TraceUserRole, User
from app.routers.admin_api import require_admin
from app.trace_workflow_core import (
    STAGES_ORDER,
    STAGE_LABELS,
    can_operate_stage,
    content_to_dict,
    is_valid_process_type,
    merge_role_permissions,
    parse_permissions_json,
    prev_stages_all_approved,
)

router = APIRouter(tags=["trace-workflow"])

AdminDep = Depends(require_admin)


def _admin_token_ok(x_admin_token: Optional[str]) -> bool:
    tok = (x_admin_token or "").strip()
    expected = (get_settings().admin_token or "").strip()
    return bool(expected and tok == expected)


def _user_permissions_set(db: Session, user_id: str) -> Set[str]:
    rows = (
        db.query(TraceSysRole)
        .join(TraceUserRole, TraceUserRole.role_id == TraceSysRole.id)
        .filter(TraceUserRole.user_id == user_id)
        .all()
    )
    lists = [parse_permissions_json(r.permissions) for r in rows]
    return merge_role_permissions(lists)


def _is_super(perms: Set[str]) -> bool:
    return "*" in perms


def _approved_stages(db: Session, batch_id: str) -> Set[str]:
    rows = (
        db.query(TraceData)
        .filter(
            TraceData.batch_id == batch_id,
            TraceData.audit_status == 1,
        )
        .all()
    )
    return {r.process_type for r in rows}


def _refresh_batch_status(db: Session, batch_id: str) -> None:
    b = db.query(TraceBatch).filter(TraceBatch.batch_no == batch_id).first()
    if not b:
        return
    approved = _approved_stages(db, batch_id)
    if len(approved) >= len(STAGES_ORDER):
        b.status = 2
    elif db.query(TraceData).filter(TraceData.batch_id == batch_id).first():
        b.status = 1
    else:
        b.status = 0
    db.add(b)
    db.commit()


def _require_trace_actor(
    db: DbSession,
    x_admin_token: Annotated[Optional[str], Header()] = None,
    user: Annotated[Optional[User], Depends(get_optional_user)] = None,
) -> Tuple[str, Optional[User]]:
    """返回 ('admin', None) 或 ('user', User)；否则 401。"""
    if _admin_token_ok(x_admin_token):
        return "admin", None
    if user:
        return "user", user
    raise HTTPException(status_code=401, detail="请先登录或提供管理令牌")


def _require_any_trace_permission(db: Session, user: User) -> Set[str]:
    perms = _user_permissions_set(db, user.id)
    if not perms:
        raise HTTPException(status_code=403, detail="无溯源权限")
    return perms


def _batch_row_out(b: TraceBatch) -> dict:
    return {
        "id": b.id,
        "batchNo": b.batch_no,
        "productName": b.product_name,
        "createUser": b.create_user,
        "createTime": b.create_time.isoformat() + "Z" if b.create_time else "",
        "status": b.status,
    }


def _data_row_out(r: TraceData) -> dict:
    return {
        "id": r.id,
        "batchId": r.batch_id,
        "processType": r.process_type,
        "processLabel": STAGE_LABELS.get(r.process_type, r.process_type),
        "content": content_to_dict(r.content),
        "submitUserId": r.submit_user_id,
        "submitTime": r.submit_time.isoformat() + "Z" if r.submit_time else "",
        "auditStatus": r.audit_status,
        "auditUser": r.audit_user,
        "auditTime": r.audit_time.isoformat() + "Z" if r.audit_time else "",
    }


# ---------- 角色 / 权限 ----------


@router.get("/api/auth/role/list")
def role_list(db: DbSession) -> Any:
    rows = db.query(TraceSysRole).order_by(TraceSysRole.id).all()
    return {
        "list": [
            {
                "id": r.id,
                "roleName": r.role_name,
                "permissions": parse_permissions_json(r.permissions),
            }
            for r in rows
        ]
    }


class AssignBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    user_id: str = Field(..., alias="userId", min_length=1)
    role_id: int = Field(..., alias="roleId", ge=1)


@router.post("/api/auth/user/assign", dependencies=[AdminDep])
def user_assign_role(body: AssignBody, db: DbSession) -> Any:
    uid = body.user_id.strip()
    u = db.query(User).filter(User.id == uid).first()
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    role = db.query(TraceSysRole).filter(TraceSysRole.id == body.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    ex = (
        db.query(TraceUserRole)
        .filter(
            TraceUserRole.user_id == uid,
            TraceUserRole.role_id == body.role_id,
        )
        .first()
    )
    if ex:
        return {"ok": True, "message": "已存在绑定"}
    db.add(TraceUserRole(user_id=uid, role_id=body.role_id))
    db.commit()
    return {"ok": True}


@router.get("/api/auth/user/permission")
def user_permission(user: CurrentUser, db: DbSession) -> Any:
    perms = _user_permissions_set(db, user.id)
    roles = (
        db.query(TraceSysRole)
        .join(TraceUserRole, TraceUserRole.role_id == TraceSysRole.id)
        .filter(TraceUserRole.user_id == user.id)
        .all()
    )
    return {
        "userId": user.id,
        "permissions": sorted(perms),
        "isSuper": _is_super(perms),
        "roles": [{"id": r.id, "roleName": r.role_name} for r in roles],
        "stages": [
            {"key": k, "label": STAGE_LABELS[k]}
            for k in STAGES_ORDER
            if can_operate_stage(perms, k)
        ],
    }


# ---------- 批次 ----------


class BatchCreateBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    product_name: str = Field("信阳毛尖", alias="productName", max_length=200)


@router.post("/api/trace/batch/create", dependencies=[AdminDep])
def batch_create(body: BatchCreateBody, db: DbSession) -> Any:
    day = datetime.utcnow().strftime("%Y%m%d")
    batch_no = f"TB{day}{uuid.uuid4().hex[:6].upper()}"
    row = TraceBatch(
        batch_no=batch_no,
        product_name=(body.product_name or "").strip() or "信阳毛尖",
        create_user="admin",
        status=0,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "batchNo": batch_no, "id": row.id, "status": row.status}


@router.get("/api/trace/batch/list")
def batch_list(
    db: DbSession,
    x_admin_token: Annotated[Optional[str], Header()] = None,
    user: Annotated[Optional[User], Depends(get_optional_user)] = None,
) -> Any:
    if _admin_token_ok(x_admin_token):
        rows = db.query(TraceBatch).order_by(TraceBatch.create_time.desc()).all()
        return {"list": [_batch_row_out(r) for r in rows]}
    if not user:
        raise HTTPException(status_code=401, detail="请先登录或提供管理令牌")
    _require_any_trace_permission(db, user)
    rows = (
        db.query(TraceBatch)
        .filter(TraceBatch.status != 3)
        .order_by(TraceBatch.create_time.desc())
        .all()
    )
    return {"list": [_batch_row_out(r) for r in rows]}


@router.get("/api/trace/batch/detail/{batch_id}")
def batch_detail(
    batch_id: str,
    db: DbSession,
    x_admin_token: Annotated[Optional[str], Header()] = None,
    user: Annotated[Optional[User], Depends(get_optional_user)] = None,
) -> Any:
    bid = batch_id.strip()
    b = db.query(TraceBatch).filter(TraceBatch.batch_no == bid).first()
    if not b:
        raise HTTPException(status_code=404, detail="批次不存在")
    if _admin_token_ok(x_admin_token):
        pass
    elif user:
        _require_any_trace_permission(db, user)
        if b.status == 3:
            raise HTTPException(status_code=403, detail="批次已下架")
    else:
        raise HTTPException(status_code=401, detail="请先登录或提供管理令牌")

    data_rows = db.query(TraceData).filter(TraceData.batch_id == bid).all()
    by_type = {r.process_type: r for r in data_rows}
    progress = []
    for st in STAGES_ORDER:
        r = by_type.get(st)
        progress.append(
            {
                "processType": st,
                "label": STAGE_LABELS[st],
                "filled": r is not None,
                "auditStatus": r.audit_status if r else -1,
            }
        )
    out = _batch_row_out(b)
    out["progress"] = progress
    return out


# ---------- 环节数据 ----------


class SubmitBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    batch_id: str = Field(..., alias="batchId", min_length=1)
    process_type: str = Field(..., alias="processType", min_length=1)
    content: dict = Field(default_factory=dict)


@router.post("/api/trace/data/submit")
def data_submit(body: SubmitBody, db: DbSession, user: CurrentUser) -> Any:
    bid = body.batch_id.strip()
    pt = body.process_type.strip()
    if not is_valid_process_type(pt):
        raise HTTPException(status_code=400, detail="无效环节类型")
    batch = db.query(TraceBatch).filter(TraceBatch.batch_no == bid).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    if batch.status == 3:
        raise HTTPException(status_code=403, detail="批次已下架")

    perms = _user_permissions_set(db, user.id)
    if not can_operate_stage(perms, pt):
        raise HTTPException(status_code=403, detail="无权上报该环节")

    approved = _approved_stages(db, bid)
    if not prev_stages_all_approved(approved, pt):
        raise HTTPException(status_code=400, detail="前置环节未全部审核通过，无法填报本环节")

    row = (
        db.query(TraceData)
        .filter(
            TraceData.batch_id == bid,
            TraceData.process_type == pt,
        )
        .first()
    )
    payload = json.dumps(body.content or {}, ensure_ascii=False)

    if row:
        if row.audit_status == 1:
            raise HTTPException(status_code=400, detail="该环节已通过审核，请使用修改接口并填写原因")
        row.content = payload
        row.submit_user_id = user.id
        row.submit_time = datetime.utcnow()
        if row.audit_status == 2:
            row.audit_status = 0
        db.add(row)
    else:
        row = TraceData(
            batch_id=bid,
            process_type=pt,
            content=payload,
            submit_user_id=user.id,
            submit_time=datetime.utcnow(),
            audit_status=0,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    _refresh_batch_status(db, bid)
    return {"ok": True, "id": row.id, "auditStatus": row.audit_status}


@router.get("/api/trace/data/list/{batch_id}")
def data_list(
    batch_id: str,
    db: DbSession,
    x_admin_token: Annotated[Optional[str], Header()] = None,
    user: Annotated[Optional[User], Depends(get_optional_user)] = None,
) -> Any:
    bid = batch_id.strip()
    b = db.query(TraceBatch).filter(TraceBatch.batch_no == bid).first()
    if not b:
        raise HTTPException(status_code=404, detail="批次不存在")
    if _admin_token_ok(x_admin_token):
        pass
    elif user:
        _require_any_trace_permission(db, user)
        if b.status == 3:
            raise HTTPException(status_code=403, detail="批次已下架")
    else:
        raise HTTPException(status_code=401, detail="请先登录或提供管理令牌")

    rows = db.query(TraceData).filter(TraceData.batch_id == bid).order_by(TraceData.id).all()
    return {"list": [_data_row_out(r) for r in rows]}


class AuditBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    data_id: int = Field(..., alias="dataId", ge=1)
    audit_pass: bool = Field(..., alias="pass")
    comment: str = Field("", alias="comment", max_length=500)


@router.post("/api/trace/data/audit", dependencies=[AdminDep])
def data_audit(body: AuditBody, db: DbSession) -> Any:
    row = db.query(TraceData).filter(TraceData.id == body.data_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="数据不存在")
    row.audit_status = 1 if body.audit_pass else 2
    row.audit_user = "admin"
    row.audit_time = datetime.utcnow()
    db.add(row)
    db.commit()
    _refresh_batch_status(db, row.batch_id)
    return {"ok": True, "auditStatus": row.audit_status}


class UpdateBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    data_id: int = Field(..., alias="dataId", ge=1)
    content: dict = Field(default_factory=dict)
    reason: str = Field(..., min_length=1, max_length=500)


def _can_update_data(
    db: Session,
    *,
    actor: str,
    user: Optional[User],
    row: TraceData,
) -> bool:
    if actor == "admin":
        return True
    assert user is not None
    perms = _user_permissions_set(db, user.id)
    if _is_super(perms):
        return True
    if row.audit_status == 1:
        return False
    return can_operate_stage(perms, row.process_type)


@router.post("/api/trace/data/update")
def data_update(
    body: UpdateBody,
    db: DbSession,
    x_admin_token: Annotated[Optional[str], Header()] = None,
    user: Annotated[Optional[User], Depends(get_optional_user)] = None,
) -> Any:
    actor, u = _require_trace_actor(db, x_admin_token=x_admin_token, user=user)
    row = db.query(TraceData).filter(TraceData.id == body.data_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="数据不存在")

    if not _can_update_data(db, actor=actor, user=u, row=row):
        raise HTTPException(status_code=403, detail="无权修改该数据或已通过审核需管理员修改")

    before = row.content
    after = json.dumps(body.content or {}, ensure_ascii=False)
    uid = "admin" if actor == "admin" else (u.id if u else "")
    log = TraceDataLog(
        data_id=row.id,
        before_content=before,
        after_content=after,
        update_user=uid,
        update_time=datetime.utcnow(),
        reason=body.reason.strip(),
    )
    row.content = after
    if actor == "admin":
        pass
    else:
        assert u is not None
        p = _user_permissions_set(db, u.id)
        if not _is_super(p):
            row.audit_status = 0
    db.add(log)
    db.add(row)
    db.commit()
    _refresh_batch_status(db, row.batch_id)
    return {"ok": True, "id": row.id}


@router.get("/api/trace/data/log/{data_id}")
def data_log(
    data_id: int,
    db: DbSession,
    x_admin_token: Annotated[Optional[str], Header()] = None,
    user: Annotated[Optional[User], Depends(get_optional_user)] = None,
) -> Any:
    row = db.query(TraceData).filter(TraceData.id == data_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="数据不存在")
    if _admin_token_ok(x_admin_token):
        pass
    elif user:
        perms = _user_permissions_set(db, user.id)
        if not _is_super(perms) and user.id != row.submit_user_id:
            raise HTTPException(status_code=403, detail="无权查看该日志")
    else:
        raise HTTPException(status_code=401, detail="请先登录或提供管理令牌")

    logs = (
        db.query(TraceDataLog)
        .filter(TraceDataLog.data_id == data_id)
        .order_by(TraceDataLog.update_time.desc())
        .all()
    )
    return {
        "list": [
            {
                "id": lg.id,
                "before": content_to_dict(lg.before_content),
                "after": content_to_dict(lg.after_content),
                "updateUser": lg.update_user,
                "updateTime": lg.update_time.isoformat() + "Z" if lg.update_time else "",
                "reason": lg.reason,
            }
            for lg in logs
        ]
    }


@router.get("/api/trace/data/my")
def data_my_list(user: CurrentUser, db: DbSession) -> Any:
    """当前用户提交的环节数据（小程序「我的上报」）。"""
    perms = _user_permissions_set(db, user.id)
    if not perms:
        raise HTTPException(status_code=403, detail="无溯源权限")
    rows = (
        db.query(TraceData)
        .filter(TraceData.submit_user_id == user.id)
        .order_by(TraceData.submit_time.desc())
        .all()
    )
    return {"list": [_data_row_out(r) for r in rows]}
