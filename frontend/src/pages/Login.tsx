import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../context/useAuth'

const inputClass =
  'mt-1 block w-full rounded-md border border-rule bg-white px-3 py-2 font-body text-sm text-ink shadow-sm focus:border-keyword focus:outline-none'

const labelClass = 'font-display text-xs tracking-wide text-ink/60 uppercase'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await login(email, password)
      navigate('/my/notes')
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Incorrect email or password.'
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <p className="font-display text-xs text-ink/40">$ authenticate</p>
      <h1 className="mt-1 font-display text-xl font-semibold text-ink">Log in</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </div>
        {error && (
          <p className="rounded-md border border-flag/30 bg-flag/5 px-3 py-2 font-body text-sm text-ink">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-keyword px-4 py-2 font-display text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  )
}
