# Building My Own Infrastructure From Scratch: A PHP Developer's Journey Into DevOps

As a PHP developer working with CodeIgniter, my world used to end at `git push` to a shared host and hoping the cPanel gods were kind. But if you're trying to grow into a full-stack role — especially one that appeals to US-based remote teams — "I know how to FTP files to a server" doesn't cut it anymore.

So I decided to build something real: a self-hosted developer notes and snippets tool, from the ground up, on infrastructure I fully own and control. No Heroku, no Vercel magic, no "click deploy and forget how it works." Just me, a $6/month server, and a lot of new terminal commands.

Here's what I learned setting up the foundation — before writing a single line of application code.

## Why Not Just Use a PaaS?

Platforms like Railway or Vercel are genuinely great, and I'll probably still use them for quick side projects. But they come with a trade-off: your deployment configuration lives inside *their* platform, not yours. If I ever wanted to migrate, I'd be starting from scratch.

I wanted the opposite: infrastructure defined entirely in my own repo, portable enough to move to any VPS or cloud provider with minimal changes. Basically, thinking like the CTO of a tiny one-person company, not just a developer shipping a side project.

## The Stack

- **Backend:** Laravel, running as an API
- **Frontend:** React
- **Database:** PostgreSQL
- **Server:** A $6/month DigitalOcean Droplet (Ubuntu 24.04)
- **Containers:** Docker + Docker Compose, so the whole stack is reproducible anywhere

## Setting Up the Server

The first surprise: how much thought goes into infrastructure *before* any app code exists. Here's the sequence I followed:

1. **Generated a dedicated SSH key** just for this project, kept separate from my existing GitHub/Bitbucket keys, so access stays cleanly scoped.
2. **Created the Droplet** — the cheapest tier (1 vCPU, 1GB RAM, 25GB disk) is plenty to start.
3. **Set a spend alert** at $6/month with notifications at 50/75/100% — a good habit for anyone nervous about cloud billing surprises (I definitely was).
4. **Connected via SSH**, and immediately ran system updates and set up a basic firewall (`ufw`) that blocks everything except SSH by default.
5. **Installed Docker and Docker Compose** — both free, open-source, and the foundation everything else will run on top of.

One thing that surprised me: **powering off a server doesn't stop billing.** The resources are still reserved for you. If you want to truly stop paying, you have to destroy the Droplet entirely — which is exactly why defining everything in Docker Compose matters. If I ever need to rebuild from zero, it's a config file away, not a memory-reconstruction exercise.

## A Small But Important Decision: ufw vs. Cloud Firewall

DigitalOcean's dashboard recommended adding their network-level Cloud Firewall on top of my server's own `ufw` firewall. I skipped it — running both risks conflicting rules, and `ufw` is a skill that transfers to literally any Linux server, on any provider. Small decision, but it's the kind of thing that adds up to actually understanding your stack instead of just clicking buttons in a dashboard.

## What's Next

With the server hardened and Docker running, the next steps are:

- Writing the `docker-compose.yml` that ties Laravel, React, and PostgreSQL together
- Setting up Traefik for automatic HTTPS
- Wiring up GitHub Actions so pushing to `main` actually deploys
- Building the actual snippet vault and blog — the thing this server exists to run in the first place

If you're a developer coming from a similar background — comfortable with your framework of choice, but new to owning your own infrastructure — I'd say the biggest mental shift is this: **the server is not scary once you stop treating it like a black box.** Every command has a reason. Every decision (like skipping the managed database to run Postgres myself) is a trade-off you can actually explain in an interview.

More posts coming as the actual application gets built.
