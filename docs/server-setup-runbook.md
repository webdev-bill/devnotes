# Self-Hosted Dev Notes Project — Infrastructure Setup Runbook

> Personal runbook documenting how this project's infrastructure was set up from scratch.
> Written to be re-runnable: if the server ever needs to be rebuilt, follow this top to bottom.

## Goals

- Full ownership of infrastructure (no PaaS lock-in)
- Portable: could migrate to any VPS or cloud provider with minimal changes
- Cheap: target ~$6/month base cost
- Learn real-world DevOps fundamentals along the way

## Stack Decisions

| Layer | Choice | Why |
|---|---|---|
| Backend | Laravel (API mode) | Leverages existing PHP/CodeIgniter experience, fast to build CRUD/auth |
| Frontend | React | Highest-demand frontend skill in US job market |
| Database | PostgreSQL | Industry standard, more common in US stacks than MySQL |
| Hosting | DigitalOcean Droplet (VPS) | Developer-friendly, US-recognized, avoids PaaS lock-in |
| Containerization | Docker + Docker Compose | Makes the whole stack portable and reproducible |
| Reverse proxy / SSL | Traefik or Caddy (planned) | Automatic HTTPS, avoids vendor-specific CDN lock-in |
| DNS | Cloudflare | Decouples domain from hosting provider |
| CI/CD | GitHub Actions (planned) | Builds Docker images, deploys via SSH |

## Step 1 — Domain

- Already owned a personal `.com` domain under own name.
- Decision: use personal domain as the base site, host this project under a subdomain
  (e.g. `notes.yourdomain.com`) to keep it decoupled from the main portfolio site.

## Step 2 — DigitalOcean Account & Billing Safety

- Created DigitalOcean account.
- **Spend alert created:** name "Monthly cap", budget $6/month, thresholds at 50%, 75%, 100%.
  - Note: DigitalOcean does NOT support a hard spending cap — only usage alerts.
  - Confirmed no extras enabled (no backups, no volumes, no managed DB) — nothing that
    would push cost above the flat Droplet rate.
- **2FA note:** if you signed up via Google/GitHub SSO, DigitalOcean does not manage 2FA
  itself — 2FA must be enabled on the parent Google or GitHub account instead.

## Step 3 — SSH Key Generation (Windows / PowerShell)

Generated a dedicated key pair for this project (kept separate from existing GitHub/Bitbucket keys):

```powershell
ssh-keygen -t ed25519 -C "devnotes-project" -f "$env:USERPROFILE\.ssh\devnotes_key"
```

- Private key: `devnotes_key` (never share, never commit to git)
- Public key: `devnotes_key.pub` (safe to share — this goes into DigitalOcean)

View the public key to copy it:
```powershell
notepad "$env:USERPROFILE\.ssh\devnotes_key.pub"
```

## Step 4 — Create the Droplet

Configuration used:
- Region: New York (NYC1) — closest to US East traffic
- Image: Ubuntu 24.04 LTS
- Plan: Basic, Regular SSD, $6/mo (1 vCPU, 1GB RAM, 25GB SSD, 1000GB transfer)
- Authentication: SSH Key (uploaded `devnotes_key.pub`, named "devnotes-windows")
- Backups: disabled (self-managing backups later to keep cost down)
- Volumes: none
- Monitoring: enabled (free, useful for CPU/RAM graphs)
- Managed Database: skipped (self-hosting Postgres in a container instead)
- Hostname: renamed to `devnotes-prod` for clarity

## Step 5 — SSH Config for Easy Access

Added to `~/.ssh/config` (alongside existing GitHub/Bitbucket entries):

```
Host devnotes
    HostName <DROPLET_PUBLIC_IP>
    User root
    IdentityFile ~/.ssh/devnotes_key
    IdentitiesOnly yes
```

Connect with:
```powershell
ssh devnotes
```

First connection will prompt to confirm the host fingerprint — type `yes`.

## Step 6 — Initial Server Hardening ✅ DONE

Ran immediately after first login:

```bash
# Update all packages
apt update && apt upgrade -y
```

- During the update, a prompt appeared: "Configuring openssh-server — a new version of
  sshd_config is available, but the installed version has been locally modified."
  → Chose **"keep the local version currently installed"** (the default, pre-highlighted option).
  This preserves the current SSH access setup rather than overwriting it.
- Update also flagged a **pending kernel upgrade** (running 6.8.0-124-generic, newer
  6.8.0-138-generic available). Noted for reboot at a clean checkpoint (see below).

```bash
# Install and enable a basic firewall (allow only SSH for now)
apt install ufw -y
ufw allow OpenSSH
ufw enable
```

- Prompted: "Command may disrupt existing ssh connections. Proceed with operation (y|n)?"
  → typed `y`. Since OpenSSH was already allowed before enabling, the active session stayed
  connected (no disruption).
- Verified with `ufw status`:
  ```
  Status: active
  To                         Action      From
  --                         ------      ----
  OpenSSH                    ALLOW       Anywhere
  OpenSSH (v6)               ALLOW       Anywhere (v6)
  ```
  Only SSH is open — everything else blocked by default, as intended.

**Rebooted to apply the pending kernel update:**
```bash
reboot
```
- This drops the SSH session immediately (expected).
- Waited ~30-60 seconds, reconnected with `ssh devnotes` — successful.

