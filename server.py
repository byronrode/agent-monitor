#!/usr/bin/env python3
"""
Agent Monitor — Dashboard server for OpenClaw agent runs.

Reads from:
  - OPENCLAW_DIR/subagents/runs.json (run metadata)
  - OPENCLAW_DIR/agents/*/sessions/ (transcripts for completion messages)

Serves:
  - GET /              → dashboard HTML
  - GET /api/agents    → all agent IDs configured
  - GET /api/runs      → all runs with full task + outcome
  - GET /api/runs/:id  → single run detail with transcript excerpts

Environment:
  OPENCLAW_DIR  — path to .openclaw directory (default: ~/.openclaw)
  PORT          — server port (default: 8787)
"""

import json
import os
import re
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

OPENCLAW_DIR = Path(os.environ.get("OPENCLAW_DIR", os.path.expanduser("~/.openclaw")))
STATIC_DIR = Path(__file__).parent / "static"


def sanitize(text: str) -> str:
    """Strip potential secrets/tokens from text."""
    # Remove Bearer tokens
    text = re.sub(r'Bearer\s+[A-Za-z0-9\-_.]+', 'Bearer [REDACTED]', text)
    # Remove API keys that look like secrets
    text = re.sub(r'(api[_-]?key|secret|password|token)\s*[=:]\s*["\']?[A-Za-z0-9\-_.]{20,}["\']?',
                  r'\1=[REDACTED]', text, flags=re.IGNORECASE)
    # Remove Supabase anon keys (eyJ...)
    text = re.sub(r'eyJ[A-Za-z0-9\-_]{50,}\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+', '[JWT_REDACTED]', text)
    return text


def get_configured_agents():
    """List all configured agent IDs."""
    agents_dir = OPENCLAW_DIR / "agents"
    if not agents_dir.exists():
        return []
    return sorted([d.name for d in agents_dir.iterdir() if d.is_dir()])


def get_runs():
    """Load all runs from subagents/runs.json."""
    runs_file = OPENCLAW_DIR / "subagents" / "runs.json"
    if not runs_file.exists():
        return []

    with open(runs_file) as f:
        data = json.load(f)

    results = []
    for run_id, run in data.get("runs", {}).items():
        outcome = run.get("outcome", {})
        outcome_status = outcome.get("status", "unknown")

        status = "unknown"
        if outcome_status == "ok":
            status = "done"
        elif outcome_status == "done":
            status = "done"
        elif outcome_status == "timeout":
            status = "timeout"
        elif outcome_status == "error":
            status = "failed"
        elif run.get("endedAt") and not outcome_status:
            status = "done"
        elif run.get("startedAt") and not run.get("endedAt"):
            status = "running"

        started = run.get("startedAt", run.get("createdAt", 0))
        ended = run.get("endedAt")
        runtime_ms = (ended - started) if ended and started else (
            int(time.time() * 1000) - started if started else 0
        )

        # Determine which agent this ran on
        session_key = run.get("childSessionKey", "")
        # agent:dev-ios:subagent:UUID → dev-ios
        # agent:main:subagent:UUID → main
        agent_id = "unknown"
        parts = session_key.split(":")
        if len(parts) >= 2:
            agent_id = parts[1]

        results.append({
            "runId": run_id,
            "label": run.get("label", ""),
            "agentId": agent_id,
            "model": run.get("model", ""),
            "status": status,
            "startedAt": started,
            "endedAt": ended,
            "runtimeMs": runtime_ms,
            "timeoutSeconds": run.get("runTimeoutSeconds"),
            "task": sanitize(run.get("task", "")),
            "sessionKey": session_key,
            "outcome": {
                "status": outcome_status,
            },
        })

    results.sort(key=lambda x: x.get("startedAt", 0), reverse=True)
    return results


def get_run_detail(run_id):
    """Get a single run with transcript excerpts."""
    runs_file = OPENCLAW_DIR / "subagents" / "runs.json"
    if not runs_file.exists():
        return None

    with open(runs_file) as f:
        data = json.load(f)

    run = data.get("runs", {}).get(run_id)
    if not run:
        return None

    session_key = run.get("childSessionKey", "")
    agent_id = "unknown"
    parts = session_key.split(":")
    if len(parts) >= 2:
        agent_id = parts[1]

    outcome = run.get("outcome", {})
    outcome_status = outcome.get("status", "unknown")
    status = {"ok": "done", "done": "done", "timeout": "timeout", "error": "failed"}.get(
        outcome_status, "running" if not run.get("endedAt") else "done"
    )

    started = run.get("startedAt", run.get("createdAt", 0))
    ended = run.get("endedAt")

    # Extract transcript messages
    messages = []
    transcript = find_transcript(session_key)
    if transcript:
        try:
            lines = transcript.read_text().strip().split('\n')
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
                                    tool_calls.append({
                                        "name": c.get("name", ""),
                                        "args_preview": str(c.get("arguments", {}))[:200],
                                    })
                    elif isinstance(content, str):
                        text = content

                    if text.strip() or tool_calls:
                        messages.append({
                            "role": role,
                            "text": sanitize(text.strip()[:2000]),
                            "toolCalls": tool_calls[:5],
                            "timestamp": msg.get("timestamp", entry.get("timestamp")),
                        })
                except:
                    continue
        except:
            pass

    return {
        "runId": run_id,
        "label": run.get("label", ""),
        "agentId": agent_id,
        "model": run.get("model", ""),
        "status": status,
        "startedAt": started,
        "endedAt": ended,
        "runtimeMs": (ended - started) if ended and started else 0,
        "timeoutSeconds": run.get("runTimeoutSeconds"),
        "task": sanitize(run.get("task", "")),
        "sessionKey": session_key,
        "outcome": outcome,
        "messages": messages,
    }


def find_transcript(session_key: str) -> Path | None:
    """Find the JSONL transcript file for a session key."""
    # Check all agent session dirs
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
        except:
            continue
    return None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "/api/agents":
            self.json_response(get_configured_agents())
        elif path == "/api/runs":
            self.json_response(get_runs())
        elif path.startswith("/api/runs/"):
            run_id = path.split("/api/runs/")[1]
            detail = get_run_detail(run_id)
            if detail:
                self.json_response(detail)
            else:
                self.send_error(404)
        elif path in ("", "/"):
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
    port = int(os.environ.get("PORT", "8787"))
    print(f"Agent Monitor → http://0.0.0.0:{port}")
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()
