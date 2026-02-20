import { useState } from 'react'
import type { RunDetail } from '../lib/types'

export function DetailSheet({ run, close }: { run?: RunDetail; close: () => void }) {
  if (!run) return null
  return (
    <div className="sheet-backdrop" onClick={close}>
      <aside className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header"><h3 className="topbar-title">Run detail</h3><button className="btn" onClick={close}>Close</button></div>
        <div className="space-y-3">
          <div className="card text-sm"><div><b>Agent:</b> {run.agentId}</div><div><b>Run:</b> {run.runId}</div><div><b>Task:</b> {run.task}</div></div>
          <div className="space-y-2">
            {run.messages?.map((m, i) => <Message key={i} role={m.role} text={m.text} tools={m.toolCalls || []} />)}
          </div>
        </div>
      </aside>
    </div>
  )
}

function Message({ role, text, tools }: { role: string; text: string; tools: Array<{ name?: string; arguments?: unknown; result?: unknown }> }) {
  return (
    <div className="card">
      <div className="mb-2 lane-title">{role}</div>
      <pre className="whitespace-pre-wrap text-sm">{text}</pre>
      {tools.length > 0 && (
        <div className="mt-3 space-y-2">
          {tools.map((t, i) => <ToolCall key={i} tool={t} />)}
        </div>
      )}
    </div>
  )
}

function ToolCall({ tool }: { tool: { name?: string; arguments?: unknown; result?: unknown } }) {
  const [openArgs, setOpenArgs] = useState(false)
  const [openRes, setOpenRes] = useState(false)
  const args = JSON.stringify(tool.arguments ?? {}, null, 2)
  const res = JSON.stringify(tool.result ?? {}, null, 2)
  return (
    <div className="rounded border p-2" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
      <div className="text-sm font-medium">Tool: {tool.name || 'unknown'}</div>
      <button className="btn mt-2" onClick={() => setOpenArgs((v) => !v)}>Args {openArgs ? '−' : '+'}</button>
      {openArgs && <pre className="mt-2 max-h-56 overflow-auto rounded p-2 text-xs" style={{ background: 'var(--surface-3)' }}>{args}</pre>}
      <button className="btn mt-2" onClick={() => setOpenRes((v) => !v)}>Result {openRes ? '−' : '+'}</button>
      {openRes && <pre className="mt-2 max-h-56 overflow-auto rounded p-2 text-xs" style={{ background: 'var(--surface-3)' }}>{res}</pre>}
    </div>
  )
}
