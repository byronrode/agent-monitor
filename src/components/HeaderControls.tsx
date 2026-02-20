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
    <header className="topbar">
      <div>
        <h1 className="topbar-title">Agent Monitor</h1>
        <div className="topbar-subtitle">live orchestration dashboard</div>
      </div>
      <div className="topbar-controls">
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
