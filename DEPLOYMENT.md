# DigitalOcean Deployment: How It All Fits Together

## Architecture at a glance

```
                    Internet
                       │
                    :80 (only public port)
                       │
                 ┌─────▼─────┐
                 │   nginx   │  (public-facing reverse proxy)
                 └─────┬─────┘
                       │ proxy_pass → web-admin:3000
                 ┌─────▼─────┐
                 │ web-admin │  (Next.js portal, internal only)
                 └─────┬─────┘
                       │ fetch() with Bearer token → hermes:8642
                 ┌─────▼─────┐
                 │  hermes   │  (agent gateway, internal only)
                 └─────┬─────┘
                       │ /var/run/docker.sock (bind-mounted)
                       ▼
            sibling sandbox containers
            (spawned on the host, --network=host)
```

All three services run as containers on **one droplet**, joined by Docker Compose's default network. Only `nginx` publishes a port to the outside world — `web-admin` and `hermes` are reachable only by their service names (`web-admin`, `hermes`) over Compose's internal DNS, never from the internet directly.

---

## The three containers

### 1. `nginx` — the front door
- Uses the stock `nginx:1.27-alpine` image, no custom build needed.
- `nginx.conf` is bind-mounted in (not baked into an image), so it's trivial to edit and just restart the container.
- Listens on `:80`, proxies everything to `http://web-admin:3000`.
- The `X-Forwarded-*` headers it sets let web-admin know the real client IP/protocol even though the request actually arrives from nginx internally.
- The commented-out `# server_name` line is a placeholder — the day you have a domain, you add `server_name yourdomain.com;` plus a `listen 443 ssl;` block here without restructuring anything else.

### 2. `web-admin` — the portal (your code)
- **`web-admin/Dockerfile`** is a 3-stage build:
  1. **`deps`** — installs npm packages with `npm ci` (uses the lockfile for reproducible installs).
  2. **`builder`** — copies in source, runs `npm run build`. Because `next.config.ts` now sets `output: "standalone"`, this produces a self-contained `.next/standalone` folder that bundles only the files actually needed at runtime (no full `node_modules` copy required).
  3. **`runner`** — the final, small image: copies just `public/`, `.next/standalone`, and `.next/static` from the builder stage, creates a non-root `nextjs` user, and runs `node server.js` on port 3000.
- This container never talks to the internet directly for its own port — Compose only `expose`s 3000 (visible to other containers on the network) rather than `ports` (which would publish it to the host).
- At runtime it's given two env vars that override its local-dev defaults:
  - `HERMES_DASHBOARD_URL=http://hermes:8642` — points at the hermes container by its Compose service name instead of `localhost`.
  - `HERMES_DASHBOARD_TOKEN=${API_SERVER_KEY}` — pulled from `hermes_home/.env`'s `API_SERVER_KEY` at `docker compose up` time, so the same bearer token protects the hermes API on both sides.
- This is exactly what `web-admin/src/lib/hermes.ts` already expects — no code changes were needed there, just correct environment wiring.

### 3. `hermes` — the agent (third-party image)
- No Dockerfile — it's the public `nousresearch/hermes-agent` image, pinned to tag `v2026.7.20` (verified live on Docker Hub) instead of floating on `latest`, so a redeploy never silently pulls an unvetted upstream change.
- `volumes: ./hermes_home:/opt/data` — this is the single most important line for the agent's identity: all of its persistent state (config, memories, cron jobs, chat/kanban databases, skills) lives in this bind-mounted host directory, not inside the container. Rebuild or replace the container as often as you like; `hermes_home/` is what actually holds "the agent."
- `volumes: /var/run/docker.sock:/var/run/docker.sock` — this is what lets hermes spawn *sibling* containers on the host for its sandboxed code-execution ("terminal") tool, per `hermes_home/config.yaml`'s `terminal.backend: docker`. The container itself runs as a non-root user internally (UID 10000, per NousResearch's own docs), so `group_add: ["${DOCKER_GID}"]` adds that user to the host's `docker` group so it's actually allowed to use the socket it's been handed.
- `env_file: ./hermes_home/.env` — loads every secret (`OPENROUTER_API_KEY`, `TELEGRAM_BOT_TOKEN`, `GOOGLE_SERVICE_ACCOUNT_FILE`, etc.) straight from that file into the container's environment. Nothing sensitive is hardcoded in `docker-compose.yml`.
- `shm_size: "1gb"` — the image bundles Playwright/Chromium for some skills, which needs more shared memory than Docker's stingy default.