**Still to do (next session):**
- [ ] Create a non-root user with sudo access
- [ ] Write docker-compose.yml (Laravel + React + Postgres)
- [ ] Set up Traefik for reverse proxy + automatic HTTPS
- [ ] Point Cloudflare DNS (A record) to the Droplet's IP
- [ ] Set up GitHub Actions for build + deploy
- [ ] Configure Postgres backups to S3-compatible storage (e.g. Backblaze B2)
- [ ] Write DEPLOYMENT.md — a from-scratch rebuild guide
- [ ] Add pagination controls to the notes list pages (`/notes` and `/my/notes`)
      — deliberately deferred in the 2026-08-26 notes/blog pages session, both
      currently only render the first page of API results

## Step 7 — Install Docker ✅ DONE

```bash
apt install docker.io docker-compose-v2 -y
```

Installed cleanly, no errors. Confirmed versions:
```
docker --version
→ Docker version 29.1.3, build 29.1.3-0ubuntu3~24.04.2

docker compose version
→ Docker Compose version 2.40.3+ds1-0ubuntu1~24.04.1
```

Verified with the standard test container:
```bash
docker run hello-world
```
→ Successfully pulled and ran, printed the "Hello from Docker!" confirmation message.

**Cost note:** Docker, Docker Compose, and all software installed via `apt` here are free,
open-source, with no licensing fees or usage-based charges. Only the underlying Droplet
($6/mo, already running) has any cost.

## Development Tools

- **Claude Code** and **Cursor** will be used for writing/editing the application code
  (Laravel backend, React frontend) going forward.
- This runbook covers infrastructure setup done via direct SSH/terminal work; application
  code development will happen locally first (via Claude Code / Cursor), then get pushed
  to GitHub and deployed to this server via the Docker Compose + CI/CD pipeline (planned).

## Decisions Made Along the Way

- **DigitalOcean Cloud Firewall — skipped.** DO's dashboard recommended adding their
  network-level Cloud Firewall on top of `ufw`. Decision: stick with `ufw` only, since
  running both at once risks conflicting rules (DO's own warning), and `ufw` is more
  portable knowledge (works identically on any Linux server, including a future AWS
  migration). Revisit Cloud Firewall only if this ever becomes a team/production project
  needing defense-in-depth.
- **Non-root user — deferred on purpose.** Decided to stay on root while finishing initial
  server setup and hardening (firewall, updates, Docker install), then create a dedicated
  non-root user with `sudo` access right before actual app deployment begins. This keeps
  setup simple now while still following best practice once real workloads start running.

## Lessons / Notes

- `$HOME` is not a recognized variable in Windows PowerShell — use `$env:USERPROFILE` instead
  when running `ssh-keygen` or referencing paths.
- Powering off a Droplet does NOT stop billing — resources are still reserved.
  Must fully **destroy** the Droplet to stop being charged.
- DigitalOcean spend alerts are notifications only, not hard caps.

---

# Application Development Log

> Local application development (Laravel backend, React frontend, Docker Compose dev stack).
> Same rules as above: factual, specific, mistakes included — this is rebuild reference and
> future blog-post raw material, not a sanitized changelog.

## 2026-08-26 — Git Identity, SSH Config, and Line-Ending Issues Across WSL/Windows

The local dev environment spans two separate shells operating on the same repo: Windows
Git Bash (MSYS) and a WSL2 Ubuntu distro, both reaching the project through the same
`\\wsl.localhost\Ubuntu\...` filesystem path. They do **not** share `~/.ssh` or global git
config, which caused three separate issues in one session.

**Issue 1 — commit failed with no git identity in WSL:**

```
Author identity unknown
*** Please tell me who you are.
fatal: empty ident name (for <redacted-hostname>) not allowed
```

WSL's git had never been configured with a name/email (Windows' git config is entirely
separate). Fixed by checking the Windows-side identity and mirroring it locally in the
repo (not `--global`), since `.git/config` lives on the shared filesystem and applies no
matter which shell touches the repo afterward:

```bash
# checked on the Windows side first:
git config user.name   # → Drew Swift
git config user.email  # → <redacted-personal-email>

# then set locally (not --global) from WSL:
git config user.name "Drew Swift"
git config user.email "<redacted-personal-email>"
```

**Issue 2 — push failed from WSL after the commit succeeded:**

```
ssh: Could not resolve hostname github-devnotes: Name or service not known
fatal: Could not read from remote repository.
```

The remote is `git@github-devnotes:webdev-bill/devnotes.git` — `github-devnotes` is a
custom `Host` alias defined in **Windows'** `~/.ssh/config` (pointing at a
project-specific deploy key), but WSL has its own separate `~/.ssh/config` without that
alias. Rather than duplicating SSH config into WSL, the fix was simply to run `git push`
from the Windows Git Bash tool instead — commits made from WSL are immediately visible
there since it's the same `.git` directory on the same underlying filesystem, just
accessed from a different shell.

- **Decision:** commit/push using whichever shell already has the correct SSH config for
  the remote in question (Windows Git Bash, for this repo), rather than re-configuring
  SSH identically in both environments. Git identity only needed fixing once (shared via
  `.git/config`); SSH access did not transfer the same way (lives in each shell's own
  `~/.ssh`).

