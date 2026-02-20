#!/usr/bin/env python3
"""
Agent Monitor — Dashboard server for OpenClaw agent runs.

Reads from:
  - OPENCLAW_DIR/subagents/runs.json (run metadata)
  - OPENCLAW_DIR/agents/*/sessions/ (transcripts for completion messages)

Persists to:
  - SQLite run history DB (default: OPENCLAW_DIR/subagents/run_history.db)

Serves:
  - GET /              → dashboard HTML
  - GET /api/agents    → all agent IDs configured
  - GET /api/runs      → paginated run history + live status
  - GET /api/runs/:id  → single run detail with transcript excerpts

Environment:
  OPENCLAW_DIR                  path to .openclaw directory (default: ~/.openclaw)
  PORT                          server port (default: 8787)
  RUN_HISTORY_DB                sqlite file path (default: OPENCLAW_DIR/subagents/run_history.db)
  RUN_HISTORY_RETENTION_DAYS    history retention in days (default: 90, 0/unlimited disables pruning)
"""

import json
import os
import re
import sqlite3
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

OPENCLAW_DIR = Path(os.environ.get("OPENCLAW_DIR", os.path.expanduser("~/.openclaw")))
STATIC_DIR = Path(__file__).parent / "static"
DB_PATH = Path(os.environ.get("RUN_HISTORY_DB", str(OPENCLAW_DIR / "subagents" / "run_history.db")))
RETENTION_RAW = os.environ.get("RUN_HISTORY_RETENTION_DAYS", "90").strip().lower()
BASE_PATH = (os.environ.get("BASE_PATH", "").strip() or "/agent-monitor").rstrip("/")


def parse_retention_days(raw: str):
    if raw in {"", "0", "none", "off", "unlimited", "infinite", "-1"}:
        return None
    try:
        days = int(raw)
        return None if days <= 0 else days
    except ValueError:
        return 90


RETENTION_DAYS = parse_retention_days(RETENTION_RAW)


def sanitize(text: str) -> str:
    """Strip potential secrets/tokens from text."""
    text = re.sub(r"Bearer\s+[A-Za-z0-9\-_.]+", "Bearer [REDACTED]", text)
    text = re.sub(
        r"(api[_-]?key|secret|password|token)\s*[=:]\s*[\"']?[A-Za-z0-9\-_.]{20,}[\"']?",
        r"\1=[REDACTED]",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"eyJ[A-Za-z0-9\-_]{50,}\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+", "[JWT_REDACTED]", text)
    return text


def get_configured_agents():
    agents_dir = OPENCLAW_DIR / "agents"
    if not agents_dir.exists():
        return []
    return sorted([d.name for d in agents_dir.iterdir() if d.is_dir()])


def compute_status(run: dict):
    outcome = run.get("outcome", {}) or {}
    outcome_status = outcome.get("status", "unknown")
    if outcome_status in ("ok", "done"):
        return "done", outcome_status
    if outcome_status == "timeout":
        return "timeout", outcome_status
    if outcome_status == "error":
        return "failed", outcome_status
    if run.get("endedAt") and not outcome_status:
        return "done", outcome_status
    if run.get("startedAt") and not run.get("endedAt"):
        return "running", outcome_status
    return "unknown", outcome_status


def get_agent_id(session_key: str):
    parts = (session_key or "").split(":")
    return parts[1] if len(parts) >= 2 else "unknown"


