import { Link, useNavigate } from 'react-router'
import { useAuth } from '../context/useAuth'

export default function Nav() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <nav className="border-b border-gray-200">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link to="/" className="font-semibold text-gray-900">
          devnotes
        </Link>
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <Link to="/notes" className="hover:text-gray-900">
            Notes
          </Link>
          <Link to="/blog" className="hover:text-gray-900">
            Blog
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/my/notes" className="hover:text-gray-900">
                Dashboard
              </Link>
              <button type="button" onClick={handleLogout} className="hover:text-gray-900">
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="hover:text-gray-900">
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