**Issue 3 — unintended line-ending diffs:**

After moving files around from both shells, `git status` showed `LICENSE` and
`README.md` as modified with a pure LF→CRLF diff — every line changed, no actual content
different. Cause: Windows git defaults to `core.autocrlf=true` (normalizes LF→CRLF on
checkout) while WSL git does not, so touching the same working tree from both sides can
silently rewrite line endings on files nobody meant to edit. Fixed by discarding the
unintended changes before committing anything else:

```bash
git checkout -- LICENSE README.md
```

**Issue 4 — a cleanup one-liner nearly unstaged the entire repo:**

While removing a stray Windows `Zone.Identifier` artifact file (a leftover "downloaded
from the internet" marker, not real content) from the git index, this pipeline was run:

```bash
git ls-files -z | grep -a "Zone" | xargs -0 -I{} git rm --cached "{}"
```

`grep` without `-z`/`--null-data` doesn't treat NUL-separated input as multiple lines —
it matched "Zone" somewhere in the whole null-delimited blob and passed the *entire*
file list through to `xargs`, which dutifully ran `git rm --cached` on every tracked
file in the repo. Caught before committing (working tree files were untouched, since
`--cached` only affects the index) and fixed immediately with:

```bash
git reset   # restores the index to match HEAD, undoes the mass --cached removal
```

- **Lesson:** never pipe `git ls-files -z` through plain `grep` — either add `grep -z`
  or, for a single obviously-named file, just target the exact path directly instead of
  scripting an index-wide filter.

## 2026-08-26 — Data Models and API Design: Notes, Tags, Blog Posts + Sanctum Auth

Designed and implemented the core data model and REST API for notes/snippets, tags, and
blog posts, following a review-before-code workflow for both the schema and the endpoint
list (proposed each in chat, waited for explicit approval, then implemented).

### Schema decisions

- **`notes` unifies notes and snippets** via a single nullable `language` column instead
  of a separate `type` enum — a snippet is just a note with a language attached; no
  content is created by having both fields.
- **Tags are global**, not scoped per user — simplest model for a personal tool; still
  doesn't block adding more users later, it just means users would share a tag namespace.
- **`blog_posts.published_at` (nullable timestamp) is the only draft/published signal** —
  no separate `status` column. `null` = draft, a past timestamp = published, a future
  timestamp = scheduled (`published_at <= now()` in the query scope). Avoids two fields
  that could drift out of sync.
- **`notes.visibility` (public/private) also covers the "draft" concept** — a private
  note is functionally a draft (visible only to the owner). No third state was added.
- **`visibility` is a plain `string` column**, cast to a native PHP backed enum
  (`App\Enums\NoteVisibility`) on the Eloquent model — not a Postgres-native enum/check
  constraint, which is painful to alter later (Postgres only supports `ADD VALUE`, no
  easy remove/reorder).
- **`user_id` is deliberately excluded from each model's fillable attributes.** Ownership
  is only ever set via `$user->notes()->create(...)` / `$user->blogPosts()->create(...)`,
  never mass-assigned from request input — this is what makes "don't hardcode single-user
  assumptions" actually true: nothing needs to change to support more users later, and a
  request body can never spoof ownership.
- **Postgres-specific:** all markdown content columns use plain `text`, not `longText()`
  — Postgres has no MySQL-style TEXT/MEDIUMTEXT/LONGTEXT tiering, so the distinction
  Laravel's migration builder offers is a MySQL-only concern.
- `note_tag` pivot uses a composite primary key (`note_id`, `tag_id`), no surrogate `id`
  — pure join table, Laravel's alphabetical naming convention.

Migrations verified live via `php artisan tinker` inside the running container (enum
casting, the `belongsToMany` tag relationship, and both the `public()`/`published()`
query scopes) before being committed.

### API structure decision

Every resource is split into **two separate controllers** rather than one controller
with auth-conditional logic:

- `Api\NoteController` / `Api\BlogPostController` — unauthenticated, read-only, base
  query always starts `public()`/`published()`-scoped.
- `Api\My\NoteController` / `Api\My\BlogPostController` — behind `auth:sanctum`, full
  CRUD, scoped to the caller's own records via Policies.

Rationale (confirmed explicitly before implementing): this makes it structurally
impossible for a future refactor to leak private data through the public endpoint —
there's no `if (auth)` branch that could be broken by a later change, because the public
controller literally has no code path to unscoped data. Filters (`search=`, `tag=`) are
chained onto the already-scoped query, so they can only narrow results, never widen them
past what the base scope already allows.

- Auth: `laravel/sanctum` installed via Composer, migration published via
  `php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"`,
  `HasApiTokens` added to `User`. Plain bearer-token flow (`POST /api/login` issues a
  token, `POST /api/my/logout` revokes the current one) — not Sanctum's SPA/cookie flow,
  since backend and frontend are separately deployed services. No registration endpoint:
  single owner, so a public sign-up route would only be extra attack surface.
- Ownership enforcement via Laravel Policies (`NotePolicy`, `BlogPostPolicy`),
  auto-discovered by naming convention — no manual registration needed.
- Validation via per-action `FormRequest` classes; `UpdateNoteRequest` and
  `UpdateBlogPostRequest` call the relevant policy's `update` check directly from their
  `authorize()` method.

### Gotcha: route-model-binding parameter names must match exactly

Laravel's implicit route-model binding matches by the **exact PHP parameter name**
against the route's URI placeholder — not by type alone. `Route::apiResource` for a
`blog-posts` resource auto-generates the placeholder `{blog_post}` (hyphens become
underscores). Controllers and `FormRequest`s were first written with camelCase
`$blogPost`, which would have silently failed to bind (the parameter would just stay
`null`/unresolved). Caught before committing and fixed by standardizing on `$blog_post`
everywhere — controllers, route closures, and `$this->route('blog_post')` calls inside
`FormRequest::authorize()` — to match Laravel's own resource-route naming convention.

### Live verification (not just code review)

Ran the full stack (`docker compose up -d db backend`) and exercised the real HTTP API
with `curl` before committing:

- Login success and failure (wrong password → `401` with JSON body).
- Created a private note and a public note (with tags, exercising find-or-create).
- Confirmed the public `/api/notes` endpoint never returns the private note — including
  under `?search=` and `?tag=` filters.
- Confirmed a draft blog post 404s on its public slug URL, then appears once
  `published_at` is set to a past timestamp.
- Created a second user and confirmed `403` (not `404`) when it tries to view, update, or
  delete the first user's private note or blog post — proves the Policy checks work
  across users, not just against an unauthenticated request.
- Confirmed logout actually revokes the token (subsequent authenticated request → `401`).
- Deleted all test users/notes/tags/posts via Tinker afterward so the dev database
  stayed clean.

**Minor tooling gotcha hit again during this verification:** inlining `curl` commands
with embedded JSON across three nested shells (Bash tool → `wsl.exe` → inner `bash -lc`)
mangled quoting and silently dropped output. Fixed by writing the test flow as a
standalone `.sh` script file and executing that file directly, instead of inlining
multi-command strings across shell layers.

## 2026-08-26 — Full Secrets Audit + gitleaks Pre-Commit Hook

Ran a full audit of everything ever committed to the repo (all 7 commits, not just
current tree state) for secrets/confidential info, then set up an automated safeguard
against it happening again.

### Audit method

Checked git history three ways, cross-checking each against the others:

1. Filename search for secret-shaped paths (`*.env` excluding `*.env.example`, `*.pem`,
   `*.key`, etc.) — nothing found.
2. Manual regex sweep of `git log -p --all` output for AWS key patterns, private key
   headers, GitHub/Slack/Stripe token formats, password assignments, real IPs, and real
   emails/domains — every hit individually verified in context (see findings below).
3. `gitleaks detect --source . --log-opts="--all"` as an independent cross-check against
   the same history using its own (more sophisticated, entropy-aware) rule set —
   agreed with the manual sweep: no leaks found.

### Findings

- **No API keys, tokens, passwords, DB credentials, private keys, or cloud credentials**
  anywhere in history. No `.env` file was ever committed — only `.env.example` files
  with placeholder values (`changeme`, empty AWS key fields).
- Dozens of email-address false positives, all public open-source package maintainer
  emails baked into `composer.lock` (Taylor Otwell, Symfony contributors, etc.) — normal
  for any Laravel project, not specific to this one.
- IP-address-shaped false positives were numeric coordinates inside
  `frontend/public/icons.svg`'s SVG path data, not real IPs.
- **Two real findings**, both self-introduced while writing the previous runbook entry
  (the git-identity session log): a personal Gmail address and a laptop hostname, quoted
  verbatim in `docs/server-setup-runbook.md` while documenting a `git config` command and
  a git error message, in commit `f9941b0`.

### Remediation

Since `f9941b0` was the current tip of `main` (not buried under later commits), fixing it
only required amending that one commit — not a multi-commit rebase like the earlier
author-identity situation:

```bash
# edited the two lines in docs/server-setup-runbook.md to placeholders, then:
git add docs/server-setup-runbook.md
git commit --amend --no-edit
git push --force origin main
```

Verified the fix three ways before considering it done:
- `git log --format="%an <%ae> - %s"` on both local and `origin/main` — all 7 commits
  still present, correct messages, correct order, authorship intact.
- `git log -p --all | grep` for both redacted strings — zero matches, on both local and
  remote history.
- `git rev-list --objects --all | git cat-file --batch-check` — confirmed neither string
  appears in *any* object reachable from any ref, not just in the diff view.

**Note on completeness:** `git commit --amend` makes the old blob unreachable but doesn't
immediately erase it from the local `.git` object database. Ran
`git reflog expire --expire=now --all && git gc --prune=now --aggressive` afterward, then
confirmed with `git fsck --unreachable --no-reflogs` (empty output) that the old object is
actually gone locally, not just unreferenced. GitHub's backend may retain the old object
briefly until its own garbage collection runs — there's no user-facing "purge" command —
but it's unreachable from any ref, so no clone/browse/fork will ever surface it. Acceptable
residual for what leaked here (a personal email + hostname, not a credential); a real
credential leak would warrant contacting GitHub support to force an immediate purge.

### gitleaks pre-commit hook

Chose gitleaks over git-secrets: single static binary (no runtime dependency), actively
maintained, solid default rule set (regex + entropy-based), and a `protect --staged` mode
that's a natural fit for a pre-commit hook (scans only the staged diff, not the whole
repo, so it stays fast).

