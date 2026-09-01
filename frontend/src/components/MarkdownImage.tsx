import { useEffect, useState } from 'react'
import { fetchImageObjectUrl } from '../api/images'

type MarkdownImageProps = {
  src?: string
  alt?: string
}

type LoadedFor = { src: string; url: string } | { src: string; failed: true }

// Custom img renderer for react-markdown. Images inserted by our own upload
// flow are relative /images/:id paths (see NoteForm) — those need the bearer
// token attached, which a plain <img src> can never do, so we fetch them via
// JS and swap in a blob: object URL instead (see api/images.ts). Anything
// else (a hand-typed external URL) renders as a normal <img> — never routed
// through fetchImageObjectUrl, so the token is never sent to a third party.
export default function MarkdownImage({ src, alt }: MarkdownImageProps) {
  const isOwnImage = src?.startsWith('/images/') ?? false
  // Tagged with the src it resolved for, so a still-loading new src doesn't
  // briefly render the previous src's (already stale) result — see below.
  const [loaded, setLoaded] = useState<LoadedFor | null>(null)

  useEffect(() => {
    if (!isOwnImage || !src) return undefined

    let cancelled = false
    let createdUrl: string | null = null

    fetchImageObjectUrl(src)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        createdUrl = url
        setLoaded({ src, url })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ src, failed: true })
      })

    // Revokes both on unmount and whenever src changes (this cleanup runs
    // before the next effect), so no object URL outlives the image it backed.
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [isOwnImage, src])

  if (!isOwnImage) {
    // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through from markdown, may legitimately be empty
    return <img src={src} alt={alt ?? ''} />
  }

  // Ignore state left over from a previous src while the new one is in flight.
  const current = loaded?.src === src ? loaded : null

  if (current && 'failed' in current) {
    return <span className="font-body text-sm text-flag">[image failed to load]</span>
  }

  if (!current) {
    return <span className="font-body text-sm text-ink/40">loading image…</span>
  }

  // eslint-disable-next-line jsx-a11y/alt-text -- alt is passed through from markdown, may legitimately be empty
  return <img src={current.url} alt={alt ?? ''} />
}
