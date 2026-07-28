#!/usr/bin/env bash
# Local single-container dev/testing only. Production deploys use docker-compose.yml.
set -euo pipefail

CONTAINER_NAME=hermes
IMAGE=nousresearch/hermes-agent
HOST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/hermes_home"

start() {
  if docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
    echo "Container '$CONTAINER_NAME' already exists, starting it..."
    docker start "$CONTAINER_NAME"
  else
    docker run -d \
      --name "$CONTAINER_NAME" \
      --restart unless-stopped \
      -v "$HOST_DIR:/opt/data" \
      -v /var/run/docker.sock:/var/run/docker.sock \
      --group-add "$(stat -f '%g' /var/run/docker.sock)" \
      --env-file "$HOST_DIR/.env" \
      -p 8642:8642 \
      -p 9119:9119 \
      "$IMAGE" gateway run
  fi
}

stop() {
  docker stop "$CONTAINER_NAME"
}

restart() {
  stop || true
  docker rm "$CONTAINER_NAME"
  start
}

logs() {
  docker logs -f "$CONTAINER_NAME"
}

status() {
  docker ps -a --filter "name=^${CONTAINER_NAME}$"
}

case "${1:-}" in
  start)   start ;;
  stop)    stop ;;
  restart) restart ;;
  logs)    logs ;;
  status)  status ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs|status}"
    exit 1
    ;;
esac
