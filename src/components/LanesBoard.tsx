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

const summaryText = (run: Run) => {
  const text = (run.task || '').replace(/\s+/g, ' ').trim()
  return text || 'No task summary available'
}

const badgeTone: Record<string, string> = {
  running: 'border border-emerald-500/55 bg-emerald-500/12 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.22)]',
  quiet: 'border border-amber-500/55 bg-amber-500/12 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
  stalled: 'border border-orange-500/55 bg-orange-500/12 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
  dead: 'border border-rose-500/55 bg-rose-500/12 text-rose-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
  done: 'border border-sky-500/55 bg-sky-500/12 text-sky-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
  failed: 'border border-rose-500/55 bg-rose-500/12 text-rose-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
  timeout: 'border border-orange-500/55 bg-orange-500/12 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
  unknown: 'border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text-3)]',
}

const borderTone: Record<string, string> = {
  running: 'border-l-emerald-400/85',
  quiet: 'border-l-amber-400/85',
  stalled: 'border-l-orange-400/85',
  dead: 'border-l-rose-400/85',
  done: 'border-l-sky-400/85',
  failed: 'border-l-rose-400/85',
  timeout: 'border-l-orange-400/85',
  unknown: 'border-l-[var(--border)]',
}

const laneTitleTone = [
  'text-cyan-300',
  'text-violet-300',
  'text-emerald-300',
  'text-sky-300',
  'text-fuchsia-300',
  'text-amber-300',
]

function statusFor(run: Run) {
  return run.status === 'running' ? runState(run) : run.status
}

export function LanesBoard({ runs, laneMode, onSelect }: Props) {
  if (laneMode === 'list') {
    return <div className="flex flex-col gap-2.5">{runs.map((r) => <RunCard key={r.runId} run={r} onSelect={onSelect} />)}</div>
  }

  const agentIds = Array.from(new Set(runs.map((r) => r.agentId)))
  return (
    <div className="flex gap-3 overflow-x-auto pb-3 max-lg:flex-col">
      {agentIds.map((agentId, index) => {
        const agentRuns = runs.filter((r) => r.agentId === agentId)
        const laneTone = laneTitleTone[index % laneTitleTone.length]
        return (
          <section
            key={agentId}
            className="min-w-[312px] max-w-[392px] flex-shrink-0 overflow-hidden rounded-xl border border-[var(--border)]/85 bg-[var(--surface)]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] max-lg:max-w-none"
          >
            <header className="flex items-center justify-between border-b border-[var(--border)]/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-3.5 py-2.5">
              <span className={`truncate text-[0.79rem] font-semibold tracking-[0.01em] ${laneTone}`}>{agentId}</span>
              <span className="font-mono text-[0.64rem] text-[var(--text-3)]">{agentRuns.length} runs</span>
            </header>
            <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2.5">{agentRuns.map((r) => <LaneCard key={r.runId} run={r} onSelect={onSelect} />)}</div>
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
      className={`grid w-full grid-cols-[84px_1fr_auto] items-center gap-3 rounded-xl border border-l-[3px] border-[var(--border)]/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] transition hover:border-[var(--border-hover)] max-lg:grid-cols-1 max-lg:gap-2 max-lg:px-3.5 max-lg:py-3 ${borderTone[badge] || borderTone.unknown}`}
      onClick={() => onSelect(run.runId)}
    >
      <div className="flex flex-col items-start gap-1 max-lg:flex-row max-lg:items-center">
        <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.08em] ${badgeTone[badge] || badgeTone.unknown}`}>{badge}</span>
        <span className="font-mono text-[0.64rem] text-[var(--text-3)]">{fmtDuration(run.runtimeMs)}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[0.83rem] font-semibold text-[var(--text)]">{run.label || run.agentId}</div>
        <p className="mt-0.5 truncate text-[0.69rem] text-[var(--text-3)]">{summaryText(run)}</p>
        <div className="mt-1 flex items-center gap-1.5 font-mono text-[0.62rem] text-[var(--text-3)]">
          <span className="truncate">{run.agentId}</span>
          <span aria-hidden>•</span>
          <span className="truncate">{run.model || 'model'}</span>
          <span aria-hidden>•</span>
          <span>{tokenText(run)}</span>
        </div>
      </div>
      <div className="font-mono text-[0.64rem] text-[var(--text-3)] max-lg:text-left">{new Date(run.startedAt).toLocaleString()}</div>
    </button>
  )
}

function LaneCard({ run, onSelect }: { run: Run; onSelect: (id: string) => void }) {
  const badge = statusFor(run)
  return (
    <button
      type="button"
      className={`w-full rounded-lg border border-l-[3px] border-[var(--border)]/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.005))] px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition hover:border-[var(--border-hover)] ${borderTone[badge] || borderTone.unknown}`}
      onClick={() => onSelect(run.runId)}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[0.78rem] font-semibold text-[var(--text)]">{run.label || run.agentId}</div>
          <p className="mt-0.5 truncate text-[0.66rem] text-[var(--text-3)]">{summaryText(run)}</p>
        </div>
        <span className={`inline-flex flex-shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[0.56rem] font-semibold uppercase tracking-[0.08em] ${badgeTone[badge] || badgeTone.unknown}`}>{badge}</span>
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[0.6rem] text-[var(--text-3)]">
        <span>{fmtDuration(run.runtimeMs)}</span>
        <span aria-hidden>•</span>
        <span className="truncate">{run.model || 'model'}</span>
        <span aria-hidden>•</span>
        <span className="truncate">{tokenText(run)}</span>
      </div>
    </button>
  )
}
