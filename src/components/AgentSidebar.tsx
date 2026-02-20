import type { Run, RunState } from '../lib/types'
import { runState, stateTone } from '../lib/utils'

type Props = {
  runs: Run[]
  selectedAgent: string
  setSelectedAgent: (v: string) => void
  stateFilter: RunState | 'all'
  setStateFilter: (v: RunState | 'all') => void
}

export function AgentSidebar({ runs, selectedAgent, setSelectedAgent, stateFilter, setStateFilter }: Props) {
  const latestByAgent = new Map<string, Run>()
  runs.forEach((r) => {
    if (!latestByAgent.has(r.agentId)) latestByAgent.set(r.agentId, r)
  })
  const stateCounts = { running: 0, quiet: 0, stalled: 0, dead: 0 }
  latestByAgent.forEach((r) => stateCounts[runState(r)]++)

  return (
    <aside className="card sidebar-card h-fit min-w-64 space-y-3">
      <div className="lane-title">Agents</div>
      <select className="btn w-full" value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
        <option value="all">All agents</option>
        {[...latestByAgent.keys()].sort().map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <div className="space-y-1">
        <button className={`btn w-full text-left ${stateFilter === 'all' ? 'btn-primary' : ''}`} onClick={() => setStateFilter('all')}>All states</button>
        {(['running','quiet','stalled','dead'] as const).map((s) => (
          <button key={s} className={`btn w-full text-left ${stateFilter === s ? 'btn-primary' : ''}`} onClick={() => setStateFilter(s)}>
            <span className={`badge ${stateTone[s]}`}>{s}</span> <span className="ml-2">{stateCounts[s]}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
