# Git Workflow — devnotes

# Git Workflow — devnotes

## Branch

- **`main`** — the only branch. Solo project, no team to protect from broken work-in-progress,
  so a dev/main split adds overhead without real benefit here. Revisit this if the project
  ever gets collaborators.

## Daily Routine

Start of day:
```bash
git pull origin main
```

End of day (or after a meaningful chunk of work):
```bash
git add .
git commit -m "type: what you did"
git push origin main
```

That's it — no branch switching, no merging.

## Commit Message Format

```
type: short description of what you did
```

| Type | When to use |
|---|---|
| `feat` | Added something new |
| `fix` | Fixed a bug |
| `hotfix` | Urgent fix on live site |
| `chore` | Config, setup, dependency updates |
| `refactor` | Cleaned up code, no behavior change |
| `style` | UI/CSS only |
| `docs` | Documentation only |
| `wip` | Not done yet, saving progress |

**Be specific** — future-you (and anyone reviewing the repo) will thank you.

Bad:
```
fix: bug fix
feat: new stuff
update
```

Good:
```
fix: menu image not displaying after webp conversion
feat: drag and drop image upload on menu form
```

`wip` is completely fine for end-of-day saves:
```
wip: switching to laptop, checkout page half done
```

## Quick Sanity Checks

```bash
git branch              # confirms which branch you're on
git status               # confirms nothing is left uncommitted
git log --oneline -5     # see last 5 commits
```

## Emergency

Undo all local uncommitted changes:
```bash
git checkout .
```

## Secret Scanning (gitleaks pre-commit hook)

Every commit is scanned by [gitleaks](https://github.com/gitleaks/gitleaks) before it's
created — it checks the staged diff (not the whole repo) against its default rule set
(API keys, tokens, private keys, high-entropy strings that look like secrets, etc.) and
**blocks the commit** if anything is flagged.

**One-time setup after a fresh clone** (this doesn't happen automatically — `.git/hooks/`
is never part of a clone, so this repo's hook lives in `.githooks/` instead and has to be
pointed to explicitly, once, per clone):

```bash
git config core.hooksPath .githooks
```

**Install gitleaks itself** (only needs doing once per machine):

```powershell
# Windows
winget install --id Gitleaks.Gitleaks -e
```

```bash
# macOS
brew install gitleaks

# Linux — no official package; download a release binary from
# https://github.com/gitleaks/gitleaks/releases
```

If gitleaks isn't installed, the hook **fails the commit** rather than silently letting
it through — a secret scanner that no-ops when missing isn't a safeguard.

**Bypassing for a genuine false positive:**

```bash
git commit --no-verify -m "type: description"
```

`--no-verify` skips this hook (and any other git hooks). Only use it when you're certain
the flagged string isn't actually a secret — e.g. a long random-looking test fixture ID,
not an actual credential. Never use it to push past something you're not sure about; if
in doubt, treat it as real and get it out of the diff instead.

Note: this only guards commits made *from now on*. It doesn't retroactively scan existing
history — a full manual history audit was done separately and is logged in
`docs/server-setup-runbook.md`.

## Note for Claude Code

When making commits in this repo, follow this exact workflow:
- Commit directly to `main` — this is a solo project with a single branch, no dev/main split.
- Use the `type: description` commit format above — pick the most accurate type,
  and write a specific, real description of the actual change (not generic text).
- Run `git status` before committing to confirm only intended files are staged
  (especially double-check no `.env` files or secrets are included).
- Push after every commit, unless told otherwise.
