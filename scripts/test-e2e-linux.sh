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

# The containers go before their network, which Docker will not remove while
# one is still on it. It runs once, however the script ends: done, failed, or
# stopped (Ctrl-C, or CI cancelling the job), and then exits.
cleaned=
cleanup() {
  [ -n "$cleaned" ] && return
  cleaned=1
  docker rm -f "$RUN-tests" "$RUN-mongo" >/dev/null 2>&1 || true
  docker network rm "$RUN" >/dev/null 2>&1 || true
  docker run --rm -v "$CACHE":/cache alpine rm -rf "/cache/$RUN" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM
docker network create "$RUN" >/dev/null
docker run -d --name "$RUN-mongo" --network "$RUN" mongo:9.0 >/dev/null

# The tests run in a container named for this run, so cleanup can stop it.
# --init gives it an init process that passes Ctrl-C (SIGINT) on to npm and
# Playwright, which otherwise, as process 1, would not stop for it; to all of
# them, not only the bash it starts (TINI_KILL_PROCESS_GROUP). docker run
# goes in the background and the script waits for it, because bash runs a trap
# only once the command in the foreground ends.
echo "Installing packages and running the browser tests on Linux..."
status=0
docker run --rm --init --name "$RUN-tests" --network "$RUN" -v "$WORK":/app -v "${E2E_NPM_CACHE:-glazecalc-npm-cache}":/root/.npm -w /app \
  -e TINI_KILL_PROCESS_GROUP=1 -e CI=true -e E2E_MONGO_URI="mongodb://$RUN-mongo/glazecalc_e2e" \
  -e E2E_WORKERS="${E2E_WORKERS:-}" -e E2E_BLOB="${E2E_BLOB:-}" "$IMAGE" \
  bash -c 'npm ci --no-audit --no-fund --loglevel=error && exec npx playwright test "$@"' bash "$@" &
wait $! || status=$?

# What failed (screenshots, traces, page snapshots), to look at from the host,
# and a sharded run's blob report.
rm -rf "$RESULTS"
mkdir -p "$RESULTS"
if [ -d "$WORK/test-results" ]; then cp -r "$WORK/test-results/." "$RESULTS/"; fi
if [ -d "$WORK/blob-report" ]; then cp -r "$WORK/blob-report" "$RESULTS/blob-report"; fi
exit $status
