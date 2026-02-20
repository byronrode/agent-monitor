# Agent Monitor

A lightweight dashboard for monitoring OpenClaw agent runs. Shows agent lanes, task prompts, outcomes, transcripts, and real-time status.

![Python](https://img.shields.io/badge/python-3.10+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Durable run history** — runs are persisted to SQLite so history survives OpenClaw cleanup/restarts
- **Backfill on startup/refresh** — current `runs.json` data is imported into durable storage automatically
- **Retention policy** — defaults to 90 days, configurable, supports unlimited retention
- **Agent lanes** — each agent gets its own swimlane with task history
- **Full prompts** — see exactly what each agent was asked to do
- **Outcomes** — done, failed, timed out at a glance
- **Transcripts** — expand any run to see the agent's messages and tool calls
- **Real-time** — auto-refreshes every 5-30s with live indicators
- **List + Lane views** — toggle between chronological list and kanban-style lanes
- **Historical browsing** — list view includes “Load older runs” pagination

## Quick Start

```bash
# Clone
git clone https://github.com/byronrode/agent-monitor.git
cd agent-monitor

# Run (defaults to ~/.openclaw, port 8787)
python3 server.py

# Or with custom settings
OPENCLAW_DIR=/path/to/.openclaw PORT=9090 python3 server.py
```

Then open `http://localhost:8787` in your browser.

Reverse-proxy subpath support is built in. The UI and API resolve correctly from both:
- `http://localhost:8787`
- `http://localhost:8787/agent-monitor`

## Run as a systemd User Service (Daemon)

Use this setup to keep Agent Monitor running in the background.

- **Service name:** `agent-monitor.service`
- **Service file:** `~/.config/systemd/user/agent-monitor.service`

Example service definition (key settings):

```ini
[Service]
ExecStart=/usr/bin/env python3 /home/byronrode/work/agent-monitor/server.py
Restart=always
Environment=RUN_HISTORY_DB=/home/byronrode/.openclaw/subagents/run_history.db
Environment=RUN_HISTORY_RETENTION_DAYS=90
```

Enable and start:

```bash
systemctl --user daemon-reload
systemctl --user enable --now agent-monitor.service
```

Operations:

```bash
# status
systemctl --user status agent-monitor.service

# restart
systemctl --user restart agent-monitor.service

# logs
journalctl --user -u agent-monitor.service -f
```

Access URL:
- `http://raspberrypi.cloudforest-pineapplefish.ts.net:8787`
- Use **http** on port `8787` (not https).

Behavior notes:
- With user lingering enabled (`loginctl enable-linger byronrode`), the service auto-starts on boot.
- `Restart=always` ensures it auto-restarts after crashes.

## Migration / Run Notes

No manual migration is required.

On first start with this version, the server will:
1. Create the SQLite DB if missing.
2. Backfill from `$OPENCLAW_DIR/subagents/runs.json`.
3. Continue upserting runs on each `/api/runs` request.
4. Prune old data based on retention (unless unlimited).

Default DB location:
- `$OPENCLAW_DIR/subagents/run_history.db`

To inspect quickly:

```bash
sqlite3 ~/.openclaw/subagents/run_history.db 'select count(*) from run_history;'
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `OPENCLAW_DIR` | `~/.openclaw` | Path to your OpenClaw data directory |
| `PORT` | `8787` | Server port |
| `RUN_HISTORY_DB` | `$OPENCLAW_DIR/subagents/run_history.db` | SQLite database file path |
| `RUN_HISTORY_RETENTION_DAYS` | `90` | Retention days (`0`, `-1`, `none`, `off`, `unlimited` = keep forever) |
| `BASE_PATH` | `/agent-monitor` | Optional reverse-proxy subpath to also accept (in addition to `/`) |

## API

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard UI |
| `GET /api/agents` | List of configured agent IDs |
| `GET /api/runs?limit=200&offset=0&agentId=<id>&status=<status>` | Paginated historical runs + live statuses |
| `GET /api/runs/:id` | Single run with full transcript |

Response shape for `/api/runs`:

```json
{
  "items": ["...runs..."],
  "total": 1234,
  "limit": 200,
  "offset": 0
}
```

## Requirements

- Python 3.10+ (no external dependencies)
- OpenClaw with agent runs

## License

MIT
