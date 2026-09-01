import { getToken } from './token'

export const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** A FormData body (e.g. a file upload) is sent as-is, multipart — never JSON-stringified. */
  body?: unknown
  /** Attach the stored Sanctum token as an Authorization header. */
  auth?: boolean
  /** Query string params — undefined/empty-string values are omitted. */
  params?: Record<string, string | undefined>
}

/**
 * Thin fetch wrapper for the Laravel API. Public GET requests need nothing
 * extra; anything hitting `/my/*` should pass `auth: true` to attach the
 * bearer token.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, params } = options

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  const isFormData = body instanceof FormData

  // FormData: the browser sets Content-Type itself (with the multipart
  // boundary) — setting it manually here would drop the boundary and break
  // the upload.
  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) query.set(key, value)
  }
  const queryString = query.toString()

  const response = await fetch(`${API_URL}${path}${queryString ? `?${queryString}` : ''}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError(response.status, data?.message ?? response.statusText)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
