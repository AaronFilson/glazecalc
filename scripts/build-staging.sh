#!/usr/bin/env bash
# Builds a staging image of any commit on the owner's PC, for deploy/staging.sh
# on the instance (docs/mfa-plan.md, "Phase 2"; deploy/README.md, "Staging").
# Git Bash with Docker Desktop on Windows, or any bash with Docker and buildx.
# Production images still come only from CI (.github/workflows/publish.yml).
#
#   scripts/build-staging.sh <git-ref>                  build and push ghcr.io/aaronfilson/glazecalc:staging-<sha>
#   scripts/build-staging.sh <git-ref> --to-s3 <bucket> instead upload it as
#                                                       s3://<bucket>/staging-images/staging-<sha>.tar.gz
#   scripts/build-staging.sh <git-ref> --local          only build it into this PC's Docker (a check)
#
# <git-ref> is a branch, tag or commit in this repository; uncommitted changes
# are never included: the build uses a clean checkout of the commit, in a
# temporary git worktree. The image is for linux/arm64 (the t4g instance); the
# Angular build runs natively and only the small runtime stages are emulated
# (the Dockerfile's --platform=$BUILDPLATFORM). Like CI's images, it carries
# the commit in its org.opencontainers.image.revision label, which staging.sh checks.
#
# Pushing needs a GitHub sign-in to GHCR first, once per token:
#   docker login ghcr.io -u AaronFilson     (password: a classic token with write:packages only)
# --to-s3 needs the AWS CLI signed in as the operator (copper-bell).
set -euo pipefail

image=ghcr.io/aaronfilson/glazecalc
platform=${GLAZECALC_PLATFORM:-linux/arm64}

usage() {
  echo "Usage: $0 <git-ref> [--to-s3 <bucket> | --local]" >&2
  exit 2
}
fail() {
  echo "$*" >&2
  exit 1
}

[ $# -ge 1 ] || usage
ref=$1
shift
mode=push
bucket=
case "${1:-}" in
  '') ;;
  --to-s3)
    [ $# -eq 2 ] || usage
    mode=s3
    bucket=$2
    [[ "$bucket" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] || fail "'$bucket' is not an S3 bucket name."
    ;;
  --local)
    [ $# -eq 1 ] || usage
    mode=local
    ;;
  *) usage ;;
esac

docker buildx version > /dev/null 2>&1 || fail "Docker with buildx is needed (Docker Desktop has both)."
if [ "$mode" = s3 ]; then command -v aws > /dev/null || fail "The AWS CLI is needed for --to-s3."; fi

repo=$(git rev-parse --show-toplevel)
sha=$(git -C "$repo" rev-parse --verify --quiet "$ref^{commit}") || fail "'$ref' is not a commit in $repo."
tag=staging-$sha

# Docker Desktop on Windows takes Windows paths; Git Bash's /tmp is not one.
native_path() { if command -v cygpath > /dev/null; then cygpath -m "$1"; else printf '%s' "$1"; fi; }

work=$(mktemp -d)
cleanup() {
  git -C "$repo" worktree remove --force "$work/src" > /dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT
git -C "$repo" worktree add --detach --quiet "$work/src" "$sha"
src=$(native_path "$work/src")

build=(buildx build --platform "$platform" --file "$src/Dockerfile" --tag "$image:$tag"
  --label "org.opencontainers.image.source=https://github.com/AaronFilson/glazecalc"
  --label "org.opencontainers.image.revision=$sha"
  --provenance=false)
echo "Building $image:$tag for $platform from ${sha:0:12} ($ref)"
case "$mode" in
  push)
    docker "${build[@]}" --push "$src" || fail "The build or the push failed (signed in? docker login ghcr.io)."
    where="$tag"
    ;;
  s3)
    docker "${build[@]}" --load "$src"
    archive="$work/$tag.tar.gz"
    docker save "$image:$tag" | gzip > "$archive"
    aws s3 cp "$(native_path "$archive")" "s3://$bucket/staging-images/$tag.tar.gz" --only-show-errors
    where="s3://$bucket/staging-images/$tag.tar.gz"
    ;;
  local)
    docker "${build[@]}" --load "$src"
    echo "Built $image:$tag into this PC's Docker; nothing was published."
    exit 0
    ;;
esac

echo
echo "Published. On the instance, in a Session Manager shell (sudo -i):"
echo "  /opt/glazecalc/staging.sh $where"
