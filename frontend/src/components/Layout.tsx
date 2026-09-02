import { Link, Outlet } from 'react-router'
import Nav from './Nav'

export default function Layout() {
  return (
    <div className="min-h-screen bg-paper">
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
