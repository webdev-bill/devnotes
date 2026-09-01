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
- [x] Create a non-root user with sudo access — done 2026-08-27, see that
      session's log below
- [ ] Write docker-compose.yml (Laravel + React + Postgres)
- [ ] Set up Traefik for reverse proxy + automatic HTTPS
- [ ] Point Cloudflare DNS (A record) to the Droplet's IP
- [x] Set up GitHub Actions for build + deploy — done and verified working
      end-to-end 2026-08-27, see that session's log below
- [ ] Configure Postgres backups to S3-compatible storage (e.g. Backblaze B2)
- [ ] Write DEPLOYMENT.md — a from-scratch rebuild guide
- [ ] Add pagination controls to the notes list pages (`/notes` and `/my/notes`)
      — deliberately deferred in the 2026-08-26 notes/blog pages session, both
      currently only render the first page of API results
- [ ] Add pagination controls to the blog list pages (`/blog` and `/my/blog`) —
      same deferral, same reason, from the 2026-08-27 blog pages session
- [ ] Add scheduled-publishing UI to the blog post form — the backend already
      supports a future `published_at` (`/my/blog-posts` accepts any date), but
      the frontend's publish control only offers "now" or "never" (draft).
      Deliberately deferred in the 2026-08-27 blog pages session in favor of
      the simpler two-button draft/publish pair
- [ ] Resolve "publish now" server-side instead of trusting the browser's clock
      — `BlogForm`'s Publish button currently sends `new Date().toISOString()`
      from the client. Not the cause of the 2026-08-27 missing-post report
      (that was a stale browser cache), but a real independent risk — a
      client clock drifting behind the server's (e.g. Docker Desktop's VM
      clock after a host sleep/resume) could silently schedule a post
      slightly in the future
- [ ] Add real Docker healthchecks to `backend`/`frontend`/`traefik` in
      `docker-compose.prod.yml` — currently only `db` has one, so
      `docker compose up -d --build` doesn't actually wait for the app to be
      ready, only started. `deploy.sh`'s health-check retry loop (added
      2026-08-27) papers over this at the deploy-script level; real
      healthchecks would fix it at the source instead

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

## 2026-08-27 — Real Blog Pages: List, Detail, Dashboard, Draft/Publish

Replaced the `/blog`, `/blog/:slug`, `/my/blog` (+ create/edit) placeholders with real
pages, following the same propose-then-build flow as the notes pages session — reusing
the design system and shared infrastructure (`useFetch`, `LoadingState`/`ErrorState`,
`LineNumberedTextarea`, the directory-listing/tab-strip patterns) rather than inventing
parallel versions of any of it.

### New pieces, and why they couldn't just reuse the notes ones

- `BlogPostCard` — same directory-listing row shape as `NoteCard`, but shows a published
  date instead of `[language]`/`#tags`, since posts have neither.
- `PostStatusBadge` — **three** states (draft / scheduled / published), not two, because
  the backend already supports a future `published_at` for scheduling even though the UI
  doesn't expose scheduling yet (see backlog item below). Styled identically to
  `VisibilityBadge` (dot + label, same tokens) but a distinct component since the shape
  genuinely differs — forcing a boolean-shaped component to represent three states would
  have been worse than a small, consistent duplicate.
- `BlogForm` — structurally like `NoteForm`, but the publish control is the one real UI
  decision this session (see below), and there's no visibility radio or tags field —
  blog posts have neither.
- Extracted `components/formStyles.ts` (`inputClass`, `labelClass`) out of `NoteForm` and
  `Login` — `BlogForm` would have been a third copy-paste of the exact same classNames,
  which crossed the line into "this is now a real duplication problem," not "premature
  abstraction."

### Publish/draft control

Two buttons, state-dependent on whether the post being edited already has a
`published_at`:

- **New or draft**: `Save draft` (submits `published_at: null`) / `Publish` (submits
  `published_at: <now>`).
- **Already published**: `Save changes` (keeps the existing `published_at` untouched) /
  `Unpublish` (submits `published_at: null`) — added on the user's confirmation that
  publish shouldn't be a one-way door in the UI just because it wasn't explicitly
  requested.

**Deliberate safety choice, not just styling:** neither button is `type="submit"`. The
form's own `onSubmit` just calls `preventDefault()` and does nothing — every action fires
from an explicit `onClick`. Reasoning: pressing Enter while typing in the title field
triggers a form's default submit in a single-line input (unlike a textarea, where Enter
just inserts a newline), and publishing a post is a real, visible consequence — not
something that should happen because someone hit Enter mid-sentence titling their draft.

Scheduling (a future `published_at`) was **not** built into the UI this session, even
though the backend already supports it — the two-button pair is simpler and covers the
actual ask; scheduling is logged to the "still to do" list below rather than silently
dropped.

### Nav and routing changes (both flagged and confirmed before building)

- Nav's single `~/dashboard.md` tab became two: `~/my-notes.md` and `~/my-blog.md`,
  shown together when authenticated — mirrors the existing public `~/notes.md`/
  `~/blog.md` pair rather than inventing a new nav concept. Without this, `/my/blog`
  would have been reachable only by typing the URL directly.
- Renamed the blog edit route param from `:id` to `:slug` (`/my/blog/:slug/edit`) — the
  originally-approved route structure said `:id`, but `BlogPost`'s route-model binding is
  slug-based everywhere in the backend, public and private, so the value actually flowing
  through that segment was always a slug. Naming it accurately now avoids confusion later
  rather than carrying forward a misleading param name.

### Verification

Build and lint clean (same single pre-existing `AuthContext` warning, nothing new). Live
end-to-end test against the real API, mirroring exactly what `BlogForm`/`BlogDashboard`
call: created a draft → confirmed it's excluded from the public list (`total: 0`) and
404s on its public slug URL → confirmed it appears correctly on the authenticated
dashboard with `published_at: null` → published it (`published_at` set to now) →
confirmed it now appears publicly (`total: 1`, `200` on the slug URL) → unpublished it
(`published_at` back to `null`) → confirmed it disappeared from the public list again and
404s again → confirmed the route guard's server-side backing (`GET /my/blog-posts` with
no auth → `401`, same fix from the notes session, still holding) → deleted the test post
and confirmed both dashboards were left empty for manual UI checking. Route regression
check on all four new paths, all `200`.

**Same honest gap as every frontend session so far:** no browser tool available, so
nobody has watched this render. The API-level flow above is as rigorous a check as I can
do without one, but it's not the same claim as "the two-button state switch actually
looks right once a post is published" — that's still the user's to confirm.

## 2026-08-27 — Bug Report: Published Post Missing from Public /blog (Resolved: Not a Bug)

User reported clicking "Publish" on a post, then seeing an empty `/blog` list with no
errors anywhere (console, network tab, or UI). Investigated three specific hypotheses
before touching anything, per the user's request to understand root cause first.

**Timezone mismatch (the user's leading suspect) — ruled out as literally stated, but a
related real risk remains.** `config('app.timezone')` is hardcoded `'UTC'`; `now()`
confirmed returning UTC via Tinker; `new Date().toISOString()` (what `BlogForm`'s
"Publish" button sends) is *always* UTC by JS spec regardless of browser-local
timezone — so "browser local vs. server UTC" specifically isn't the mechanism. Directly
tested the `published()` scope's actual SQL and bound values via Tinker (stored
`published_at` vs. `now()` at query time) and the comparison was correct.
**However:** the frontend still trusts the *browser's wall clock* for "what time is
`now`," which is an independent risk from timezone handling — Docker Desktop's VM clock
drifting after a host sleep/resume is a documented real-world failure mode. No clock skew
found in this dev environment (host/WSL/container all agreed to the second), but this is
worth hardening regardless of whether it's the actual cause here — proposed resolving
"publish now" server-side instead of trusting the client's clock; not yet built, pending
the user's decision.

**Backend API — not reproducible, and there's direct evidence it's working.** Recreated
the exact flow (create draft → publish with a JS-`toISOString()`-shaped value → fetch the
public list) via curl/Tinker and it worked correctly end to end. More tellingly: the
database already contained a real post (`"hello"`, published earlier by the user's own
manual testing) that `GET /api/blog-posts` correctly returns right now — meaning the full
write→store→serve pipeline demonstrably worked for at least one real click.

**Frontend silently swallowing a response — no bug found on read-through.**
`BlogList.tsx`, `api/blogPosts.ts`, `api/client.ts`, and `useFetch.ts` all read
structurally correct: `apiRequest` properly awaits and returns `response.json()`,
`useFetch` properly transitions to `{status: 'success', data}`, and `BlogList`'s
loading/error/success/empty branching has no path that would render a non-empty
successful response as blank.

