import type { ReactNode } from 'react'
import { Link } from 'react-router'

export default function ToolPageLayout({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div>
      <Link to="/tools" className="font-display text-xs text-ink/40 hover:text-keyword">
        ← ~/tools.md
      </Link>
      <h1 className="mt-2 font-display text-xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-ink/70">{description}</p>
      <div className="mt-6 max-w-2xl">{children}</div>
    </div>
  )
}
