import { createContext, useCallback, useState, type ReactNode } from 'react'
import { login as loginRequest, logout as logoutRequest } from '../api/auth'
import { clearToken, getToken, setToken as persistToken } from '../api/token'

export type AuthContextValue = {
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken())

  const login = useCallback(async (email: string, password: string) => {
    const { token } = await loginRequest(email, password)
    persistToken(token)
    setToken(token)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      // Clear locally even if the revoke request fails (e.g. token already
      // expired) — the user's intent to log out should always succeed client-side.
      clearToken()
      setToken(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated: token !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
