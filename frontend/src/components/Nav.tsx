import { NavLink, useNavigate } from 'react-router'
import { useAuth } from '../context/useAuth'

const tabClass =
  'group -mb-px inline-flex items-center gap-2 rounded-t-md border border-b-0 px-3 py-2 font-display text-xs transition-colors'

function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${tabClass} ${
          isActive
            ? 'border-rule border-b-white bg-white text-ink'
            : 'border-transparent text-ink/45 hover:text-ink/70'
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
    <div className="flex items-end justify-between gap-2 px-1">
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
          <Tab to="/my/notes" label="~/dashboard.md" />
        ) : (
          <Tab to="/login" label="~/login.sh" />
        )}
      </div>
      {isAuthenticated && (
        <button
          type="button"
          onClick={handleLogout}
          className="mb-2 shrink-0 font-display text-xs text-ink/45 hover:text-flag"
        >
          log out
        </button>
      )}
    </div>
  )
}
