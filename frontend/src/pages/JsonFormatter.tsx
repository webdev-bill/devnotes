import { useMemo, useState } from 'react'
import { labelClass } from '../components/formStyles'
import LineNumberedTextarea from '../components/LineNumberedTextarea'
import ToolPageLayout from '../components/ToolPageLayout'

type Indent = 2 | 4

type Result =
  | { status: 'idle' }
  | { status: 'success'; formatted: string }
  | { status: 'error'; message: string; lineText?: string; caretOffset?: number }

function lineColFromPosition(text: string, position: number): { line: number; column: number } {
  const upTo = text.slice(0, Math.max(0, Math.min(position, text.length)))
  const lines = upTo.split('\n')
  return { line: lines.length, column: lines[lines.length - 1].length + 1 }
}

// V8 (Chrome/Edge/Node) JSON.parse errors embed a raw character offset as
// "...at position N" — not itself useful to a human staring at a textarea.
// Pull that offset back out and translate it into the line/column plus the
// offending source line a reader can actually act on. Engines that don't
// report a position (e.g. Firefox's own line/column-only message) just fall
// back to showing JSON.parse's message as-is, which beats hiding it.
function describeJsonError(err: unknown, text: string): Result {
  const message = err instanceof Error ? err.message : 'Invalid JSON.'
  const match = message.match(/position (\d+)/)
  if (!match) return { status: 'error', message }

  const position = Number(match[1])
  const { line, column } = lineColFromPosition(text, position)
  const lineText = text.split('\n')[line - 1] ?? ''

  return {
    status: 'error',
    message: `Invalid JSON at line ${line}, column ${column}.`,
    lineText,
    caretOffset: column - 1,
  }
}

export default function JsonFormatter() {
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState<Indent>(2)
  const [copied, setCopied] = useState(false)

  const result: Result = useMemo(() => {
    if (!input.trim()) return { status: 'idle' }
    try {
      const parsed: unknown = JSON.parse(input)
      return { status: 'success', formatted: JSON.stringify(parsed, null, indent) }
    } catch (err) {
      return describeJsonError(err, input)
    }
  }, [input, indent])

  async function handleCopy() {
    if (result.status !== 'success') return
    try {
      await navigator.clipboard.writeText(result.formatted)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be denied (permissions, insecure context) —
      // nothing destructive either way, so just leave the button unclicked.
    }
  }

  return (
    <ToolPageLayout
      title="JSON Formatter"
      description="Paste JSON to pretty-print and validate it — entirely in your browser, nothing here is sent anywhere."
    >
      <div>
        <label htmlFor="json-input" className={labelClass}>
          Raw JSON
        </label>
        <div className="mt-1">
          <LineNumberedTextarea
            id="json-input"
            rows={14}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder='{"hello": "world"}'
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className={labelClass}>Indent</span>
        <div className="flex gap-1">
          {([2, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setIndent(n)}
              className={`rounded-md border px-3 py-1.5 font-display text-xs font-medium ${
                indent === n
                  ? 'border-keyword bg-keyword/5 text-keyword'
                  : 'border-rule text-ink/60 hover:bg-paper'
              }`}
            >
              {n} spaces
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <span className={labelClass}>Output</span>
          {result.status === 'success' && (
            <button
              type="button"
              onClick={handleCopy}
              className="font-display text-xs text-keyword hover:underline"
            >
              {copied ? 'copied!' : 'copy to clipboard'}
            </button>
          )}
        </div>

        <div className="mt-1">
          {result.status === 'idle' && (
            <p className="rounded-md border border-rule bg-panel px-3 py-2 font-body text-sm text-ink/40">
              Paste some JSON above to see it formatted here.
            </p>
          )}

          {result.status === 'error' && (
            <div className="rounded-md border border-flag/30 bg-flag/5 px-4 py-3">
              <p className="font-display text-xs font-semibold tracking-wide text-flag uppercase">
                Invalid JSON
              </p>
              <p className="mt-1 font-body text-sm text-ink">{result.message}</p>
              {result.lineText !== undefined && (
                <pre className="mt-2 overflow-x-auto rounded bg-paper px-3 py-2 font-display text-xs text-ink/80">
                  <code>
                    {result.lineText}
                    {'\n'}
                    {' '.repeat(result.caretOffset ?? 0)}^
                  </code>
                </pre>
              )}
            </div>
          )}

          {result.status === 'success' && (
            <pre className="max-h-[32rem] overflow-auto rounded-md border border-rule bg-panel px-3 py-2 font-display text-xs text-ink">
              <code>{result.formatted}</code>
            </pre>
          )}
        </div>
      </div>
    </ToolPageLayout>
  )
}