- Installed via `winget install --id Gitleaks.Gitleaks -e` (Windows).
- Hook script lives at `.githooks/pre-commit` — **tracked in the repo**, not
  `.git/hooks/pre-commit`, since `.git/hooks/` is local-only and never part of a clone.
  Activated per-clone with `git config core.hooksPath .githooks` (one-time, documented in
  `docs/git-workflow.md`).
- Hook fails closed: if `gitleaks` isn't installed, the commit is blocked with an install
  instruction rather than silently skipping the scan.

**Gotcha — CRLF can break a hook's shebang line.** Windows git (`core.autocrlf=true`)
normalizes LF→CRLF on checkout; a CRLF-corrupted `#!/bin/sh` line breaks execution
entirely on some shells. Added a root `.gitattributes` forcing `eol=lf` on `.githooks/*`
and `*.sh` specifically, so the hook script's line endings can't get corrupted regardless
of which environment (Windows Git Bash, WSL) checks it out.

**Gotcha — winget updates the PATH registry key immediately, but already-open shells
don't see it.** After `winget install`, `gitleaks` wasn't found on `PATH` in the same
terminal session the install ran in — `[Environment]::GetEnvironmentVariable("Path",
"User")` already had the new entry, but the running shell's cached environment didn't.
A new terminal window picks it up fine; no reboot needed, just a fresh shell.

