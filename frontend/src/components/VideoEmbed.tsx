import type { ComponentPropsWithoutRef } from 'react'
import type { ExtraProps } from 'react-markdown'
import { VIDEO_PROVIDERS, isValidVideoId, isValidVideoProvider } from '../markdown/videoProviders'

// Extends the real `<video>` element props (react-markdown's `Components`
// type keys off JSX.IntrinsicElements, so this is what react-markdown
// expects to be able to pass in) — never actually used, since this
// component intercepts the node entirely and renders something else. Only
// `data-provider`/`data-video-id` (set by remarkVideoDirective.ts) matter.
type VideoEmbedProps = ComponentPropsWithoutRef<'video'> &
  ExtraProps & {
    'data-provider'?: string
    'data-video-id'?: string
  }

// Rendered for the `<video>` hast element remarkVideoDirective produces for
// a validated `::video{provider="..." id="..."}` directive (see
// remarkVideoDirective.ts) — never for a real markdown `<video>` tag, since
// raw HTML is never enabled in this renderer (see CLAUDE.md).
//
// Re-validates provider/id independently rather than trusting the upstream
// remark pass ran correctly — the iframe src below is built exclusively
// from this function's own validated (provider, id) pair, never from any
// string the post author wrote directly.
export default function VideoEmbed(props: VideoEmbedProps) {
  const provider = props['data-provider']
  const id = props['data-video-id']

  if (!isValidVideoProvider(provider) || !isValidVideoId(provider, id)) {
    return null
  }

  const src = VIDEO_PROVIDERS[provider].buildEmbedSrc(id)

  return (
    <iframe
      src={src}
      title={`${provider} video embed`}
      loading="lazy"
      referrerPolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin allow-presentation"
      allowFullScreen
      className="aspect-video w-full rounded-lg border border-rule"
    />
  )
}
