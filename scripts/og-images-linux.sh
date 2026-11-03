#!/usr/bin/env bash
# Makes the link preview images (scripts/og-images.mjs) on Linux in Docker, in
# the browser tests' image (test-e2e-linux.Dockerfile), whose Noto fonts cover
# every live language's script. Called by scripts/og-images-linux.mjs (npm run
# og-images), which makes the source tar.
#
#   bash scripts/og-images-linux.sh <source.tar> <checkout> [language codes]
#
# The images and lib/og-images.json are copied back into <checkout>.
set -euo pipefail
TAR=$1
CHECKOUT=$2
shift 2
HERE=$(cd "$(dirname "$0")" && pwd)
CACHE=$HOME/.cache/glazecalc-e2e-linux
RUN=glazecalc-og-$$-$RANDOM
WORK=$CACHE/$RUN

# The same image as the browser tests (scripts/test-e2e-linux.sh).
PACKAGE=$(tar -xOf "$TAR" package.json)
PLAYWRIGHT=$(grep -o '"@playwright/test": *"[^"]*"' <<<"$PACKAGE" | grep -o '[0-9][0-9.]*')
DOCKERFILE=$(sha256sum "$HERE/test-e2e-linux.Dockerfile" | cut -c1-12)
IMAGE=glazecalc-e2e:playwright$PLAYWRIGHT-$DOCKERFILE
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Building $IMAGE, once for this Playwright..."
  docker build -q -t "$IMAGE" --build-arg PLAYWRIGHT="$PLAYWRIGHT" - \
    <"$HERE/test-e2e-linux.Dockerfile" >/dev/null
fi

mkdir -p "$WORK"
tar -xf "$TAR" -C "$WORK"
cleanup() {
  docker rm -f "$RUN" >/dev/null 2>&1 || true
  docker run --rm -v "$CACHE":/cache alpine rm -rf "/cache/$RUN" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --rm --init --name "$RUN" -v "$WORK":/app -v glazecalc-npm-cache:/root/.npm -w /app "$IMAGE" \
  bash -c 'npm ci --ignore-scripts --no-audit --no-fund --loglevel=error && exec node scripts/og-images.mjs "$@"' bash "$@"

rm -rf "$CHECKOUT/client/public/og"
cp -r "$WORK/client/public/og" "$CHECKOUT/client/public/og"
cp "$WORK/lib/og-images.json" "$CHECKOUT/lib/og-images.json"
