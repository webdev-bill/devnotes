import { useMemo, useState } from 'react'
import ToolPageLayout from '../components/ToolPageLayout'
import { timezoneCities } from '../data/timezoneCities'
import {
  buildWindow,
  dayDiff,
  dayDiffSuffix,
  formatDate,
  formatTime,
  getBrowserTimeZone,
  getWorkingHoursStatus,
  getZonedParts,
  type WorkingHoursStatus,
  type ZonedParts,
} from '../lib/timezones'

const QUICK_ADD = [
  { label: 'US Pacific', zone: 'America/Los_Angeles' },
  { label: 'UK', zone: 'Europe/London' },
  { label: 'Philippines', zone: 'Asia/Manila' },
]

const WORKING_HOURS_STYLE: Record<WorkingHoursStatus, { dot: string; text: string; label: string }> = {
  // Reuses the app's existing accent roles rather than stock traffic-light
  // colors — `open`/`closed` map cleanly onto `string` (green) and `flag`
  // (red), which already carry "good"/"bad" meaning elsewhere in this app.
  // There's no existing "caution" role, so `caution` borrows the amber tone
  // the JWT decoder already established for "not wrong, just needs a second
  // look" — see docs/server-setup-runbook.md, same reasoning applies here.
  open: { dot: 'bg-string', text: 'text-string', label: 'working hours' },
  caution: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-500', label: 'early / late' },
  closed: { dot: 'bg-flag', text: 'text-flag', label: 'outside hours' },
}

function cityLabelForZone(zone: string): string {
  const match = timezoneCities.find((city) => city.zone === zone)
  if (match) return match.label
  const [continent, ...rest] = zone.split('/')
  return rest.length > 0 ? rest.join('/').replace(/_/g, ' ') : continent
}

function zoneLine(zone: string, parts: ZonedParts, diff: number): string {
  return `${cityLabelForZone(zone)} — ${formatDate(parts)}, ${formatTime(parts)} ${parts.tzAbbrev}${dayDiffSuffix(diff, 'long')}`
}