**Conclusion at the time: unresolved, not faked as resolved.** Given the backend
demonstrably worked (including for the user's own real post) and the frontend code read
correctly, the leading hypothesis was a stale Vite dev-server/HMR state in the browser tab
that had been open through many iterative edits to these exact files across two
sessions — not a logic bug. That was a hypothesis, not a confirmed finding at the time, so
it was logged as unresolved rather than claimed fixed.

**Confirmed afterward: correct call, not a real bug.** User hard-refreshed and checked the
actual `GET /blog-posts` network response directly — the published post was in the
response body all along. Stale browser/dev-server cache, exactly as hypothesized; no
backend or timezone bug. The independent risk surfaced during the investigation (the
frontend trusting the browser's wall clock for "now" rather than resolving publish time
server-side) is still real and worth hardening even though it wasn't the actual cause
here — added to the "still to do" list below rather than dropped just because this
specific report turned out to be something else.

**Separately, a real bug found and fixed:** buttons across the app had no pointer cursor
on hover (reported specifically for the logout control, but systemic — 9 files have
`<button>` elements, all affected the same way). Root cause: Tailwind's Preflight reset
sets `cursor: default` on `<button>` to normalize inconsistent browser UA defaults; `<a>`
elements (the nav tabs) are untouched by that reset and keep the browser's native pointer
cursor, which is why the asymmetry was only visible on the logout button specifically.
Fixed once at the root — `button:not(:disabled) { cursor: pointer; }` in the base layer —
rather than patching `cursor-pointer` onto nine separate button classNames.

## 2026-08-27 — Non-Root Sudo User on the Droplet

DNS went live this session (`devnotes.billandrewsallao.com` → the Droplet's IP), which
made deployment prep real rather than hypothetical — starting with the non-root user
deferred all the way back in the initial server hardening (see the "Decisions Made Along
the Way" note above: "stay on root through setup, create a dedicated user right before
actual app deployment begins"). That moment arrived.

Executed directly over SSH (root access confirmed working first via a read-only check —
`whoami`/`hostname`/`os-release` — before changing anything):

```bash
adduser --disabled-password --gecos "" andrew
usermod -aG sudo andrew
mkdir -p /home/andrew/.ssh
cp /root/.ssh/authorized_keys /home/andrew/.ssh/authorized_keys
chown -R andrew:andrew /home/andrew/.ssh
chmod 700 /home/andrew/.ssh
chmod 600 /home/andrew/.ssh/authorized_keys
```

**Real decision, not just a technical step: sudo needs a password.** `adduser
--disabled-password` is correct for an SSH-key-only account, but it also means the
account has no password at all — and `sudo` on Ubuntu challenges for the *account's own
local password* by default, separate from however you authenticated over SSH. Passing
that through non-interactively (`sudo -l -U andrew` first, to verify the `(ALL : ALL)
ALL` grant existed without needing any password) surfaced a real choice: passwordless
`sudo` (NOPASSWD — defensible here since the SSH key already grants full root today via
direct root login, so it wouldn't actually lower the current trust bar) vs. a real
password (the standard DigitalOcean/Ubuntu convention, and stronger against a
non-interactive process running as `andrew` silently escalating). **User chose the real
password.** Couldn't be set by Claude Code non-interactively — `passwd` needs a genuine
TTY and typing it through any automated channel would mean it got logged/seen somewhere,
defeating the point — so the user ran `ssh devnotes "passwd andrew"` themselves,
interactively, in their own terminal.

**Verification, done deliberately as two separate steps** so a fallback existed at every
point: confirmed `andrew`'s sudo *configuration* was correct before the password even
existed (`sudo -l -U andrew` as root needs no target-user auth), then — after the
password was set — the user independently confirmed `ssh -i ~/.ssh/devnotes_key
andrew@<IP>` logs in and `sudo whoami` correctly prompts and returns `root`. Root SSH
access was deliberately left untouched throughout (didn't disable root login, didn't
replace the existing `Host devnotes` SSH config entry) until that end-to-end check passed
— only after confirming did the user update their own `~/.ssh/config` to make `devnotes`
default to `andrew` rather than `root`.

**Not done yet, on purpose:** root password/SSH login itself hasn't been disabled server-
side. That's the natural next hardening step now that the `andrew` account is proven to
work, not something to rush ahead of verification.

## 2026-08-27 — Production Docker Compose + Traefik (Files Only, Not Deployed)

DNS went live this session (`devnotes.billandrewsallao.com` → the Droplet's IP),
prompting the actual production stack design. Proposed the full architecture before
writing anything — file structure, Traefik routing/cert-issuance mechanics, env var
handling, Postgres hardening — and got it confirmed, including one real fork the user
made a call on (see below), before building. Nothing was deployed or run on the server
this session; everything below was built and validated **locally only**.

### Separate `docker-compose.prod.yml`, not an override

Compose's override mechanism suits a small delta from dev. Here the delta is large:
volume strategy flips entirely (dev bind-mounts source for hot reload; prod bakes built
artifacts into images), almost all port publishing disappears (Traefik takes over), and
the frontend needs a fundamentally different build. A separate, fully self-contained file
is easier to read as "this is what actually runs in production" than a merge would be.

### Backend server: PHP-FPM + nginx, not `php artisan serve`

Explicitly offered this as a choice rather than deciding unilaterally — `artisan serve`
would have worked for a low-traffic personal site with zero new Dockerfile work, but
Laravel's own docs call it dev-only. **User chose PHP-FPM + nginx** — the more correct
setup, worth the extra moving parts for something that's also a portfolio piece.
Implementation: multi-stage `backend/Dockerfile.prod` (stage 1: `composer install
--no-dev` via the official `composer` image; stage 2: `php:8.4-fpm` + nginx + supervisor,
supervisor running both processes and forwarding their logs to stdout/stderr so `docker
logs` captures everything). nginx proxies `.php` requests to PHP-FPM over
`127.0.0.1:9000` (the base image's default FPM listen address — didn't need to touch
`www.conf`) and serves `public/` directly for everything else.

**Deliberately not done this pass:** `config:cache`/`route:cache` at build time. This is
a known Laravel-in-Docker trap — caching config during the Docker *build* stage would
bake in whatever (empty/default) env values exist at build time, not the real production
values injected at container *run* time, silently caching wrong config (e.g. `DB_HOST`
as unset instead of `db`). Skipped for correctness; a real optimization worth doing
properly later (cache at container startup via an entrypoint script, after real env vars
are available), not worth the risk of a subtle bug for a low-traffic site right now.

### Frontend: multi-stage build, and the SPA-fallback gotcha

`frontend/Dockerfile.prod`: stage 1 `npm run build` (needs `VITE_API_URL` as a **build
arg**, not a runtime env var — Vite inlines `VITE_*` vars into the static bundle at build
time; there's no Node process left at runtime to read one from), stage 2 copies `dist/`
into `nginx:alpine`. This one wasn't a choice the way the backend was — there's no
reasonable way to run the Vite dev server in production.

**Real bug caught by local testing, not just written correctly by inspection:**
`frontend/nginx.conf` needs `try_files $uri $uri/ /index.html;` or a static file server
will 404 any client-side route on direct visit/refresh (`/notes/5` isn't a real file on
disk — only React Router knows what to do with it, and only after `index.html` has
loaded and the app has booted). Wrote it correctly the first time from knowing the
gotcha, then verified rather than assumed: built the image, ran it, curled `/notes/5`
directly, confirmed `200` with `<title>devnotes</title>` in the body — not a 404.

### Traefik: Docker-label-driven routing, HTTP-01 challenge, named volume for certs

- `--providers.docker.exposedByDefault=false` — only containers explicitly labeled
  `traefik.enable=true` get routed, so nothing gets exposed by accident as more
  containers get added later.
- HTTP-01 challenge (simplest option — just needs port 80 reachable, no DNS provider API
  credentials, unlike DNS-01).
- **Named volume for `/letsencrypt`, not a bind-mount** — Traefik creates `acme.json`
  itself inside the container with correct `600` permissions on first run. The classic
  "chmod your acme.json or Traefik silently refuses to use it" gotcha is specifically a
  bind-mount problem; a named volume sidesteps the entire class of issue.
- Backend router: `Host(...) && PathPrefix(/api)`, explicit `priority=10` rather than
  relying on Traefik's rule-specificity inference to rank it above the frontend's bare
  `Host` catch-all — pinning it explicitly beats debugging a routing ambiguity later.
  **No `StripPrefix` middleware** — Laravel's own routing already expects the `/api`
  prefix (`bootstrap/app.php`'s `api:` routing), so it passes through unchanged. Stripping
  it would make Laravel receive `/notes` instead of `/api/notes` and 404 everything.
- `${DOMAIN}` is an env var throughout, never hardcoded into the compose file or labels —
  consistent with the project's existing rule against hardcoded domains.

### Environment variables

New `.env.production.example` (tracked) mirrors the existing `.env.example` pattern —
placeholders only. Real `.env.production` will live only on the server, gitignored,
filled with real secrets. **Found and fixed a real gap while creating it**: the root
`.gitignore`'s `.env` rule only matches a file literally named `.env` — it would *not*
have caught `.env.production` (a different filename). Added `.env.production` and
`.env.*.local` patterns before creating the file that needed them, not after.

**`ACME_EMAIL` deliberately isn't in the tracked `.example` file** — the user's real
email is going in the real (gitignored) `.env.production` on the server, but a personal
email in a file that gets committed to a public repo is exactly the mistake from the
2026-08-26 secrets audit session, so a placeholder (`you@example.com`) went in the
tracked file instead, with the real value communicated in chat, not committed.

Also: `VITE_API_URL` becomes relative (`/api`) in production, not absolute like dev's
`http://localhost:8000/api` — Traefik puts frontend and backend on the *same* domain
(routing by path, not port), so production requests are same-origin. Worth noting: the
permissive CORS setup relied on for local dev (cross-origin, different ports) becomes
irrelevant for the app's own traffic in production — not a security problem given the
bearer-token, no-cookie auth model, just no longer load-bearing.

### Postgres: confirmed volume persistence, removed the public port

Named volume (`db_data`) persistence already existed and carries over unchanged. The one
real production change: **no `ports:` mapping at all**. Dev publishes `${DB_PORT}:5432`
for local GUI tools; in production, Postgres has no reason to be reachable from the
public internet even password-protected. It's now reachable only by the backend
container, over the Docker network — `docker compose exec db psql` (or an SSH tunnel) for
any direct access needed later.

### Verified locally — real validation, not just written and assumed correct

Nothing was deployed to the Droplet, but nothing was taken on faith locally either:
- `docker compose -f docker-compose.prod.yml config` — confirmed valid syntax with dummy
  env values.
- Built both `Dockerfile.prod`s locally end to end (`docker build`, not just linted by
  eye) — both succeeded.
- **Ran the built backend image** (SQLite swapped in just for this smoke test — no need
  to spin up Postgres to prove the web server stack itself works) and confirmed via
  `docker logs` that both `nginx` and `php-fpm` started under supervisor and stayed
  running, then curled `/up` through the full nginx→FastCGI→PHP-FPM→Laravel path and got
  `200` — proving the nginx config and FPM socket wiring are actually correct, not just
  plausible-looking.
- **Ran the built frontend image** and specifically tested the SPA-fallback gotcha
  described above — confirmed, not assumed.
- Cleaned up all test containers and images afterward; nothing left running locally, and
  the Droplet itself was never touched.

### Still ahead before this actually goes live

`ufw` on the Droplet only allows SSH right now (from initial hardening) — `80/tcp` and
`443/tcp` need opening before Traefik can do anything, regardless of how correct this
compose file is. That's a deploy-time step, deliberately not run yet — the user will
confirm before anything runs on the server, and that ufw step is the thing most likely to
be forgotten in the moment, so it's flagged here specifically to not be.

## 2026-08-27 — Uptime + SSL Certificate Expiry Monitoring (StatusCake)

Closed the "no monitoring/alerting exists yet" gap flagged earlier in this runbook.
Wanted something that would catch two independent failure modes before a visitor did:
the site being down, and the Let's Encrypt certificate lapsing or becoming invalid.

### Tool choice, and why it took three tries

Initial pick was Better Stack (free tier, SSL checks built into the same uptime
monitor) — signup rejected the personal email domain being used. Second pick was
HetrixTools (free tier, generous limits, SSL included) — rejected on trust grounds
(smaller/lesser-known provider) before signing up. Landed on **StatusCake**: an
established provider (operating since 2012, large customer base), free plan requires
only an email and no credit card, and — unlike Better Stack's combined model —
StatusCake splits uptime and SSL into two separate test types rather than one
toggle on a single monitor.

### What's configured

- **Uptime test** (`devnotes site`, HTTP type): checks `https://devnotes.billandrewsallao.com`
  every 15 minutes. Confirmed showing UP (green status) after creation.
- **SSL test** (separate test, since StatusCake doesn't bundle this into the uptime
  test the way some competitors do): same URL, 24-hour check rate (free-tier ceiling —
  faster intervals are a paid "Business Critical" feature, not needed here since cert
  expiry is a slow-moving problem by nature).
  - Alert on Expiration: enabled
  - Alert on Problems (invalid/misconfigured cert): enabled
  - Mixed Content Warnings: enabled
  - Reminder schedule: 30 / 7 / 1 days before expiration
- Both tests share one Contact Group (email) so alerts land in the same inbox
  regardless of which check fires.

### Gotcha: the SSL test's Contact Group is easy to leave empty

The "Create test" form doesn't block submission if **Contact Groups** is left on
"Select an option" — a test with no contact group will still run and detect problems,
it just won't tell anyone. Caught this before finalizing the SSL test; worth
double-checking on any future test creation in StatusCake, since a monitor silently
collecting data with nobody subscribed is functionally the same as no monitor at all.

### Still to do

- [ ] Fire an actual test alert (if/when StatusCake exposes that option) or wait for
      a real check cycle to confirm the alert email reliably lands in the inbox and
      isn't filtered to spam — configured but not yet end-to-end verified with a real
      notification received.
- [ ] Revisit if this project ever needs multi-region checks or sub-24h SSL check
      frequency — both are free-tier limitations, not needed at current traffic/scale.

## 2026-08-27 — Dark Mode: Tokens, Toggle, and a Real Contrast Conflict

Implemented light/dark theming across every existing page, extending the design system
from the earlier design-pass sessions rather than introducing a parallel one. Spec was
pre-approved with exact hex values; the job was implementation and verification, not
re-designing — with one real exception (below) that the spec itself explicitly asked to
be flagged rather than silently resolved.

### The conflict: one token, two incompatible uses

The approved dark-mode hex values for `keyword`/`string`/`flag` were contrast-checked as
**foreground text against `paper`/`panel`** — correct for that, and deliberately lighter
than their light-mode counterparts specifically because text needs to be light to read
against a dark background. But the codebase also uses those exact same tokens as **filled
button backgrounds** with hardcoded `text-white` (Login's submit button, both dashboards'
"+ new" buttons, both forms' submit buttons). Wiring the given hex values in unchanged
would have made white text sit on top of a now-*light* pastel fill. Computed the actual
ratios rather than eyeballing:

| Dark-mode fill | White text contrast |
|---|---|
| `keyword` `#7C93F5` | 2.9:1 |
| `string` `#4FBE8B` | 2.3:1 |
| `flag` `#E5696A` | 3.2:1 (borderline even against the lenient UI-component floor) |

All fail the 4.5:1 normal-text threshold; two fail even 3:1. Stopped and flagged this
before writing any code, per the task's explicit instruction to do so rather than decide
unilaterally. **User chose:** dark text on the accent fill in dark mode (the standard
pattern for light/pastel accent fills — e.g. how shadcn/Radix-style dark themes handle
this), over the alternative of pinning filled-button backgrounds to the light-mode
saturated color regardless of theme.

**Implementation, reusing only already-approved values — no new hex invented:** added one
small additional token, `accent-ink` — the foreground color for text sitting on a solid
accent fill, as opposed to `ink` (foreground on `paper`/`panel`). White in light mode
(already implicitly correct for the original saturated fills), the light-mode `ink` hex
(`#1B2430`) in dark mode. Replaced `text-white` with `text-accent-ink` on every filled
accent button. `Home.tsx`'s unrelated `bg-indigo-600` button was left untouched — that
page was already out of scope for the design-system pass and isn't in this task's route
list either.

### Token architecture

`index.css` now has three layers: raw CSS custom properties on `:root` (light values) and
`[data-theme="dark"]` (dark values), then a `@theme` block that aliases each Tailwind
color token to the corresponding raw property (`--color-paper: var(--paper)`, etc.) rather
than owning literal hex itself. This is Tailwind v4's documented pattern for CSS-variable
theming — redefining an `@theme`-owned variable directly under a nested selector works,
but aliasing is the pattern actually documented for this, so that's what got built.
Existing utility classes (`bg-paper`, `text-ink`, `border-rule`, ...) needed zero changes
anywhere — they just repaint under the `data-theme` attribute automatically.

Added a `panel` token (`#FFFFFF` light / `#20242C` dark) — didn't exist before; `bg-white`
was hardcoded/implicit everywhere the tab-seam trick's content surface appeared. Grepped
the whole `frontend/src` tree for `bg-white`/`text-white` and Tailwind's stock
gray/indigo/red/etc. palette classes to find every place needing a token instead of a
literal. Real finds: `Layout.tsx`'s content panel, `Nav.tsx`'s active tab, `NotesList.tsx`'s
search input/tag select, `LineNumberedTextarea.tsx`'s wrapper, and the shared
`formStyles.ts` input class — all `bg-white` → `bg-panel`. `PostStatusBadge` and
`VisibilityBadge` needed no changes at all — they only ever use tokens as small dots and
label text, never as a fill-with-white-text pattern, so they were already dark-mode-safe
by construction. `ComingSoon.tsx` still has hardcoded Tailwind grays too, but it's dead
code — nothing imports it anymore (every page it used to stand in for has since been
built out for real) — so it was left alone rather than fixed for a component nothing can
ever render.

### Toggle: context + provider split, same shape as AuthContext

`ThemeContext.tsx` (context + provider) and `useTheme.ts` (the hook) — deliberately
mirrors the existing `AuthContext`/`useAuth` file split, including picking up the exact
same "fast refresh" oxlint warning that was already accepted for `AuthContext` for the
same reason (colocating a small context with its provider is a standard, low-risk
pattern; splitting further for this app's size isn't worth 3 files for one context).
`ThemeToggle` renders in the tab strip after the last tab, explicitly *not* styled as a
tab — same reasoning already established for why Logout isn't a tab: it isn't a page.

**No-flash-of-wrong-theme**: a small inline script in `index.html`, before React mounts,
reads `localStorage.theme` (falling back to `prefers-color-scheme`) and sets
`data-theme` on `<html>` synchronously. `ThemeContext`'s own initial state resolution
uses the identical fallback order, so it agrees with what's already painted instead of
flashing on top of it. The two are documented as needing to stay in sync if either
changes.

**Markdown rendering** (`NoteDetail`, `BlogDetail`): needed `@custom-variant dark
(&:where([data-theme=dark], [data-theme=dark] *));` so Tailwind's `dark:` variant (used
for `dark:prose-invert`) keys off the same `[data-theme]` attribute as everything else,
instead of its default `prefers-color-scheme`/`.dark`-class behavior. Without this,
`dark:prose-invert` would activate based on OS preference regardless of what the user
actually picked with the toggle — silently wrong for anyone who overrides their system
preference. The existing custom `.prose` link/code-block tint rules (already
token-based) needed no changes; they already track the theme correctly through the CSS
custom properties.

### Verification

Didn't stop at "the source edit looks right" — grepped the actual compiled `dist/`
output for both the `[data-theme=dark]` block and every one of the 16 token values (8
tokens × 2 themes), confirming the shipped CSS matches the approved table exactly
(`#ffffff` appearing minified as `#fff` in the light-mode `panel`/`accent-ink` values,
as expected). Independently computed the dark-mode contrast ratios by hand (WCAG relative
luminance formula) rather than trusting the pre-approved numbers outright: ink/keyword/
string/flag all clear 4.5:1 against both `paper` and `panel` (4.9:1 to 13.6:1 across all
eight pairings) — confirmed, not just assumed. One honest data point: `rule` against
`panel` computed to ~2.89:1 by hand, a hair under the 3:1 UI-component floor (it clears
3.1:1 against `paper`) — within hand-calculation precision margin, not a clear violation
like the button-text issue was, so reported rather than treated as a blocker. Full build
and lint clean (one new oxlint warning, the same accepted pattern as `AuthContext`'s).
Route regression check: all ten routes still `200` in both themes.

**No browser tool available this session either** — checked via `ToolSearch` before
claiming so, rather than assuming. Said so plainly instead of silently skipping the
"actually look at it" verification step, consistent with flagging this same gap in every
design-pass session in this runbook. Left the dev server running with the toggle visible
in the tab strip for manual checking.

## 2026-08-27 — GitHub Actions CI/CD: Push-to-Deploy, Verified Working End-to-End

Push to `main` now deploys to the Droplet automatically. Two new files
(`.github/workflows/deploy.yml`, `deploy.sh`), a manual one-time server/GitHub setup the
user did directly (per the standing credential boundary — Claude Code creates files and
finds bugs, never touches SSH/keys/secrets), and one real race-condition bug found via an
actual failed deploy and fixed with real local testing, not just reasoned about.

### Architecture

- **GitHub Actions doesn't do the deploy work itself** — the workflow (`appleboy/
  ssh-action@v1.0.3`) just opens an SSH connection to the Droplet and sends a trivial
  script (`echo "connecting..."`). The *real* deploy logic lives entirely in `deploy.sh`
  on the server, invoked via an SSH **forced command** tied to the deploy key — meaning
  whatever the Action actually sends over that connection is ignored; the server runs
  `deploy.sh` regardless. This is a deliberate security boundary: even if the Action's
  own script were somehow compromised or misconfigured, the SSH key it authenticates
  with can only ever run one specific script, not arbitrary commands on the server.
- **Scoped deploy key, not the existing admin key.** A dedicated SSH key exists solely
  for this pipeline, separate from the `devnotes_key` used for interactive admin access
  — narrower blast radius if the CI secret were ever exposed, and it can be rotated or
  revoked independently of the key a human actually logs in with.
- **Three GitHub Actions secrets** (`SSH_HOST`, `SSH_USER`, `DEPLOY_SSH_KEY`) hold what
  the Action needs to connect. Referencing them by name in the workflow YAML is not
  itself a secret-handling concern — the values live only in GitHub's encrypted secrets
  store, never in the repo.
- **Conditional migrations, not unconditional.** `deploy.sh` diffs `backend/database/
  migrations` between the pre- and post-`git pull` commits and only runs `artisan
  migrate --force` if that diff is non-empty — most deploys are just code changes, and
  running a migration command (even a no-op one) on every single deploy is unnecessary
  surface area.
- **Manual setup the user performed directly, not witnessed by Claude Code**: generating
  the dedicated deploy key, configuring the forced-command restriction on the server side
  for that key, and adding the three GitHub secrets. Consistent with the standing
  boundary established earlier — described here at the architecture level (above) since
  that's what's actually verifiable from the resulting behavior, not as exact commands
  Claude Code never saw run.

### Two bugs found before the first real test, by reading the repo rather than trusting the given script

The user handed over exact file contents to implement verbatim, but verification against
the actual codebase (not the given script's assumptions about it) surfaced two real
mistakes before anything ran:

1. **Wrong migrations path.** The given script filtered the git diff on `database/
   migrations`; this repo's migrations live at `backend/database/migrations`. As given,
   the filter would never match anything — migrations would silently never run, on any
   deploy, even when they genuinely changed. Confirmed by listing the real directory
   before fixing, not assumed.
2. **Wrong health-check URL, two compounding ways.** The given script checked
   `/api/up`. Laravel's health route is registered at the bare path `/up`
   (`health: '/up'` in `bootstrap/app.php`) — a route Laravel adds *outside* the `/api`
   prefix entirely, so `/api/up` 404s. And even the corrected bare `/up` wouldn't have
   reached the backend anyway: Traefik only routes `PathPrefix(/api)` to it (confirmed
   by re-reading `docker-compose.prod.yml`'s own labels), so `/up` would hit the
   frontend's catch-all instead — a false "healthy" signal that never actually checks
   the backend. Fixed by checking `/api/tags` instead — a real, already-public,
   lightweight endpoint that genuinely exercises the backend and its DB connection.

Both fixes stayed within the two files being created — no need to touch
`docker-compose.prod.yml` or anything else to correct either one.

### Gotcha (recurrence): the executable bit didn't survive the Windows/WSL boundary

Same issue as the gitleaks pre-commit hook script from an earlier session: `chmod +x
deploy.sh` followed by `git add` still showed mode `100644` (not executable) in the git
index — editing through the `\\wsl.localhost\...` UNC path from the Windows side doesn't
reliably carry the executable bit across to git's view of the file. Fixed the same way as
before: `git update-index --chmod=+x deploy.sh`, then verified via `git ls-files -s`
showing `100755` before committing.

### The real bug: a race condition, caught by an actual failed deploy

First real end-to-end test: build, container recreation, and the conditional migration
check all succeeded — only the final health check failed, `curl` exit 22 (HTTP error
status). User's diagnosis: a race condition, not an application bug. Confirmed structurally
before writing any fix: `db` has a Docker healthcheck and `backend` depends on it via
`condition: service_healthy`, but `backend`/`frontend`/`traefik` themselves have **no
healthcheck defined at all** in `docker-compose.prod.yml`. `docker compose up -d --build`
only waits for a container to be *started*, not *ready* — for a service with no
healthcheck, Compose has no way to tell the difference, so the very next line (`curl`)
raced against PHP-FPM/nginx startup (and possibly Traefik's own Docker-provider discovery
of the recreated container, which also isn't instant).

**Discussed reasoning before implementing**, per the user's explicit request — not just
building a fix silently:
- A fixed `sleep N` has to be sized for the worst case, paying that full cost on *every*
  deploy even when the container is ready in under a second (the common case), and still
  fails if a deploy is ever slower than N for any reason.
- A retry loop succeeds the moment the service is actually ready, and covers more than
  one possible cause of the delay (FPM cold start, Traefik reconfig lag, transient CPU
  contention from the rebuild itself) rather than one assumed cause with one assumed
  duration.
- A more thorough fix exists — real Docker healthchecks on `backend`/`frontend`/
  `traefik` in `docker-compose.prod.yml`, so `up -d --build` itself wouldn't return until
  they're actually healthy — but that touches a file outside this task's scope, so it's
  noted as a future option rather than done now (see "still to do" below).

Implemented: up to 6 attempts, 3 seconds apart (≈18s worst case), printing the actual
HTTP status on each failed attempt so a genuine failure is debuggable in the Action log
rather than just "it didn't work."

**A second real bug, caught only because the fix was actually tested, not just read
over:** the first draft's fallback for "curl couldn't connect at all" was
`status=$(curl ... || echo "000")`. curl itself already prints its own `000` via `-w`
when there's no response to report a code for (e.g. connection refused) — that print
happens regardless of curl's own nonzero exit, so the `|| echo "000"` fired *in addition*,
and both landed in the same command substitution: `000` + `000` concatenated into
`000000`. Caught this by actually running the loop against three real scenarios (a
working endpoint, a 404, and an unreachable host) rather than trusting the logic by
inspection — the connection-refused case printed the concatenated value immediately.
Fixed as a clean statement-level fallback instead of a piped one:
`status=$(curl ...) || status="000"` — on failure this reassigns the variable outright
rather than appending a second command's output into the same capture. Re-ran all three
scenarios after the fix to confirm, not just after the first attempt.

Also reverted an unrelated line-ending-only change to `README.md` that was already staged
from the user's IDE (same artifact as the very first scaffolding session) — kept out of
the fix commit rather than bundled in by accident.

### Final verification — real pipeline run, checked at the job/step level, not assumed from a green checkmark

Pushed a genuine small change (a README line documenting the auto-deploy behavior itself
— not an empty/fake commit) specifically to re-trigger the pipeline and confirm the fix.
`gh` CLI wasn't installed in this environment; used the public GitHub REST API directly
instead (unauthenticated — this repo is public, so read access to Actions run data didn't
need credentials, consistent with the standing boundary against handling auth). Checked
not just the top-level run conclusion but the job/step breakdown: run `b044e17`,
conclusion `success`, completed in 14 seconds. The single "Trigger deploy via SSH" step
runs `deploy.sh` in its entirety on the server — build, migration check, and the health
check retry loop all execute inside that one step — so its `success` conclusion means the
script reached its final `echo "Deploy succeeded"` line, which only happens if the health
check passed within the retry window. Attempted to pull the actual step log content for
full transparency on whether a retry fired or it passed on the first attempt; the log
endpoint requires authenticated admin access, which wasn't available (and wouldn't be
used even if it were, per the standing boundary) — the job-level result is authoritative
enough without it.

**Still to do:** the more thorough fix mentioned above — real Docker healthchecks on
`backend`/`frontend`/`traefik` in `docker-compose.prod.yml` so `up -d --build` itself
waits for readiness, rather than relying on the deploy script's own retry loop to paper
over the gap every time.

## 2026-08-27 — Rate Limiting on POST /api/login

Flagged during interview-prep review (not an active incident): the login endpoint had no
rate limiting at all, meaning unlimited password-guessing attempts against any known
email. Fixed with a named Laravel rate limiter, proposed and approved before any code was
written, then built and verified against a real running instance.

### Design: combined email+IP key, not either alone

`RateLimiter::for('login', ...)` in `AppServiceProvider::boot()`, keyed on
`$request->string('email')->lower().'|'.$request->ip()` — 5 attempts per 60 seconds on
that combined key, applied via `->middleware('throttle:login')` on the login route only.
Neither component alone was acceptable:
- **IP alone** only ever exercises a single vector — trivially bypassed by anyone with
  more than one IP address (which is most attackers).
- **Email alone** lets an attacker who doesn't even know the password lock the real
  owner out of their own account, just by hammering their known email from anywhere.

This is the same combined-key pattern Laravel's own Fortify/Breeze use for exactly this
reasoning — not a novel design, a well-trodden one.

### A real edge case caught during the proposal step, before any code existed

`throttle:login` runs *before* `LoginRequest`'s validation — FormRequest validation
happens during controller-argument resolution, which is after route middleware has
already run. So a malformed request with no `email` field at all would reach the rate
limiter's key-building closure with a missing input *before* validation ever gets a
chance to reject it cleanly. Using `Str::lower($request->input('email'))` risked a type
error or deprecation warning on `null` ahead of that validation. Used
`$request->string('email')->lower()` instead — Laravel's fluent string helper safely
defaults to an empty string when the input is missing, so a malformed request just gets
rate-limited normally (as part of the `''|<ip>` bucket) instead of risking a 500 before
validation ever runs. Caught and agreed during the propose-before-build step, not
discovered after the fact.

### Custom 429 response

Overrode the limiter's `response()` (rather than letting Laravel's default
`ThrottleRequestsException` shape render) to return
`{"message": "Too many login attempts. Please try again in {N} seconds."}` — `N` read
directly from the `Retry-After` value Laravel already computes and passes into the
response callback's `$headers` array, not recalculated separately. The real
`Retry-After` HTTP header still goes out too (`$headers` passed through to
`response()->json()`), not just mentioned in the body.

### Verification — real request flow against a running instance, not code review

Confirmed `CACHE_STORE=database` in `backend/.env` before relying on it (rate limiting
needs a store that persists across requests/processes, not one that resets every
request) — then verified it empirically too, not just trusted the config read, since the
whole point of the cooldown-reset test below is proving the store is actually working.

Created a real test user and ran the actual HTTP flow: correct login → `200` with a real
token. Five wrong-password attempts on the same email+IP → `401` each. Sixth → `429` with
the custom message and a `Retry-After` header. Also checked something the test plan
didn't explicitly ask for but the design implies: submitted the *correct* password while
still within the limited window — still `429`, confirming the block is on the request
itself, not conditional on the credentials being wrong (an attacker who eventually
guesses right doesn't get to slip through on the exact request that would have revealed
it). Waited out the 60-second cooldown, then confirmed a subsequent attempt was allowed
again (`401` for wrong password, not `429`) — proving the store actually expires counts
rather than the block being permanent or the whole thing silently not working.

**A methodology mistake caught mid-test, not a bug in the implementation:** the first run
tested "correct login succeeds" and then immediately started the wrong-password loop
against the *same* email — but the success check itself is also a request to `/login`
with the same key, so it consumed one of the 5 allowed slots. The result (4 wrong
attempts allowed, the 5th blocked) was actually still exactly correct behavior — 5 total
requests allowed regardless of credential correctness, 6th blocked — but didn't match the
test plan's literal wording of "5 wrong-password attempts." Re-ran with a second, fully
isolated test user for a clean, unambiguous sequence: 5 wrong attempts → `401` × 5, 6th →
`429`, matching the plan exactly. Also confirmed via `route:list -v` that
`Illuminate\Routing\Middleware\ThrottleRequests:login` is actually attached to the route,
not just assumed from the code.

Ran the existing backend test suite while in there — one pre-existing, unrelated failure
(`Tests\Feature\ExampleTest` expects `GET /` to return `200`; this has been a pure
API-only app with no web routes since the very first backend scaffolding session, so that
route has never existed). Not caused by this change, not touched, noted for whenever the
default Laravel scaffold test debris gets cleaned up.

Both test users and their tokens were deleted afterward; dev containers stopped since
this was a pure backend/API verification with nothing visual to leave running.

### Noted, not built: a broader IP-only layer

Per the agreed scope, no second IP-only limiter was added this pass. Worth flagging for
later, as the plan asked: the combined email+IP key means an attacker cycling through
*many different* email addresses from a single IP (a credential-stuffing pattern, not a
single-account brute-force) isn't meaningfully slowed down by this limiter at all — each
distinct email is its own 5/60s bucket, so thousands of attempts across thousands of
emails from one IP would sail through. A secondary, more permissive IP-only limiter (e.g.
~20-30/min per IP regardless of email) would close that specific gap without touching
the combined-key limiter's job of protecting individual accounts. Not built now — this is
exactly the kind of thing to revisit if the login endpoint ever needs to hold up against
more than "a known-gap fix from an interview-prep pass."

## 2026-08-27 — Dependabot Alerts + Security Updates Enabled

Enabled GitHub's built-in Dependabot on the repo (`webdev-bill/devnotes`) as automated
dependency vulnerability scanning for both Composer (Laravel, `composer.lock`) and npm
(React, `package-lock.json`). This was a repo settings change, made via Settings → Code
security — not a code change, so there's nothing to commit for the change itself, only
this log entry.

### What was enabled

- **Dependabot alerts** — passive scan of `composer.lock` and `package-lock.json` against
  GitHub's Advisory Database. Alert-only: surfaces known vulnerabilities in the dependency
  tree, opens no PRs.
- **Dependabot security updates** — when an alert fires *and* a patched version is
  available, GitHub auto-opens a PR bumping just that package to the patched version.
  Reactive, not proactive — it only acts in response to an actual alert, not on every new
  release upstream.

### What was deliberately left off, and why

- **Dependabot malware alerts** — a separate feature from vulnerability alerts; flags
  packages GitHub identifies as outright malicious rather than merely vulnerable. Not
  requested this pass. Low cost to add later if wanted — it's a settings toggle, not an
  architecture decision.
- **Grouped security updates** — bundles multiple simultaneous security-update PRs into
  one, to cut down on PR noise. Only useful once there are actually multiple concurrent
  alerts to group; at current scale (small, freshly-scaffolded dependency tree) there's
  nothing to group yet. Easy to turn on later if the PR volume ever justifies it.
- **Dependabot version updates** — the proactive "open a PR whenever any dependency has a
  newer release, vulnerable or not" feature. Deliberately skipped in favor of the
  narrower, reactive-only vulnerability scanning that was actually requested. Unlike the
  two features above, this one isn't a plain settings toggle — it requires a tracked
  `.github/dependabot.yml` config file (schedule, package ecosystems, version bump
  strategy, etc.), so revisiting it later is a real config-authoring task, not a checkbox.

### No config file needed for what was enabled

Both Dependabot alerts and Dependabot security updates are pure GitHub repo settings —
there is no `.github/dependabot.yml` or any other tracked file backing them. Nothing was
committed to the repo for this change; the only trace of it is this runbook entry and the
repo's Settings → Code security page itself.

### Pre-existing preset rule, checked and confirmed benign — not something either of us configured

The repo already had a GitHub-managed preset enabled: **"Dismiss low-impact alerts for
development-scoped dependencies."** This automatically dismisses alerts for vulnerable
`require-dev` / `devDependencies` packages that GitHub's own scoring methodology rates as
low-impact — i.e., non-exploitable at runtime, things like a vulnerable version of a test
runner or build tool that can't affect the deployed application. Neither of us turned this
on; it ships as a GitHub default. Left as-is — reasonable behavior for this project, not a
gap to close.

Worth stating explicitly, though, since it's easy to misread "Dependabot alerts enabled"
as "every vulnerable dependency produces a visible alert" — it doesn't. Low-impact,
dev-only CVEs are silently dismissed by this preset by design, before they ever surface as
an alert to review. A second preset, **"Dismiss package malware alerts,"** is also present
on the repo but is disabled — consistent with malware alerts being left off overall per
the decision above.

## 2026-08-30 — Encrypted Postgres Backups to Backblaze B2

Automated, encrypted, off-server backups of the production Postgres database, uploaded to
Backblaze B2 daily via cron. Full design was proposed and approved before any code was
written; both scripts and their `.env.production.example` placeholders were reviewed via
`git diff` for hardcoded secrets before every commit, per the standing rule. Verified fully
end to end: real backup uploaded, real restore into a throwaway container, real data back.

### scripts/backup-db.sh

`docker compose exec -T db pg_dump -Fc` piped directly into `gpg --symmetric --cipher-algo
AES256`, uploaded to B2 via the official `b2` CLI, guarded by `flock` against overlapping
runs. The encrypted `.gpg` file only ever exists inside a `mktemp -d` directory cleaned up
by a `trap ... EXIT`, and is deleted the moment the upload finishes — the unencrypted dump
never touches disk anywhere, at any point; the `pg_dump | gpg` pipe is in-memory only.

**No database password ever touches this host's process list.** The original plan assumed
passing `DB_PASSWORD` to `pg_dump` via `docker compose exec -e PGPASSWORD=...`, but that
would put the password in this host's own `ps aux` output for the duration of the command
— the exact class of leak the plan was already explicit about avoiding for the gpg
passphrase (`--passphrase-fd`, never `--passphrase`). Instead, `pg_dump` runs inside the
container with no `-h`/`PGPASSWORD` at all, connecting over the local Unix socket, which
the official postgres image trusts by default — so the script sources `.env.production` in
full as planned, but `DB_PASSWORD` is simply never passed to any command.

The gpg passphrase reaches `gpg` only via an anonymous fd from process substitution
(`--passphrase-fd 3 3< <(printf '%s' "$BACKUP_ENCRYPTION_PASSPHRASE")`) — never `argv`,
never a plaintext file. `--pinentry-mode loopback` added on both the backup and restore
sides so gpg never tries to invoke an interactive pinentry prompt in a non-interactive
cron/script context.

### A real naming mismatch caught during the first live run, not the propose step

The approved plan named the B2 key-ID variable `B2_KEY_ID`. During the propose step I
flagged that the official `b2` CLI actually reads `B2_APPLICATION_KEY_ID` /
`B2_APPLICATION_KEY` from the environment specifically — not `B2_KEY_ID` — and renamed it
in the script and `.env.production.example` accordingly. The real `.env.production` on the
server, though, had already been set up earlier using the original plan's name before that
renaming was settled, so the first live backup attempt failed cleanly with `b2`'s own
"Please provide both B2_APPLICATION_KEY and B2_APPLICATION_KEY_ID" error. Fixed by renaming
the variable (same value) in `.env.production` on the server — no code change needed, since
the repo's copy was already correct. `B2_BUCKET_ID` was added to `.env.production.example`
per the plan but isn't consumed by either script — `b2 file upload`/`download` take the
bucket name, not its ID — kept only for reference when looking the bucket up in the B2
console.

### scripts/restore-db.sh — and the write-only key becoming the standard DR process

Decrypts a given backup and `pg_restore`s it into a brand-new one-off `postgres:16`
container (`docker run --rm`, no volume, no shared compose project) — never the production
`db` service or its `db_data` volume. This is a structural guarantee, not a convention:
the throwaway container shares no compose project, no volume, and no server process with
production, so there's no flag or typo that could reach real data.

The B2 application key used for backups is scoped write-only — it can upload but cannot
list, read, or delete objects. This was verified for real, not assumed: the first restore
attempt genuinely failed with an "unauthorized" error the moment `restore-db.sh` tried its
`b2 file download` fallback, proving the key's scope is enforced by B2, not just configured
and untested.

That failure led to the actual disaster-recovery process, which turned out stronger than
the original plan: **download the backup manually through an authenticated B2 console
session (Browse Files), scp it to the server, and let `restore-db.sh` find it locally.**
The script checks for `<backup-filename>` in the repo root before ever calling `b2 file
download`; if it's present, B2 is never contacted at all. This means real disaster recovery
never requires minting a read-capable B2 API key, even temporarily — a stronger security
posture than the original plan, which assumed the restore script itself would always
authenticate to B2 for retrieval. The `b2 file download` fallback still exists in the
script purely for convenience in a dev/test setup where a broader-scoped key happens to be
configured; production has no such key and is expected to always use the local-file path.

### Bug #1: a Postgres startup race, caught and fixed with real evidence, not just a retry added blindly

The first real restore attempt got through decryption, container start, and file copy, then
failed on `pg_restore` with `FATAL: database "restore" does not exist`. The immediate
assumption — that the script never created the database — was wrong: `POSTGRES_DB=restore`
does create it automatically. The actual cause was confirmed by watching `docker logs`
timestamps on a real container: the official postgres image runs an internal *temporary*
server during first-run initialization to execute setup (including the `CREATE DATABASE`
for `POSTGRES_DB`), which accepts connections **before** that setup has actually finished.
On a real run here, the temp server reported "ready to accept connections" at T+0ms, but
`CREATE DATABASE` didn't execute until T+690ms — a real ~690ms window where the script's
`pg_isready` check would report ready while the target database still didn't exist. A
second ~590ms gap follows immediately after, where neither the temp nor the final server is
listening at all, during the handoff between them.

Fixed by replacing the `pg_isready` poll with a loop that retries an idempotent `CREATE
DATABASE restore` directly (treating "already exists" as success) — this survives both
gaps without depending on the image's internal init timing at all, since the loop just
keeps retrying through the dead gap and succeeds against whichever server generation
happens to be up. Verified empirically, not just reasoned about: reproduced the race
directly by exec-ing into containers and inspecting `docker logs` for the exact timestamps
above, then ran the new retry loop against multiple fresh throwaway containers and
confirmed it consistently needed 2–3 attempts before succeeding, matching the measured gap.

### Bug #2 (cosmetic, fixed): ownership warnings on every restore

`pg_restore` tries to `ALTER OWNER` every restored object to match the production role
recorded in the dump (e.g. `devnotes`), which doesn't exist in the throwaway container —
only `restore` does — producing ~22 harmless "role does not exist" warnings on every run.
Non-blocking, but risked burying a real error among expected noise on a future run. Added
`--no-owner` to the `pg_restore` call: ownership doesn't matter for a container that exists
purely for verification, and `restore` (a superuser) can already read everything regardless
of recorded ownership.

### Final verification

- Real automated backup: `pg_dump | gpg` pipeline succeeded, uploaded to B2, confirmed via
  the B2 console.
- Real restore: backup manually downloaded via B2 console + scp, decrypted, restored into a
  throwaway container, `pg_restore` completed successfully. Row counts came back as 0 across
  all tables, because production held no data at the time of this test — the restore code
  path doesn't branch on row count, so this is sufficient proof the mechanism itself works;
  it doesn't yet prove large/complex data survives the round trip, which the next real
  production backup will implicitly cover once there's real data to restore.
- Cron installed for the `andrew` user (never root) for daily 3am backups.
- Cleanup confirmed: the manually-downloaded `.gpg` file removed from the repo root
  afterward (it's untracked, but was sitting in the working tree), no leftover test
  containers.

### Noted, not built

- **Backup retention / lifecycle** — not addressed this pass. B2 lifecycle rules for
  automatic old-backup deletion were mentioned as set up during bucket creation but weren't
  specified or verified as part of this work; worth confirming what policy is actually
  active.
- Everything else from the approved plan was built as scoped — no second B2 key, no
  broader IAM changes, no changes to the production `db` service itself.

## 2026-08-31 — Bug Fix: Paginated API URLs Showing http:// Instead of https://

**Bug report:** paginated endpoints (e.g. `GET /api/notes`) returned `http://` in
`first_page_url`, `path`, `next_page_url`, etc., despite the site only ever being served
over HTTPS via Traefik.

**Root cause:** Traefik terminates TLS at the edge and forwards plain HTTP to the
`backend` container over the internal Docker network (per `docker-compose.prod.yml`).
Laravel had never been told to trust proxy headers, so it had no way to know the original
request was HTTPS — it built all generated URLs (including pagination links) from the
plain-HTTP request it actually received, defaulting to `http://`.

**Version check first:** confirmed via `backend/composer.json` (`laravel/framework
^13.17`) before touching anything — Laravel 11+ moved proxy trust config into
`bootstrap/app.php` (`->trustProxies()`), replacing the old
`app/Http/Middleware/TrustProxies.php` pattern from Laravel 10 and earlier. This project
already uses the `bootstrap/app.php` pattern elsewhere (the `redirectGuestsTo` fix, see
2026-08-26 above), and no `TrustProxies.php` file exists in the repo, confirming the
newer pattern was the right target.

**Option considered and rejected:** pinning the exact Docker network CIDR in
`docker-compose.prod.yml` and trusting only that range. Rejected because
`docker-compose.prod.yml` currently defines no custom network at all — `backend`,
`frontend`, `db`, and `traefik` all share Compose's implicit default network with no
pinned subnet. Doing this properly would mean *adding* a new custom network block with a
static subnet (a real topology change to the production stack, touching every service's
network attachment), not just reading an existing value.

**Option chosen: trust all proxies (`at: '*'`).** Justified specifically because the
`backend` container has no published port in `docker-compose.prod.yml` — it's only
reachable through Traefik over the internal Docker network, exactly like Postgres already
has no published port. Trusting `'*'` is therefore equivalent in practice to trusting only
Traefik, without the added risk of restructuring the Docker network topology for a
cosmetic URL-generation fix. This is also Laravel's own documented recommendation for
apps with no direct public ingress.

**Fix**, in `backend/bootstrap/app.php`, added inside the existing `->withMiddleware()`
block alongside `redirectGuestsTo`:

```php
$middleware->trustProxies(at: '*');
```

Checked Laravel's `TrustProxies` middleware source first: the default `$headers` bitmask
already covers `X-Forwarded-For`, `-Host`, `-Port`, `-Proto`, `-Prefix`, and `-Aws-Elb`, so
no explicit `headers:` argument was needed — passing only `at: '*'` was sufficient.

**Verification, in order:**
- Windows' system PHP (7.3) choked on the named-argument syntax when lint-checking
  directly — a red herring, not a real syntax error. Confirmed by spinning up the actual
  dev stack (`docker compose up -d db backend`, Laravel 13.29.0 / PHP 8.4 inside the
  container) and running `php -l bootstrap/app.php` there instead: clean.
- Functional test inside the dev container: `curl` against `GET /api/notes` with
  `X-Forwarded-Proto: https` and `X-Forwarded-Host` set (simulating Traefik) returned
  `https://` pagination URLs. A negative-control request with neither header still
  returned `http://localhost/...` — confirming the fix responds to the forwarded header
  rather than some other change (e.g. `APP_URL`) coincidentally fixing the output.
- Tore down the dev containers afterward (`docker compose down`) — nothing left running
  from this verification pass.
- Committed directly to `main` per `docs/git-workflow.md`
  (`fix: trust Traefik proxy headers so paginated API URLs use https`), gitleaks
  pre-commit hook ran clean, pushed. GitHub Actions "Deploy to Production" run completed
  successfully (41s).
- **Live verification against production**: `GET https://devnotes.billandrewsallao.com/api/notes`
  now returns `first_page_url`, `path`, and `last_page_url` all starting with `https://`
  (previously `http://`).

## 2026-08-31 — Tools Module: Client-Side Image-to-WebP Converter

Built a new `/tools` section — a directory-listing landing page (same visual pattern as
`/notes`/`/blog`, sourced from `frontend/src/tools/registry.ts` so future tools don't
touch the landing page) plus the first real tool, `/tools/image-to-webp`. Entirely
frontend-only: drag-and-drop or file-picker in, `createImageBitmap` → off-screen
`<canvas>` → `canvas.toBlob('image/webp', quality)` → object-URL download, nothing
touches the API. New files: `tools/registry.ts`, `components/ToolPageLayout.tsx`,
`pages/ToolsLanding.tsx`, `pages/ImageToWebpConverter.tsx`; added a `~/tools.md` nav tab
alongside the existing public `~/notes.md`/`~/blog.md` pair.

### No browser tool again this session — used a different real substitute, not a mock

`claude-in-chrome` was declined again (same limitation as every frontend session in this
project). Unlike prior sessions, "no browser tool" wasn't good enough here — this feature
*is* browser Canvas/File API code with no server side to curl. Found Chrome already
installed locally (`C:\Program Files\Google\Chrome\Application\chrome.exe`) and drove it
directly over CDP with `puppeteer-core` (a throwaway Node project in the scratchpad
directory, not added to the repo — no browser binary download, just a small client
library pointed at the existing install). This exercises the *actual* `onChange` handler,
`createImageBitmap`, canvas draw, and `toBlob('image/webp')` — genuinely running the
shipped code in a real renderer, not simulating it. Files were injected via CDP's
`uploadFile` (sets the file input directly, bypassing the OS picker — a legitimate way to
drive a real `<input type="file">`), and the resulting blob was pulled back out via
`fetch()` on the object URL from inside the page and returned as base64. Worth carrying
forward: this pattern is a real fallback for testing browser-only JS in this project when
neither a live UI click-through nor a curl-able API is available.

### Test images — real EXIF data, without touching personal photos

Needed a real photo with genuine EXIF GPS data per the plan's requirement, but didn't want
to run this test against the user's actual photo library for a privacy verification.
Used `ianare/exif-samples` on GitHub instead — a long-standing public test-fixture repo
that EXIF-parsing libraries themselves use for this exact purpose (real camera EXIF blocks
with GPS IFDs, MIT-licensed test data) — pulled via `raw.githubusercontent.com`:
- `jpg/gps/DSCN0010.jpg` (161,713 B, Nikon COOLPIX P6000, confirmed GPS-tagged) — small
  photo with EXIF GPS.
- `jpg/Reconyx_HC500_Hyperfire.jpg` (425,890 B, 2048×1536) — larger real photo, has EXIF
  but no GPS, for a general size-reduction case.
- A synthetic 1400×900 PNG (`screenshot-sample.png`, generated locally via PowerShell's
  `System.Drawing` — flat color blocks + repeated text lines, standing in for a real UI
  screenshot) since no PNG existed anywhere in the repo to test against.

No `exiftool`, ImageMagick, or Python/PIL available on this machine to inspect EXIF
directly, so verification used two purpose-written checks instead of a proper EXIF
library: a byte scanner confirming the source JPEGs' APP1 segments actually contain an
`Exif\0\0` marker (positive control — proves the "before" claim, not just the filename),
and a RIFF chunk walker over the *output* WebP bytes checking for an `EXIF` FourCC chunk.
Cross-checked both source and output against `file`'s own format detection as a second,
independent tool.

### EXIF verification result: confirmed stripped, UI claim added

Both EXIF-bearing JPEGs (`gps-sample.jpg`, `large-photo.jpg`) converted to WebPs
containing only `VP8X`, `ICCP`, and `VP8 ` chunks — no `EXIF` chunk in either output,
despite the chunk walker confirming the sources genuinely carried `Exif\0\0` (with GPS,
for the first). This matches the theoretical expectation (canvas is a raw pixel buffer
with no metadata channel to re-attach on encode) but this was checked against real EXIF
bytes rather than assumed. Added the UI note near the drop zone:
> EXIF metadata, including location data, is automatically removed during conversion.

### Real finding: WebP can come out *larger* than the source — the flag-token case fired for real

`screenshot-sample.png` (108,798 B) converted to a **164,480 B** WebP at the default
quality 80 — 51% *larger*, not smaller. Confirmed genuine, not a bug: PNG's lossless
scheme handles this kind of content (large flat color regions, sharp text edges, few
unique colors) more efficiently than lossy WebP at quality 80, which spends bits on
DCT-block artifacting that a flat UI screenshot doesn't need. This is exactly the "rare
case output is larger" the approved plan anticipated with the flag/red delta styling —
good to have it actually fire against a real file rather than only existing as a
defensive `if` branch nobody had triggered. No code change from this — it's a real,
correctly-handled outcome, not a defect. Real photos (both JPEG samples) converted
smaller as expected: 25.9% and 36.2% reduction at quality 80.

### Quality slider / debounce verified for real

Loaded `large-photo.jpg` (271,538 B output at default quality 80), then set the slider to
20 programmatically and waited past the 250ms debounce window: re-encoded down to
87,468 B, confirming both that the slider actually re-triggers encoding and that quality
genuinely affects output size in the expected direction.

### Error paths verified for real, not just read through

- Non-image file (`.txt` renamed, `text/plain`): correctly hit the MIME-type check,
  rendered `ErrorState` with `"not-an-image.txt" doesn't look like an image (text/plain).`
- Corrupted JPEG (first 5,000 bytes of a valid file, truncated mid-scan): `file(1)` still
  read the (intact) header fine, but `createImageBitmap` genuinely threw in the browser —
  hit the `catch` branch, rendered `Couldn't decode "corrupted.jpg" — it may be corrupted
  or unsupported.` Confirms the two error paths are actually distinct code paths that both
  fire correctly, not just one tested twice.

### Gotcha: oxlint's `set-state-in-effect` rule caught two real smells

First draft called `setStatus('loading')` synchronously at the top of the debounce
`useEffect`, and stored the object URL via `setResultUrl(url)` inside its own effect.
oxlint flagged both under `react(set-state-in-effect)` — a newer lint rule this project
hadn't hit before. Fixed rather than suppressed: moved `setStatus('loading')` to the
actual triggering events (successful image load, quality slider `onChange`) instead of
deriving it inside an effect, and switched the object URL from state+effect to
`useMemo(() => URL.createObjectURL(resultBlob), [resultBlob])` with the effect doing
*only* the `URL.revokeObjectURL` cleanup — no setState left in either effect body. Zero
new lint warnings after the fix (same two pre-existing, already-accepted context-file
warnings as every prior session).

### Gotcha: `docker compose up --build` failed on a cached image

`docker compose up -d --build frontend` failed pulling `php:8.4-cli`'s image metadata
(`failed to authorize: failed to fetch anonymous token` — a transient Docker Hub/registry
connectivity issue) even though `devnotes-backend`'s image was already built and cached
locally from days earlier. Buildx checks base-image metadata over the network on every
`--build` invocation regardless of cache hits. Since nothing in `package.json` changed
(no new dependencies), `docker compose up -d frontend` (no `--build`) reused the cached
image directly — source is bind-mounted per `docker-compose.yml`, so the new `.tsx` files
were picked up without any rebuild.

### Verification summary

- `tsc -b && vite build`: clean. `oxlint`: 0 errors, 2 warnings (both pre-existing,
  accepted in earlier sessions).
- Route regression check (`/`, `/notes`, `/notes/1`, `/blog`, `/login`, `/my/notes`,
  `/my/blog`, `/tools`, `/tools/image-to-webp`): all `200`.
- Real conversions run through an actual Chrome renderer (not simulated): 3 different
  images/formats/sizes, quality-slider re-encode, 2 distinct error paths, EXIF-stripping
  confirmed against real EXIF+GPS bytes, output files confirmed as valid WebP by `file(1)`.
- Committed directly to `main` per `docs/git-workflow.md`
  (`feat: add Tools module with client-side image-to-WebP converter`), gitleaks
  pre-commit hook ran clean, pushed. GitHub Actions run #16 (`b806807`) completed
  successfully.
- **Live verification against production**, via the same real-Chrome-over-CDP method
  (no browser extension available): loaded `https://devnotes.billandrewsallao.com/tools`
  and `/tools/image-to-webp` and confirmed the actual rendered content (nav tab, tool
  listing, converter UI, EXIF note) — not just the unrendered SPA shell a plain
  fetch/curl would return. Ran one real conversion against production itself
  (`gps-sample.jpg` → 25.9% smaller, valid WebP per `file(1)`), matching the dev-container
  result exactly.

## 2026-09-01 — Image Upload Support: B2-Backed Cover Images and Inline Note Images

Added a single cover image on blog posts and optional inline images (embedded via
markdown `![alt](url)`) on notes. Full route/schema/Intervention-config proposal was
reviewed and approved before any code was written, per the established
propose-then-build workflow. Storage is Backblaze B2, via Laravel's `s3` flysystem
driver pointed at B2's S3-compatible endpoint — a **separate bucket
(`devnotes-images-webdevbill`) and separate application key** from the Postgres-backup
bucket (see the 2026-08-30 entry above).

### Data model

- New `images` table: `id`, polymorphic `imageable_type`/`imageable_id`, `path` (the B2
  object key), `mime_type`, `size`, timestamps. Deliberately **no `disk` or `user_id`
  column** — `disk` is YAGNI with only one storage backend today (trivial, low-risk
  migration to add later if that changes), and `user_id` would duplicate ownership
  that's already derivable via `imageable->user_id`, which is exactly the kind of
  second signal that can drift out of sync the project has already avoided elsewhere
  (see `published_at`-only vs. a second `status` column, 2026-08-26 schema session).
  Ownership resolves as `$image->imageable->user_id` everywhere, no exceptions.
- `blog_posts.cover_image_path` (nullable string) holds the B2 object key directly.
  It's **not** in `BlogPost`'s `#[Fillable]`, so it can never be set through the
  regular JSON update endpoint — only `BlogPostCoverImageController` writes it, via
  `forceFill()`, same boundary as `user_id`.
- `Image` is `#[Fillable(['path', 'mime_type', 'size'])]` with `imageable_type`/
  `imageable_id` excluded — created only via `$note->images()->create(...)` or
  `$blogPost->coverImage()->create(...)`, never mass-assigned from a request, mirroring
  the existing `user_id` pattern on `Note`/`BlogPost`.
- `path` is `#[Hidden]` on the `Image` model — the frontend only ever needs an image's
  `id` to build `/api/images/{id}`; the raw B2 key never reaches the client.

### Upload endpoints and the "save first, then attach" constraint

Both `POST /api/my/notes/{note}/images` and `POST /api/my/blog-posts/{blog_post}/
cover-image` are separate endpoints from the existing JSON create/update routes, not
bundled into them. Reasoning: `api/client.ts`'s `apiRequest` only sent JSON bodies
before this session (see below), and note inline images fundamentally need an
upload-first flow anyway — the markdown `![alt](url)` needs the returned image URL
before it can be inserted. Real consequence: a **new** note/post must be saved once
before an image can attach to it (the polymorphic FK needs a real row), so `NoteForm`
and `BlogForm` hide the image control behind a "save this note/post once first" hint
until `initialNote`/`initialPost` is populated (i.e. the edit route, not the create
route). Same pattern WordPress/Ghost use for featured images.

### Validation — two independent checks against the real bytes, not the client's claims

`GenuineImageContent` (a custom `ValidationRule`) runs `finfo_file()` and
`getimagesize()` as two **separate** checks, each with its own failure message, so a
rejection is traceable to exactly which one caught it:

- A file's real content not matching `image/jpeg`/`image/png`/`image/webp` (per
  `finfo`, ignoring the client's `Content-Type` and the extension) fails the first
  check.
- A file that passes the magic-byte sniff but doesn't decode as a real image (e.g. a
  JPEG truncated after its header) fails the second.

Verified both paths for real in `tests/Feature/ImageUploadTest.php`: a PHP script
renamed to `.jpg` with a spoofed `image/jpeg` part-header is caught by the `finfo`
check; a real JPEG truncated to 30 bytes (keeps the magic-byte header, so `finfo`
still reports `image/jpeg`) is caught by `getimagesize()` instead — two genuinely
distinct rejections, not the same check exercised twice.

Every accepted upload is then decoded (Intervention Image v3, GD driver — see
Dockerfile note below), scaled down to a 1600px max dimension (never upscaled), and
re-encoded as WebP at quality 80 (matching the quality the client-side WebP tool
already defaults to — see 2026-08-31 entry) with EXIF stripped explicitly. Stored
under a `Str::random(40)` filename, never the original. This re-encode step is a
security control, not just optimization: the bytes written to B2 are always
server-produced from decoded pixel data, never the client's original file content.

### Serving route: two-tier authorization, not a single Policy check

`GET /api/images/{image}` carries no `auth:sanctum` middleware — it can't, since a
published post's cover image has to load for a signed-out visitor. Auth is resolved
manually inside `ImageController`: if the image's owner (a public note, a published
post) is publicly visible, it serves unconditionally; otherwise an anonymous request
404s (mirroring the public `NoteController`'s existing "hide, don't reveal existence"
behavior for a private note by id) and an authenticated-but-wrong-user request 403s via
the existing `NotePolicy`/`BlogPostPolicy` `view` check. This two-tier logic — public
scope check first, ownership Policy second — mirrors how public vs. private
note/post content already works elsewhere in the app; a single `Gate::authorize('view',
...)` call alone would only have covered the owner case, not the "is this public"
case the public read endpoints handle via query scopes instead of a Policy.

### Frontend: FormData support, and a real gap in the localStorage-token model

`api/client.ts`'s `apiRequest` previously always JSON-stringified its body and set
`Content-Type: application/json` unconditionally. Now branches on `body instanceof
FormData` — a FormData body is sent as-is (browser sets its own multipart boundary),
never stringified, never given a manual `Content-Type` (setting one manually strips the
boundary and breaks the upload).

**Real gap found, not just anticipated:** since auth is a bearer token in
`localStorage` rather than a cookie, a plain `<img src="/api/images/123">` can never
attach `Authorization` — a private note's own owner would never see their own inline
images render. Fixed with `MarkdownImage.tsx`, a custom `img` renderer passed to
`react-markdown`'s `components` prop (used in both `NoteDetail.tsx` and
`BlogDetail.tsx`): for a same-origin `/images/:id` src, it fetches the bytes via the
existing authenticated-fetch pattern and swaps in a `blob:` object URL; for any other
(hand-typed external) src it renders a plain `<img>` untouched, so the token is never
sent to a third-party origin. The object URL is revoked both on unmount and whenever
`src` changes — the effect's cleanup closes over the URL it personally created, so a
`src` change (new effect run) revokes the previous one before the next fetch starts,
and an unmount revokes whatever was last created. No compromise to the localStorage/
XSS boundary in `CLAUDE.md`: the token never touches a URL or query string.

Blog post cover images skip this entirely — `BlogDetail.tsx` only ever renders a
`published()`-scoped post fetched through the public endpoint, so its cover image is
provably public too; a plain `<img>` against the API URL works with no token needed.

**Gotcha (oxlint, recurrence):** first draft of `MarkdownImage` called `setObjectUrl`/
`setFailed` synchronously at the top of the effect body to reset state on `src`
change — `react(set-state-in-effect)` flagged it, same rule class hit in the
2026-08-31 Tools-module session. Fixed the same way: no synchronous setState in the
effect body at all. Instead of imperatively resetting state, the component tags loaded
state with the `src` it resolved for and derives "is this stale" during render
(`loaded?.src === src ? loaded : null`) — state is only ever set from inside the async
`.then()`/`.catch()` callbacks. Zero new warnings after the fix.

### Real gap found via testing: deleted notes/posts were orphaning their images

Polymorphic relations have no DB-level FK, so nothing was cascading `images` rows (or
their B2 objects) on delete — caught this by literally leaving one behind during
tinker testing and noticing `Image::count()` didn't return to zero after deleting its
post. Fixed with a `static::deleting()` hook in both `Note::booted()` and
`BlogPost::booted()` that deletes each associated image's B2 object and row before the
parent is removed. Covered by two new feature tests (`test_deleting_a_note_deletes_its_
images_from_storage_and_the_database`, and the blog post equivalent).

### Cover-image replace performs real B2 deletes — a deliberate departure from the backup key's write-only posture

`BlogPostCoverImageController@store` deletes the superseded B2 object once the new one
is safely stored (new file written and `blog_posts.cover_image_path` updated first, old
object deleted only after — so a failed upload never leaves a post without a cover).
This is a **real delete capability**, unlike the Postgres-backup B2 application key from
the 2026-08-30 entry above, which is deliberately scoped write-only specifically so a
compromised key (or a bug in the app) could never erase backup history — that entry's
"no delete, rely on B2 lifecycle rules, orphans accepted as the retention story" stance
still stands for backups and is **not** being walked back here.

The images key is a different credential against a different bucket, provisioned
deliberately with read+delete because this feature structurally needs both: the
`GET /api/images/{image}` proxy route has to read bytes back out to serve them, and
cover-image replace has to delete the old object or B2 usage grows unbounded with every
edit to a post's cover (unlike backups, where accumulating history is the entire
point). Scoping this key to the one images bucket only — never the account master key —
keeps the same narrow-blast-radius principle the backup key already established, just
with a different, deliberately wider permission set matched to what this specific
feature actually does.

### Dockerfile: GD extension added (both dev and prod images)

Neither `Dockerfile` nor `Dockerfile.prod` had any image-processing extension before
this session. Added `libjpeg-dev`/`libpng-dev`/`libwebp-dev` + `docker-php-ext-configure
gd --with-jpeg --with-webp` + `docker-php-ext-install gd` to both. Verified inside the
rebuilt dev container: `php -m | grep gd` present, `gd_info()['WebP Support']` is
`true`. `intervention/image` v3 bundles its GD driver in the core package — no separate
`intervention/image-driver-gd` package exists on Packagist (the approved plan named
one; corrected during implementation to just `intervention/image`).

### Gotcha: `BlogPost` route-model-binds by slug everywhere — bit the new tests too

Wrote the first cover-image test hitting `/api/my/blog-posts/{$post->id}/cover-image`
and got a confusing 404 (`No query results for model [App\Models\BlogPost] 1`) even
though the post genuinely existed. Root cause: `BlogPost::getRouteKeyName()` returns
`'slug'`, so **every** `{blog_post}` route parameter in the app binds by slug, not id —
already established and documented in the 2026-08-27 blog pages session, just not front
of mind while writing a fresh test. Fixed by using `$post->slug` in the URL. No code
bug — a test-authoring mistake against an already-correct, already-documented
convention.

### Gotcha: fresh directories created by `docker compose exec` weren't writable from the host

`docker compose exec backend mkdir -p app/Rules app/Services` created directories that
the Write tool couldn't write into afterward (`EPERM`) from the Windows/WSL UNC path,
even though `ls -la` reported normal `Andrew`-owned `755` permissions — a drvfs/WSL
permission-metadata quirk, not a real ownership problem (existing, git-checked-out
directories were unaffected; only directories freshly created by the container hit
this). Worked around it by creating new files via `docker compose exec backend sh -c
"cat > path" <<'EOF'` instead of the Write tool for anything landing in a
container-created directory; the Write tool worked normally for edits to
already-existing files and for new files in already-existing directories.

### `.dockerignore` gap: `storage/framework/testing/*` wasn't excluded

The new feature tests were the first thing in this project to use `Storage::fake()`,
which creates `storage/framework/testing/disks/...` on demand. That directory hit the
same host-permission quirk above, which then blocked the *build context* transfer on
the next `docker compose build` (`error from sender: ... Access is denied`) — a step
that never involves the Write tool at all. Added `storage/framework/testing/*` to
`backend/.dockerignore` alongside the sibling `cache`/`sessions`/`views`/`logs`
patterns already there. (Already covered by Laravel's own nested `storage/framework/
testing/.gitignore`, so nothing here was ever a `git status` risk — only the Docker
build context was affected.)

### Verification

- **12 backend feature tests**, all passing, using `Storage::fake('images')` (Laravel's
  real local flysystem adapter under a fake root — genuinely writes/reads files, not a
  mock) since no B2 credentials exist locally by design (`.env.production`-only, per
  the standing credential boundary): valid JPEG/PNG upload re-encoded and confirmably
  stored as real WebP bytes (`getimagesize()` on the stored bytes reports
  `image/webp`, and the bytes differ from the original JPEG, proving re-encoding
  actually happened, not a pass-through); the PHP-script-as-.jpg and truncated-JPEG
  rejections above, each asserted against its own distinct message; oversized-file
  rejection; cross-user upload 403; private note image 404 unauthenticated / 403 wrong
  user / 200 owner; published post cover image 200 unauthenticated; draft post cover
  image 404 unauthenticated; cover-image replace deletes the old B2 object and old row;
  deleting a note/post deletes its image(s).
- `./vendor/bin/pint` clean (one file auto-fixed: `concat_space`, `no_unused_imports`
  in the new test file).
- `tsc -b && vite build`: clean. `oxlint`: 0 errors, the same 2 pre-existing accepted
  `AuthContext`/`ThemeContext` warnings, nothing new.
- Live curl against the running dev container (not just the PHPUnit test kernel):
  unauthenticated `GET /api/images/999999` → `404`; unauthenticated `POST
  /api/my/notes/1/images` → `401` — confirms real routing/middleware wiring outside the
  test framework, not just inside it.
- **Real browser verification** via the same real-Chrome-over-CDP + `puppeteer-core`
  method as the 2026-08-31 Tools-module session (browser extension still not
  installed): logged in, created a note, confirmed the "insert image" control is
  hidden with a "save first" hint pre-save and appears post-save, selected a real file
  through the actual file input, confirmed a real multipart `POST` fired to
  `/api/my/notes/{id}/images`. Same flow for a blog post's cover-image control. Both
  correctly received `500`s locally (no B2 credentials in dev `.env` — the AWS SDK's
  own error, `Missing required client configuration options: region`, is the exact,
  expected gap given only `.env.production` will ever hold real B2 credentials) — and
  confirmed the frontend degrades correctly on that failure: the real error message
  renders, the upload button re-enables, nothing gets stuck or crashes. This validates
  the entire pipeline for real, through an actual renderer, up to the one boundary that
  structurally requires credentials this session was never meant to hold.
- **Not verified**: an actual successful upload landing in the real B2 bucket, since
  that requires the real `.env.production` credentials, which only exist on the
  server. That's the one piece left for the deploy step below.

### What's needed on the server (for you to run — not done by this session)

Add to `.env.production` (placeholders already in `.env.production.example`):

```
B2_IMAGES_KEY_ID=<from the B2 console, for the devnotes-images-webdevbill bucket>
B2_IMAGES_APPLICATION_KEY=<same>
B2_IMAGES_BUCKET=devnotes-images-webdevbill
B2_IMAGES_BUCKET_ID=<from the B2 console — not consumed by the app, kept for reference>
B2_IMAGES_REGION=<e.g. us-west-004 — must match the bucket's actual region>
B2_IMAGES_ENDPOINT=<e.g. https://s3.us-west-004.backblazeb2.com — same region>
```

No other manual step is required: `deploy.sh` already runs `docker compose ... up -d
--build` unconditionally (picks up the new GD extension and Composer packages) and
diffs `backend/database/migrations` to decide whether to run `artisan migrate --force`
(the two new migrations in this session will be detected and applied automatically on
the next push to `main`).
