import { Helmet } from 'react-helmet-async'
import { Link, Outlet } from 'react-router'
import { useSiteSettings } from '../context/useSiteSettings'
import Nav from './Nav'

export default function Layout() {
  const { settings } = useSiteSettings()

  return (
    <div className="min-h-screen bg-paper">
      {/* Site-wide defaults — rendered on every route so a page with no
          page-specific <Helmet> (e.g. Home, NotesList) still gets sane
          title/meta/favicon tags. A route that renders its own <Helmet>
          (e.g. BlogDetail) has its tags merged over these by react-helmet-async,
          not replaced wholesale — deeper-in-the-tree wins per tag.

          Deliberately UNCONDITIONAL (not gated on `settings` being loaded):
          react-helmet-async's "deeper wins" ordering is really "whichever
          Helmet instance mounted later wins," and both this Helmet and a
          child page's Helmet mount behind their own independent async
          fetches. If this one were gated on `settings &&`, it could mount
          — and "win" — AFTER a page-specific Helmet whenever the page's own
          fetch happens to resolve first, silently clobbering a more
          specific title with the site default. Rendering unconditionally
          means this Helmet always mounts on Layout's first render, before
          Outlet's children exist at all, so a child's Helmet always mounts
          later and correctly wins regardless of fetch timing. */}
      <Helmet>
        <title>{settings?.site_title ?? 'devnotes'}</title>
        {settings?.meta_description && <meta name="description" content={settings.meta_description} />}
        {settings?.favicon_ico_url && <link rel="icon" href={settings.favicon_ico_url} />}
        {settings?.favicon_png_url && <link rel="icon" type="image/png" href={settings.favicon_png_url} />}
      </Helmet>
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        {/* Nav (tab tray) and main (content) share this one box so the active
            tab's background can meet the content's background with zero gap —
            see Nav.tsx for why that's what makes the seam disappear. */}
        <div className="overflow-hidden rounded-lg border border-rule shadow-sm">
          <Nav />
          <main className="bg-panel p-6 sm:p-8">
            <Outlet />
          </main>
        </div>

        {/* Sibling below the shell, not inside it — the shell's own bottom
            border is boundary enough, so this deliberately adds no border of
            its own, just spacing. Present on every page (this is Layout,
            shared by every route including /login and the dashboard), unlike
            the tab-strip nav — /about isn't a content section with its own
            CRUD, so it doesn't belong as a fourth tab. */}
        <footer className="pt-4 pb-8 text-center">
          <Link
            to="/about"
            className="font-display text-xs text-ink/45 transition-colors hover:text-ink"
          >
            <span className="text-ink/35">// </span>built by Bill Andrew Sallao — ~/about.md
          </Link>
        </footer>
      </div>
    </div>
  )
}
