import type { Paragraph, Root } from 'mdast'
import { visit } from 'unist-util-visit'
import { isValidVideoId, isValidVideoProvider } from './videoProviders'

function describeAttributes(attributes: Record<string, string | null | undefined> | null | undefined): string {
  const entries = Object.entries(attributes ?? {})
  if (entries.length === 0) return '(no attributes)'
  return entries.map(([key, value]) => `${key}="${value ?? ''}"`).join(' ')
}

function fallbackParagraph(message: string): Paragraph {
  return { type: 'paragraph', children: [{ type: 'text', value: message }] }
}

// Runs after remark-directive has already turned `::video{provider="..."
// id="..."}` into a `leafDirective` mdast node. Never touches raw HTML —
// this only ever routes a directive node to one of two plain, code-chosen
// outcomes: a hast `<video>` element carrying exactly the two validated
// attributes (picked up by mdast-util-to-hast via `data.hName`/
// `data.hProperties`, then rendered by our own VideoEmbed component — see
// markdownConfig.tsx), or inert fallback text spliced in as a plain mdast
// paragraph node (never silently dropped, and — being plain mdast text —
// can only ever become an escaped string in the rendered output). No
// author-supplied string ever becomes markup either way.
export default function remarkVideoDirective() {
  return (tree: Root) => {
    visit(tree, 'leafDirective', (node, index, parent) => {
      if (!parent || index === undefined) return

      if (node.name !== 'video') {
        parent.children[index] = fallbackParagraph(`[unknown directive: ::${node.name}]`)
        return
      }

      const provider = node.attributes?.provider ?? undefined
      const id = node.attributes?.id ?? undefined

      if (!isValidVideoProvider(provider) || !isValidVideoId(provider, id)) {
        parent.children[index] = fallbackParagraph(`[invalid video embed — ${describeAttributes(node.attributes)}]`)
        return
      }

      node.children = []
      node.data = {
        hName: 'video',
        hProperties: {
          'data-provider': provider,
          'data-video-id': id,
        },
      }
    })
  }
}
