import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth()

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
