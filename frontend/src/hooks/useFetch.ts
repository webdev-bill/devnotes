import { useEffect, useState, type DependencyList } from 'react'
import { ApiError } from '../api/client'

type FetchState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

/**
 * Generic data-fetching hook shared by every page that loads from the API.
 * Re-runs whenever `deps` changes. No caching — each page just refetches
 * fresh from the server, which is simple enough at this app's scale.
 */
export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList,
): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof ApiError ? error.message : 'Something went wrong.'
        setState({ status: 'error', message })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey])

  return { ...state, refetch: () => setReloadKey((key) => key + 1) }
}
