type Props = {
  laneMode: 'lanes' | 'list'
  setLaneMode: (m: 'lanes' | 'list') => void
  interval: number
  setIntervalSec: (n: number) => void
  dark: boolean
  toggleTheme: () => void
  refresh: () => void
  lastUpdate: string
}

export function HeaderControls(props: Props) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <img className="brand-mark" src="/logo.svg" alt="Agent Monitor logo" />
        <div className="brand-copy">
          <h1>Agent Monitor</h1>
          <div className="subtitle-wrap"><div className="live-dot" /><span className="subtitle">{props.lastUpdate ? `updated ${props.lastUpdate}` : 'loading…'}</span></div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="header-controls-group">
          <div className="view-toggle">
            <button className={props.laneMode === 'list' ? 'active' : ''} onClick={() => props.setLaneMode('list')}>List</button>
            <button className={props.laneMode === 'lanes' ? 'active' : ''} onClick={() => props.setLaneMode('lanes')}>Lanes</button>
          </div>
          <div className="refresh-controls">
            <span className="refresh-label">Auto</span>
            <select value={props.interval} onChange={(e) => props.setIntervalSec(Number(e.target.value))}>
              <option value={0}>manual</option><option value={5}>5s</option><option value={10}>10s</option><option value={30}>30s</option>
            </select>
          </div>
        </div>
        <button className="btn header-utility-btn" onClick={props.toggleTheme} aria-label="Toggle color theme">{props.dark ? '☼' : '☾'}</button>
        <button className="btn header-utility-btn" onClick={props.refresh} aria-label="Refresh runs">↻</button>
      </div>
    </header>
  )
}
