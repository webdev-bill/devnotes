// Bakes site-wide OG/meta tags (from SiteSettings) into index.html before
// Vite builds it, so the SPA shell itself carries correct tags on the very
// first byte — no UA detection, no backend round-trip per request.
//
// Why this exists: a UA-based bot/crawler heuristic (frontend/nginx.conf's
// `map`) cannot distinguish a real browser from a headless-Chrome-based
// meta-tag checker tool (e.g. metatags.io) — modern headless Chrome sends a
// completely standard Chrome UA by design. See docs/server-setup-runbook.md
// for the full evidence chain. Baking site-wide defaults directly into the
// built HTML sidesteps the detection problem entirely for the homepage and
// any other generic page: whoever/whatever requests it gets correct tags
// immediately, real browser or not.
//
// Runs as an npm "prebuild" hook (npm's automatic pre<script> convention),
// so `npm run build` always calls this first. Only fetches when
// SITE_BASE_URL is set (a build ARG wired in for the production Docker
// build only — see Dockerfile.prod, docker-compose.prod.yml) — local/dev
// builds have nothing to fetch from and silently skip this, same as
// before this change existed. Never fails the build: any missing config or
// fetch error just leaves index.html's default (no OG tags) as-is.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const START_MARKER = '<!-- STATIC_META_TAGS_START -->';
const END_MARKER = '<!-- STATIC_META_TAGS_END -->';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTags({ title, description, ogImage, twitterHandle, canonicalUrl }) {
  return [
    description ? `<meta name="description" content="${description}">` : null,
    `<link rel="canonical" href="${canonicalUrl}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${title}">`,
    description ? `<meta property="og:description" content="${description}">` : null,
    `<meta property="og:url" content="${canonicalUrl}">`,
    `<meta property="og:site_name" content="${title}">`,
    ogImage ? `<meta property="og:image" content="${ogImage}">` : null,
    `<meta name="twitter:card" content="summary_large_image">`,
    twitterHandle ? `<meta name="twitter:site" content="${escapeHtml('@' + twitterHandle)}">` : null,
    `<meta name="twitter:title" content="${title}">`,
    description ? `<meta name="twitter:description" content="${description}">` : null,
    ogImage ? `<meta name="twitter:image" content="${ogImage}">` : null,
  ]
    .filter(Boolean)
    .join('\n    ');
}

async function main() {
  const baseUrl = process.env.SITE_BASE_URL;
  if (!baseUrl) {
    console.log('[inject-meta] SITE_BASE_URL not set — skipping static meta injection.');
    return;
  }

  const settingsUrl = `${baseUrl.replace(/\/$/, '')}/api/site-settings`;
  let settings;
  try {
    const res = await fetch(settingsUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    settings = await res.json();
  } catch (err) {
    console.log(`[inject-meta] Skipping static meta injection — could not fetch ${settingsUrl} (${err.message}).`);
    return;
  }

  const title = escapeHtml(settings.site_title || 'devnotes');
  const description = settings.meta_description ? escapeHtml(settings.meta_description) : null;
  const ogImage = settings.og_image_url ? escapeHtml(settings.og_image_url) : null;
  const twitterHandle = settings.twitter_handle || null;
  const canonicalUrl = escapeHtml(`${baseUrl.replace(/\/$/, '')}/`);

  const tags = buildTags({ title, description, ogImage, twitterHandle, canonicalUrl });

  const indexPath = path.resolve(process.cwd(), 'index.html');
  let html = await readFile(indexPath, 'utf8');

  const startIdx = html.indexOf(START_MARKER);
  const endIdx = html.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    console.log('[inject-meta] Skipping static meta injection — markers not found in index.html.');
    return;
  }

  html =
    html.slice(0, startIdx + START_MARKER.length) +
    '\n    ' + tags + '\n    ' +
    html.slice(endIdx);

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);

  await writeFile(indexPath, html, 'utf8');
  console.log(`[inject-meta] Injected static site-wide meta tags into index.html from ${settingsUrl}.`);
}

await main();
