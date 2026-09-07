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

## Standing verification checklist (any new feature or dependency)

Before considering ANY feature "done" — not just when asked — check and 
report on all of the following as part of normal completion, not as a 
separate follow-up:

1. **New dependencies.** Run `git show <commit> -- frontend/package.json 
   frontend/package-lock.json` (and the backend equivalent — 
   `composer.json`/`composer.lock` — if backend code changed). If a new 
   package was added:
   - Name it and its version.
   - Run `npm view <package> license` (or `composer show <package>` for 
     PHP) and state whether the license is permissive (MIT, Apache-2.0, 
     BSD, ISC — fine) or copyleft (GPL/AGPL/LGPL/MPL — flag explicitly, 
     explain the obligation it creates).
   - If no new dependency was added, say so explicitly rather than 
     omitting the check.

2. **Cost/infra impact.** State plainly whether the change touches the 
   server at all (new API endpoint, new container, new background job, 
   new external API call) or is fully client-side/static. This project 
   runs on a fixed $6/mo Droplet with no autoscaling — anything that adds 
   a recurring server-side cost or new outbound API dependency needs to be 
   flagged, not just built.

3. **New attack surface.** If the feature accepts any user input (form 
   field, URL param, pasted content, uploaded file), state how it's 
   rendered/processed and confirm no `dangerouslySetInnerHTML`, no raw SQL 
   string interpolation, no `eval`/`new Function`, and no new unauthenticated 
   write path. If a security-relevant claim is made (e.g. "renders safely," 
   "signature not verified"), back it with an actual test, not just a code 
   read-through — same standard as the JWT Decoder session.

Report this as a short section at the end of the completion summary, even 
when the answer to all three is "no impact" — an explicit "no new deps, no 
server cost, no new input surface" is worth one sentence and removes the 
need to ask.