def normalize_request_path(path: str) -> str:
    """Support both direct root routes and optional reverse-proxy subpath routes."""
    if not path:
        return "/"

    path = path.rstrip("/") or "/"
    prefixes = ["/agent-monitor"]
    if BASE_PATH and BASE_PATH not in prefixes:
        prefixes.insert(0, BASE_PATH)

    for prefix in prefixes:
        if path == prefix:
            return "/"
        if path.startswith(prefix + "/"):
            stripped = path[len(prefix) :]
            return stripped.rstrip("/") or "/"

    return path


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS run_history (
                run_id TEXT PRIMARY KEY,
                label TEXT,
                agent_id TEXT,
                model TEXT,
                status TEXT,
                started_at INTEGER,
                ended_at INTEGER,
                runtime_ms INTEGER,
                timeout_seconds INTEGER,
                task TEXT,
                session_key TEXT,
                outcome_status TEXT,
                outcome_json TEXT,
                raw_json TEXT,
                created_at INTEGER,
                updated_at INTEGER
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_run_history_started ON run_history(started_at DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_run_history_agent ON run_history(agent_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_run_history_status ON run_history(status)")


def load_current_runs_file():
    runs_file = OPENCLAW_DIR / "subagents" / "runs.json"
    if not runs_file.exists():
        return {}
    try:
        with open(runs_file) as f:
            data = json.load(f)
        return data.get("runs", {}) if isinstance(data, dict) else {}
    except Exception:
        return {}


def prune_old_runs(conn: sqlite3.Connection):
    if RETENTION_DAYS is None:
        return
    now_ms = int(time.time() * 1000)
    cutoff = now_ms - RETENTION_DAYS * 24 * 60 * 60 * 1000
    conn.execute(
        "DELETE FROM run_history WHERE COALESCE(ended_at, started_at, created_at, 0) < ?",
        (cutoff,),
    )


def sync_runs_to_db():
    runs = load_current_runs_file()
    if not runs:
        return
    now_ms = int(time.time() * 1000)

    with sqlite3.connect(DB_PATH) as conn:
        for run_id, run in runs.items():
            status, outcome_status = compute_status(run)
            started = run.get("startedAt", run.get("createdAt", 0))
            ended = run.get("endedAt")
            runtime_ms = (
                (ended - started)
                if ended and started
                else (int(time.time() * 1000) - started if started and status == "running" else 0)
            )
            outcome = run.get("outcome", {}) or {}
            session_key = run.get("childSessionKey", "")

            conn.execute(
                """
                INSERT INTO run_history (
                    run_id, label, agent_id, model, status, started_at, ended_at,
                    runtime_ms, timeout_seconds, task, session_key, outcome_status,
                    outcome_json, raw_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(run_id) DO UPDATE SET
                    label=excluded.label,
                    agent_id=excluded.agent_id,
                    model=excluded.model,
                    status=excluded.status,
                    started_at=excluded.started_at,
                    ended_at=excluded.ended_at,
                    runtime_ms=excluded.runtime_ms,
                    timeout_seconds=excluded.timeout_seconds,
                    task=excluded.task,
                    session_key=excluded.session_key,
                    outcome_status=excluded.outcome_status,
                    outcome_json=excluded.outcome_json,
                    raw_json=excluded.raw_json,
                    updated_at=excluded.updated_at
                """,
                (
                    run_id,
                    run.get("label", ""),
                    get_agent_id(session_key),
                    run.get("model", ""),
                    status,
                    started,
                    ended,
                    runtime_ms,
                    run.get("runTimeoutSeconds"),
                    sanitize(run.get("task", "")),
                    session_key,
                    outcome_status,
                    json.dumps(outcome, default=str),
                    json.dumps(run, default=str),
                    run.get("createdAt", started or now_ms),
                    now_ms,
                ),
            )
        prune_old_runs(conn)
        conn.commit()


def query_runs(limit=200, offset=0, agent_id=None, status=None):
    sync_runs_to_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        where = []
        args = []

        if agent_id:
            where.append("agent_id = ?")
            args.append(agent_id)
        if status:
            where.append("status = ?")
            args.append(status)

        where_sql = ("WHERE " + " AND ".join(where)) if where else ""

        total = conn.execute(f"SELECT COUNT(*) FROM run_history {where_sql}", args).fetchone()[0]

        rows = conn.execute(
            f"""
            SELECT run_id, label, agent_id, model, status, started_at, ended_at,
                   runtime_ms, timeout_seconds, task, session_key, outcome_status
            FROM run_history
            {where_sql}
            ORDER BY started_at DESC
            LIMIT ? OFFSET ?
            """,
            [*args, limit, offset],
        ).fetchall()

        now_ms = int(time.time() * 1000)
        items = []
        for row in rows:
            runtime = row["runtime_ms"]
            if row["status"] == "running" and row["started_at"]:
                runtime = now_ms - row["started_at"]

            items.append(
                {
                    "runId": row["run_id"],
                    "label": row["label"] or "",
                    "agentId": row["agent_id"] or "unknown",
                    "model": row["model"] or "",
                    "status": row["status"] or "unknown",
                    "startedAt": row["started_at"],
                    "endedAt": row["ended_at"],
                    "runtimeMs": runtime or 0,
                    "timeoutSeconds": row["timeout_seconds"],
                    "task": row["task"] or "",
                    "sessionKey": row["session_key"] or "",
                    "outcome": {"status": row["outcome_status"] or "unknown"},
                }
            )

        return {"items": items, "total": total, "limit": limit, "offset": offset}


def get_run_detail(run_id):
    sync_runs_to_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM run_history WHERE run_id = ?", (run_id,)).fetchone()

    if not row:
        return None

    session_key = row["session_key"] or ""
    started = row["started_at"]
    ended = row["ended_at"]

    outcome = {}
    try:
        outcome = json.loads(row["outcome_json"] or "{}")
    except Exception:
        outcome = {"status": row["outcome_status"]}

    messages = []
    transcript = find_transcript(session_key)
    if transcript:
        try:
            lines = transcript.read_text().strip().split("\n")
            for line in lines:
                try:
                    entry = json.loads(line)
                    msg = entry.get("message", entry)
                    role = msg.get("role")
                    if role not in ("assistant", "user"):
                        continue

                    content = msg.get("content", "")
                    text = ""
                    tool_calls = []

                    if isinstance(content, list):
                        for c in content:
                            if isinstance(c, dict):
                                if c.get("type") == "text" and c.get("text", "").strip():
                                    text += c["text"] + "\n"
                                elif c.get("type") == "toolCall":
                                    tool_calls.append(
                                        {
                                            "name": c.get("name", ""),
                                            "args_preview": str(c.get("arguments", {}))[:200],
                                        }
                                    )
                    elif isinstance(content, str):
                        text = content

                    if text.strip() or tool_calls:
                        messages.append(
                            {
                                "role": role,
                                "text": sanitize(text.strip()[:2000]),
                                "toolCalls": tool_calls[:5],
                                "timestamp": msg.get("timestamp", entry.get("timestamp")),
                            }
                        )
                except Exception:
                    continue
        except Exception:
            pass

    runtime_ms = (ended - started) if ended and started else 0
    if row["status"] == "running" and started:
        runtime_ms = int(time.time() * 1000) - started

    return {
        "runId": row["run_id"],
        "label": row["label"] or "",
        "agentId": row["agent_id"] or "unknown",
        "model": row["model"] or "",
        "status": row["status"] or "unknown",
        "startedAt": started,
        "endedAt": ended,
        "runtimeMs": runtime_ms,
        "timeoutSeconds": row["timeout_seconds"],
        "task": row["task"] or "",
        "sessionKey": session_key,
        "outcome": outcome,
        "messages": messages,
    }


def find_transcript(session_key: str) -> Path | None:
    for agent_dir in (OPENCLAW_DIR / "agents").glob("*/sessions"):
        sessions_json = agent_dir / "sessions.json"
        if not sessions_json.exists():
            continue
        try:
            with open(sessions_json) as f:
                sessions = json.load(f)
            for sk, sess in sessions.items():
                if sk == session_key:
                    sid = sess.get("sessionId", "")
                    transcript = agent_dir / f"{sid}.jsonl"
                    if transcript.exists():
                        return transcript
        except Exception:
            continue
    return None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = normalize_request_path(parsed.path)
        q = parse_qs(parsed.query)

        if path == "/api/agents":
            self.json_response(get_configured_agents())
        elif path == "/api/runs":
            limit = int(q.get("limit", ["200"])[0])
            offset = int(q.get("offset", ["0"])[0])
            limit = max(1, min(limit, 1000))
            offset = max(0, offset)
            agent_id = q.get("agentId", [None])[0]
            status = q.get("status", [None])[0]
            self.json_response(query_runs(limit=limit, offset=offset, agent_id=agent_id, status=status))
        elif path.startswith("/api/runs/"):
            run_id = path.split("/api/runs/")[1]
            detail = get_run_detail(run_id)
            if detail:
                self.json_response(detail)
            else:
                self.send_error(404)
        elif path in ("", "/", "/index.html"):
            self.path = "/index.html"
            super().do_GET()
        else:
            super().do_GET()

    def json_response(self, data):
        payload = json.dumps(data, default=str)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(payload.encode())

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    init_db()
    sync_runs_to_db()
    port = int(os.environ.get("PORT", "8787"))
    retention = "unlimited" if RETENTION_DAYS is None else f"{RETENTION_DAYS}d"
    print(f"Agent Monitor → http://0.0.0.0:{port} | db={DB_PATH} | retention={retention}")
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()
