# -*- coding: utf-8 -*-
"""
重症卒中临床科研电子数据采集系统 (eCRF / EDC) 后端服务
支持：
1. 双数据库引擎自动切换：
   - 若配置了环境变量 DATABASE_URL (如 Supabase PostgreSQL 连接串)，自动连接 Supabase 云端数据库；
   - 若未配置 DATABASE_URL，自动回退使用本地 SQLite (edc_data.db) 方便本地开发调试。
2. 账号密码登录鉴权 (POST /api/v1/auth/login) 与 Token 校验
3. 后端账号开通与精细化权限管理 (GET/POST/DELETE /api/v1/admin/users)
4. 受试者全周期 eCRF 数据存储与同步 (GET /api/v1/subjects, POST /api/v1/subjects/sync)
5. 健康检查与 Supabase 保活接口 (GET /api/v1/health)：每次调用均执行真实 SQL 查询，配合 GitHub Actions 定时任务防止 Supabase 7天休眠
"""

import os
import json
import time
import hmac
import hashlib
import base64
import sqlite3
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent

# 自动读取同目录下的 .env 配置文件（若存在）
ENV_FILE = BASE_DIR / ".env"
if ENV_FILE.exists():
    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v

DB_PATH = Path(os.environ.get("EDC_DB_PATH", str(BASE_DIR / "edc_data.db")))
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
SECRET_KEY = os.environ.get("EDC_SECRET_KEY", "stroke-sap-edc-secret-key-2026")
FRONTEND_DIR = BASE_DIR.parent / "edc-system"

# 兼容 postgres:// 前缀为 postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://") :]

IS_POSTGRES = bool(DATABASE_URL.startswith("postgresql://"))

if IS_POSTGRES:
    import psycopg2
    import psycopg2.extras

