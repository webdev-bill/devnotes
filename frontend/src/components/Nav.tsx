import { NavLink, useNavigate } from 'react-router'
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
        {isAuthenticated ? (
          <>
            <Tab to="/my/notes" label="~/my-notes.md" />
            <Tab to="/my/blog" label="~/my-blog.md" />
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