**Verified end-to-end** with real `git commit` invocations, not just calling gitleaks
directly: staged a fake AWS-shaped secret → commit correctly blocked with the finding
redacted in the output; staged an unrelated clean file → commit went through normally;
`git commit --no-verify` with the same fake secret staged → correctly bypassed. All test
commits were reset afterward so none of this test scaffolding made it into real history.

**Aside:** gitleaks' default rule set intentionally allowlists AWS's own well-known
documentation example key (`AKIAIOSFODNN7EXAMPLE`) — worth knowing so a "no leaks found"
result against copy-pasted AWS docs examples isn't mistaken for the tool not working. Had
to retest with a realistic-but-fake key to actually exercise detection.

## 2026-08-26 — Frontend Scaffold: Tailwind, React Router, and a Working Login

Installed Tailwind CSS and React Router into `frontend/`, proposed and got approval on
the full route structure before building anything, then implemented the API client
layer, layout/nav, route guard, and a fully working `/login` page against the real
Sanctum-backed API.

### Route structure

Public: `/`, `/notes`, `/notes/:id`, `/blog`, `/blog/:slug`, `/login`. Private (behind a
route guard, redirects to `/login`): `/my/notes`, `/my/notes/new`, `/my/notes/:id/edit`,
`/my/blog`, `/my/blog/new`, `/my/blog/:id/edit`.

**Deliberate naming split from the API:** frontend uses `/my/blog`, the API uses
`/api/my/blog-posts`. Frontend routes optimize for URL readability; API routes follow
REST resource-naming. They don't need to match, and the API client is the only place
that needs to know both names.

Only `/login` is a real page this session — every other route is wired into the router
with a `ComingSoon` placeholder component, so navigation and the auth guard are fully
testable end-to-end without building the notes/blog UI yet.

### Token storage decision

Sanctum returns a bearer token in the JSON response body (not a cookie) — a constraint
from how the backend auth was built (decoupled frontend/backend, not same-site), which
rules out httpOnly cookies as an option without backend changes. Chose `localStorage`
over `sessionStorage` or in-memory-only storage: the realistic risk for a single-owner
app isn't a targeted attacker, it's *future code* introducing XSS — most plausibly via
markdown rendering that executes raw HTML. That's the actual control that matters, not
the storage mechanism.

**This is now a documented hard constraint**, not just a conversation note — added a
root `CLAUDE.md` (didn't exist before this session) specifically because it's
automatically loaded at the start of every future Claude Code session in this repo, which
is a much stronger guarantee against "forgotten in a future session" than a doc file
someone has to remember to open. The rule: **the markdown renderer for notes/blog content
must never execute raw HTML** (e.g. `react-markdown` without a raw-HTML plugin, no
`dangerouslySetInnerHTML` on user content). Whoever (human or Claude) builds the actual
note/post rendering later needs to see this before picking a renderer.

### Package choices

- **`react-router` (v8), not `react-router-dom` (v7).** Checked npm directly rather than
  assuming from memory: `react-router-dom` is now a legacy compat package trailing behind
  — as of React Router v7's Remix merger, DOM bindings live in the base `react-router`
  package itself, which is where new development happens (confirmed it's at v8 while
  `-dom` is stuck at v7).
- **Tailwind v4 via `@tailwindcss/vite`**, not the old v3 `tailwind.config.js` +
  PostCSS setup — v4's Vite plugin needs just one line (`@import "tailwindcss";`) in the
  CSS entrypoint, no config file for a project this size.

### Gotcha: Docker anonymous volumes don't survive `docker compose run --rm`

`docker compose run --rm frontend npm install <pkg>` correctly updated `package.json`
and `package-lock.json` on the host (bind-mounted), but installed packages themselves
went into `/app/node_modules` — which is an **anonymous volume**, and `--rm` deletes a
container's anonymous volumes along with the container. So the install "worked" (host
manifest files updated) but `node_modules` was empty again immediately after. Fix: the
Dockerfile already bakes `RUN npm install` into the image at build time, and Docker
initializes a fresh anonymous volume from whatever already exists at that path in the
image — so `docker compose build frontend` (to bake the new deps into the image) followed
by `docker compose up` (fresh anonymous volume, correctly pre-populated) is the actual
correct sequence any time new frontend packages are added.

