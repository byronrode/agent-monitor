type Props = {
  page: 'monitor' | 'reporting'
  setPage: (p: 'monitor' | 'reporting') => void
  laneMode: 'lanes' | 'list'
  setLaneMode: (m: 'lanes' | 'list') => void
  interval: number
  setIntervalSec: (n: number) => void
  dark: boolean
  toggleTheme: () => void
  refresh: () => void
}

export function HeaderControls(props: Props) {
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div>
        <h1 className="text-lg font-semibold">Agent Monitor</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={`btn ${props.page === 'monitor' ? 'btn-primary' : ''}`} onClick={() => props.setPage('monitor')}>Monitor</button>
        <button className={`btn ${props.page === 'reporting' ? 'btn-primary' : ''}`} onClick={() => props.setPage('reporting')}>Reporting</button>
        <button className="btn" onClick={() => props.setLaneMode(props.laneMode === 'lanes' ? 'list' : 'lanes')}>{props.laneMode}</button>
        <select className="btn" value={props.interval} onChange={(e) => props.setIntervalSec(Number(e.target.value))}>
          <option value={5}>5s</option><option value={15}>15s</option><option value={30}>30s</option><option value={60}>60s</option>
        </select>
        <button className="btn" onClick={props.toggleTheme}>{props.dark ? 'Light' : 'Dark'}</button>
        <button className="btn" onClick={props.refresh}>Refresh</button>
      </div>
    </header>
  )
}
