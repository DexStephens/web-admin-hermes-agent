#!/usr/bin/env bash
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
      -p 8642:8642 \
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