### Verification — live containers, no browser tool available this session

Browser automation (`claude-in-chrome`) wasn't available this session — the user declined
to install the extension. Verified everything possible without it, rather than either
skipping verification or falsely claiming a browser test happened:

- `npm run build` (`tsc -b && vite build`) — clean, 0 type errors, and the generated CSS
  bundle (11.8 kB) confirms Tailwind is actually scanning and compiling the utility
  classes used in the components, not just installed and unused.
- `npm run lint` (oxlint) — 0 errors. One harmless warning remains about React Fast
  Refresh granularity for the context+provider pair sharing a file (a standard pattern,
  used in React's own docs) — split `useAuth` into its own file to clear the first
  instance of this warning, left the context/provider colocation as-is since fully
  satisfying the rule would mean 3 files for one small context, not worth it here.
- Simulated the exact network calls the browser's JS makes: `POST /api/login` with real
  credentials → `{"token": "..."}`, matching what `AuthContext.login` expects; wrong
  password → `401`, matching the `ApiError` branch in `Login.tsx`; the token used against
  an authenticated endpoint (`POST /api/my/logout`) → `204`; confirmed
  `Access-Control-Allow-Origin: *` is present even with `Origin: http://localhost:5173`
  explicitly sent, so the browser's cross-origin request won't be blocked.
- Curled every defined route path against the Vite dev server (`/`, `/login`, `/notes`,
  `/notes/1`, `/blog`, `/blog/some-slug`, `/my/notes`, `/my/notes/new`, `/my/blog`,
  `/my/blog/new`) — all return `200` with the SPA shell, confirming Vite's dev-server
  fallback serves client-side routes correctly rather than 404ing.

**What's NOT verified:** actually clicking through the login form in a real browser and
watching the redirect + nav state change happen. Left the Docker stack running with a
test account (`andrew@example.com` / a test password) specifically so this could be
checked visually afterward — that's the one piece automated checks can't stand in for.

## 2026-08-26 — Real Notes Pages: List, Detail, Dashboard, Create/Edit/Delete

Replaced the `/notes`, `/notes/:id`, and `/my/notes` (+ create/edit) placeholders with
real pages backed by the actual API, following the same propose-then-build flow as the
schema/endpoint sessions.

### Component breakdown that shipped

- `NoteCard` (presentational only — title, language badge, tags) reused by both the
  public list and the dashboard; each page decides what wraps it (a `<Link>` publicly,
  extra chrome — visibility badge, edit/delete — on the dashboard).
- `TagPills` extracted out of `NoteCard` because `NoteDetail` needed the exact same tag
  rendering.
- `VisibilityBadge` — dashboard-only, deliberately not shared with the public list since
  everything there is public by definition.
- `NoteForm` (the actual form) is shared between create and edit; the two routes are thin
  page wrappers — the edit wrapper fetches the existing note first and passes it in,
  delete lives on the page (not the form) since it's a destructive action, not a field.
- `useFetch` hook + `LoadingState`/`ErrorState` components — the shared loading/error
  pattern from the proposal, now actually in use across three pages, ready to reuse for
  blog pages next.

### `react-markdown` — the CLAUDE.md constraint's first real application

Rendered note content with `<ReactMarkdown>{note.content}</ReactMarkdown>` and nothing
else — no `rehype-raw`, no plugins that enable raw HTML passthrough. Added an inline
comment directly above the usage in `NoteDetail.tsx` (not just relying on someone having
read `CLAUDE.md`) spelling out why it must stay that way, since this is user-authored
content rendered for arbitrary public visitors — exactly the scenario the localStorage
token-storage decision was betting against.

Also had to install `@tailwindcss/typography` and add `@plugin "@tailwindcss/typography";`
to `index.css` — without it, Tailwind's `prose` class (used to style the rendered
markdown) is just an inert class name with zero effect. Caught this before it shipped
silently broken by actually reading the generated CSS bundle size in the build output.

### Gotcha (recurrence): stale anonymous volume survives a rebuild

