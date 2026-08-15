#!/usr/bin/env bash
# Fetch the store packages a release run built and submit them.
#
# The release workflow attaches pkg / snap / appx to the run artifacts rather than
# to the release page, because none of them installs outside its own store. This
# pulls them down and hands each one to its store: snap goes up on its own, the
# other two need a human in a web form.
#
# Usage:
#   yarn release:stores            packages for the version in package.json
#   yarn release:stores 0.9.0      that version
#   yarn release:stores --dry-run  log actions, run nothing
#
# Credentials stay on this machine. The runner never sees a store login.

set -euo pipefail

DRY_RUN=0
VERSION=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    *) VERSION="$arg" ;;
  esac
done

[[ -n "$VERSION" ]] || VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"
OUT="release-stores/${TAG}"

log() { printf '[stores] %s\n' "$*" >&2; }
run() {
  if [[ $DRY_RUN -eq 1 ]]; then log "DRY: $*"; else log "RUN: $*"; eval "$@"; fi
}

command -v gh >/dev/null || { log "gh is not installed"; exit 1; }

# The run that carries the packages is the newest release run for this tag.
RUN_ID=$(gh run list --workflow=release.yml --limit 20 \
  --json databaseId,headBranch,conclusion \
  --jq "[.[] | select(.headBranch == \"${TAG}\")] | first | .databaseId")

if [[ -z "$RUN_ID" || "$RUN_ID" == "null" ]]; then
  log "no release run found for ${TAG}"
  exit 1
fi
log "run ${RUN_ID} for ${TAG}"

mkdir -p "$OUT"
# Artifacts carry the tag in their name since 0.9.1; the short names are what
# earlier runs used.
for store in mac-appstore linux-snap windows-appx; do
  got=0
  for name in "podlite-${TAG}-${store}" "store-${store%%-*}"; do
    if gh run download "$RUN_ID" -n "$name" -D "$OUT" 2>/dev/null; then
      log "got ${name}"
      got=1
      break
    fi
  done
  [[ $got -eq 1 ]] || log "no ${store} in this run — that store was skipped or its build failed"
done
# Older runs kept the pkg inside a folder; flatten so the paths below hold files.
find "$OUT" -mindepth 2 -type f \( -name '*.pkg' -o -name '*.snap' -o -name '*.appx' \) \
  -exec mv {} "$OUT"/ \; 2>/dev/null || true

shopt -s nullglob
PKG=("$OUT"/*.pkg)
SNAP=("$OUT"/*.snap)
APPX=("$OUT"/*.appx)
shopt -u nullglob

# Snap is the only one that submits from a terminal.
if (( ${#SNAP[@]} )); then
  if command -v snapcraft >/dev/null; then
    run "snapcraft upload --release=stable ${SNAP[0]}"
  else
    log "snapcraft is not installed; ${SNAP[0]} left in place"
  fi
fi

echo
echo "Left to do by hand:"
if (( ${#PKG[@]} )); then
  echo "  Mac App Store   open Transporter, add ${PKG[0]}, deliver,"
  echo "                  then submit the build in App Store Connect"
else
  echo "  Mac App Store   no package in this run"
fi
if (( ${#APPX[@]} )); then
  echo "  Microsoft Store Partner Center -> Update -> Manage packages,"
  echo "                  upload ${APPX[0]}, supersede the old one, Save, Submit"
else
  echo "  Microsoft Store no package in this run"
fi
echo
echo "Packages are in ${OUT}"
