import { useEffect, useMemo, useState } from 'react'
import { fetchReporting, fetchRunDetail, fetchRuns } from './lib/api'
import type { Reporting, Run, RunDetail, RunState } from './lib/types'
import { HeaderControls } from './components/HeaderControls'
import { AgentSidebar } from './components/AgentSidebar'
import { MetricCards } from './components/MetricCards'
import { LanesBoard } from './components/LanesBoard'
import { DetailSheet } from './components/DetailSheet'
import { ReportingChart } from './components/ReportingChart'
import { runState } from './lib/utils'

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
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(themeKey, dark ? 'dark' : 'light')
  }, [dark])

  const load = async () => {
    const params = new URLSearchParams({ limit: '250', offset: '0' })
    const r = await fetchRuns(params)
    setRuns(r.items)
    setLastUpdate(new Date().toLocaleTimeString())
    const reportDays = reportPeriod === 'daily' ? '14' : reportPeriod === 'weekly' ? '84' : '365'
    const bucketCount = reportPeriod === 'daily' ? '14' : '12'
    const days = page === 'reporting' ? reportDays : '1'
    const rp = await fetchReporting(new URLSearchParams({ days, period: reportPeriod, bucketCount, scope: 'all', includeRunning: '1', includeStaleRunning: '1' }))
    setReporting(rp)
  }

  useEffect(() => {
    load()
    if (intervalSec <= 0) return
    const id = setInterval(load, intervalSec * 1000)
    return () => clearInterval(id)
  }, [intervalSec, page, reportPeriod])

  const filteredRuns = useMemo(() => {
    let list = [...runs]
    if (selectedAgent !== 'all') list = list.filter((r) => r.agentId === selectedAgent)
    if (stateFilter !== 'all') list = list.filter((r) => (r.status === 'running' ? runState(r) : r.status) === stateFilter)
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

      <div className="flex gap-1 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 md:px-8">
        <button className={`rounded-lg border px-3 py-1.5 font-mono text-[0.72rem] ${page === 'monitor' ? 'border-[var(--accent-active-border-soft)] bg-[var(--accent-active-bg-soft)] text-[var(--text)]' : 'border-transparent text-[var(--text-2)]'}`} onClick={() => setPage('monitor')}>Monitor</button>
        <button className={`rounded-lg border px-3 py-1.5 font-mono text-[0.72rem] ${page === 'reporting' ? 'border-[var(--accent-active-border-soft)] bg-[var(--accent-active-bg-soft)] text-[var(--text)]' : 'border-transparent text-[var(--text-2)]'}`} onClick={() => setPage('reporting')}>Reporting</button>
      </div>

      {page === 'monitor' ? (
        <div className="flex min-h-[calc(100vh-94px)] max-lg:flex-col">
          <AgentSidebar runs={runs} selectedAgent={selectedAgent} setSelectedAgent={setSelectedAgent} stateFilter={stateFilter} setStateFilter={setStateFilter} />
          <main className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-6">
            <MetricCards runs={filteredRuns} />
            <div className="mb-6 grid grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))] gap-3 rounded-[10px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-tint-1),var(--surface-tint-0))] p-3 max-lg:grid-cols-1">
              <div className="flex min-w-0 flex-col gap-1.5">
                <label className="pl-0.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-[var(--text-3)]">Search</label>
                <input className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 font-mono text-[0.78rem]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search label, task, agent, or model" />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label className="pl-0.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-[var(--text-3)]">Status</label>
                <select className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 font-mono text-[0.78rem]" value={stateFilter} onChange={(e) => setStateFilter(e.target.value as RunState | 'all')}><option value="all">all statuses</option><option value="running">running</option><option value="quiet">quiet</option><option value="stalled">stalled</option><option value="dead">dead</option></select>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label className="pl-0.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-[var(--text-3)]">Time window</label>
                <select className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 font-mono text-[0.78rem]" value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)}><option value="0">all time</option><option value="1">last 1h</option><option value="6">last 6h</option><option value="24">last 24h</option><option value="168">last 7d</option></select>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label className="pl-0.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-[var(--text-3)]">Actions</label>
                <button className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 font-mono text-[0.76rem] text-[var(--text-2)]" onClick={() => { setSearch(''); setStateFilter('all'); setTimeWindow('24') }}>Clear filters</button>
              </div>
            </div>
            <LanesBoard runs={filteredRuns} laneMode={laneMode} onSelect={openDetail} />
          </main>
        </div>
      ) : (
        <main className="mx-auto max-w-[1240px] px-4 py-6 md:px-8"><ReportingChart data={reporting} period={reportPeriod} onPeriodChange={setReportPeriod} /></main>
      )}
      <DetailSheet run={selectedRun} close={() => setSelectedRun(undefined)} />
    </div>
  )
}
