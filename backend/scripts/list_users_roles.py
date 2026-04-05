"""列出 users 与 trace_sys_role，便于分配溯源角色。"""
import sqlite3
import sys
from pathlib import Path

db = Path(__file__).resolve().parent.parent / "tea_data.db"
if not db.is_file():
    print("未找到 tea_data.db，请先启动一次后端完成建表与 seed。")
    sys.exit(0)

c = sqlite3.connect(str(db))
print("=== users (id = 分配角色时的 userId) ===")
rows = list(c.execute("SELECT id, openid, nickname FROM users LIMIT 30"))
if not rows:
    print("(暂无用户：请用微信在小程序里登录一次后再运行本脚本)")
else:
    for row in rows:
        print(row)
print("\n=== trace_sys_role (id = 分配时的 roleId) ===")
try:
    for row in c.execute("SELECT id, role_name, permissions FROM trace_sys_role ORDER BY id"):
        print(row)
except sqlite3.OperationalError as e:
    print("(表不存在)", e)
c.close()
