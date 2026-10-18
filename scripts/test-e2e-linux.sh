#!/usr/bin/env bash
# Runs the browser tests on Linux in Docker, exactly as CI runs them (CI calls
# this too): Playwright's image for its version, Node 24, MongoDB 9.0. Linux
# lays pages out differently from Windows, and layouts that passed on Windows
# have broken there. Called by scripts/test-e2e-linux.mjs (npm run
# test:e2e:linux), which makes the source tar.
#
#   bash scripts/test-e2e-linux.sh <source.tar> <results dir> [playwright args]
#
# Each run has its own copy of the source, network and MongoDB container, so
# two runs on one machine leave each other be (npm run test:e2e:both).
# E2E_WORKERS and E2E_BLOB pass through to Playwright (playwright.config.js);
# E2E_NPM_CACHE is a directory for npm's cache in place of a Docker volume (CI).
set -euo pipefail
TAR=$1
RESULTS=$2
shift 2
HERE=$(cd "$(dirname "$0")" && pwd)
CACHE=$HOME/.cache/glazecalc-e2e-linux
RUN=glazecalc-e2e-$$-$RANDOM
WORK=$CACHE/$RUN

# Playwright's own image for the version in package.json, with Node, built once
# for each version and each change to test-e2e-linux.Dockerfile. CI runs the
# tests in it too. The file is read whole before it is searched: grep stopping
# early would cut tar off mid-write, and pipefail would end the script.
PACKAGE=$(tar -xOf "$TAR" package.json)
PLAYWRIGHT=$(grep -o '"@playwright/test": *"[^"]*"' <<<"$PACKAGE" | grep -o '[0-9][0-9.]*')
DOCKERFILE=$(sha256sum "$HERE/test-e2e-linux.Dockerfile" | cut -c1-12)
IMAGE=glazecalc-e2e:playwright$PLAYWRIGHT-$DOCKERFILE
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Building $IMAGE, once for this Playwright..."
  docker build -q -t "$IMAGE" --build-arg PLAYWRIGHT="$PLAYWRIGHT" - \
    <"$HERE/test-e2e-linux.Dockerfile" >/dev/null
fi

# A clean copy of the source for this run. The containers leave root-owned
# files, so a container clears them at the end.
mkdir -p "$WORK"
tar -xf "$TAR" -C "$WORK"

cleanup() {
  docker rm -f "$RUN-mongo" >/dev/null 2>&1 || true
  docker network rm "$RUN" >/dev/null 2>&1 || true
  docker run --rm -v "$CACHE":/cache alpine rm -rf "/cache/$RUN" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker network create "$RUN" >/dev/null
docker run -d --name "$RUN-mongo" --network "$RUN" mongo:9.0 >/dev/null

echo "Installing packages and running the browser tests on Linux..."
status=0
docker run --rm --network "$RUN" -v "$WORK":/app -v "${E2E_NPM_CACHE:-glazecalc-npm-cache}":/root/.npm -w /app \
  -e CI=true -e E2E_MONGO_URI="mongodb://$RUN-mongo/glazecalc_e2e" \
  -e E2E_WORKERS="${E2E_WORKERS:-}" -e E2E_BLOB="${E2E_BLOB:-}" "$IMAGE" \
  bash -c 'npm ci --no-audit --no-fund --loglevel=error && npx playwright test "$@"' bash "$@" ||
  status=$?

# What failed (screenshots, traces, page snapshots), to look at from the host,
# and a sharded run's blob report.
rm -rf "$RESULTS"
mkdir -p "$RESULTS"
if [ -d "$WORK/test-results" ]; then cp -r "$WORK/test-results/." "$RESULTS/"; fi
if [ -d "$WORK/blob-report" ]; then cp -r "$WORK/blob-report" "$RESULTS/blob-report"; fi
exit $status