Hit the anonymous-volume issue from the previous session again, in a slightly different
shape: added `react-markdown` and `@tailwindcss/typography`, ran `docker compose build
frontend` (image now has them baked in via the Dockerfile's `RUN npm install`), then
`docker compose up -d` — and `tsc` still failed with "Cannot find module 'react-markdown'"
inside the running container. Cause: the frontend container's anonymous `node_modules`
volume had already been created in an earlier `up` this session, and Compose reuses an
existing anonymous volume for a service by default rather than re-initializing it from a
freshly rebuilt image — volume-from-image initialization only happens for a volume that's
genuinely new. Fix:

```bash
docker compose up -d --force-recreate --renew-anon-volumes frontend
```

**Takeaway:** `docker compose build` alone is never enough after adding a package if the
service's container (and its anonymous volume) already existed from a prior `up` in the
same session — `--renew-anon-volumes` (or tearing the stack down first) is required to
actually pick up the new dependency.

### Backend bug found via frontend integration testing: 500 instead of 401

While testing the route guard's server-side backing (`GET /api/my/notes` with no auth),
a bare `curl` call with no `Accept` header returned a raw `500`, not the expected `401`.
Root cause (from `storage/logs/laravel.log`): Laravel's `Authenticate` middleware builds
its guest-redirect target as `$request->expectsJson() ? null : route('login')` — and this
app has no `web.php`, no HTML routes, and no route named `login` at all. Any request that
doesn't send `Accept: application/json` (curl by default, Postman by default, a browser
navigating to the URL directly) hits `expectsJson() === false`, and `route('login')`
throws `RouteNotFoundException` while the middleware is still constructing the exception
it was about to throw — a 500 masking what should be a 401.

**This never affected the real frontend** — `api/client.ts` unconditionally sends
`Accept: application/json` on every request, so `expectsJson()` is always true in
practice, which is exactly why this had gone uncaught through the entire Sanctum test
pass. Found it only because this session's test script made one deliberately bare
`curl` call (no headers at all) specifically to check the guard's server-side behavior.

**Fix**, in `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->redirectGuestsTo(fn () => null);
})
```

Since there is no login page anywhere in this API-only app, guests should never be
redirected — always fall through to the JSON `401`. Verified with the no-header curl
case, a `text/html`-accepting case (simulating a browser typed-in-address-bar visit), and
the normal `Accept: application/json` case — all three now return `401`; public endpoints
and `/up` unaffected.

**Lesson:** an API-only Laravel app should treat this as day-one hardening, not something
to discover later — any Sanctum-protected route will have this exact failure mode until
`redirectGuestsTo` (or equivalent) is set, and it's easy to miss if every test client
happens to always send `Accept: application/json` like ours did.

### Verification

Full build (`tsc -b && vite build`) and lint (`oxlint`) clean — one accepted warning
remains (the `AuthContext` fast-refresh nitpick from last session, still not worth
splitting into 3 files). Live-tested the complete flow against the running containers,
matching exactly what each page's code calls: login, create a public note and a private
note (with tags, exercising find-or-create), confirmed the public list and search/tag
filters never surface the private note, confirmed the public single-note endpoint 404s
for a private note by id, confirmed the dashboard sees both notes, confirmed the
previously-broken unauthenticated check now correctly 401s, edited a note, deleted both,
confirmed the deletion stuck. Left the dashboard empty afterward and the test account
in place so the actual create-note form UI could be exercised firsthand.

**Still not verified — same gap as last session:** no browser automation available, so
the actual DOM-level behavior (does the route guard really redirect to `/login` when you
type `/my/notes` into the address bar unauthenticated, does the search input/tag dropdown
actually update the list on screen, does the markdown render correctly) hasn't been
watched happen by anyone. Server-side, the guard's `401` is confirmed solid regardless of
headers sent (see the bug above) — but "does the client-side redirect component actually
fire" is a real, distinct claim I have not verified.

## 2026-08-27 — Real Design Pass: Tokens, Editor-Tab Nav, Directory-Listing UI

Applied `/mnt/skills/public/frontend-design/SKILL.md`'s process (brainstorm → critique
against its own "generic AI look" warning list → revise → build) to replace the default
unstyled-Tailwind look across the layout/nav, `/notes`, `/notes/:id`, `/my/notes`, the
note create/edit form, and `/login`. Blog pages and `Home` were explicitly out of scope
(not named in the request) and were left untouched — they'll look inconsistent inside the
new shell until their own pass happens.

**Aside on process:** the skill file wasn't actually present in this environment at the
path the user gave (`/mnt/skills/public/frontend-design/SKILL.md` — checked WSL, the
Windows-side filesystem, and a broad search; genuinely not installed here). Rather than
fabricate its contents or quietly substitute generic "avoid AI look" judgment for a skill
the user explicitly wanted followed, asked how to proceed — they pasted the file's actual
content directly. Followed it from that pasted text.

### The self-critique the skill's process asks for

First instinct for "developer tool" was dark background, monospace everywhere, one neon
accent — which is almost exactly the skill's own cluster-2 warning (near-black + single
acid accent). Named that explicitly and rejected it before designing anything, in favor
of a *light* editor theme with a small semantic accent system borrowed from syntax
highlighting (keyword-blue, string-green, error-red as three distinct roles, not one
brand color) rather than a single arbitrary hue.

### What shipped

- **Design tokens** in `frontend/src/index.css` via Tailwind v4's CSS-first `@theme`
  block (no `tailwind.config.js` needed) — `paper` `#F6F7FA`, `ink` `#1B2430`, `rule`
  `#DEE2E9`, `keyword` `#3555D8`, `string` `#1F8A5F`, `flag` `#C23B3B`. Confirmed these
  actually compiled into real utility classes (`.bg-keyword`, `.text-flag`, etc.) by
  grepping the production CSS build output, not just assuming Tailwind picked them up.
