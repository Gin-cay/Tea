"""trace_workflow_core 纯逻辑单测（无数据库）。"""

import pytest

from app.trace_workflow_core import (
    can_operate_stage,
    merge_role_permissions,
    prev_stages_all_approved,
    parse_permissions_json,
)


def test_merge_star_wins():
    assert merge_role_permissions([["picking"], ["*"]]) == {"*"}


def test_can_operate_stage():
    assert can_operate_stage({"picking", "qc"}, "picking") is True
    assert can_operate_stage({"picking"}, "sales") is False
    assert can_operate_stage({"*"}, "sales") is True


def test_prev_stages_all_approved():
    approved = {"picking"}
    assert prev_stages_all_approved(approved, "picking") is True
    assert prev_stages_all_approved(approved, "processing") is True
    assert prev_stages_all_approved(approved, "qc") is False
    assert prev_stages_all_approved({"picking", "processing"}, "qc") is True


def test_parse_permissions_json_invalid():
    assert parse_permissions_json("") == []
    assert parse_permissions_json("not json") == []
