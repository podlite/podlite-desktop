#!/usr/bin/env bash
# Ship production builds to GitHub Release and Snapcraft.
# AppX (Microsoft Store) and MAS (Mac App Store) uploads remain manual.
#
# Usage:
#   yarn release:ship              build all and upload to GitHub and Snapcraft
#   yarn release:ship --dry-run    log actions, run nothing
#
# Optional env:
#   RELEASE_NOTES_FILE  path to file with GitHub release notes
#                       (default: extract '# upcoming' section from CHANGELOG.md)

set -uo pipefail

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

log() { printf '[ship] %s\n' "$*" >&2; }
run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    log "DRY: $*"
  else
    log "RUN: $*"
    eval "$@"
  fi
}

# Preflight
: "${CSC_NAME:?CSC_NAME not set}"
: "${APPLE_API_KEY:?APPLE_API_KEY not set}"
: "${APPLE_API_KEY_ID:?APPLE_API_KEY_ID not set}"
: "${APPLE_API_ISSUER:?APPLE_API_ISSUER not set}"
command -v gh >/dev/null || { log "ERROR: gh CLI not installed"; exit 1; }
command -v snapcraft >/dev/null || log "WARN: snapcraft not installed; snap upload will skip"
log "preflight OK; shipping v${VERSION} (dry-run=${DRY_RUN})"

# Build: delegates to yarn release (one source of truth for build flags)
run yarn release \
  || log "WARN: build had failures; check release/ for surviving artifacts"

# Resolve release notes
NOTES_ARG="--notes \"release ${TAG}\""
NOTES_FILE="${RELEASE_NOTES_FILE:-}"
if [[ -n "$NOTES_FILE" && -f "$NOTES_FILE" ]]; then
  NOTES_ARG="--notes-file $NOTES_FILE"
elif [[ -f CHANGELOG.md ]]; then
  TMP_NOTES=$(mktemp -t release-notes)
  awk '/^# upcoming/{flag=1; next} /^# /{flag=0} flag' CHANGELOG.md | sed '/./,$!d' > "$TMP_NOTES"
  [[ -s "$TMP_NOTES" ]] && NOTES_ARG="--notes-file $TMP_NOTES"
fi

# Upload to GitHub Release (artifacts that exist)
GH_FILES=$(ls release/*.dmg release/*.zip release/*.exe release/*.AppImage 2>/dev/null || true)
if [[ -n "$GH_FILES" ]]; then
  log "create draft release ${TAG}"
  run "env -u GITHUB_TOKEN gh release create ${TAG} --draft --title \"${TAG}\" ${NOTES_ARG}" \
    || log "WARN: gh release create failed (may already exist)"
  log "upload artifacts"
  run "env -u GITHUB_TOKEN gh release upload ${TAG} ${GH_FILES} --clobber" \
    || log "WARN: gh upload failed"
  log "publish release"
  run "env -u GITHUB_TOKEN gh release edit ${TAG} --draft=false" \
    || log "WARN: gh publish failed"
else
  log "SKIP gh: no GitHub artifacts in release/"
fi

# Upload to Snapcraft (stable channel)
if ls release/*.snap >/dev/null 2>&1; then
  log "upload to Snapcraft stable"
  run "snapcraft upload --release=stable release/*.snap" \
    || log "WARN: snap upload failed"
else
  log "SKIP snap: no .snap artifact"
fi

# Manual reminders
log "==="
log "Manual steps:"
log "  AppX: upload release/*.appx via Microsoft Partner Center"
log "  MAS: yarn release:mas + Apple Transporter"
log "==="
log "ship complete (dry-run=${DRY_RUN})"