- **Type**: IBM Plex Mono for display/headings (a deliberate inversion — mono is usually
  reserved for code blocks; here it's the headline voice, since the whole product's
  premise is code) and IBM Plex Sans for body/prose. Loaded via Google Fonts
  `<link>` tags in `index.html` (preconnect + stylesheet), not a blocking `@import` in CSS.
- **Signature element: the nav is a tab strip.** `~/notes.md`, `~/blog.md`,
  `~/dashboard.md`/`~/login.sh` depending on auth state, styled like open files in an
  editor — the active tab visually merges into the content panel below it (classic
  matching-border-color tab trick: active tab's bottom border is the same white as the
  panel it sits on). Logout is deliberately *not* rendered as a tab — it isn't a page, so
  pretending it's one would misrepresent the nav's own structure.
- **Notes lists render as a directory listing** (numbered rows, bracketed `[language]`,
  `#tag` tokens in muted mono) rather than a card grid — literal to the content, since
  these are files in a personal vault, not abstract feed items.
- **The note form's content field has a live line-number gutter** synced to the textarea
  via scroll-position matching — the one signature element that's genuinely functional,
  not just decorative chrome.
- **Loading state** is a blinking `_` cursor (`motion-safe:animate-pulse`, so
  `prefers-reduced-motion` gets a static cursor instead). **Empty states** read like a
  code comment (`// no notes found`). **Error states** keep a compiler-annotation frame
  (small red "ERROR" label) but the actual message stays full-contrast, plain body text —
  see the fix below for why that split matters.

### Fixed after user feedback, before it shipped wrong

Initial empty-state pass put the *entire* message (not just the decorative `//` prefix)
at `text-ink/50` — roughly a 3:1 contrast gray, borderline for text someone actually needs
to read. The user's approval on the plan had explicitly flagged this exact risk: the
skill's own writing guidance puts clarity on "what happened" before voice/personality,
and stylized-but-illegible would violate that. Fixed by splitting the two: the `// `
prefix stays muted (`ink/35`, purely decorative), the actual message is now full-strength
`text-ink` (matching the pattern already used correctly in `ErrorState`, where the "ERROR"
label is styled but the message itself was always plain body text at full contrast).

### Verification

Full build and lint clean (only the pre-existing, previously-accepted `AuthContext`
fast-refresh warning remains). Confirmed the `@theme` tokens actually generated real
Tailwind utilities by grepping the compiled CSS bundle directly, rather than assuming.
Regression-checked all six routes still return `200` after the rewrite.

**Not verified, same limitation as the last two sessions:** no browser automation
available, so nobody has actually looked at this. Alignment details that are hard to
reason about from markup alone — whether the tab-strip's "merges into the panel" illusion
actually reads correctly at the pixel level, whether the line-number gutter stays in sync
during fast scrolling, whether the directory-listing rows wrap sensibly on mobile — are
real, unverified claims, not confirmed ones. Flagging this explicitly rather than
implying a visual design pass was actually seen by anyone.

## 2026-08-27 — Design Fixes from Real Screenshots: Tab Seam, Desktop Width

The prior session's "not verified — no browser available" caveat turned out to matter:
the user reviewed actual screenshots (desktop + mobile) and came back with two real
issues neither build/lint nor CSS-grepping could have caught.

**Tab-to-panel seam didn't merge.** Root cause in the old CSS: the tab had
`border border-b-0` (bottom border width zeroed), then the active-tab variant tried
`border-b-white` — coloring a border that has zero width, which renders nothing. Nav and
the content panel were also separate sibling blocks, `<main>` had its own full `border`
including a top edge, so there was a real visible line with nothing attempting to cover
it. Rewrote around adjacent same-color backgrounds instead of border-matching: `Nav` and
`main` now share one outer box; the tab tray's background is `paper`, the content's is
`white`, and the active tab is the only tab painted `white` — where it meets the content
directly below with zero gap, they're the same color touching, which needs no pixel-exact
border arithmetic to look seamless. Confirmed reliable because it only depends on
`align-items: flex-end` guaranteeing every tab's bottom edge sits flush with the tray's
bottom edge (a real flexbox guarantee, not a hopeful negative-margin trick), not on any
sub-pixel behavior that would need visual testing to trust.

**Desktop felt like a floating card.** Widened the shell `max-w-4xl` → `max-w-6xl`
(896px → 1152px). Deliberately did *not* apply that width to actual reading/editing
content: `NoteDetail`'s rendered markdown is capped at `max-w-2xl` (a real reading
measure) and the note form at `max-w-3xl` (wider than prose since the content field holds
code, not paragraphs, but still well short of the full shell). The directory-listing
pages (`/notes`, `/my/notes`) got no cap at all — full shell width, per the explicit
request, since a real file listing doesn't float as a narrow card. The principle: a wider
*workspace* doesn't mean wider *paragraphs or form fields* — those still want a bounded
measure regardless of how much shell space exists around them.

No browser tool this session either — verified via build/lint (clean), grepping the
compiled CSS for the new width utilities and background tokens, and route regression
checks, same rigor as before. The actual pixel-level correctness of the seam still
depends on the user's live check, which is what surfaced these two issues in the first
place — this is exactly the loop that limitation is supposed to run through.
