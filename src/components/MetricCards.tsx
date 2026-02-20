import type { Run } from '../lib/types'
import { runState } from '../lib/utils'

type Props = { runs: Run[] }

const fmtTokens = (n: number) => n.toLocaleString()

export function MetricCards({ runs }: Props) {
  const counts = {
    running: runs.filter((r) => runState(r) === 'running').length,
    quiet: runs.filter((r) => runState(r) === 'quiet').length,
    stalled: runs.filter((r) => runState(r) === 'stalled').length,
    dead: runs.filter((r) => runState(r) === 'dead').length,
    total: runs.length,
  }

  const tokens = runs.reduce(
    (acc, r) => {
      acc.input += r.inputTokens ?? 0
      acc.output += r.outputTokens ?? 0
      acc.total += r.totalTokens ?? ((r.inputTokens ?? 0) + (r.outputTokens ?? 0))
      if (r.inputTokens != null || r.outputTokens != null || r.totalTokens != null) acc.withData += 1
      return acc
    },
    { input: 0, output: 0, total: 0, withData: 0 },
  )

  const cards = [
    { label: 'Running', value: counts.running },
    { label: 'Quiet', value: counts.quiet },
    { label: 'Stalled', value: counts.stalled },
    { label: 'Dead', value: counts.dead },
    { label: 'Total', value: counts.total },
  ]

  return (
    <>
      <div className="mb-3 grid grid-cols-5 gap-3 max-lg:grid-cols-2">
        {cards.map((c) => (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 p-4" key={c.label}>
            <div className="text-[0.68rem] uppercase tracking-[0.07em] text-[var(--text-3)]">{c.label}</div>
            <div className="mt-1 font-mono text-[1.3rem] font-semibold text-[var(--text)]">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 max-lg:grid-cols-1">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 p-4">
          <div className="text-[0.68rem] uppercase tracking-[0.07em] text-[var(--text-3)]">Window Input Tokens</div>
          <div className="mt-1 font-mono text-[1.3rem] font-semibold text-[var(--text)]">{fmtTokens(tokens.input)}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 p-4">
          <div className="text-[0.68rem] uppercase tracking-[0.07em] text-[var(--text-3)]">Window Output Tokens</div>
          <div className="mt-1 font-mono text-[1.3rem] font-semibold text-[var(--text)]">{fmtTokens(tokens.output)}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 p-4">
          <div className="text-[0.68rem] uppercase tracking-[0.07em] text-[var(--text-3)]">Window Total Tokens</div>
          <div className="mt-1 font-mono text-[1.3rem] font-semibold text-[var(--text)]">{fmtTokens(tokens.total)}</div>
          <div className="mt-1.5 font-mono text-[0.64rem] text-[var(--text-3)]">{tokens.withData} / {runs.length} runs reporting tokens</div>
        </div>
      </div>
    </>
  )
}
