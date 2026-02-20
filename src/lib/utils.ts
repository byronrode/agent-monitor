import type { Run, RunState } from './types'

export const fmtDuration = (ms = 0) => {
  const sec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m ${s}s`
  return `${s}s`
}

export const runState = (run: Run, now = Date.now()): RunState => {
  const hb = run.lastHeartbeatAt ?? run.startedAt ?? now
  const idleMs = now - hb
  if (run.status === 'running') {
    if (idleMs < 2 * 60_000) return 'running'
    if (idleMs < 10 * 60_000) return 'quiet'
    return 'stalled'
  }
  return 'dead'
}

export const stateTone: Record<RunState, string> = {
  running: 'status-running',
  quiet: 'status-quiet',
  stalled: 'status-stalled',
  dead: 'status-dead'
}
