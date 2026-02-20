import { useState } from 'react'
import type { RunDetail } from '../lib/types'

export function DetailSheet({ run, close }: { run?: RunDetail; close: () => void }) {
  if (!run) return null
  return (
    <div className="fixed inset-0 z-[180] bg-[var(--sheet-backdrop)]" onClick={close}>
      <aside className="fixed right-0 top-0 z-[190] flex h-screen w-[min(680px,92vw)] flex-col overflow-auto border-l border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sheet-shadow)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Run detail</h3>
          <button className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 font-mono text-[0.72rem]" onClick={close}>Close</button>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
            <div><b>Agent:</b> {run.agentId}</div>
            <div><b>Run:</b> {run.runId}</div>
            <div><b>Task:</b> {run.task}</div>
          </div>
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
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-[var(--text-3)]">{role}</div>
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
    <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2">
      <div className="text-sm font-medium">Tool: {tool.name || 'unknown'}</div>
      <button className="mt-2 h-7 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 font-mono text-[0.7rem]" onClick={() => setOpenArgs((v) => !v)}>Args {openArgs ? '−' : '+'}</button>
      {openArgs && <pre className="mt-2 max-h-56 overflow-auto rounded bg-[var(--surface-3)] p-2 text-xs">{args}</pre>}
      <button className="mt-2 h-7 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 font-mono text-[0.7rem]" onClick={() => setOpenRes((v) => !v)}>Result {openRes ? '−' : '+'}</button>
      {openRes && <pre className="mt-2 max-h-56 overflow-auto rounded bg-[var(--surface-3)] p-2 text-xs">{res}</pre>}
    </div>
  )
}