### The `hermes_home/config.yaml` edits
Two changes were made directly to the agent's config, both required for it to safely fit on this specific droplet:
- **Removed `--gpus=all`** from the sandbox's `docker_extra_args` — a standard DigitalOcean droplet has no GPU, and none of the enabled skills (bookkeeping, email parsing) need one.
- **Reduced `container_memory` (5120→1536 MB) and `container_disk` (51200→15360 MB)** — these numbers govern how much RAM/disk *each spawned sandbox container* is allowed to request. The old values could let a single sandbox request more RAM than the whole 4GB droplet has, and with up to 3 concurrent sub-agents, could try to reserve ~150GB of disk against an 80GB droplet — a guaranteed OOM/disk-exhaustion event that would take down nginx and web-admin along with it, not just the sandbox.

---

## What the Terraform builds

Terraform's only job here is to stand up the droplet and its network perimeter — it does **not** touch application secrets or deploy code (that's a manual `rsync` step, since the GitHub repo is private and cloud-init has no deploy credentials).

| File | What it defines |
|---|---|
| `provider.tf` | Configures the `digitalocean` provider using `var.do_token`, and looks up your existing SSH key (`dexter-macbook-key`) already registered in your DO account via a `data` source — Terraform doesn't create this key, just references it. |
| `variables.tf` | Typed inputs: region (`nyc3`), droplet size (`s-2vcpu-4gb`), base image (`ubuntu-22-04-x64`), SSH key name, and project name — all with sensible defaults so `terraform apply` needs no prompts beyond `do_token`. |
| `main.tf` | The two real resources: **`digitalocean_droplet.app`** (the VM itself, booted with the SSH key attached and `cloud-init.yaml` as its `user_data`) and **`digitalocean_firewall.app`** (a network-level firewall — enforced outside the VM, at DigitalOcean's hypervisor — allowing inbound only on port 22 and port 80; everything else inbound is blocked, and this holds even for the sandbox containers running `--network=host` inside the droplet). |
| `outputs.tf` | Prints the droplet's public IP after `apply`, so you have the address to `ssh`/`rsync`/`curl` against. |
| `cloud-init.yaml` | The droplet's first-boot script (passed in as `user_data`) — see below. |
| `terraform.tfvars` (gitignored) | Holds the actual secret `do_token` value, auto-loaded by `plan`/`apply`. Replaces the old, disconnected `terraform/.env` file. |

---

## How Docker actually comes alive on the droplet

**Automated:** after `terraform apply` finishes, run `./deploy.sh` from the repo root. It does everything in steps 3–8 below — waits for SSH and cloud-init, `rsync`s the repo, writes the top-level `.env`, fixes `hermes_home` ownership, brings the stack up, and verifies with `curl`. It uses `~/.ssh/digital-ocean-droplet` by default; override with `SSH_KEY=/path/to/key ./deploy.sh`. Re-running it is safe — it's used for redeploys too. The steps below spell out what it's doing, for troubleshooting or a first-time walkthrough.

This is the sequence from `terraform apply` to a running stack:

1. **`terraform apply`** calls the DigitalOcean API to create the droplet with `ubuntu-22-04-x64` as its base image, your SSH key attached, the firewall applied, and `cloud-init.yaml`'s contents handed to DigitalOcean as `user_data`.

2. **On first boot**, DigitalOcean's `cloud-init` service (pre-installed on the Ubuntu image) reads that `user_data` automatically — no manual step needed. `cloud-init.yaml` is a `#cloud-config` script that:
   - Adds Docker's official APT repository and GPG key.
   - Runs `apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin` — this is what actually puts the `docker` and `docker compose` commands on the box.
   - Creates an empty `/opt/app` directory to receive the application code.
   - At this point the droplet has a working Docker engine but **no application code and no containers running yet** — cloud-init's job ends here by design, since it has no way to pull a private GitHub repo.

3. **You confirm cloud-init finished** with `ssh -i ~/.ssh/digital-ocean-droplet root@$IP cloud-init status --wait`. The `-i` flag matters here: the key registered in DigitalOcean as `dexter-macbook-key` (referenced by `provider.tf`'s data source) is `~/.ssh/digital-ocean-droplet`, not your default `id_ed25519`/`id_rsa` — without pointing at it explicitly, ssh offers the wrong keys and you get `Permission denied (publickey)` even though the droplet is up. Add `IdentityFile ~/.ssh/digital-ocean-droplet` for this host in `~/.ssh/config` if you'd rather not pass `-i` every time.

4. **You `rsync` the whole repo** (code + the full `hermes_home/` directory, including secrets and existing agent memory, since you chose to migrate state rather than start fresh) from your laptop straight into `/opt/app` on the droplet, e.g. `rsync -avz -e "ssh -i ~/.ssh/digital-ocean-droplet" --exclude node_modules --exclude .git ./ root@$IP:/opt/app`. This is the step that gets `docker-compose.yml`, `nginx.conf`, `web-admin/`, and `hermes_home/` (with its real `.env` and `secrets/service-account.json`) onto the box — nothing sensitive ever touches git or Terraform state.

5. **Before the first `docker compose up`, create a top-level `/opt/app/.env`** (next to `docker-compose.yml`, distinct from `hermes_home/.env`). This is required — `env_file: ./hermes_home/.env` only injects vars into the `hermes` container's own runtime, it does **not** feed Compose's `${...}` interpolation used elsewhere in `docker-compose.yml`. Without this file, `docker compose up` prints `variable is not set, Defaulting to a blank string` for both and silently breaks things: `HERMES_DASHBOARD_TOKEN=${API_SERVER_KEY}` ends up empty (web-admin calls hermes with no bearer token → every request 401s), and `group_add: ["${DOCKER_GID}"]` ends up empty (hermes's non-root user never joins the host's `docker` group → the sandbox/terminal tool can't use the bind-mounted socket). Populate it with:
   ```
   DOCKER_GID=$(getent group docker | cut -d: -f3)
   API_SERVER_KEY=<same value as API_SERVER_KEY in hermes_home/.env>
   ```
   `chmod 600` it, same as `hermes_home/.env`.

6. **Fix `hermes_home/` ownership before starting the `hermes` container.** The `hermes-agent` image runs as a non-root user, uid `10000`, and its `cont-init` script only `chown`s a handful of paths it knows it needs (`auth.json`, `config.yaml`, `cron/`, etc.) — it does **not** recursively chown the whole bind mount. Anything that arrived via `rsync` (`kanban.db`, `kanban/`, `.local/state/hermes/gateway-locks/`, and more) keeps the *rsyncing* user's uid instead. Left alone, this surfaces later as `PermissionError` / `Permission denied` on lock files (e.g. the Telegram adapter failing to write its bot-token lock, or the kanban dispatcher failing to init) — the container looks like it's running fine, but individual features silently fail. Fix it on every deploy with:
   ```
   chown -R 10000:10000 /opt/app/hermes_home
   ```

7. **You `ssh -i ~/.ssh/digital-ocean-droplet` in and run `docker compose up -d --build`** from `/opt/app`. This is the moment Docker actually starts doing work:
   - Builds the `web-admin` image locally on the droplet using its `Dockerfile`.
   - Pulls `nousresearch/hermes-agent:v2026.7.20` and `nginx:1.27-alpine` from their registries.
   - Creates the shared Compose network, starts all three containers on it, wires up the bind mounts (`hermes_home/` → `/opt/data`, the Docker socket) and the `env_file`/environment variables described above.
   - `nginx` binds `:80` on the droplet's actual network interface — this is the only point at which anything becomes reachable from the internet, and it's exactly the port the Terraform firewall already allows in.

8. **Verification**: `curl http://$IP/` should return the web-admin UI (proving nginx → web-admin works), and logging into the portal to view chat history/skills confirms the full chain — web-admin → hermes:8642 over the internal network — is functioning.

From here, redeploys are just: `./deploy.sh` again (or manually: `rsync` → rewrite top-level `.env` if secrets changed → `chown -R 10000:10000 hermes_home` → `docker compose up -d --build`). `hermes_home/` persists across rebuilds because it's a bind mount, not baked into any image — the agent's memory and history survive every redeploy, which is exactly why its ownership needs re-fixing every time new files land in it via `rsync`.

---

## Known issue: outbound email (SMTP) is blocked

The `email_parser` skill's IMAP side works fine (`imap.gmail.com:993` connects, reads unread mail), but sending replies over SMTP does not: `smtp.gmail.com` on ports 25, 465, and 587 all time out from the droplet, while every other outbound port tested (443, IMAP 993) works instantly. This isn't `ufw`, `iptables`, or the Terraform firewall (whose outbound rule already allows all ports) — it's **DigitalOcean blocking outbound mail ports by default on new accounts/droplets** as an anti-spam measure, enforced above the account's own firewall config.

Two ways to resolve it:
1. File a DigitalOcean support ticket asking to unblock outbound SMTP for the account.
2. Switch the email plugin from SMTP to the Gmail API (OAuth over HTTPS/443, a port already proven open) — more involved, requires a config/plugin change rather than a network fix, but sidesteps the block entirely.

Until one of those happens, expect the email adapter to connect and read, but fail to send.
