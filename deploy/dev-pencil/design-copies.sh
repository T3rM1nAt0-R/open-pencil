#!/bin/sh
# Daily copies of the Pencil shelf (slumberjakz/specs/Design-Copies.md).
# Keeps one dated copy of every design (.fig, name, preview and comments) per day
# for 14 days, so a bad save or a broken dev build can always be undone.
#
#   design-copies.sh copy     make today's copy now (if missing) and drop old ones
#   design-copies.sh loop     copy, then check again every hour (the compose service)
#   design-copies.sh list     the copies there are, newest first
#
# Restoring is done on Brian by hand (the shelf is mounted read-only here):
#   ls /opt/data/selfhost/openpencil-copies/<date>/
#   cp -a /opt/data/selfhost/openpencil-copies/<date>/<id>.* \
#         /opt/data/selfhost/openpencil/designs/pencil-store/open_pencil_storage/canvases/
#
# Folders: SHELF_DIR (default /shelf, the canvases folder) and COPIES_DIR (default
# /copies). Days follow TZ (IST-5:30 in compose). Plain POSIX sh: runs in alpine.
set -eu

SHELF_DIR="${SHELF_DIR:-/shelf}"
COPIES_DIR="${COPIES_DIR:-/copies}"
KEEP_DAYS="${KEEP_DAYS:-14}"

copies() {
  ls -1 "$COPIES_DIR" 2>/dev/null | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' | sort -r || true
}

copy_now() {
  today="$(date +%F)"
  mkdir -p "$COPIES_DIR"
  if [ ! -d "$SHELF_DIR" ]; then
    echo "design copies: no shelf at $SHELF_DIR yet"
    return 0
  fi
  if [ ! -d "$COPIES_DIR/$today" ]; then
    tmp="$COPIES_DIR/.tmp-$today"
    rm -rf "$tmp"
    cp -a "$SHELF_DIR" "$tmp"
    mv "$tmp" "$COPIES_DIR/$today"
    echo "design copies: made $today ($(ls -1 "$COPIES_DIR/$today" | grep -c '\.fig$' || true) designs)"
  fi
  copies | tail -n +"$((KEEP_DAYS + 1))" | while read -r old; do
    rm -rf "${COPIES_DIR:?}/$old"
    echo "design copies: dropped $old"
  done
}

case "${1:-}" in
  copy) copy_now ;;
  loop)
    while true; do
      copy_now || echo "design copies: failed; trying again in an hour"
      sleep 3600
    done
    ;;
  list) copies ;;
  *)
    sed -n '2,17p' "$0"
    exit 1
    ;;
esac
