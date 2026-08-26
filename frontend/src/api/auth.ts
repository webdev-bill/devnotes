import { apiRequest } from './client'

export function login(email: string, password: string): Promise<{ token: string }> {
  return apiRequest('/login', { method: 'POST', body: { email, password } })
}

export function logout(): Promise<void> {
  return apiRequest('/my/logout', { method: 'POST', auth: true })
}
