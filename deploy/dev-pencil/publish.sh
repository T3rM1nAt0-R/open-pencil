#!/usr/bin/env bash
# Builds this fork's web editor and lays out the folder Brian runs dev-pencil from:
# deploy/dev-pencil/out/site. Run it on a build machine (not on Brian). Needs git and bun.
#   deploy/dev-pencil/publish.sh            # builds origin/slumberjakz
#   PENCIL_REF=<branch or sha> deploy/dev-pencil/publish.sh
# Then on Brian, in /opt/data/selfhost/openpencil-dev/: keep the previous release in
# .prev, copy out/site, compose.yaml and Caddyfile in, and run: docker compose up -d
# (a changed Caddyfile or site needs: docker compose restart web)
set -euo pipefail
REF="${PENCIL_REF:-slumberjakz}"
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone --depth 1 --branch "$REF" https://github.com/T3rM1nAt0-R/open-pencil.git "$WORK/src"
cd "$WORK/src"
SHA="$(git rev-parse --short HEAD)"
bun install --frozen-lockfile
bun run build:packages
bunx vite build

rm -rf "$HERE/out"
mkdir -p "$HERE/out/site"
cp -r dist/. "$HERE/out/site/"
# Cloudflare Pages files; Caddy does these itself.
rm -f "$HERE/out/site/_headers" "$HERE/out/site/_redirects"
echo "$REF $SHA" > "$HERE/out/site/VERSION.txt"
echo "Ready: $HERE/out/site ($REF $SHA)."
