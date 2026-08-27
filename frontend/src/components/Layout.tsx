import { Outlet } from 'react-router'
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
          <main className="bg-white p-6 sm:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
