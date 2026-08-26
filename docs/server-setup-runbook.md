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
