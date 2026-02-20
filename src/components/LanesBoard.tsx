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
    return <div className="card list-stack">{filtered.map((r) => <RunRow key={r.runId} run={r} onSelect={onSelect} />)}</div>
  }

  return (
    <div className="lane-grid">
      {statuses.map((st) => {
        const laneRuns = filtered.filter((r) => r.status === st)
        return (
          <div key={st} className="card lane-card">
            <div className="lane-title">{st} · {laneRuns.length}</div>
            <div className="lane-list">
              {laneRuns.map((r) => <RunRow key={r.runId} run={r} onSelect={onSelect} compact />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RunRow({ run, onSelect, compact }: { run: Run; onSelect: (id: string) => void; compact?: boolean }) {
  const state = runState(run)
  return (
    <button onClick={() => onSelect(run.runId)} className="run-row">
      <div className="flex items-center justify-between gap-2">
        <div className="run-agent truncate">{run.agentId}</div>
        <span className={`badge ${stateTone[state]}`}>{state}</span>
      </div>
      <div className="run-task line-clamp-2">{run.task || run.label}</div>
      {!compact && <div className="run-runtime">{fmtDuration(run.runtimeMs)}</div>}
    </button>
  )
}
