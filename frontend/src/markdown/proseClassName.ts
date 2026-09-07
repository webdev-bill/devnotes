// Shared className for react-markdown's rendered output — NoteDetail and
// BlogDetail both need the exact same typographic treatment, so it lives
// here once rather than as two copies that can drift apart.
export const proseClassName = [
  'prose dark:prose-invert mt-6 max-w-2xl',
  'prose-headings:font-display',
  'prose-h1:text-2xl prose-h1:font-semibold',
  'prose-h2:text-xl prose-h2:font-semibold prose-h2:border-b prose-h2:border-rule prose-h2:pb-2',
  'prose-h3:text-lg prose-h3:font-medium',
  'prose-p:font-body prose-p:leading-relaxed prose-p:text-ink/90',
  'prose-blockquote:border-l-4 prose-blockquote:border-keyword prose-blockquote:italic prose-blockquote:text-ink/70',
  'prose-img:rounded-lg prose-img:max-w-full',
  'prose-figcaption:font-display',
].join(' ')