export default function TimezoneScheduler() {
  const [referenceZone, setReferenceZone] = useState<string | null>(() => getBrowserTimeZone())
  const [zones, setZones] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [anchorMs, setAnchorMs] = useState(() => Date.now())
  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedZone, setCopiedZone] = useState<string | null>(null)

  const supportsBrowseAll = typeof Intl.supportedValuesOf === 'function'

  const windowInfo = useMemo(
    () => (referenceZone ? buildWindow(referenceZone, new Date()) : null),
    [referenceZone],
  )

  const sliderIndex = useMemo(() => {
    if (!windowInfo) return 0
    const raw = Math.round((anchorMs - windowInfo.startUtcMs) / (windowInfo.stepMinutes * 60_000))
    return Math.min(windowInfo.stepCount - 1, Math.max(0, raw))
  }, [windowInfo, anchorMs])

  const anchorInstant = useMemo(() => {
    if (!windowInfo) return null
    return new Date(windowInfo.startUtcMs + sliderIndex * windowInfo.stepMinutes * 60_000)
  }, [windowInfo, sliderIndex])

  const referenceParts = useMemo(
    () => (anchorInstant && referenceZone ? getZonedParts(anchorInstant, referenceZone) : null),
    [anchorInstant, referenceZone],
  )

  const allZonesByContinent = useMemo(() => {
    if (!supportsBrowseAll) return null
    let all: string[]
    try {
      all = Intl.supportedValuesOf('timeZone').filter((zone) => zone.includes('/') && !zone.startsWith('Etc/'))
    } catch {
      return null
    }
    const groups = new Map<string, string[]>()
    for (const zone of all) {
      const continent = zone.split('/')[0]
      const list = groups.get(continent) ?? []
      list.push(zone)
      groups.set(continent, list)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportsBrowseAll])

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []
    return timezoneCities
      .filter((city) => city.label.toLowerCase().includes(query) || city.zone.toLowerCase().includes(query))
      .filter((city) => city.zone !== referenceZone && !zones.includes(city.zone))
      .slice(0, 8)
  }, [search, referenceZone, zones])

  function addZone(zone: string) {
    setSearch('')
    if (!referenceZone) {
      setReferenceZone(zone)
      return
    }
    if (zone === referenceZone || zones.includes(zone)) return
    setZones([...zones, zone])
  }

  function removeZone(zone: string) {
    if (zone === referenceZone) {
      setReferenceZone(zones[0] ?? null)
      setZones(zones.slice(1))
      return
    }
    setZones(zones.filter((z) => z !== zone))
  }

  function makeReference(zone: string) {
    if (!referenceZone || zone === referenceZone) return
    setZones([referenceZone, ...zones.filter((z) => z !== zone)])
    setReferenceZone(zone)
  }

  async function copyText(text: string, onDone: () => void) {
    try {
      await navigator.clipboard.writeText(text)
      onDone()
    } catch {
      // Clipboard access can be denied (permissions, insecure context) —
      // nothing destructive either way, just no confirmation shown.
    }
  }

  function handleCopyAll() {
    if (!referenceParts || !anchorInstant || !referenceZone) return
    const lead = `${formatDate(referenceParts)}, ${formatTime(referenceParts)} ${referenceParts.tzAbbrev}`
    const rest = zones.map((zone) => {
      const parts = getZonedParts(anchorInstant, zone)
      const diff = dayDiff(parts, referenceParts)
      return `${formatTime(parts)} ${parts.tzAbbrev}${dayDiffSuffix(diff, 'long')}`
    })
    void copyText([lead, ...rest].join(' / '), () => {
      setCopiedAll(true)
      window.setTimeout(() => setCopiedAll(false), 1500)
    })
  }

  function handleCopyZone(zone: string, line: string) {
    void copyText(line, () => {
      setCopiedZone(zone)
      window.setTimeout(() => setCopiedZone((current) => (current === zone ? null : current)), 1500)
    })
  }

  // `referenceZone` auto-populates from the browser's own timezone on a
  // normal page load, so gating the quick-add invite on "is there a
  // reference" would make it nearly unreachable — the state that's
  // actually empty from a user's perspective is "no comparison zones
  // added yet", i.e. `zones.length === 0`, independent of the reference.
  const hasComparisonZones = zones.length > 0
  const quickAddChips = QUICK_ADD.filter((chip) => chip.zone !== referenceZone && !zones.includes(chip.zone))

  return (
    <ToolPageLayout
      title="Timezone Scheduler"
      description="Line up a meeting time across every timezone your team works in — entirely in your browser, using your device's own timezone database."
    >
      <p className="font-body text-xs text-ink/50">
        Runs entirely client-side. Nothing you add here leaves your browser.
      </p>

      <div className="mt-4">
        <label htmlFor="zone-search" className="font-display text-xs tracking-wide text-ink/60 uppercase">
          Add a city or timezone
        </label>
        <input
          id="zone-search"
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search e.g. &quot;Manila&quot;, &quot;London&quot;, &quot;America/Denver&quot;..."
          className="mt-1 block w-full rounded-md border border-rule bg-panel px-3 py-2 font-body text-sm text-ink shadow-sm focus:border-keyword focus:outline-none"
          autoComplete="off"
        />

        {searchResults.length > 0 && (
          <div className="mt-1 divide-y divide-rule rounded-md border border-rule bg-panel">
            {searchResults.map((city) => (
              <button
                key={city.zone + city.label}
                type="button"
                onClick={() => addZone(city.zone)}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-paper/60"
              >
                <span className="font-display text-sm text-ink">{city.label}</span>
                <span className="font-display text-xs text-ink/40">{city.zone}</span>
              </button>
            ))}
          </div>
        )}

        {supportsBrowseAll && allZonesByContinent && (
          <details className="mt-2">
            <summary className="cursor-pointer font-display text-xs text-keyword hover:underline">
              Browse all time zones
            </summary>
            <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-rule bg-panel p-2">
              {allZonesByContinent.map(([continent, zoneList]) => (
                <div key={continent} className="mb-3 last:mb-0">
                  <p className="font-display text-xs font-semibold tracking-wide text-ink/50 uppercase">
                    {continent.replace(/_/g, ' ')}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {zoneList
                      .filter((zone) => zone !== referenceZone && !zones.includes(zone))
                      .map((zone) => (
                        <button
                          key={zone}
                          type="button"
                          onClick={() => addZone(zone)}
                          className="rounded border border-rule px-2 py-1 font-display text-xs text-ink/70 hover:border-keyword hover:text-keyword"
                        >
                          {zone.split('/').slice(1).join('/').replace(/_/g, ' ') || zone}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {!hasComparisonZones && quickAddChips.length > 0 && (
        <div className="mt-6 rounded-md border border-dashed border-rule bg-panel px-4 py-6 text-center">
          <p className="font-body text-sm text-ink/60">
            Add a timezone above to start comparing — or jump-start it with one of these:
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {quickAddChips.map((chip) => (
              <button
                key={chip.zone}
                type="button"
                onClick={() => addZone(chip.zone)}
                className="rounded-md border border-keyword/40 bg-keyword/5 px-3 py-1.5 font-display text-xs text-keyword hover:bg-keyword/10"
              >
                + {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {windowInfo && referenceParts && anchorInstant && referenceZone && (
        <>
          <div className="mt-6 rounded-md border border-rule bg-panel px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-sm text-ink">
                {formatDate(referenceParts)}, {formatTime(referenceParts)}{' '}
                <span className="text-ink/40">({referenceParts.tzAbbrev})</span>
              </span>
              <button
                type="button"
                onClick={() => setAnchorMs(Date.now())}
                className="font-display text-xs text-keyword hover:underline"
              >
                jump to now
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={windowInfo.stepCount - 1}
              step={1}
              value={sliderIndex}
              onChange={(event) =>
                setAnchorMs(windowInfo.startUtcMs + Number(event.target.value) * windowInfo.stepMinutes * 60_000)
              }
              className="mt-3 w-full accent-keyword"
            />
            <div className="mt-1 flex justify-between font-display text-[10px] text-ink/40">
              <span>yesterday 00:00</span>
              <span>today</span>
              <span>tomorrow 23:45</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="font-display text-xs tracking-wide text-ink/60 uppercase">Zones</span>
            <button
              type="button"
              onClick={handleCopyAll}
              className="rounded-md border border-keyword/40 bg-keyword/5 px-3 py-1.5 font-display text-xs font-medium text-keyword hover:bg-keyword/10"
            >
              {copiedAll ? 'copied!' : 'copy all'}
            </button>
          </div>

          <div className="mt-2 divide-y divide-rule border-t border-rule">
            {[referenceZone, ...zones].map((zone) => {
              const isReference = zone === referenceZone
              const parts = getZonedParts(anchorInstant, zone)
              const diff = isReference ? 0 : dayDiff(parts, referenceParts)
              const status = getWorkingHoursStatus(parts.hour24)
              const style = WORKING_HOURS_STYLE[status]
              const line = zoneLine(zone, parts, diff)

              return (
                <div key={zone} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-display text-sm text-ink">{cityLabelForZone(zone)}</span>
                      <span className="font-display text-xs text-ink/40">{zone}</span>
                      {isReference && (
                        <span className="rounded border border-keyword/40 px-1.5 py-0.5 font-display text-[10px] tracking-wide text-keyword uppercase">
                          reference
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-xs">
                      <span className={`inline-flex items-center gap-1.5 ${style.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {style.label}
                      </span>
                      <span className="text-ink/70">
                        {formatTime(parts)} {parts.tzAbbrev}
                      </span>
                      {diff !== 0 && (
                        <span className="text-ink/40">{dayDiffSuffix(diff, 'short').trim()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 font-display text-xs">
                    <button
                      type="button"
                      onClick={() => handleCopyZone(zone, line)}
                      className="text-keyword hover:underline"
                    >
                      {copiedZone === zone ? 'copied!' : 'copy'}
                    </button>
                    {!isReference && (
                      <button
                        type="button"
                        onClick={() => makeReference(zone)}
                        className="text-ink/50 hover:text-keyword hover:underline"
                      >
                        make reference
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeZone(zone)}
                      aria-label={`Remove ${cityLabelForZone(zone)}`}
                      className="text-ink/40 hover:text-flag"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </ToolPageLayout>
  )
}
