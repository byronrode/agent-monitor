# Agent Monitor

A lightweight dashboard for monitoring OpenClaw agent runs. Shows agent lanes, task prompts, outcomes, transcripts, and real-time status.

![Python](https://img.shields.io/badge/python-3.10+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Agent lanes** — each agent gets its own swimlane with task history
- **Full prompts** — see exactly what each agent was asked to do
- **Outcomes** — done, failed, timed out at a glance
- **Transcripts** — expand any run to see the agent's messages and tool calls
- **Real-time** — auto-refreshes every 5-30s with live indicators
- **List + Lane views** — toggle between chronological list and kanban-style lanes
- **Sidebar filter** — click an agent to filter to just their runs

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

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `OPENCLAW_DIR` | `~/.openclaw` | Path to your OpenClaw data directory |
| `PORT` | `8787` | Server port |

## How It Works

The server reads:
- `$OPENCLAW_DIR/subagents/runs.json` — run metadata (task, status, timing)
- `$OPENCLAW_DIR/agents/*/sessions/` — session transcripts for message history

All data is read-only. The dashboard never modifies OpenClaw state.

**Security:** Bearer tokens, API keys, and JWTs are automatically redacted from displayed prompts and transcripts.

## API

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard UI |
| `GET /api/agents` | List of configured agent IDs |
| `GET /api/runs` | All runs with metadata |
| `GET /api/runs/:id` | Single run with full transcript |

## Requirements

- Python 3.10+ (no external dependencies)
- OpenClaw with agent runs

## License

MIT