app = FastAPI(
    title="重症卒中临床科研电子数据采集系统 (eCRF) API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def hash_password(password: str) -> str:
    return hashlib.sha256((password + ":" + SECRET_KEY).encode("utf-8")).hexdigest()


def create_token(account: str, is_pi: bool, can_export: bool, can_manage: bool) -> str:
    payload = {
        "sub": account,
        "isPI": is_pi,
        "canExport": can_export,
        "canManageUsers": can_manage,
        "exp": int(time.time()) + 86400 * 7,
    }
    b64 = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("ascii")
    sig = hmac.new(SECRET_KEY.encode("utf-8"), b64.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{b64}.{sig}"


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        b64, sig = parts
        expected = hmac.new(SECRET_KEY.encode("utf-8"), b64.encode("ascii"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(b64.encode("ascii")).decode("utf-8"))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


# ==============================================================================
# 统一数据库访问层 (同时兼容 Supabase PostgreSQL 与本地 SQLite)
# ==============================================================================
def _adapt_sql(sql: str) -> str:
    if IS_POSTGRES:
        return sql.replace("?", "%s")
    return sql


def db_fetchall(sql: str, params: Tuple = ()) -> List[Dict[str, Any]]:
    q = _adapt_sql(sql)
    if IS_POSTGRES:
        conn = psycopg2.connect(DATABASE_URL)
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(q, params)
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(q, params).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()


def db_fetchone(sql: str, params: Tuple = ()) -> Optional[Dict[str, Any]]:
    rows = db_fetchall(sql, params)
    return rows[0] if rows else None


def db_execute(sql: str, params: Tuple = ()) -> None:
    q = _adapt_sql(sql)
    if IS_POSTGRES:
        conn = psycopg2.connect(DATABASE_URL)
        try:
            with conn.cursor() as cur:
                cur.execute(q, params)
            conn.commit()
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(str(DB_PATH))
        try:
            conn.execute(q, params)
            conn.commit()
        finally:
            conn.close()


def init_db():
    db_execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            account TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT '',
            dept TEXT DEFAULT '',
            is_pi INTEGER DEFAULT 0,
            can_export INTEGER DEFAULT 0,
            can_unlock INTEGER DEFAULT 0,
            can_manage_users INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            updated_at TEXT DEFAULT ''
        )
        """
    )
    db_execute(
        """
        CREATE TABLE IF NOT EXISTS subjects (
            id TEXT PRIMARY KEY,
            data_json TEXT NOT NULL,
            updated_at TEXT DEFAULT ''
        )
        """
    )
    if IS_POSTGRES:
        try:
            db_execute("ALTER TABLE users ENABLE ROW LEVEL SECURITY")
            db_execute("ALTER TABLE subjects ENABLE ROW LEVEL SECURITY")
        except Exception:
            pass

    row = db_fetchone("SELECT COUNT(*) AS cnt FROM users")
    cnt = int(row["cnt"]) if row else 0
    if cnt == 0:
        default_users = [
            ("dr_liguiwei", "lgw@1556", "李桂伟", "主任医师 (PI)", "急症部", 1, 1, 1, 1, "active"),
            ("dr_gaowentao", "448875571", "高文涛", "24专硕研究生", "急症部", 0, 1, 1, 1, "active"),
            ("dr_liruiying", "liruiying", "李蕊影", "25专硕研究生", "急症部", 0, 0, 0, 0, "active"),
            ("dr_yule", "yule", "余乐", "26专硕研究生", "急症部", 0, 0, 0, 0, "active"),
            ("dr_zhangkang", "zhangkang", "张康", "26专硕研究生", "急症部", 0, 0, 0, 0, "active"),
        ]
        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        for acc, pwd, name, role, dept, is_pi, exp, unl, mgr, st in default_users:
            db_execute(
                """
                INSERT INTO users (account, password_hash, name, role, dept, is_pi, can_export, can_unlock, can_manage_users, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (acc, pwd, name, role, dept, is_pi, exp, unl, mgr, st, now_str),
            )

    # 自动将早期内置演示受试者 (001~004) 的旧负责人账号迁移至当前团队真实账号
    legacy_owner_map = {
        "001": ("dr_liguiwei", "李桂伟"),
        "002": ("dr_gaowentao", "高文涛"),
        "003": ("dr_liruiying", "李蕊影"),
        "004": ("dr_yule", "余乐"),
    }
    try:
        subj_rows = db_fetchall("SELECT id, data_json FROM subjects")
        for srow in subj_rows:
            sid = srow.get("id")
            if sid in legacy_owner_map:
                obj = json.loads(srow["data_json"])
                if obj.get("ownerAccount") in ("dr_lihua", "dr_wangqiang", "dr_zhangmin"):
                    new_acc, new_name = legacy_owner_map[sid]
                    obj["ownerAccount"] = new_acc
                    obj["ownerName"] = new_name
                    if obj.get("investigator") in ("李华", "王强", "张敏"):
                        obj["investigator"] = new_name
                    db_execute(
                        "UPDATE subjects SET data_json = ? WHERE id = ?",
                        (json.dumps(obj, ensure_ascii=False), sid),
                    )
    except Exception:
        pass


try:
    init_db()
except Exception as _init_err:
    print(f"[WARN] init_db deferred: {_init_err}")


def row_to_user_dict(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "account": row["account"],
        "name": row["name"],
        "role": row["role"],
        "dept": row["dept"],
        "isPI": bool(row["is_pi"]),
        "canExport": bool(row["can_export"]),
        "canUnlock": bool(row["can_unlock"]),
        "canManageUsers": bool(row["can_manage_users"]),
        "status": row["status"],
    }


def list_all_users_from_db() -> List[Dict[str, Any]]:
    rows = db_fetchall("SELECT * FROM users ORDER BY is_pi DESC, account ASC")
    return [row_to_user_dict(r) for r in rows]


def get_current_user_dep(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未登录或登录凭证缺失")
    token = authorization.split(" ", 1)[1].strip()
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="登录凭证已过期或无效，请重新登录")
    row = db_fetchone("SELECT * FROM users WHERE account = ?", (payload["sub"],))
    if not row or row["status"] == "disabled":
        raise HTTPException(status_code=403, detail="该账号已被停用或不存在")
    return row_to_user_dict(row)


class LoginRequest(BaseModel):
    account: str
    password: str


class UserUpsertRequest(BaseModel):
    account: str
    name: str
    password: Optional[str] = None
    role: str = "主治医师 (Sub-I)"
    dept: str = "卒中中心"
    isPI: bool = False
    canExport: bool = False
    canUnlock: bool = False
    canManageUsers: bool = False
    status: str = "active"


class SubjectsSyncRequest(BaseModel):
    subjects: List[Dict[str, Any]]


@app.get("/api/v1/health")
def health_check():
    """
    健康检查与 Supabase 数据库激活保活接口：
    每次访问均向数据库发起真实 SELECT 查询，可由 GitHub Actions 定期调用以防止 Supabase 免费实例因 7 天无活动而暂停。
    """
    u_row = db_fetchone("SELECT COUNT(*) AS c FROM users")
    s_row = db_fetchone("SELECT COUNT(*) AS c FROM subjects")
    return {
        "status": "ok",
        "service": "stroke-sap-edc-backend",
        "databaseEngine": "supabase-postgresql" if IS_POSTGRES else "local-sqlite",
        "userCount": int(u_row["c"]) if u_row else 0,
        "subjectCount": int(s_row["c"]) if s_row else 0,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


@app.post("/api/v1/auth/login")
def login(req: LoginRequest):
    row = db_fetchone("SELECT * FROM users WHERE account = ?", (req.account.strip(),))
    if not row:
        raise HTTPException(status_code=401, detail=f"账号 '{req.account}' 未开通，请联系管理员在后端开通")
    if row["status"] == "disabled":
        raise HTTPException(status_code=403, detail=f"账号 '{req.account}' 已被后端停用")
    stored_pwd = (row["password_hash"] or "").strip()
    input_pwd = req.password.strip()
    if stored_pwd != input_pwd and stored_pwd != hash_password(input_pwd):
        raise HTTPException(status_code=401, detail="登录密码错误")
    user_dict = row_to_user_dict(row)
    token = create_token(
        user_dict["account"],
        user_dict["isPI"],
        user_dict["canExport"],
        user_dict["canManageUsers"],
    )
    return {"token": token, "user": user_dict}


@app.get("/api/v1/auth/me")
def get_me(cur_user: Dict[str, Any] = Depends(get_current_user_dep)):
    return {"user": cur_user}


@app.post("/api/v1/auth/logout")
def logout():
    return {"status": "ok"}


@app.get("/api/v1/admin/users")
def admin_list_users():
    return {"users": list_all_users_from_db()}


@app.post("/api/v1/admin/users")
def admin_upsert_user(
    req: UserUpsertRequest,
    cur_user: Dict[str, Any] = Depends(get_current_user_dep),
):
    if not (cur_user.get("canManageUsers") or cur_user.get("isPI")):
        raise HTTPException(status_code=403, detail="仅限管理员或 PI 权限可在后端开通/修改账号权限")

    acc = req.account.strip()
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
    existing = db_fetchone("SELECT * FROM users WHERE account = ?", (acc,))
    is_pi = 1 if req.isPI else 0
    can_exp = 1 if (req.canExport or req.isPI) else 0
    can_unl = 1 if (req.canUnlock or req.isPI) else 0
    can_mgr = 1 if (req.canManageUsers or req.isPI) else 0

    if existing:
        pwd_val = req.password.strip() if req.password else existing["password_hash"]
        db_execute(
            """
            UPDATE users
            SET password_hash=?, name=?, role=?, dept=?, is_pi=?, can_export=?, can_unlock=?, can_manage_users=?, status=?, updated_at=?
            WHERE account=?
            """,
            (pwd_val, req.name, req.role, req.dept, is_pi, can_exp, can_unl, can_mgr, req.status, now_str, acc),
        )
    else:
        pwd_val = (req.password or "123456").strip()
        db_execute(
            """
            INSERT INTO users (account, password_hash, name, role, dept, is_pi, can_export, can_unlock, can_manage_users, status, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (acc, pwd_val, req.name, req.role, req.dept, is_pi, can_exp, can_unl, can_mgr, req.status, now_str),
        )
    return {"status": "ok", "users": list_all_users_from_db()}


@app.delete("/api/v1/admin/users/{account}")
def admin_delete_user(
    account: str,
    cur_user: Dict[str, Any] = Depends(get_current_user_dep),
):
    if not (cur_user.get("canManageUsers") or cur_user.get("isPI")):
        raise HTTPException(status_code=403, detail="仅限管理员或 PI 权限可删除账号")
    if account == "dr_liguiwei" or account == cur_user["account"]:
        raise HTTPException(status_code=400, detail="不可删除主 PI 账号或当前登录账号")
    db_execute("DELETE FROM users WHERE account = ?", (account,))
    return {"status": "ok", "users": list_all_users_from_db()}


@app.get("/api/v1/subjects")
def list_subjects():
    rows = db_fetchall("SELECT data_json FROM subjects ORDER BY id ASC")
    return [json.loads(r["data_json"]) for r in rows]


@app.post("/api/v1/subjects/sync")
def sync_subjects(req: SubjectsSyncRequest):
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
    for subj in req.subjects:
        sid = str(subj.get("id", "")).strip()
        if not sid:
            continue
        db_execute(
            """
            INSERT INTO subjects (id, data_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json, updated_at=excluded.updated_at
            """,
            (sid, json.dumps(subj, ensure_ascii=False), now_str),
        )
    return {"status": "ok", "count": len(req.subjects)}


# 自动将同级 edc-system 前端文件夹挂载到根路径 /，实现 Render 单服务同时托管前端+后端
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
