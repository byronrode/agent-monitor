import type { Run } from '../lib/types'
import { fmtDuration, runState } from '../lib/utils'

type Props = {
  runs: Run[]
  laneMode: 'lanes' | 'list'
  onSelect: (id: string) => void
}

const stateClass: Record<string, string> = { running: 'running', quiet: 'quiet', stalled: 'stalled', dead: 'dead', done: 'done', failed: 'failed', timeout: 'timeout', unknown: 'unknown' }

const tokenText = (run: Run) => {
  const total = run.totalTokens
  const input = run.inputTokens
  const output = run.outputTokens
  if (total != null) return `${total.toLocaleString()} tok`
  if (input != null || output != null) return `${(input ?? 0).toLocaleString()} in / ${(output ?? 0).toLocaleString()} out`
  return 'tokens unavailable'
}

export function LanesBoard({ runs, laneMode, onSelect }: Props) {
  if (laneMode === 'list') {
    return <div className="run-list">{runs.map((r) => <RunCard key={r.runId} run={r} onSelect={onSelect} />)}</div>
  }
  const agentIds = Array.from(new Set(runs.map((r) => r.agentId)))
  return (
    <div className="lanes">
      {agentIds.map((agentId) => {
        const agentRuns = runs.filter((r) => r.agentId === agentId)
        return (
          <div className="lane" key={agentId}>
            <div className="lane-header"><span className="lane-name">{agentId}</span><span className="lane-count">{agentRuns.length} runs</span></div>
            <div className="lane-body">{agentRuns.map((r) => <LaneCard key={r.runId} run={r} onSelect={onSelect} />)}</div>
          </div>
        )
      })}
    </div>
  )
}

function RunCard({ run, onSelect }: { run: Run; onSelect: (id: string) => void }) {
  const live = runState(run)
  const badge = run.status === 'running' ? live : run.status
  return <div className={`run-card status-${stateClass[badge]}`} onClick={() => onSelect(run.runId)}><div className="run-card-header"><div className="run-status"><span className={`badge ${stateClass[badge]}`}>{badge}</span><span className="time">{fmtDuration(run.runtimeMs)}</span></div><div className="run-info"><div className="title-row"><span className="name">{run.label || run.agentId}</span><span className="agent-tag">{run.agentId}</span><span className="model-tag">{run.model || 'model'}</span></div><div className="task-preview">{run.task || '—'}</div></div><div className="run-meta"><div>{new Date(run.startedAt).toLocaleString()}</div><div className="token-chip">{tokenText(run)}</div></div></div></div>
}

function LaneCard({ run, onSelect }: { run: Run; onSelect: (id: string) => void }) {
  const live = runState(run)
  const badge = run.status === 'running' ? live : run.status
  return <div className={`lane-card status-${stateClass[badge]}`} onClick={() => onSelect(run.runId)}><div className="lc-top"><span className="lc-label">{run.label || run.agentId}</span><span className={`badge ${stateClass[badge]}`}>{badge}</span></div><div className="lc-task">{run.task || '—'}</div><div className="lc-bottom"><span>{fmtDuration(run.runtimeMs)}</span><span className="token-chip">{tokenText(run)}</span></div></div>
}
