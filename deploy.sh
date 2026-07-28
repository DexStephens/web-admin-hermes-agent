#!/usr/bin/env bash
# Everything that needs to happen after `terraform apply`:
# wait for the droplet, wait for cloud-init, ship the repo, write the
# top-level .env Compose needs, fix hermes_home ownership for the bind
# mount, and bring the stack up.
#
# Usage: ./deploy.sh
# Override the SSH key with: SSH_KEY=/path/to/key ./deploy.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/digital-ocean-droplet}"
REMOTE_DIR="/opt/app"
HERMES_UID=10000

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found at $SSH_KEY (set SSH_KEY to override)" >&2
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
  "$SCRIPT_DIR/" "root@$IP:$REMOTE_DIR"

echo "==> Writing top-level .env for Compose variable interpolation..."
echo "    (env_file: ./hermes_home/.env only feeds the hermes container's own runtime,"
echo "     it does NOT feed \${...} substitution used elsewhere in docker-compose.yml)"
ssh_do bash -s <<REMOTE
set -euo pipefail
cd $REMOTE_DIR
{
  echo "DOCKER_GID=\$(getent group docker | cut -d: -f3)"
  grep '^API_SERVER_KEY=' hermes_home/.env
} > .env
chmod 600 .env
REMOTE

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
