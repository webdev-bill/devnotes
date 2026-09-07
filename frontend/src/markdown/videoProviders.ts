// Single source of truth for which video providers the `::video{...}`
// directive accepts and what a valid id looks like for each — used by both
// remarkVideoDirective (decides valid vs. fallback while parsing) and
// VideoEmbed (re-validates before building the iframe src). Never add a
// provider here without also confirming its official embed domain supports
// a privacy-respecting variant (nocookie/no-tracking).
export type VideoProvider = 'youtube' | 'vimeo'

interface ProviderConfig {
  idPattern: RegExp
  buildEmbedSrc: (id: string) => string
}

export const VIDEO_PROVIDERS: Record<VideoProvider, ProviderConfig> = {
  youtube: {
    idPattern: /^[A-Za-z0-9_-]{11}$/,
    buildEmbedSrc: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
  },
  vimeo: {
    idPattern: /^[0-9]{6,11}$/,
    buildEmbedSrc: (id) => `https://player.vimeo.com/video/${id}`,
  },
}

export function isValidVideoProvider(value: string | undefined): value is VideoProvider {
  return value === 'youtube' || value === 'vimeo'
}

export function isValidVideoId(provider: VideoProvider, id: string | undefined): id is string {
  return typeof id === 'string' && VIDEO_PROVIDERS[provider].idPattern.test(id)
}
