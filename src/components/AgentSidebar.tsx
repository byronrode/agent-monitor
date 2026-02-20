import type { Run, RunState } from '../lib/types'
import { runState } from '../lib/utils'

type Props = {
  runs: Run[]
  selectedAgent: string
  setSelectedAgent: (v: string) => void
  stateFilter: RunState | 'all'
  setStateFilter: (v: RunState | 'all') => void
}

const stateColor: Record<string, string> = {
  running: 'var(--green)',
  quiet: 'var(--amber)',
  stalled: 'var(--orange)',
  dead: 'var(--red)',
  done: 'var(--blue)',
  failed: 'var(--red)',
  timeout: 'var(--orange)',
  unknown: 'var(--text-3)',
}

export function AgentSidebar({ runs, selectedAgent, setSelectedAgent }: Props) {
  const ids = Array.from(new Set(runs.map((r) => r.agentId))).sort()
  const byAgent = new Map<string, Run[]>()
  runs.forEach((r) => byAgent.set(r.agentId, [...(byAgent.get(r.agentId) || []), r]))

  return (
    <aside className="w-[220px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] px-2 py-3 max-lg:w-full max-lg:overflow-x-auto max-lg:border-r-0 max-lg:border-b max-lg:px-3 max-lg:py-2">
      <div className="px-2 pb-2 text-[0.62rem] uppercase tracking-[0.12em] text-[var(--text-3)] max-lg:hidden">Agents</div>
      <div className="space-y-1 max-lg:flex max-lg:min-w-max max-lg:gap-1.5 max-lg:space-y-0">
        <button
          type="button"
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8rem] transition hover:bg-[var(--surface-2)] max-lg:w-auto max-lg:whitespace-nowrap ${selectedAgent === 'all' ? 'bg-[var(--surface-2)] ring-1 ring-[var(--accent-active-border-soft)]' : ''}`}
          onClick={() => setSelectedAgent('all')}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--blue)]" />
          <span className="text-[var(--text)]">all agents</span>
          <span className="ml-auto rounded bg-[var(--surface-3)] px-1.5 py-0.5 font-mono text-[0.65rem] text-[var(--text-3)]">{runs.length}</span>
        </button>

        {ids.map((id) => {
          const list = byAgent.get(id) || []
          const first = list[0]
          const st = first ? (first.status === 'running' ? runState(first) : first.status) : 'dead'
          return (
            <button
              type="button"
              key={id}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8rem] transition hover:bg-[var(--surface-2)] max-lg:w-auto max-lg:whitespace-nowrap ${selectedAgent === id ? 'bg-[var(--surface-2)] ring-1 ring-[var(--accent-active-border-soft)]' : ''}`}
              onClick={() => setSelectedAgent(id)}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: stateColor[st] || 'var(--text-3)' }} />
              <span className="truncate">{id}</span>
              <span className="ml-auto rounded bg-[var(--surface-3)] px-1.5 py-0.5 font-mono text-[0.65rem] text-[var(--text-3)]">{list.length}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
