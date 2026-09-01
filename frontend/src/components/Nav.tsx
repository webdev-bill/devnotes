import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../context/useAuth'
import ThemeToggle from './ThemeToggle'

const tabClass =
  'inline-flex items-center gap-2 rounded-t-md px-3 py-2 font-display text-xs transition-colors'

function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${tabClass} ${
          isActive ? 'bg-panel text-ink' : 'text-ink/45 hover:bg-panel/50 hover:text-ink/70'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-keyword' : 'bg-ink/20'}`} />
          {label}
        </>
      )}
    </NavLink>
  )
}

// Below `lg`, ~/my-notes.md + ~/my-blog.md (the widest two tabs) no longer
// fit alongside the rest of the strip — measured, not guessed: the tab
// strip's natural width is ~674px, which only clears the available nav row
// width above roughly 800px. Collapsing them into one ~/my/ "directory" tab
// with a two-item menu ties into the same filesystem literalism as the
// actual /notes and /blog directory-listing pages, rather than reading as a
// generic bolted-on "More" menu.
function MyWorkspaceTab() {
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const isActive = location.pathname.startsWith('/my/notes') || location.pathname.startsWith('/my/blog')

  useEffect(() => {
    if (!open) return

    // Portalled to document.body and positioned via getBoundingClientRect
    // (not a plain `absolute` child) — the tab strip's own overflow-x-auto
    // implicitly forces overflow-y to auto too (a real CSS behavior: an
    // ancestor can't be "scroll on x, visible on y"), which silently clips
    // any absolutely-positioned child that tries to escape it downward.
    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (rect) {
        setMenuPosition({ top: rect.bottom + 4, left: rect.left })
      }
    }
    updatePosition()

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      const insideButton = buttonRef.current?.contains(target)
      const insideMenu = menuRef.current?.contains(target)
      if (!insideButton && !insideMenu) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`${tabClass} ${
          isActive ? 'bg-panel text-ink' : 'text-ink/45 hover:bg-panel/50 hover:text-ink/70'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-keyword' : 'bg-ink/20'}`} />
        ~/my/
      </button>
      {open &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left }}
            className="z-50 min-w-36 rounded-md border border-rule bg-panel py-1 shadow-md"
          >
            <NavLink
              to="/my/notes"
              onClick={() => setOpen(false)}
              className={({ isActive: linkActive }) =>
                `block px-3 py-1.5 font-display text-xs ${linkActive ? 'text-ink' : 'text-ink/60 hover:text-ink'}`
              }
            >
              notes.md
            </NavLink>
            <NavLink
              to="/my/blog"
              onClick={() => setOpen(false)}
              className={({ isActive: linkActive }) =>
                `block px-3 py-1.5 font-display text-xs ${linkActive ? 'text-ink' : 'text-ink/60 hover:text-ink'}`
              }
            >
              blog.md
            </NavLink>
          </div>,
          document.body,
        )}
    </div>
  )
}

export default function Nav() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    // Same background as the outer page (`paper`), so the ACTIVE tab (bg-panel)
    // is the only thing here that shares a color with the content panel below
    // it — that shared color, meeting with zero gap, is what makes it read as
    // one continuous surface rather than a border-matching trick that has to
    // line up pixel-for-pixel.
    <div className="flex items-end justify-between gap-2 bg-paper px-3 pt-3">
      <div className="flex items-end gap-1 overflow-x-auto">
        <NavLink
          to="/"
          className="mr-2 mb-2 shrink-0 font-display text-sm font-semibold text-ink"
        >
          devnotes
        </NavLink>
        <Tab to="/notes" label="~/notes.md" />
        <Tab to="/blog" label="~/blog.md" />
        <Tab to="/tools" label="~/tools.md" />
        {isAuthenticated ? (
          <>
            <div className="hidden items-end gap-1 lg:flex">
              <Tab to="/my/notes" label="~/my-notes.md" />
              <Tab to="/my/blog" label="~/my-blog.md" />
            </div>
            <div className="flex items-end lg:hidden">
              <MyWorkspaceTab />
            </div>
          </>
        ) : (
          <Tab to="/login" label="~/login.sh" />
        )}
      </div>
      {/* Persistent controls, not tabs — kept out of the tabs' scrolling
          group (shouldn't be able to scroll out of view on a narrow
          viewport) and given their own centered alignment/spacing rather
          than reusing the tabs' tab-to-tab gap-1. Not styled as tabs either
          — same reasoning as always: neither is a page. */}
      <div className="mb-2 flex shrink-0 items-center gap-4">
        <ThemeToggle />
        {isAuthenticated && (
          <button
            type="button"
            onClick={handleLogout}
            className="font-display text-xs text-ink/45 hover:text-flag"
          >
            log out
          </button>
        )}
      </div>
    </div>
  )
}
