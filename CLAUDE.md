# devnotes — Project Notes for Claude Code

## Security constraints (hard rules — do not override without explicit user sign-off)

- **Frontend auth tokens are stored in `localStorage`** (`frontend/src/api/token.ts`).
  This was a deliberate, reviewed trade-off, accepted specifically because the actual
  security control is elsewhere: **the markdown renderer for notes/blog content must
  never execute raw HTML** (e.g. `react-markdown` used without a raw-HTML plugin, no
  `dangerouslySetInnerHTML` on user-authored content). Relaxing that constraint without
  an equivalent replacement (e.g. moving auth to httpOnly cookies) reopens a real
  XSS-to-token-theft path. Full rationale logged in `docs/server-setup-runbook.md`.

## Where to look for more context

- `docs/git-workflow.md` — commit workflow, commit message format, gitleaks pre-commit
  hook usage/bypass.
- `docs/server-setup-runbook.md` — dated log of infra and application decisions,
  gotchas, and how things were verified. Check here before assuming "why" on anything
  non-obvious.
