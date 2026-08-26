// Sanctum issues a bearer token, not a cookie, so it has to be stored somewhere
// JS-readable and attached manually to each request. See docs/git-workflow.md
// for the localStorage-vs-alternatives trade-off this project settled on.
const STORAGE_KEY = 'devnotes_token'

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY)
}
