"""
溯源 API 集成测试：权限隔离、顺序填报、留痕。
依赖 conftest：ADMIN_TOKEN 与独立临时 sqlite（见 tests/conftest.py），避免与本地 tea_data.db 结构不一致。
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import TraceData, TraceUserRole, User
from app.security import create_access_token


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _admin_headers():
    from app.config import get_settings

    return {"X-Admin-Token": get_settings().admin_token}


def _ensure_user(db_factory, openid: str = "trace_test_openid") -> User:
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        u = db.query(User).filter(User.openid == openid).first()
        if not u:
            u = User(openid=openid, nickname="溯源测试", avatar_url="")
            db.add(u)
            db.commit()
            db.refresh(u)
        return u
    finally:
        db.close()


def _garden_role_id() -> int:
    from app.database import SessionLocal
    from app.models import TraceSysRole

    db = SessionLocal()
    try:
        r = db.query(TraceSysRole).filter(TraceSysRole.role_name == "茶园管理员").first()
        assert r is not None
        return r.id
    finally:
        db.close()


def _bind_garden_role(user_id: str) -> None:
    from app.database import SessionLocal

    rid = _garden_role_id()
    db = SessionLocal()
    try:
        ex = (
            db.query(TraceUserRole)
            .filter(TraceUserRole.user_id == user_id, TraceUserRole.role_id == rid)
            .first()
        )
        if not ex:
            db.add(TraceUserRole(user_id=user_id, role_id=rid))
            db.commit()
    finally:
        db.close()


def test_role_list_public(client: TestClient):
    r = client.get("/api/auth/role/list")
    assert r.status_code == 200
    data = r.json()
    assert "list" in data
    names = {x["roleName"] for x in data["list"]}
    assert "茶园管理员" in names


def test_batch_create_and_submit_permission(client: TestClient):
    u = _ensure_user(None)
    token = create_access_token(openid=u.openid, user_id=u.id)
    auth_h = {"Authorization": f"Bearer {token}"}

    cr = client.post(
        "/api/trace/batch/create",
        headers=_admin_headers(),
        json={"productName": "信阳毛尖"},
    )
    assert cr.status_code == 200, cr.text
    batch_no = cr.json()["batchNo"]

    # 未绑定角色则提交应 403
    sr = client.post(
        "/api/trace/data/submit",
        headers=auth_h,
        json={
            "batchId": batch_no,
            "processType": "picking",
            "content": {"summary": "测试采摘", "time": "2026-04-05"},
        },
    )
    assert sr.status_code == 403

    _bind_garden_role(u.id)
    sr2 = client.post(
        "/api/trace/data/submit",
        headers=auth_h,
        json={
            "batchId": batch_no,
            "processType": "picking",
            "content": {"summary": "测试采摘", "time": "2026-04-05"},
        },
    )
    assert sr2.status_code == 200, sr2.text
    data_id = sr2.json()["id"]

    # 茶园角色尝试加工环节：权限校验先于顺序校验，返回 403
    sr3 = client.post(
        "/api/trace/data/submit",
        headers=auth_h,
        json={"batchId": batch_no, "processType": "processing", "content": {}},
    )
    assert sr3.status_code == 403

    au = client.post(
        "/api/trace/data/audit",
        headers=_admin_headers(),
        json={"dataId": data_id, "pass": True},
    )
    assert au.status_code == 200, au.text

    # 茶园角色仍不可报加工
    sr4 = client.post(
        "/api/trace/data/submit",
        headers=auth_h,
        json={"batchId": batch_no, "processType": "processing", "content": {}},
    )
    assert sr4.status_code == 403


def test_submit_respects_stage_order(client: TestClient):
    """加工厂角色在采摘未审核通过前提交加工，应 400。"""
    from app.database import SessionLocal

    openid = "trace_factory_only"
    u = _ensure_user(None, openid)
    db = SessionLocal()
    try:
        from app.models import TraceSysRole

        rid = (
            db.query(TraceSysRole)
            .filter(TraceSysRole.role_name == "加工厂管理员")
            .first()
        )
        assert rid is not None
        ex = (
            db.query(TraceUserRole)
            .filter(TraceUserRole.user_id == u.id, TraceUserRole.role_id == rid.id)
            .first()
        )
        if not ex:
            db.add(TraceUserRole(user_id=u.id, role_id=rid.id))
            db.commit()
    finally:
        db.close()

    token = create_access_token(openid=u.openid, user_id=u.id)
    auth_h = {"Authorization": f"Bearer {token}"}
    cr = client.post(
        "/api/trace/batch/create",
        headers=_admin_headers(),
        json={"productName": "顺序测试"},
    )
    batch_no = cr.json()["batchNo"]
    r = client.post(
        "/api/trace/data/submit",
        headers=auth_h,
        json={
            "batchId": batch_no,
            "processType": "processing",
            "content": {"summary": "应失败"},
        },
    )
    assert r.status_code == 400


def test_update_leaves_audit_trace(client: TestClient):
    from app.database import SessionLocal

    u = _ensure_user(None)
    _bind_garden_role(u.id)
    token = create_access_token(openid=u.openid, user_id=u.id)
    auth_h = {"Authorization": f"Bearer {token}"}

    cr = client.post(
        "/api/trace/batch/create",
        headers=_admin_headers(),
        json={"productName": "留痕测试"},
    )
    batch_no = cr.json()["batchNo"]
    client.post(
        "/api/trace/data/submit",
        headers=auth_h,
        json={"batchId": batch_no, "processType": "picking", "content": {"a": 1}},
    )
    db = SessionLocal()
    try:
        row = (
            db.query(TraceData)
            .filter(TraceData.batch_id == batch_no, TraceData.process_type == "picking")
            .first()
        )
        assert row is not None
        data_id = row.id
    finally:
        db.close()

    up = client.post(
        "/api/trace/data/update",
        headers=auth_h,
        json={"dataId": data_id, "content": {"a": 2, "reasonField": "x"}, "reason": "修正笔误"},
    )
    assert up.status_code == 200, up.text

    lg = client.get(f"/api/trace/data/log/{data_id}", headers=auth_h)
    assert lg.status_code == 200
    logs = lg.json()["list"]
    assert len(logs) >= 1
    assert logs[0]["reason"] == "修正笔误"
    after = logs[0]["after"]
    assert isinstance(after, dict)
    assert after.get("a") == 2
