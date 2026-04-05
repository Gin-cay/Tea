"""
为本地 sqlite 中的用户绑定溯源角色（无需启动 HTTP 服务）。

用法（在 backend 目录下）:
  python scripts/assign_trace_role.py <users.id> <trace_sys_role.id>

示例（茶园管理员，通常 role_id=2）:
  python scripts/assign_trace_role.py abc123... 2

查看用户与角色:
  python scripts/list_users_roles.py
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    user_id, role_id = sys.argv[1].strip(), int(sys.argv[2])
    db_path = Path(__file__).resolve().parent.parent / "tea_data.db"
    if not db_path.is_file():
        print("未找到 tea_data.db，请在 backend 目录先启动一次后端完成建表。")
        sys.exit(1)
    conn = sqlite3.connect(str(db_path))
    try:
        u = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not u:
            print(f"错误：users 表中没有 id={user_id!r}。请先用该微信账号在小程序里登录一次。")
            sys.exit(1)
        r = conn.execute("SELECT id FROM trace_sys_role WHERE id = ?", (role_id,)).fetchone()
        if not r:
            print(f"错误：trace_sys_role 中没有 id={role_id}。运行 python scripts/list_users_roles.py 查看。")
            sys.exit(1)
        conn.execute(
            "INSERT OR IGNORE INTO trace_user_role (user_id, role_id) VALUES (?, ?)",
            (user_id, role_id),
        )
        conn.commit()
        print("已绑定（若已存在则忽略）：user_id=", user_id, " role_id=", role_id)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
