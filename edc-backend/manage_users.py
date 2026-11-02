#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
后端命令行账号开通与权限管理工具 (CLI) —— 同时兼容 Supabase PostgreSQL 与本地 SQLite
用法示例：
  1. 查看当前所有已开通账号及权限：
     python3 manage_users.py list

  2. 在后端开通新研究者账号：
     python3 manage_users.py open --account dr_zhangsan --name 张三 --password 123456 --role "主治医师" --dept "神经内科" --export true

  3. 为已有账号开通/关闭 PI 权限或导出权限：
     python3 manage_users.py grant --account dr_wangqiang --pi true --export true

  4. 停用或恢复某个账号：
     python3 manage_users.py status --account crc_zhaolei --state disabled
"""

import argparse
import time
from main import db_execute, db_fetchone, init_db, hash_password, list_all_users_from_db


def str2bool(v: str) -> bool:
    return str(v).strip().lower() in ("1", "true", "yes", "y", "是")


def cmd_list():
    users = list_all_users_from_db()
    print(f"{'账号(Account)':<16} {'姓名':<8} {'角色':<18} {'PI解锁权':<8} {'导出权':<8} {'管理权':<8} {'状态':<8}")
    print("-" * 82)
    for u in users:
        print(
            f"{u['account']:<16} {u['name']:<8} {u['role']:<18} "
            f"{('是' if u['isPI'] else '否'):<8} "
            f"{('是' if u['canExport'] else '否'):<8} "
            f"{('是' if u['canManageUsers'] else '否'):<8} "
            f"{u['status']:<8}"
        )


def cmd_open(args):
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
    is_pi = 1 if str2bool(args.pi) else 0
    can_exp = 1 if (str2bool(args.export) or is_pi) else 0
    can_mgr = 1 if (str2bool(args.manage) or is_pi) else 0
    pwd_hash = hash_password(args.password)

    db_execute(
        """
        INSERT INTO users (account, password_hash, name, role, dept, is_pi, can_export, can_unlock, can_manage_users, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        ON CONFLICT(account) DO UPDATE SET
            password_hash=excluded.password_hash,
            name=excluded.name,
            role=excluded.role,
            dept=excluded.dept,
            is_pi=excluded.is_pi,
            can_export=excluded.can_export,
            can_unlock=excluded.can_unlock,
            can_manage_users=excluded.can_manage_users,
            status='active',
            updated_at=excluded.updated_at
        """,
        (args.account, pwd_hash, args.name, args.role, args.dept, is_pi, can_exp, is_pi, can_mgr, now_str),
    )
    print(f"✓ 已在后端数据库成功开通/更新账号: {args.name} ({args.account}) | PI权={bool(is_pi)} | 导出权={bool(can_exp)}")
    cmd_list()


def cmd_grant(args):
    row = db_fetchone("SELECT * FROM users WHERE account = ?", (args.account,))
    if not row:
        print(f"✗ 账号 {args.account} 不存在，请先使用 open 命令开通")
        return
    is_pi = (1 if str2bool(args.pi) else 0) if args.pi is not None else row["is_pi"]
    can_exp = (1 if str2bool(args.export) else 0) if args.export is not None else row["can_export"]
    can_mgr = (1 if str2bool(args.manage) else 0) if args.manage is not None else row["can_manage_users"]
    if is_pi:
        can_exp = 1
        can_mgr = 1
    db_execute(
        """
        UPDATE users SET is_pi=?, can_export=?, can_unlock=?, can_manage_users=?, updated_at=?
        WHERE account=?
        """,
        (is_pi, can_exp, is_pi, can_mgr, time.strftime("%Y-%m-%d %H:%M:%S"), args.account),
    )
    print(f"✓ 已更新账号 {args.account} 的后端权限！")
    cmd_list()


def cmd_status(args):
    db_execute(
        "UPDATE users SET status=?, updated_at=? WHERE account=?",
        (args.state, time.strftime("%Y-%m-%d %H:%M:%S"), args.account),
    )
    print(f"✓ 已将账号 {args.account} 状态设为: {args.state}")
    cmd_list()


if __name__ == "__main__":
    init_db()
    parser = argparse.ArgumentParser(description="eCRF 后端账号与权限开通管理工具")
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("list", help="列出所有账号与权限")

    p_open = sub.add_parser("open", help="开通新账号或重置密码与权限")
    p_open.add_argument("--account", required=True, help="登录账号/工号")
    p_open.add_argument("--name", required=True, help="研究者姓名")
    p_open.add_argument("--password", default="123456", help="初始密码 (默认 123456)")
    p_open.add_argument("--role", default="主治医师 (Sub-I)", help="角色职称")
    p_open.add_argument("--dept", default="卒中中心", help="所属科室")
    p_open.add_argument("--pi", default="false", help="是否开通PI签审与解锁权限 (true/false)")
    p_open.add_argument("--export", default="false", help="是否开通CSV/JSON导出权限 (true/false)")
    p_open.add_argument("--manage", default="false", help="是否开通账号管理权限 (true/false)")

    p_grant = sub.add_parser("grant", help="修改已有账号权限")
    p_grant.add_argument("--account", required=True, help="登录账号")
    p_grant.add_argument("--pi", default=None, help="true/false")
    p_grant.add_argument("--export", default=None, help="true/false")
    p_grant.add_argument("--manage", default=None, help="true/false")

    p_status = sub.add_parser("status", help="启用或停用账号")
    p_status.add_argument("--account", required=True, help="登录账号")
    p_status.add_argument("--state", choices=["active", "disabled"], required=True)

    parsed = parser.parse_args()
    if parsed.cmd == "open":
        cmd_open(parsed)
    elif parsed.cmd == "grant":
        cmd_grant(parsed)
    elif parsed.cmd == "status":
        cmd_status(parsed)
    else:
        cmd_list()
