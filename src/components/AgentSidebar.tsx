import type { Run, RunState } from '../lib/types'
import { runState } from '../lib/utils'

type Props = {
  runs: Run[]
  selectedAgent: string
  setSelectedAgent: (v: string) => void
  stateFilter: RunState | 'all'
  setStateFilter: (v: RunState | 'all') => void
}

const stateColor: Record<string, string> = { running: 'var(--green)', quiet: 'var(--amber)', stalled: 'var(--red)', dead: 'var(--text-3)' }

export function AgentSidebar({ runs, selectedAgent, setSelectedAgent }: Props) {
  const ids = Array.from(new Set(runs.map((r) => r.agentId))).sort()
  const byAgent = new Map<string, Run[]>()
  runs.forEach((r) => byAgent.set(r.agentId, [...(byAgent.get(r.agentId) || []), r]))

  return (
    <aside className="sidebar">
      <div className="sidebar-title">Agents</div>
      <div className={`agent-item ${selectedAgent === 'all' ? 'active' : ''}`} onClick={() => setSelectedAgent('all')}><span className="dot" style={{ background: 'var(--blue)' }} /><span>all agents</span><span className="count">{runs.length}</span></div>
      {ids.map((id) => {
        const list = byAgent.get(id) || []
        const st = list[0] ? runState(list[0]) : 'dead'
        return <div key={id} className={`agent-item ${selectedAgent === id ? 'active' : ''}`} onClick={() => setSelectedAgent(id)}><span className="dot" style={{ background: stateColor[st] }} /><span>{id}</span><span className="count">{list.length}</span></div>
      })}
    </aside>
  )
}
