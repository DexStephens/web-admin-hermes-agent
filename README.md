# web-admin-hermes-agent

A multi-agent AI assistant built on the [Hermes](https://github.com/NousResearch/Hermes) agent framework (Telegram + email I/O, GHL CRM and bookkeeping sub-agents, persistent memory) paired with a Next.js admin portal for non-technical operators, deployed to a single DigitalOcean droplet via Terraform + Docker Compose.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full architecture diagram and a step-by-step walkthrough of `terraform apply` → `./deploy.sh` → a running stack.

## Overview

The repo is three pieces glued together by `docker-compose.yml`:

### `web-admin/` — the portal

A Next.js app (source in this repo, built into its own container) that gives non-technical admins a UI for chat history, API usage/cost tracking, and toggling Hermes skills on/off. It has its own portal login (`demo` / `demo` today — see [LoginForm.tsx](web-admin/src/components/LoginForm.tsx)) backed by a signed session cookie ([src/lib/auth.ts](web-admin/src/lib/auth.ts)) and enforced by [src/proxy.ts](web-admin/src/proxy.ts) on every `/portal/*` and relevant `/api/*` route. Once logged in, it authenticates _again_, server-side, against the Hermes dashboard (`/api/login`, `/api/logout` call out to hermes with `HERMES_DASHBOARD_USERNAME`/`PASSWORD`) so it can call the dashboard's `/api/skills*` and usage endpoints on the user's behalf — the browser never sees the Hermes credentials.

### `hermes_home/` — the agent's persistent state

Bind-mounted into the `hermes` container at `/opt/data`, this directory _is_ the agent's identity: `config.yaml`, skills, memories, chat/kanban databases, cron jobs, and `secrets/`. The container itself is disposable (pinned to `nousresearch/hermes-agent:v2026.7.20`) and can be rebuilt or replaced at will — nothing persists inside it. Two deliberate edits were made to `hermes_home/config.yaml` for this specific droplet: GPU args were removed (no GPU on the box) and per-sandbox memory/disk limits were lowered so a spawned sub-agent sandbox can't request more RAM/disk than the droplet actually has.

### `terraform/` — the droplet and network perimeter

Provisions the DigitalOcean side only: the droplet (`main.tf`), a firewall allowing inbound `22`/`80` and nothing else (`digitalocean_firewall.app`), and `cloud-init.yaml` to install Docker on first boot. It does **not** touch application secrets or ship code — that's `deploy.sh`'s job (`rsync` + writing a top-level `.env` + `chown` fixes + `docker compose up`).

Once the droplet exists, `nginx` is the only container with a published port; it reverse-proxies `:80` to `web-admin:3000`, which in turn calls `hermes:9119` (dashboard) and `hermes:8642` (messaging/session API) over Compose's internal network.

## Environment variables

There are **four separate `.env`-shaped files**, at four different levels, each feeding a different part of the pipeline. Missing or misplaced values here are the single most common cause of "it deployed but X is broken."

| Level | File                                                                                                 | Loaded by                                                    | Purpose                                                                           |
| ----- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1     | `terraform/terraform.tfvars` (gitignored)                                                            | `terraform plan`/`apply`                                     | The DigitalOcean API token                                                        |
| 2     | `.env` next to `deploy.sh` (gitignored, copy `.env.example` if present)                              | `deploy.sh` itself, on your laptop                           | The plaintext Hermes dashboard password, so you don't retype it every deploy      |
| 3     | `hermes_home/.env` (gitignored, lives on the droplet / in your local `hermes_home/`)                 | Docker Compose's `env_file:` for the `hermes` container only | All of the agent's third-party secrets                                            |
| 4     | top-level `/opt/app/.env` on the droplet (gitignored; **written by `deploy.sh`**, not hand-authored) | Compose's `${...}` interpolation in `docker-compose.yml`     | Bridges values from file 3 into the rest of the stack                             |
| —     | `web-admin/.env.local` (gitignored, local dev only)                                                  | `next dev`                                                   | Lets you run the portal against a local or remote Hermes dashboard without Docker |

### 1. `terraform/terraform.tfvars`

```
do_token = "..."
```

Only key required: `do_token` (your DigitalOcean API token). Everything else Terraform needs (region, droplet size, image, SSH key name) has a default in `variables.tf`.

### 2. `.env` next to `deploy.sh`

```
HERMES_DASHBOARD_PASSWORD=...
```

`hermes_home/.env` only stores this password's scrypt hash (`HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH`) — it can't be reversed to log in. `deploy.sh` needs the real plaintext value to write file 4 below. You can also pass it inline instead: `HERMES_DASHBOARD_PASSWORD=... ./deploy.sh`.

### 3. `hermes_home/.env`

This is the agent's actual secrets file, injected only into the `hermes` container:

```
API_SERVER_ENABLED=
API_SERVER_HOST=
API_SERVER_KEY=                        # bearer token for the :8642 messaging/session API
BOOKKEEPING_SPREADSHEET_ID=            # Google Sheet the bookkeeping sub-agent appends to
GHL_LOCATION_ID=
GOOGLE_SERVICE_ACCOUNT_FILE=           # path to secrets/ JSON key, mounted alongside this file
HERMES_DASHBOARD=                      # enables the :9119 dashboard (skills/usage UI backend)
HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH=
HERMES_DASHBOARD_BASIC_AUTH_SECRET=
HERMES_DASHBOARD_BASIC_AUTH_USERNAME=
HONCHO_API_KEY=                        # persistent memory provider
MCP_GHL_API_KEY=                       # GHL CRM sub-agent
NYLAS_API_KEY=                         # email parsing/sending
NYLAS_GRANT_ID=
OPENROUTER_API_KEY=                    # model routing (Gemini Flash / Sonnet / Opus)
TELEGRAM_BOT_TOKEN=
TERMINAL_ENV=
```

`chmod 600` this file — it never goes through git or Terraform state, only `rsync`.

### 4. top-level `/opt/app/.env`

Written automatically by `deploy.sh` (steps: grab `DOCKER_GID` and the dashboard username/API key from file 3, append the plaintext password from file 2, reuse or generate a `PORTAL_SESSION_SECRET`). Do **not** author this by hand unless you're debugging — a stale or incomplete copy silently breaks things: empty `${DOCKER_GID}` means the sandbox terminal tool can't touch the Docker socket, empty dashboard credentials mean web-admin's `/api/skills*` calls all 401, and a missing `PORTAL_SESSION_SECRET` makes the portal login throw on every attempt — which `LoginForm.tsx` swallows into a generic "Invalid username or password" regardless of what you typed:

```
DOCKER_GID=...
API_SERVER_KEY=...
HERMES_DASHBOARD_BASIC_AUTH_USERNAME=...
HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=...
PORTAL_SESSION_SECRET=...
```

`deploy.sh` reuses whatever `PORTAL_SESSION_SECRET` is already on the droplet across redeploys (only generating a new one the first time), so existing portal sessions aren't invalidated on every push.

### `web-admin/.env.local` (local dev only)

Only needed if you're running the portal outside Docker (`npm run dev`):

```
HERMES_DASHBOARD_URL=http://localhost:9119   # defaults to this if unset
HERMES_DASHBOARD_USERNAME=
HERMES_DASHBOARD_PASSWORD=
PORTAL_SESSION_SECRET=                       # generate with: openssl rand -base64 32
```

`PORTAL_SESSION_SECRET` signs the portal's own login session cookie (separate from the Hermes dashboard credentials above) — the app throws on startup if it's missing.
