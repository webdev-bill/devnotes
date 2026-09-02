export default function About() {
  return (
    <div className="max-w-2xl">
      <p className="font-display text-xs text-ink/40">~/about.md</p>
      <h1 className="mt-4 font-display text-xl font-semibold text-ink">Bill Andrew Sallao</h1>

      <div className="mt-6 space-y-6 font-body text-sm text-ink">
        <section>
          <p>
            Full-stack developer — 10+ years in PHP/CodeIgniter and CMS platforms, now
            building with Laravel, React, and modern infra to round out the stack.
          </p>
          <ul className="mt-3 space-y-1">
            <li>
              GitHub:{' '}
              <a
                href="https://github.com/AndrewSallao"
                target="_blank"
                rel="noopener noreferrer"
                className="text-keyword hover:underline"
              >
                github.com/AndrewSallao
              </a>
            </li>
            <li>
              LinkedIn:{' '}
              <a
                href="https://www.linkedin.com/in/bill-andrew-sallao/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-keyword hover:underline"
              >
                linkedin.com/in/bill-andrew-sallao
              </a>
            </li>
            <li>
              This repo:{' '}
              <a
                href="https://github.com/webdev-bill/devnotes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-keyword hover:underline"
              >
                github.com/webdev-bill/devnotes
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xs font-semibold tracking-wide text-ink/60 uppercase">
            Stack
          </h2>
          <p className="mt-2">
            Laravel · React · TypeScript · PostgreSQL · Docker · Traefik · DigitalOcean
          </p>
        </section>

        <section>
          <h2 className="font-display text-xs font-semibold tracking-wide text-ink/60 uppercase">
            Why this exists
          </h2>
          <p className="mt-2">
            Most portfolio CRUD apps stop at &ldquo;it works on Vercel.&rdquo; This one is
            self-hosted on a bare VPS — no PaaS — with its own reverse proxy, TLS, CI/CD
            pipeline, and security hardening, because owning the infrastructure end to end
            is part of the point, not an afterthought.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xs font-semibold tracking-wide text-ink/60 uppercase">
            Contact
          </h2>
          <p className="mt-2">
            <a href="mailto:hello@billandrewsallao.com" className="text-keyword hover:underline">
              hello@billandrewsallao.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
