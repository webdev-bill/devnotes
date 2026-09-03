import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import ErrorState from '../components/ErrorState'
import { inputClass, labelClass } from '../components/formStyles'
import LoadingState from '../components/LoadingState'
import ToolPageLayout from '../components/ToolPageLayout'

type QrType = 'url' | 'text' | 'wifi'
type WifiEncryption = 'WPA' | 'WEP' | 'nopass'
type Status = 'idle' | 'loading' | 'success' | 'error'

const TYPES: { id: QrType; label: string }[] = [
  { id: 'url', label: 'URL' },
  { id: 'text', label: 'Text' },
  { id: 'wifi', label: 'Wi-Fi' },
]

// Re-render on every keystroke would re-encode dozens of times a second while
// typing — this waits for typing to pause, same pattern as the WebP tool's
// ENCODE_DEBOUNCE_MS.
const DEBOUNCE_MS = 300

// Fixed rather than user-selectable — the approved plan lists a type
// selector, per-type fields, and a download button, not an error-correction
// control. 'M' (~15% recovery) is QRCode.js's own default and a reasonable
// balance of capacity vs. resilience for a general-purpose generator.
const ERROR_CORRECTION_LEVEL = 'M' as const

// Always true black-on-white, never the app's theme tokens. A QR code's
// colors aren't a branding choice — most real-world scanners assume dark
// modules on a light background, and an inverted (light-on-dark) code is not
// reliably scannable across phone cameras. The white card this renders into
// also keeps that contrast intact against the dark theme's own background.
const QR_COLOR = { dark: '#000000', light: '#ffffff' }

// Per the (unofficial but universally-implemented, ZXing/Zebra-Crossing)
// WIFI: URI format: backslash, semicolon, comma, and double-quote inside a
// field value must be backslash-escaped, or a scanner misparses field
// boundaries — e.g. an unescaped ';' inside a password would be read as the
// end of the P field. A single regex pass handles all four characters
// without double-escaping (it matches against the original string, not its
// own output).
function escapeWifiField(value: string): string {
  return value.replace(/([\\;,"])/g, '\\$1')
}

function buildWifiPayload(ssid: string, password: string, encryption: WifiEncryption): string {
  const parts = [`T:${encryption}`, `S:${escapeWifiField(ssid)}`]
  if (encryption !== 'nopass') {
    parts.push(`P:${escapeWifiField(password)}`)
  }
  return `WIFI:${parts.join(';')};;`
}

function isPlausibleUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export default function QrCodeGenerator() {
  const [type, setType] = useState<QrType>('url')
  const [url, setUrl] = useState('https://')
  const [text, setText] = useState('')
  const [ssid, setSsid] = useState('')
  const [password, setPassword] = useState('')
  const [encryption, setEncryption] = useState<WifiEncryption>('WPA')

  // Tagged with the payload it resolved for, so a still-encoding new payload
  // doesn't briefly show the previous (already stale) result — same pattern
  // as MarkdownImage.tsx's blob-URL loader. State is only ever set from
  // inside the async .then()/.catch() callbacks below, never synchronously
  // in the effect body, so there's nothing here for oxlint's
  // set-state-in-effect rule to flag.
  type Result = { payload: string; dataUrl: string } | { payload: string; error: string }
  const [result, setResult] = useState<Result | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const payload =
    type === 'url' ? url.trim() : type === 'text' ? text.trim() : ssid.trim() ? buildWifiPayload(ssid, password, encryption) : ''

  useEffect(() => {
    if (!payload) return undefined

    let cancelled = false
    const timeout = window.setTimeout(() => {
      const options = {
        errorCorrectionLevel: ERROR_CORRECTION_LEVEL,
        margin: 2,
        color: QR_COLOR,
      }

      Promise.all([
        canvasRef.current
          ? QRCode.toCanvas(canvasRef.current, payload, { ...options, width: 280 })
          : Promise.resolve(),
        QRCode.toDataURL(payload, { ...options, width: 512 }),
      ])
        .then(([, dataUrl]) => {
          if (!cancelled) setResult({ payload, dataUrl })
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setResult({
            payload,
            error:
              err instanceof Error ? err.message : 'Could not generate a QR code for this content.',
          })
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [payload])

  // Ignore a result left over from a previous payload while the new one is
  // still encoding (or hasn't started, e.g. still inside the debounce delay).
  const current = result?.payload === payload ? result : null
  const status: Status = !payload ? 'idle' : !current ? 'loading' : 'error' in current ? 'error' : 'success'
  const errorMessage = current && 'error' in current ? current.error : ''
  const downloadUrl = current && 'dataUrl' in current ? current.dataUrl : null

  return (
    <ToolPageLayout
      title="QR Code Generator"
      description="Generate a QR code for a URL, plain text, or Wi-Fi network — entirely in your browser, nothing here is sent anywhere."
    >
      <div className="flex gap-1 border-b border-rule">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={`-mb-px inline-flex items-center gap-2 rounded-t-md border px-3 py-2 font-display text-xs transition-colors ${
              type === t.id
                ? 'border-rule border-b-panel bg-panel text-ink'
                : 'border-transparent text-ink/45 hover:bg-paper hover:text-ink/70'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${type === t.id ? 'bg-keyword' : 'bg-ink/20'}`} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-b-md rounded-tr-md border border-t-0 border-rule bg-panel p-4">
        {type === 'url' && (
          <div>
            <label htmlFor="qr-url" className={labelClass}>
              URL
            </label>
            <input
              id="qr-url"
              type="text"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              className={inputClass}
            />
            {url.trim() && !isPlausibleUrl(url.trim()) && (
              <p className="mt-1 font-body text-xs text-flag">
                This doesn&rsquo;t look like a valid URL — the QR code will still encode it as
                plain text.
              </p>
            )}
          </div>
        )}

        {type === 'text' && (
          <div>
            <label htmlFor="qr-text" className={labelClass}>
              Text
            </label>
            <textarea
              id="qr-text"
              rows={5}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Anything you want encoded…"
              className={inputClass}
            />
          </div>
        )}

        {type === 'wifi' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="qr-ssid" className={labelClass}>
                Network name (SSID)
              </label>
              <input
                id="qr-ssid"
                type="text"
                value={ssid}
                onChange={(event) => setSsid(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="qr-encryption" className={labelClass}>
                Encryption
              </label>
              <select
                id="qr-encryption"
                value={encryption}
                onChange={(event) => setEncryption(event.target.value as WifiEncryption)}
                className={inputClass}
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None</option>
              </select>
            </div>
            {encryption !== 'nopass' && (
              <div>
                <label htmlFor="qr-password" className={labelClass}>
                  Password
                </label>
                <input
                  id="qr-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        {status === 'loading' && <LoadingState />}
        {status === 'error' && <ErrorState message={errorMessage} />}
      </div>

      {/* Always mounted (not conditional on status) so canvasRef is stable
          across renders — hidden via CSS instead of unmounted, matching the
          approach the debounced effect above assumes. White card, always,
          regardless of app theme — see QR_COLOR above. */}
      <div className={`mt-6 ${status === 'success' ? '' : 'hidden'}`}>
        <div className="inline-block rounded-md border border-rule bg-white p-4">
          <canvas ref={canvasRef} />
        </div>
        <div>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download="qr-code.png"
              className="mt-4 inline-block rounded-md bg-keyword px-4 py-2 font-display text-sm text-accent-ink transition-opacity hover:opacity-90"
            >
              Download qr-code.png
            </a>
          )}
        </div>
      </div>
    </ToolPageLayout>
  )
}
