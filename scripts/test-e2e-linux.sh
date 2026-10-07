#!/usr/bin/env bash
# Runs the browser tests on Linux in Docker, as CI (Ubuntu) runs them: Node 24,
# MongoDB 9.0, and Chromium with Linux's fonts, which are wider than Windows'
# and have broken layouts that passed on Windows. Called by
# scripts/test-e2e-linux.mjs (npm run test:e2e:linux), which makes the source tar.
#
#   bash scripts/test-e2e-linux.sh <source.tar> <results dir> [playwright args]
set -euo pipefail
TAR=$1
RESULTS=$2
shift 2
HERE=$(cd "$(dirname "$0")" && pwd)
CACHE=$HOME/.cache/glazecalc-e2e-linux
WORK=$CACHE/app

# An image with Node and Playwright's Chromium, built once for each Playwright version.
PLAYWRIGHT=$(tar -xOf "$TAR" package.json | grep -o '"@playwright/test": *"[^"]*"' | grep -o '[0-9][0-9.]*')
IMAGE=glazecalc-e2e:$PLAYWRIGHT
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Building $IMAGE, once for this Playwright version..."
  docker build -q -t "$IMAGE" --build-arg PLAYWRIGHT="$PLAYWRIGHT" - <"$HERE/test-e2e-linux.Dockerfile" >/dev/null
fi

# A clean copy of the source. The containers leave root-owned files, so a container clears the last one.
mkdir -p "$CACHE"
docker run --rm -v "$CACHE":/cache alpine rm -rf /cache/app
mkdir -p "$WORK"
tar -xf "$TAR" -C "$WORK"

docker network create glazecalc-e2e >/dev/null 2>&1 || true
docker rm -f glazecalc-e2e-mongo >/dev/null 2>&1 || true
docker run -d --name glazecalc-e2e-mongo --network glazecalc-e2e mongo:9.0 >/dev/null
trap 'docker rm -f glazecalc-e2e-mongo >/dev/null 2>&1 || true' EXIT

echo "Installing packages and running the browser tests on Linux..."
status=0
docker run --rm --network glazecalc-e2e -v "$WORK":/app -v glazecalc-npm-cache:/root/.npm -w /app \
  -e CI=true -e E2E_MONGO_URI=mongodb://glazecalc-e2e-mongo/glazecalc_e2e "$IMAGE" \
  bash -c 'npm ci --no-audit --no-fund --loglevel=error && npx playwright test --reporter=line "$@"' bash "$@" ||
  status=$?

# What failed (screenshots, traces, page snapshots), to look at from the host.
rm -rf "$RESULTS"
mkdir -p "$RESULTS"
if [ -d "$WORK/test-results" ]; then cp -r "$WORK/test-results/." "$RESULTS/"; fi
exit $status
