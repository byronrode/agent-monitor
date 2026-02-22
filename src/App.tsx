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
import { clampRange, daysBetweenInclusive, defaultRangeForPeriod, todayYmd, type DateRange, type Period } from './lib/reporting'

const themeKey = 'agent-monitor-theme'
const filtersKey = 'agent-monitor-filters-v1'

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(filtersKey) || '{}')
    } catch {
      return {}
    }
  })() as Record<string, string>

  const [page, setPage] = useState<'monitor' | 'reporting'>((params.get('page') as 'monitor' | 'reporting') || (saved.page as 'monitor' | 'reporting') || 'monitor')
  const [laneMode, setLaneMode] = useState<'lanes' | 'list'>((params.get('laneMode') as 'lanes' | 'list') || (saved.laneMode as 'lanes' | 'list') || 'list')
  const [intervalSec, setIntervalSec] = useState(10)
  const [runs, setRuns] = useState<Run[]>([])
  const [reporting, setReporting] = useState<Reporting>()
  const [selectedRun, setSelectedRun] = useState<RunDetail>()
  const [selectedAgent, setSelectedAgent] = useState(params.get('agent') || saved.agent || 'all')
  const [stateFilter, setStateFilter] = useState<RunState | 'all'>((params.get('status') as RunState | 'all') || (saved.status as RunState | 'all') || 'all')
  const [dark, setDark] = useState(() => localStorage.getItem(themeKey) !== 'light')
  const [search, setSearch] = useState(params.get('q') || saved.q || '')
  const [timeWindow, setTimeWindow] = useState(params.get('window') || saved.window || '24')
  const [lastUpdate, setLastUpdate] = useState('')
  const [reportPeriod, setReportPeriod] = useState<Period>((params.get('period') as Period) || (saved.period as Period) || 'daily')
  const [reportRange, setReportRange] = useState<DateRange>(() => {
    const fallback = defaultRangeForPeriod((params.get('period') as Period) || (saved.period as Period) || 'daily')
    return clampRange({
      start: params.get('start') || saved.start || fallback.start,
      end: params.get('end') || saved.end || fallback.end,
    })
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(themeKey, dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const payload = {
      page,
      laneMode,
      agent: selectedAgent,
      status: stateFilter,
      q: search,
      window: timeWindow,
      period: reportPeriod,
      start: reportRange.start,
      end: reportRange.end,
    }
    localStorage.setItem(filtersKey, JSON.stringify(payload))

    const q = new URLSearchParams()
    Object.entries(payload).forEach(([key, value]) => {
      if (value && value !== 'all') q.set(key, String(value))
    })
    const next = `${window.location.pathname}${q.toString() ? `?${q.toString()}` : ''}`
    window.history.replaceState({}, '', next)
  }, [page, laneMode, selectedAgent, stateFilter, search, timeWindow, reportPeriod, reportRange])

  const load = async () => {
    const runParams = new URLSearchParams({ limit: '250', offset: '0' })
    const r = await fetchRuns(runParams)
    setRuns(r.items)
    setLastUpdate(new Date().toLocaleTimeString())

    const clamped = clampRange(reportRange)
    if (clamped.start !== reportRange.start || clamped.end !== reportRange.end) setReportRange(clamped)
    const days = String(daysBetweenInclusive(clamped.start, clamped.end))
    const bucketCount = reportPeriod === 'daily' ? days : reportPeriod === 'weekly' ? '16' : '12'

    const rp = await fetchReporting(new URLSearchParams({
      days: page === 'reporting' ? days : '1',
      period: reportPeriod,
      bucketCount,
      scope: 'all',
      includeRunning: '1',
      includeStaleRunning: '1',
      startDate: clamped.start,
      endDate: clamped.end,
    }))
    setReporting(rp)
  }

  useEffect(() => {
    load()
    if (intervalSec <= 0) return
    const id = setInterval(load, intervalSec * 1000)
    return () => clearInterval(id)
  }, [intervalSec, page, reportPeriod, reportRange])

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

  const onPeriodChange = (p: Period) => {
    setReportPeriod(p)
    setReportRange(clampRange(defaultRangeForPeriod(p)))
  }

  const onPrevWeek = () => {
    const start = new Date(`${reportRange.start}T00:00:00`)
    const end = new Date(`${reportRange.end}T00:00:00`)
    start.setDate(start.getDate() - 7)
    end.setDate(end.getDate() - 7)
    setReportRange(clampRange({ start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }))
  }

  const onNextWeek = () => {
    const start = new Date(`${reportRange.start}T00:00:00`)
    const end = new Date(`${reportRange.end}T00:00:00`)
    start.setDate(start.getDate() + 7)
    end.setDate(end.getDate() + 7)
    setReportRange(clampRange({ start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }, todayYmd()))
  }

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
                <button className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 font-mono text-[0.76rem] text-[var(--text-2)]" onClick={() => { setSearch(''); setStateFilter('all'); setTimeWindow('24'); setSelectedAgent('all') }}>Clear filters</button>
              </div>
            </div>
            <LanesBoard runs={filteredRuns} laneMode={laneMode} onSelect={openDetail} />
          </main>
        </div>
      ) : (
        <main className="mx-auto max-w-[1240px] px-4 py-6 md:px-8">
          <ReportingChart
            data={reporting}
            period={reportPeriod}
            onPeriodChange={onPeriodChange}
            range={reportRange}
            onRangeChange={(r) => setReportRange(clampRange(r))}
            onPrevWeek={onPrevWeek}
            onNextWeek={onNextWeek}
          />
        </main>
      )}
      <DetailSheet run={selectedRun} close={() => setSelectedRun(undefined)} />
    </div>
  )
}
