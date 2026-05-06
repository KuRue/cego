#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(dirname -- "${BASH_SOURCE[0]}")
SCRIPT_DIR=$(cd -- "${SCRIPT_DIR}" && pwd -P)
SOURCE_DIR="${SCRIPT_DIR}/../.."
SOURCE_DIR=$(cd -- "${SOURCE_DIR}" && pwd -P)
APPDATA_DIR=$(dirname -- "${SOURCE_DIR}")

ENV_FILE="${CEGO_ENV_FILE:-${APPDATA_DIR}/.env}"
COMPOSE_FILE="${CEGO_COMPOSE_FILE:-${SOURCE_DIR}/infra/docker/compose.unraid.prebuilt.yml}"
BRANCH="${CEGO_DEPLOY_BRANCH:-main}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  echo "Set CEGO_ENV_FILE=/path/to/.env if your env file lives elsewhere." >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Missing Compose file: ${COMPOSE_FILE}" >&2
  echo "Set CEGO_COMPOSE_FILE=/path/to/compose.unraid.prebuilt.yml if needed." >&2
  exit 1
fi

compose=(docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")

echo "==> Updating source at ${SOURCE_DIR}"
git -C "${SOURCE_DIR}" fetch origin "${BRANCH}"
git -C "${SOURCE_DIR}" checkout "${BRANCH}"
git -C "${SOURCE_DIR}" pull --ff-only origin "${BRANCH}"

echo "==> Pulling prebuilt images"
"${compose[@]}" --profile tools pull

echo "==> Running database migrations"
"${compose[@]}" --profile tools run --rm cego-migrate

echo "==> Recreating services"
"${compose[@]}" up -d --force-recreate cego-web cego-deadline-worker cloudflared

echo "==> Current service status"
"${compose[@]}" ps

echo "==> Running cego-web build"
"${compose[@]}" exec -T cego-web sh -lc 'printf "CEGO_BUILD_SHA=%s\n" "${CEGO_BUILD_SHA:-missing}"'
