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
  running: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  quiet: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  stalled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  dead: 'bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-zinc-200'
}
