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
    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-tint-2),var(--surface-tint-0))] bg-[var(--surface)] px-4 py-3 md:px-8 md:py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <img className="h-[42px] w-[42px] rounded-lg border border-[var(--border)] bg-[var(--surface-tint-1)] p-1" src="/logo.svg" alt="Agent Monitor logo" />
        <div className="min-w-0">
          <h1 className="text-base font-semibold leading-tight">Agent Monitor</h1>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] shadow-[0_0_6px_var(--green)]" />
            <span className="truncate font-mono text-[0.72rem] text-[var(--text-3)]">{props.lastUpdate ? `updated ${props.lastUpdate}` : 'loading…'}</span>
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-1">
          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5" role="tablist" aria-label="View mode toggle">
            <button className={`h-8 rounded-md border px-3 font-mono text-[0.7rem] ${props.laneMode === 'list' ? 'border-[var(--accent-active-border)] bg-[var(--accent-active-bg)] text-[var(--accent-active-text)]' : 'border-transparent text-[var(--text-3)]'}`} onClick={() => props.setLaneMode('list')}>List</button>
            <button className={`h-8 rounded-md border px-3 font-mono text-[0.7rem] ${props.laneMode === 'lanes' ? 'border-[var(--accent-active-border)] bg-[var(--accent-active-bg)] text-[var(--accent-active-text)]' : 'border-transparent text-[var(--text-3)]'}`} onClick={() => props.setLaneMode('lanes')}>Lanes</button>
          </div>
          <div className="flex items-center gap-2 font-mono text-[0.72rem] text-[var(--text-3)]">
            <span className="text-[0.68rem] uppercase tracking-wide">Auto</span>
            <select className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 pr-7 font-mono text-[0.72rem]" value={props.interval} onChange={(e) => props.setIntervalSec(Number(e.target.value))}>
              <option value={0}>manual</option><option value={5}>5s</option><option value={10}>10s</option><option value={30}>30s</option>
            </select>
          </div>
        </div>
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] font-mono text-sm" onClick={props.toggleTheme} aria-label="Toggle color theme">{props.dark ? '☼' : '☾'}</button>
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] font-mono text-sm" onClick={props.refresh} aria-label="Refresh runs">↻</button>
      </div>
    </header>
  )
}
