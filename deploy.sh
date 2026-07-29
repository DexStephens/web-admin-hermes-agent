#!/usr/bin/env bash
# Everything that needs to happen after `terraform apply`:
# wait for the droplet, wait for cloud-init, ship the repo, write the
# top-level .env Compose needs, fix hermes_home ownership for the bind
# mount, and bring the stack up.
#
# Usage: ./deploy.sh
# Reads defaults (HERMES_DASHBOARD_PASSWORD, etc.) from a gitignored .env
# next to this script, if present -- see .env.example. A value already set
# in the environment (e.g. HERMES_DASHBOARD_PASSWORD=... ./deploy.sh) wins
# over the file either way.
# Override the SSH key with: SSH_KEY=/path/to/key ./deploy.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Only consult the file for a var that wasn't already passed in explicitly --
# an explicit HERMES_DASHBOARD_PASSWORD=... ./deploy.sh always wins.
if [[ -z "${HERMES_DASHBOARD_PASSWORD:-}" && -f "$SCRIPT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env"
  set +a
fi

SSH_KEY="${SSH_KEY:-$HOME/.ssh/digital-ocean-droplet}"
HERMES_DASHBOARD_PASSWORD="${HERMES_DASHBOARD_PASSWORD:-}"
REMOTE_DIR="/opt/app"
HERMES_UID=10000

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found at $SSH_KEY (set SSH_KEY to override)" >&2
  exit 1
fi

if [[ -z "$HERMES_DASHBOARD_PASSWORD" ]]; then
  echo "HERMES_DASHBOARD_PASSWORD is not set." >&2
  echo "hermes_home/.env only stores the dashboard password's scrypt hash" >&2
  echo "(HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH), not the plaintext -- web-admin" >&2
  echo "needs the real password to log in to the dashboard. Set it:" >&2
  echo "  HERMES_DASHBOARD_PASSWORD=... ./deploy.sh" >&2
  exit 1
fi

IP="$(cd "$SCRIPT_DIR/terraform" && terraform output -raw droplet_ip)"
SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5)

ssh_do() { ssh "${SSH_OPTS[@]}" "root@$IP" "$@"; }

echo "==> Target droplet: $IP"

echo "==> Waiting for SSH to come up..."
until ssh_do true 2>/dev/null; do
  sleep 5
done

echo "==> Waiting for cloud-init to finish..."
ssh_do cloud-init status --wait

echo "==> Syncing repo to $REMOTE_DIR..."
rsync -avz -e "ssh ${SSH_OPTS[*]}" \
  --exclude .git \
  --exclude node_modules \
  --exclude web-admin/.next \
  --exclude terraform/.terraform \
  --exclude 'terraform/terraform.tfstate*' \
  --exclude .DS_Store \
  --exclude '/.env' \
  "$SCRIPT_DIR/" "root@$IP:$REMOTE_DIR"

echo "==> Writing top-level .env for Compose variable interpolation..."
echo "    (env_file: ./hermes_home/.env only feeds the hermes container's own runtime,"
echo "     it does NOT feed \${...} substitution used elsewhere in docker-compose.yml)"
DOCKER_GID="$(ssh_do "getent group docker | cut -d: -f3")"
DASHBOARD_USERNAME_LINE="$(ssh_do "grep '^HERMES_DASHBOARD_BASIC_AUTH_USERNAME=' $REMOTE_DIR/hermes_home/.env")"
API_SERVER_KEY_LINE="$(ssh_do "grep '^API_SERVER_KEY=' $REMOTE_DIR/hermes_home/.env")"

# web-admin's portal login (src/lib/auth.ts) signs its session cookie with
# this secret and throws if it's unset -- reuse whatever's already on the
# droplet so redeploys don't invalidate every existing portal session;
# only generate a fresh one the first time.
PORTAL_SESSION_SECRET="$(ssh_do "grep '^PORTAL_SESSION_SECRET=' $REMOTE_DIR/.env 2>/dev/null | cut -d= -f2-" || true)"
if [[ -z "$PORTAL_SESSION_SECRET" ]]; then
  echo "    Generating a new PORTAL_SESSION_SECRET (none found on droplet yet)..."
  PORTAL_SESSION_SECRET="$(openssl rand -base64 32)"
fi

# Assembled and escaped locally, then piped as raw bytes into `cat` on the
# remote -- nothing here is re-parsed by a shell, local or remote, so
# special characters in any value can't break the script. Compose's .env
# loader re-interpolates ${...}/$VAR references *inside* .env values, so an
# unescaped $ (e.g. a password that happens to look like the scrypt hash's
# `scrypt$16384$8$1$...` format) would otherwise get silently mangled rather
# than erroring -- Compose's own escape for a literal $ is $$.
{
  printf 'DOCKER_GID=%s\n' "$DOCKER_GID"
  printf '%s\n' "${API_SERVER_KEY_LINE//\$/\$\$}"
  printf '%s\n' "${DASHBOARD_USERNAME_LINE//\$/\$\$}"
  printf 'HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=%s\n' "${HERMES_DASHBOARD_PASSWORD//\$/\$\$}"
  printf 'PORTAL_SESSION_SECRET=%s\n' "${PORTAL_SESSION_SECRET//\$/\$\$}"
} | ssh_do "cat > $REMOTE_DIR/.env && chmod 600 $REMOTE_DIR/.env"

echo "==> Fixing hermes_home ownership (container runs as uid $HERMES_UID; rsync leaves it owned by your local user)..."
ssh_do "chown -R $HERMES_UID:$HERMES_UID $REMOTE_DIR/hermes_home"

echo "==> Linking /opt/data -> hermes_home on the droplet host (docker-outside-of-docker mount fix)..."
echo "    Hermes's docker terminal backend builds sandbox bind-mount paths (skills, cache,"
echo "    sandbox home) from its internal HERMES_HOME (/opt/data). It spawns sibling sandbox"
echo "    containers via the docker.sock mount, so the HOST's real Docker daemon needs"
echo "    /opt/data to resolve to something real -- otherwise every execute_code/terminal"
echo "    call inside a sandbox fails, or (worse, on Linux) silently mounts an empty dir."
ssh_do bash -s <<REMOTE
set -euo pipefail
target="$REMOTE_DIR/hermes_home"
if [ -L /opt/data ]; then
  current="\$(readlink -f /opt/data)"
  expected="\$(readlink -f "\$target")"
  if [ "\$current" != "\$expected" ]; then
    echo "  /opt/data symlink points elsewhere (\$current) -- relinking"
    rm /opt/data
    ln -s "\$target" /opt/data
  else
    echo "  /opt/data already linked correctly"
  fi
elif [ -e /opt/data ]; then
  echo "  ERROR: /opt/data exists and is not a symlink -- refusing to overwrite" >&2
  exit 1
else
  mkdir -p /opt
  ln -s "\$target" /opt/data
  echo "  Linked /opt/data -> \$target"
fi
REMOTE

echo "==> Bringing up the stack..."
ssh_do "cd $REMOTE_DIR && docker compose up -d --build"

echo "==> Container status:"
ssh_do "cd $REMOTE_DIR && docker compose ps"

echo "==> Verifying HTTP..."
sleep 3
code="$(curl -sS -o /dev/null -w '%{http_code}' "http://$IP/" || echo "000")"
echo "HTTP $code from http://$IP/"
if [[ "$code" != "200" ]]; then
  echo "Warning: expected 200 — check 'docker compose logs' on the droplet." >&2
fi

echo "==> Done. Portal: http://$IP/"
