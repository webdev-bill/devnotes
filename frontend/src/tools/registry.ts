// Single place to register a tool — /tools reads this list to render its
// directory listing, and each entry's `slug` must match a route added in
// App.tsx. Adding a new tool page never requires touching ToolsLanding.tsx.
export interface ToolManifestEntry {
  slug: string
  name: string
  description: string
}

export const tools: ToolManifestEntry[] = [
  {
    slug: 'image-to-webp',
    name: 'Image → WebP',
    description: 'Convert JPG, PNG, and other raster images to WebP, entirely in your browser.',
  },
  {
    slug: 'qr-code-generator',
    name: 'QR Code Generator',
    description: 'Generate a QR code for a URL, plain text, or Wi-Fi network, entirely in your browser.',
  },
]
