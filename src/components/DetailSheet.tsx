import { useState } from 'react'
import type { RunDetail } from '../lib/types'

export function DetailSheet({ run, close }: { run?: RunDetail; close: () => void }) {
  if (!run) return null
  return (
    <div className="fixed inset-0 z-40 bg-black/40" onClick={close}>
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white p-4 dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Run detail</h3><button className="btn" onClick={close}>Close</button></div>
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
      <div className="mb-2 text-xs uppercase text-slate-500 dark:text-zinc-400">{role}</div>
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
    <div className="rounded border border-slate-200 p-2 dark:border-zinc-700">
      <div className="text-sm font-medium">Tool: {tool.name || 'unknown'}</div>
      <button className="btn mt-2" onClick={() => setOpenArgs((v) => !v)}>Args {openArgs ? '−' : '+'}</button>
      {openArgs && <pre className="mt-2 max-h-56 overflow-auto rounded bg-slate-100 p-2 text-xs dark:bg-zinc-800">{args}</pre>}
      <button className="btn mt-2" onClick={() => setOpenRes((v) => !v)}>Result {openRes ? '−' : '+'}</button>
      {openRes && <pre className="mt-2 max-h-56 overflow-auto rounded bg-slate-100 p-2 text-xs dark:bg-zinc-800">{res}</pre>}
    </div>
  )
}
