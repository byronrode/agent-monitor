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
  const [laneMode, setLaneMode] = useState<'lanes' | 'list'>('list')
  const [intervalSec, setIntervalSec] = useState(10)
  const [runs, setRuns] = useState<Run[]>([])
  const [reporting, setReporting] = useState<Reporting>()
  const [selectedRun, setSelectedRun] = useState<RunDetail>()
  const [selectedAgent, setSelectedAgent] = useState('all')
  const [stateFilter, setStateFilter] = useState<RunState | 'all'>('all')
  const [dark, setDark] = useState(() => localStorage.getItem(themeKey) !== 'light')
  const [search, setSearch] = useState('')
  const [timeWindow, setTimeWindow] = useState('24')
  const [lastUpdate, setLastUpdate] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(themeKey, dark ? 'dark' : 'light')
  }, [dark])

  const load = async () => {
    const params = new URLSearchParams({ limit: '250', offset: '0' })
    const r = await fetchRuns(params)
    setRuns(r.items)
    setLastUpdate(new Date().toLocaleTimeString())
    const days = page === 'reporting' ? '14' : '1'
    const rp = await fetchReporting(new URLSearchParams({ days, scope: 'all', includeRunning: '1', includeStaleRunning: '1' }))
    setReporting(rp)
  }

  useEffect(() => {
    load()
    if (intervalSec <= 0) return
    const id = setInterval(load, intervalSec * 1000)
    return () => clearInterval(id)
  }, [intervalSec, page])

  const filteredRuns = useMemo(() => {
    let list = [...runs]
    if (selectedAgent !== 'all') list = list.filter((r) => r.agentId === selectedAgent)
    if (stateFilter !== 'all') list = list.filter((r) => {
      const s = r.status === 'running' ? 'running' : r.status === 'done' ? 'dead' : 'dead'
      return s === stateFilter
    })
    if (timeWindow !== '0') {
      const cutoff = Date.now() - Number(timeWindow) * 3600_000
      list = list.filter((r) => !r.startedAt || r.startedAt >= cutoff)
    }
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((r) => `${r.label || ''} ${r.task || ''} ${r.agentId || ''} ${r.model || ''}`.toLowerCase().includes(q))
    return list
  }, [runs, selectedAgent, stateFilter, timeWindow, search])

  const openDetail = async (id: string) => setSelectedRun(await fetchRunDetail(id))

  return (
    <div>
      <HeaderControls
        laneMode={laneMode}
        setLaneMode={setLaneMode}
        interval={intervalSec}
        setIntervalSec={setIntervalSec}
        dark={dark}
        toggleTheme={() => setDark((d) => !d)}
        refresh={load}
        lastUpdate={lastUpdate}
      />

      <div className="page-nav">
        <button className={`page-link ${page === 'monitor' ? 'active' : ''}`} onClick={() => setPage('monitor')}>Monitor</button>
        <button className={`page-link ${page === 'reporting' ? 'active' : ''}`} onClick={() => setPage('reporting')}>Reporting</button>
      </div>

      {page === 'monitor' ? (
        <div className="layout">
          <AgentSidebar runs={runs} selectedAgent={selectedAgent} setSelectedAgent={setSelectedAgent} stateFilter={stateFilter} setStateFilter={setStateFilter} />
          <main className="main">
            <MetricCards runs={filteredRuns} />
            <div className="filters" id="filters">
              <div className="filter-field"><label className="filter-label">Search</label><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search label, task, agent, or model" /></div>
              <div className="filter-field"><label className="filter-label">Status</label><select value={stateFilter} onChange={(e) => setStateFilter(e.target.value as RunState | 'all')}><option value="all">all statuses</option><option value="running">running</option><option value="quiet">quiet</option><option value="stalled">stalled</option><option value="dead">dead</option></select></div>
              <div className="filter-field"><label className="filter-label">Time window</label><select value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)}><option value="0">all time</option><option value="1">last 1h</option><option value="6">last 6h</option><option value="24">last 24h</option><option value="168">last 7d</option></select></div>
              <div className="filter-field"><label className="filter-label">Actions</label><button className="btn filter-clear" onClick={() => { setSearch(''); setStateFilter('all'); setTimeWindow('24') }}>Clear filters</button></div>
            </div>
            <LanesBoard runs={filteredRuns} laneMode={laneMode} onSelect={openDetail} />
          </main>
        </div>
      ) : (
        <main className="main daily-page"><ReportingChart data={reporting} /></main>
      )}
      <DetailSheet run={selectedRun} close={() => setSelectedRun(undefined)} />
    </div>
  )
}
