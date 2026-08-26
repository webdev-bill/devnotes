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
