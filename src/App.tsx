import { useEffect, useMemo, useState } from 'react'
import { fetchReporting, fetchRunDetail, fetchRuns } from './lib/api'
import type { Reporting, Run, RunDetail, RunState } from './lib/types'
import { HeaderControls } from './components/HeaderControls'
import { AgentSidebar } from './components/AgentSidebar'
import { MetricCards } from './components/MetricCards'
import { LanesBoard } from './components/LanesBoard'
import { DetailSheet } from './components/DetailSheet'
import { ReportingChart } from './components/ReportingChart'

const themeKey = 'agent-monitor-theme'

export default function App() {
  const [page, setPage] = useState<'monitor' | 'reporting'>('monitor')
  const [laneMode, setLaneMode] = useState<'lanes' | 'list'>('lanes')
  const [intervalSec, setIntervalSec] = useState(15)
  const [runs, setRuns] = useState<Run[]>([])
  const [reporting, setReporting] = useState<Reporting>()
  const [selectedRun, setSelectedRun] = useState<RunDetail>()
  const [selectedAgent, setSelectedAgent] = useState('all')
  const [stateFilter, setStateFilter] = useState<RunState | 'all'>('all')
  const [dark, setDark] = useState(() => localStorage.getItem(themeKey) !== 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(themeKey, dark ? 'dark' : 'light')
  }, [dark])

  const load = async () => {
    const params = new URLSearchParams({ limit: '250', offset: '0' })
    if (selectedAgent !== 'all') params.set('agentId', selectedAgent)
    const r = await fetchRuns(params)
    setRuns(r.items)
    const days = page === 'reporting' ? '14' : '1'
    const rp = await fetchReporting(new URLSearchParams({ days, scope: 'all', includeRunning: '1', includeStaleRunning: '1' }))
    setReporting(rp)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, intervalSec * 1000)
    return () => clearInterval(id)
  }, [intervalSec, selectedAgent, page])

  const filteredRuns = useMemo(() => (selectedAgent === 'all' ? runs : runs.filter((r) => r.agentId === selectedAgent)), [runs, selectedAgent])

  const openDetail = async (id: string) => setSelectedRun(await fetchRunDetail(id))

  return (
    <div className="app-shell">
      <HeaderControls page={page} setPage={setPage} laneMode={laneMode} setLaneMode={setLaneMode} interval={intervalSec} setIntervalSec={setIntervalSec} dark={dark} toggleTheme={() => setDark((d) => !d)} refresh={load} />
      <main className="layout-main">
        <AgentSidebar runs={runs} selectedAgent={selectedAgent} setSelectedAgent={setSelectedAgent} stateFilter={stateFilter} setStateFilter={setStateFilter} />
        <section className="space-y-3">
          <MetricCards runs={reporting?.totals.runCount ?? filteredRuns.length} runtimeMs={reporting?.totals.runtimeMs ?? 0} agents={reporting?.totals.agentCount ?? 0} />
          {page === 'monitor' ? (
            <LanesBoard runs={filteredRuns} laneMode={laneMode} onSelect={openDetail} selectedRun={selectedRun} stateFilter={stateFilter} />
          ) : (
            <ReportingChart data={reporting} />
          )}
        </section>
      </main>
      <DetailSheet run={selectedRun} close={() => setSelectedRun(undefined)} />
    </div>
  )
}
