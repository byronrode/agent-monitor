import type { Run, RunDetail, RunState } from '../lib/types'
import { fmtDuration, runState, stateTone } from '../lib/utils'

type Props = {
  runs: Run[]
  laneMode: 'lanes' | 'list'
  selectedRun?: RunDetail
  onSelect: (id: string) => void
  stateFilter: RunState | 'all'
}

export function LanesBoard({ runs, laneMode, onSelect, stateFilter }: Props) {
  const filtered = runs.filter((r) => stateFilter === 'all' || runState(r) === stateFilter)
  const statuses = ['running', 'done', 'failed', 'timeout', 'unknown'] as const

  if (laneMode === 'list') {
    return <div className="card space-y-2">{filtered.map((r) => <RunRow key={r.runId} run={r} onSelect={onSelect} />)}</div>
  }

  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {statuses.map((st) => (
        <div key={st} className="card">
          <div className="mb-2 text-sm font-semibold uppercase">{st}</div>
          <div className="space-y-2">
            {filtered.filter((r) => r.status === st).map((r) => <RunRow key={r.runId} run={r} onSelect={onSelect} compact />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function RunRow({ run, onSelect, compact }: { run: Run; onSelect: (id: string) => void; compact?: boolean }) {
  const state = runState(run)
  return (
    <button onClick={() => onSelect(run.runId)} className="w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-sm font-medium">{run.agentId}</div>
        <span className={`badge ${stateTone[state]}`}>{state}</span>
      </div>
      <div className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-zinc-400">{run.task || run.label}</div>
      {!compact && <div className="mt-1 text-xs">{fmtDuration(run.runtimeMs)}</div>}
    </button>
  )
}
