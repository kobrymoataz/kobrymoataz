#!/usr/bin/env bash
# V29 safe publisher: reuse local Git objects, deploy from a temporary worktree.
# No new clone, no force pushes, no deletion of old stashes.
set -euo pipefail
PKG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$HOME/Developer/kobrymoataz}"
EXPECTED_V28='8b517911d905b24bb6853987ded9a134e73d71d1'
EXPECTED_REPO='kobrymoataz/kobrymoataz'
V29_MESSAGE='Refine V29 global perspective, WebGL compatibility and public engineering evidence'

for tool in git rsync node python3; do
  command -v "$tool" >/dev/null 2>&1 || { echo "STOP: Missing required command: $tool" >&2; exit 1; }
done
[[ -d "$REPO/.git" ]] || { echo "STOP: Local repository not found: $REPO" >&2; exit 1; }
[[ "$(git -C "$REPO" branch --show-current)" == 'main' ]] || { echo 'STOP: Checkout must be on main.' >&2; exit 1; }
REMOTE="$(git -C "$REPO" remote get-url origin)"
case "$REMOTE" in
  https://github.com/kobrymoataz/kobrymoataz|https://github.com/kobrymoataz/kobrymoataz.git|git@github.com:kobrymoataz/kobrymoataz|git@github.com:kobrymoataz/kobrymoataz.git) ;;
  *) echo "STOP: origin is not $EXPECTED_REPO: $REMOTE" >&2; exit 1 ;;
esac
if [[ -n "$(git -C "$REPO" status --porcelain)" ]]; then
  echo 'STOP: Your Developer checkout contains uncommitted changes; nothing was modified.' >&2
  git -C "$REPO" status --short
  exit 1
fi
for f in README.md docs/index.html docs/perspective.js docs/perspective.css docs/globe.js docs/assets/img/regional-atlas.svg scripts/validate_site.py scripts/test_studio.mjs scripts/test_flow_v28.mjs scripts/test_perspective_v29.mjs scripts/push_v28.sh scripts/push_v29.sh .github/workflows/deploy-pages.yml; do
  [[ -f "$PKG/$f" ]] || { echo "STOP: Incomplete V29 package: $f" >&2; exit 1; }
done

printf '\nRunning V29 package checks (read only)...\n'
(
  cd "$PKG"
  python3 scripts/validate_site.py
  node scripts/test_studio.mjs
  node scripts/test_flow_v28.mjs
  node scripts/test_perspective_v29.mjs
  for file in docs/i18n.js docs/lab.js docs/app.js docs/globe.js docs/perspective.js docs/studio.js docs/studio-engine.js docs/studio-flow-ui.js docs/studio-flow-engine.js; do node --check "$file"; done
)

printf '\nChecking GitHub main (fetch, no clone)...\n'
git -C "$REPO" fetch --no-tags origin main
LOCAL_SHA="$(git -C "$REPO" rev-parse main)"
REMOTE_SHA="$(git -C "$REPO" rev-parse refs/remotes/origin/main)"
if [[ "$REMOTE_SHA" != "$EXPECTED_V28" ]]; then
  if [[ "$(git -C "$REPO" log -1 --format=%s "$REMOTE_SHA")" == "$V29_MESSAGE" ]]; then
    printf '\nV29 is already on remote main. Synchronizing local checkout if possible...\n'
    git -C "$REPO" pull --ff-only origin main
    git -C "$REPO" log -1 --oneline
    exit 0
  fi
  echo 'STOP: Remote main is not at the verified V28 baseline. No files changed.' >&2
  echo "  expected V28: $EXPECTED_V28" >&2
  echo "  origin/main : $REMOTE_SHA" >&2
  exit 1
fi
if ! git -C "$REPO" merge-base --is-ancestor "$LOCAL_SHA" "$REMOTE_SHA"; then
  echo 'STOP: Local main has diverged from remote main. No files changed.' >&2
  echo "  local main  : $LOCAL_SHA" >&2
  echo "  origin/main : $REMOTE_SHA" >&2
  exit 1
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/portfolio-v29.XXXXXX")"
cleanup() {
  cd "$PKG" || true
  git -C "$REPO" worktree remove --force "$WORK/repo" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
printf '\nBuilding V29 in a temporary worktree (your Mac files remain untouched)...\n'
git -C "$REPO" worktree add --quiet --detach "$WORK/repo" "$REMOTE_SHA"
TARGET="$WORK/repo"
mkdir -p "$TARGET/docs" "$TARGET/assets/banners" "$TARGET/assets/logos" "$TARGET/scripts" "$TARGET/.github/workflows"
rsync -a --delete "$PKG/docs/" "$TARGET/docs/"
rsync -a "$PKG/assets/banners/" "$TARGET/assets/banners/"
rsync -a "$PKG/assets/logos/" "$TARGET/assets/logos/"
for file in README.md scripts/validate_site.py scripts/test_studio.mjs scripts/test_flow_v28.mjs scripts/test_perspective_v29.mjs scripts/qa_perspective_v29.py scripts/push_v28.sh scripts/push_v29.sh .github/workflows/deploy-pages.yml; do
  cp "$PKG/$file" "$TARGET/$file"
done

printf '\nVerifying the exact files to be published...\n'
(
  cd "$TARGET"
  python3 scripts/validate_site.py
  node scripts/test_studio.mjs
  node scripts/test_flow_v28.mjs
  node scripts/test_perspective_v29.mjs
  for file in docs/i18n.js docs/lab.js docs/app.js docs/globe.js docs/perspective.js docs/studio.js docs/studio-engine.js docs/studio-flow-ui.js docs/studio-flow-engine.js; do node --check "$file"; done
)
git -C "$TARGET" add -A -- README.md docs assets/banners assets/logos scripts/validate_site.py scripts/test_studio.mjs scripts/test_flow_v28.mjs scripts/test_perspective_v29.mjs scripts/qa_perspective_v29.py scripts/push_v28.sh scripts/push_v29.sh .github/workflows/deploy-pages.yml
git -C "$TARGET" diff --cached --check
if git -C "$TARGET" diff --cached --quiet; then
  echo 'V29 is already identical to remote main. Nothing to publish.'
  exit 0
fi
printf '\nThese V29 changes will be published:\n'
GIT_PAGER=cat git -C "$TARGET" diff --cached --stat
printf '\nPublish verified V29 to %s main? [y/N]: ' "$EXPECTED_REPO"
read -r answer
case "$answer" in y|Y|yes|YES) ;; *) echo 'Canceled safely. Nothing published.'; exit 0;; esac
if [[ -z "$(git -C "$TARGET" config user.name || true)" || -z "$(git -C "$TARGET" config user.email || true)" ]]; then
  echo 'STOP: Git author name/email is not configured.' >&2
  exit 1
fi
printf '\nCommitting V29 inside temporary worktree...\n'
git -C "$TARGET" commit -m "$V29_MESSAGE"
printf '\nPushing V29 to main (fast-forward only; never force-push)...\n'
git -C "$TARGET" push origin HEAD:refs/heads/main
printf '\nSyncing original Mac checkout using fast-forward only...\n'
git -C "$REPO" pull --ff-only origin main
printf '\nV29 PUSH SUCCESSFUL. Your original checkout is now up to date. Previous stashes were not touched.\n'
git -C "$REPO" log -1 --oneline
printf 'Portfolio: https://kobrymoataz.github.io/kobrymoataz/\n'
