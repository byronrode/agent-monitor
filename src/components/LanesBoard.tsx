import type { Run } from '../lib/types'
import { fmtDuration, runState } from '../lib/utils'

type Props = {
  runs: Run[]
  laneMode: 'lanes' | 'list'
  onSelect: (id: string) => void
}

const tokenText = (run: Run) => {
  const total = run.totalTokens
  const input = run.inputTokens
  const output = run.outputTokens
  if (total != null) return `${total.toLocaleString()} tok`
  if (input != null || output != null) return `${(input ?? 0).toLocaleString()} in / ${(output ?? 0).toLocaleString()} out`
  return 'tokens unavailable'
}

const badgeTone: Record<string, string> = {
  running: 'bg-[var(--green-bg)] text-[var(--green)]',
  quiet: 'bg-[var(--amber-bg)] text-[var(--amber)]',
  stalled: 'bg-[var(--orange-bg)] text-[var(--orange)]',
  dead: 'bg-[var(--red-bg)] text-[var(--red)]',
  done: 'bg-[var(--blue-bg)] text-[var(--blue)]',
  failed: 'bg-[var(--red-bg)] text-[var(--red)]',
  timeout: 'bg-[var(--orange-bg)] text-[var(--orange)]',
  unknown: 'bg-[var(--surface-3)] text-[var(--text-3)]',
}

const borderTone: Record<string, string> = {
  running: 'border-l-[var(--green)]',
  quiet: 'border-l-[var(--amber)]',
  stalled: 'border-l-[var(--orange)]',
  dead: 'border-l-[var(--red)]',
  done: 'border-l-[var(--blue)]',
  failed: 'border-l-[var(--red)]',
  timeout: 'border-l-[var(--orange)]',
  unknown: 'border-l-[var(--border)]',
}

function statusFor(run: Run) {
  return run.status === 'running' ? runState(run) : run.status
}

export function LanesBoard({ runs, laneMode, onSelect }: Props) {
  if (laneMode === 'list') {
    return <div className="flex flex-col gap-3">{runs.map((r) => <RunCard key={r.runId} run={r} onSelect={onSelect} />)}</div>
  }

  const agentIds = Array.from(new Set(runs.map((r) => r.agentId)))
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 max-lg:flex-col">
      {agentIds.map((agentId) => {
        const agentRuns = runs.filter((r) => r.agentId === agentId)
        return (
          <section key={agentId} className="min-w-[320px] max-w-[400px] flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] max-lg:max-w-none">
            <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <span className="text-[0.85rem] font-semibold">{agentId}</span>
              <span className="font-mono text-[0.7rem] text-[var(--text-3)]">{agentRuns.length} runs</span>
            </header>
            <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-3">{agentRuns.map((r) => <LaneCard key={r.runId} run={r} onSelect={onSelect} />)}</div>
          </section>
        )
      })}
    </div>
  )
}

function RunCard({ run, onSelect }: { run: Run; onSelect: (id: string) => void }) {
  const badge = statusFor(run)
  return (
    <button
      type="button"
      className={`grid w-full grid-cols-[90px_1fr_auto] items-center gap-4 rounded-lg border border-l-[3px] border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-left transition hover:border-[var(--border-hover)] max-lg:grid-cols-1 max-lg:gap-2 max-lg:px-4 max-lg:py-3 ${borderTone[badge] || borderTone.unknown}`}
      onClick={() => onSelect(run.runId)}
    >
      <div className="flex flex-col items-center gap-1 max-lg:flex-row">
        <span className={`inline-flex rounded px-2.5 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-wide ${badgeTone[badge] || badgeTone.unknown}`}>{badge}</span>
        <span className="font-mono text-[0.7rem] text-[var(--text-3)]">{fmtDuration(run.runtimeMs)}</span>
      </div>
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-[0.9rem] font-semibold">{run.label || run.agentId}</span>
          <span className="rounded bg-[var(--purple-bg)] px-2 py-0.5 font-mono text-[0.65rem] text-[var(--purple)]">{run.agentId}</span>
          <span className="rounded bg-[var(--surface-3)] px-2 py-0.5 font-mono text-[0.65rem] text-[var(--text-2)]">{run.model || 'model'}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 text-right font-mono text-[0.7rem] text-[var(--text-3)] max-lg:items-start max-lg:text-left">
        <span>{new Date(run.startedAt).toLocaleString()}</span>
        <span className="inline-block rounded bg-[var(--surface-3)] px-2 py-0.5 text-[0.65rem] text-[var(--text-2)]">{tokenText(run)}</span>
      </div>
    </button>
  )
}

function LaneCard({ run, onSelect }: { run: Run; onSelect: (id: string) => void }) {
  const badge = statusFor(run)
  return (
    <button
      type="button"
      className={`w-full rounded-md border border-l-[3px] border-[var(--border)] bg-[var(--bg)] p-3 text-left transition hover:border-[var(--border-hover)] ${borderTone[badge] || borderTone.unknown}`}
      onClick={() => onSelect(run.runId)}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[0.8rem] font-semibold">{run.label || run.agentId}</span>
        <span className={`inline-flex rounded px-2 py-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-wide ${badgeTone[badge] || badgeTone.unknown}`}>{badge}</span>
      </div>
      <div className="flex items-center justify-between gap-2 font-mono text-[0.65rem] text-[var(--text-3)]">
        <span>{fmtDuration(run.runtimeMs)}</span>
        <span className="rounded bg-[var(--surface-3)] px-2 py-0.5 text-[0.62rem] text-[var(--text-2)]">{tokenText(run)}</span>
      </div>
    </button>
  )
}
