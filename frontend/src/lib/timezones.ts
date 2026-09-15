// Timezone math built entirely on Intl — no date library, no external API.
// The one non-trivial piece is converting a *local wall-clock time in some
// IANA zone* into a real UTC instant (needed to find "yesterday 00:00 in
// Manila" as an absolute point in time). There's no direct Intl call for
// that, so it's done with the standard guess-and-correct loop: assume the
// wall time is UTC, see how far that guess actually lands once read back
// through the target zone, and correct by the gap. Offsets only change on
// whole-minute boundaries, so this converges in at most two or three passes
// for every real IANA zone — including the non-hour offsets (India +5:30,
// Nepal +5:45, Newfoundland -3:30).

export type WorkingHoursStatus = 'open' | 'caution' | 'closed'

export interface ZonedParts {
  year: number
  month: number // 1-12
  day: number
  weekday: string // short, e.g. "Tue"
  monthLabel: string // short, e.g. "Oct"
  hour12: number // 1-12
  hour24: number // 0-23
  minute: number
  dayPeriod: 'AM' | 'PM'
  tzAbbrev: string // e.g. "EST", "GMT+8" — whatever Intl gives back
}

const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

// Locale is pinned to 'en-US' deliberately, not left to the browser's
// locale — a workshop audience needs "Tue Oct 14, 2:00 PM" to read
// identically no matter whose laptop is projecting it.
const displayFormatterCache = new Map<string, Intl.DateTimeFormat>()

function getDisplayFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = displayFormatterCache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    })
    displayFormatterCache.set(timeZone, formatter)
  }
  return formatter
}

// The single source of truth for a zone's rendered time *and* its calendar
// date — both are read from one formatToParts() call so the +1/-1 day badge
// can never disagree with the time actually shown on the card.
export function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = getDisplayFormatter(timeZone).formatToParts(instant)
  const map: Record<string, string> = {}
  for (const part of parts) map[part.type] = part.value

  const dayPeriod: 'AM' | 'PM' = map.dayPeriod?.toUpperCase() === 'PM' ? 'PM' : 'AM'
  const hour12 = Number(map.hour)
  const hour24 = (hour12 % 12) + (dayPeriod === 'PM' ? 12 : 0)

  return {
    year: Number(map.year),
    month: (MONTH_INDEX[map.month] ?? 0) + 1,
    day: Number(map.day),
    weekday: map.weekday ?? '',
    monthLabel: map.month ?? '',
    hour12,
    hour24,
    minute: Number(map.minute),
    dayPeriod,
    tzAbbrev: map.timeZoneName ?? timeZone,
  }
}

function dateKeyUtcMs(parts: ZonedParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day)
}

// Whole calendar days between two zones' dates for the *same instant* — 0
// most of the time, ±1 across a midnight crossing. Not hardcoded to ±1:
// extreme real-world offset pairs (UTC-12 vs UTC+14) can span 2 days.
export function dayDiff(zoneParts: ZonedParts, referenceParts: ZonedParts): number {
  return Math.round((dateKeyUtcMs(zoneParts) - dateKeyUtcMs(referenceParts)) / 86_400_000)
}

export function formatTime(parts: ZonedParts): string {
  return `${parts.hour12}:${String(parts.minute).padStart(2, '0')} ${parts.dayPeriod}`
}

export function formatDate(parts: ZonedParts): string {
  return `${parts.weekday} ${parts.monthLabel} ${parts.day}`
}

// `long` matches the workshop's example copy ("(next day)"); `short` is
// used for the compact per-card badge.
export function dayDiffSuffix(diff: number, style: 'long' | 'short'): string {
  if (diff === 0) return ''
  if (style === 'long') {
    if (diff === 1) return ' (next day)'
    if (diff === -1) return ' (previous day)'
    return ` (${diff > 0 ? '+' : ''}${diff} days)`
  }
  const magnitude = Math.abs(diff)
  return diff > 0 ? ` +${magnitude}d` : ` -${magnitude}d`
}

export function getWorkingHoursStatus(hour24: number): WorkingHoursStatus {
  if (hour24 >= 9 && hour24 < 18) return 'open'
  if ((hour24 >= 7 && hour24 < 9) || (hour24 >= 18 && hour24 < 21)) return 'caution'
  return 'closed'
}

function getOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant)
  const map: Record<string, string> = {}
  for (const part of parts) map[part.type] = part.value
  const asUtc = Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    Number(map.hour), Number(map.minute), Number(map.second),
  )
  return (asUtc - instant.getTime()) / 60_000
}

// Converts a local wall-clock date/time *as read in `timeZone`* into the
// real UTC instant it represents. `month` is 0-indexed, matching Date.UTC.
export function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  let guess = Date.UTC(year, month, day, hour, minute)
  for (let i = 0; i < 3; i++) {
    const offset = getOffsetMinutes(new Date(guess), timeZone)
    const corrected = Date.UTC(year, month, day, hour, minute) - offset * 60_000
    if (corrected === guess) break
    guess = corrected
  }
  return new Date(guess)
}

export function getBrowserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

export interface SchedulerWindow {
  startUtcMs: number
  stepMinutes: number
  stepCount: number
}

// The slider's range: yesterday 00:00 through tomorrow 23:45 (last
// 15-minute step before midnight), all anchored to the reference zone's own
// calendar — so scrubbing it always covers both of the reference zone's
// midnight crossings, which is what the working-hours/day-badge sweep test
// needs to exercise.
export function buildWindow(referenceZone: string, now: Date): SchedulerWindow {
  const today = getZonedParts(now, referenceZone)
  const todayUtcAnchor = Date.UTC(today.year, today.month - 1, today.day)
  const yesterday = new Date(todayUtcAnchor - 86_400_000)

  const startUtcMs = zonedTimeToUtc(
    referenceZone,
    yesterday.getUTCFullYear(),
    yesterday.getUTCMonth(),
    yesterday.getUTCDate(),
    0,
    0,
  ).getTime()

  const stepMinutes = 15
  const totalMinutes = 3 * 24 * 60 // yesterday + today + tomorrow
  return { startUtcMs, stepMinutes, stepCount: totalMinutes / stepMinutes }
}
