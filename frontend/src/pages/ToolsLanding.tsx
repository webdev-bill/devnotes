import { Link } from 'react-router'
import { tools } from '../tools/registry'

export default function ToolsLanding() {
  return (
    <div>
      <p className="font-display text-xs text-ink/40">~/tools.md</p>
      <h1 className="mt-1 font-display text-xl font-semibold text-ink">Tools</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-ink/70">
        Small utilities that run entirely in your browser — nothing here calls the API or
        leaves your machine.
      </p>

      <div className="mt-6 divide-y divide-rule border-t border-rule">
        {tools.map((tool, index) => (
          <Link key={tool.slug} to={`/tools/${tool.slug}`} className="block hover:bg-paper/60">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
              <span className="w-6 shrink-0 select-none text-right font-display text-xs text-ink/30">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 shrink-0 font-display text-sm text-ink">{tool.name}</span>
              <span className="min-w-0 flex-1 truncate font-body text-xs text-ink/50">
                {tool.description}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
