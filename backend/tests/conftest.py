"""
pytest 全局前置：
- ADMIN_TOKEN：空则设为固定值供集成测试使用
- DATABASE_URL：强制使用临时 sqlite 文件，与本地 tea_data.db 旧结构隔离，create_all 与模型一致
"""

import os
import tempfile

if not (os.environ.get("ADMIN_TOKEN") or "").strip():
    os.environ["ADMIN_TOKEN"] = "pytest-admin-token"

_tmp_db = os.path.join(tempfile.gettempdir(), "tea_workflow_pytest.db")
try:
    if os.path.isfile(_tmp_db):
        os.remove(_tmp_db)
except OSError:
    pass
os.environ["DATABASE_URL"] = "sqlite:///" + _tmp_db.replace("\\", "/")
