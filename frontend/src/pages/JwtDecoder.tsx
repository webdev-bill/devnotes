import { useMemo, useState } from 'react'
import { inputClass, labelClass } from '../components/formStyles'
import ToolPageLayout from '../components/ToolPageLayout'

type Result =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; header: string; payload: string; signature: string }

const BASE64URL_RE = /^[A-Za-z0-9_-]*$/

// atob() only understands standard base64, so a JWT segment (base64url —
// '-'/'_' instead of '+'/'/', no padding) needs translating first. atob()
// itself throws on genuinely invalid input, which is what surfaces the
// "not valid base64url" error case below.
function decodeBase64Url(segment: string): string {
  if (!BASE64URL_RE.test(segment)) {
    throw new Error('not valid base64url')
  }
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=')
  const binary = atob(base64)
  // atob gives us a byte string; JWT JSON is UTF-8, so decode it as such
  // rather than treating each byte as a UTF-16 code unit.
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

function decodeJwt(token: string): Result {
  const segments = token.trim().split('.')
  if (segments.length !== 3) {
    return {
      status: 'error',
      message: `Expected 3 segments (header.payload.signature), found ${segments.length}.`,
    }
  }
  const [headerSeg, payloadSeg, signatureSeg] = segments

  const parseSegment = (segment: string, name: string): string => {
    let decoded: string
    try {
      decoded = decodeBase64Url(segment)
    } catch {
      throw new Error(`${name} segment is not valid base64url.`)
    }
    try {
      return JSON.stringify(JSON.parse(decoded), null, 2)
    } catch {
      throw new Error(`${name} segment decoded but is not valid JSON.`)
    }
  }

  if (!BASE64URL_RE.test(signatureSeg) || signatureSeg.length === 0) {
    return { status: 'error', message: 'Signature segment is not valid base64url.' }
  }

  try {
    const header = parseSegment(headerSeg, 'Header')
    const payload = parseSegment(payloadSeg, 'Payload')
    return { status: 'success', header, payload, signature: signatureSeg }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Could not decode token.' }
  }
}

export default function JwtDecoder() {
  const [input, setInput] = useState('')

  const result: Result = useMemo(() => {
    if (!input.trim()) return { status: 'idle' }
    return decodeJwt(input)
  }, [input])

  return (
    <ToolPageLayout
      title="JWT Decoder"
      description="Decode a JSON Web Token's header and payload — entirely in your browser. This does not verify the signature."
    >
      <p className="font-body text-xs text-ink/50">
        Runs entirely client-side. Nothing you paste here leaves your browser.
      </p>

      <div className="mt-4 rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3">
        <p className="font-display text-xs font-semibold tracking-wide text-amber-600 uppercase dark:text-amber-500">
          Not verified
        </p>
        <p className="mt-1 font-body text-sm text-ink">
          This only decodes the token&apos;s header and payload — it does not check the signature. A token that
          decodes successfully is not proof that it&apos;s authentic, unexpired, or was issued by anyone you trust.
        </p>
      </div>

      <div className="mt-4">
        <label htmlFor="jwt-input" className={labelClass}>
          JWT
        </label>
        <textarea
          id="jwt-input"
          rows={4}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
          className={`${inputClass} font-display`}
          spellCheck={false}
        />
      </div>

      <div className="mt-6">
        <span className={labelClass}>Output</span>

        <div className="mt-1">
          {result.status === 'idle' && (
            <p className="rounded-md border border-rule bg-panel px-3 py-2 font-body text-sm text-ink/40">
              Paste a JWT above to decode its header and payload here.
            </p>
          )}

          {result.status === 'error' && (
            <div className="rounded-md border border-flag/30 bg-flag/5 px-4 py-3">
              <p className="font-display text-xs font-semibold tracking-wide text-flag uppercase">Decode error</p>
              <p className="mt-1 font-body text-sm text-ink">{result.message}</p>
            </div>
          )}

          {result.status === 'success' && (
            <div className="space-y-4">
              <div>
                <span className="font-display text-xs tracking-wide text-ink/60 uppercase">Header</span>
                <pre className="mt-1 max-h-[16rem] overflow-auto rounded-md border border-rule bg-panel px-3 py-2 font-display text-xs text-ink">
                  <code>{result.header}</code>
                </pre>
              </div>

              <div>
                <span className="font-display text-xs tracking-wide text-ink/60 uppercase">Payload</span>
                <pre className="mt-1 max-h-[16rem] overflow-auto rounded-md border border-rule bg-panel px-3 py-2 font-display text-xs text-ink">
                  <code>{result.payload}</code>
                </pre>
              </div>

              <div>
                <span className="font-display text-xs tracking-wide text-ink/40 uppercase">
                  Signature (raw, not decoded)
                </span>
                <p className="mt-1 font-body text-xs text-ink/40">
                  Opaque bytes — not base64url-encoded JSON like the other two segments, so it isn&apos;t decoded
                  here.
                </p>
                <pre className="mt-1 max-h-[8rem] overflow-auto rounded-md border border-dashed border-rule bg-paper px-3 py-2 font-display text-xs break-all text-ink/60">
                  <code>{result.signature}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  )
}
