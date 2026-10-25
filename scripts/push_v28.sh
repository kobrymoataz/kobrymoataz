#!/usr/bin/env bash
# V28 safe deploy: reuse the existing Git checkout; never clone the repository.
# Runs in a temporary Git worktree, keeping ~/Developer/kobrymoataz untouched
# until the fast-forward sync after a successful GitHub push.
set -euo pipefail
PKG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$HOME/Developer/kobrymoataz}"
EXPECTED_V27="504789f3feabe8fb6b20650f6835b52981661855"
REPO_NAME="kobrymoataz/kobrymoataz"

for tool in git rsync node python3; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing command: $tool" >&2; exit 1; }
done
[[ -d "$REPO/.git" ]] || { echo "Local Git repository not found: $REPO" >&2; exit 1; }
for file in README.md docs/index.html docs/studio-flow-engine.js docs/studio-flow-ui.js docs/studio-flow.css scripts/validate_site.py scripts/test_flow_v28.mjs scripts/test_studio.mjs; do
  [[ -f "$PKG/$file" ]] || { echo "Incomplete V28 package: $file" >&2; exit 1; }
done

REMOTE="$(git -C "$REPO" remote get-url origin)"
case "$REMOTE" in
  https://github.com/kobrymoataz/kobrymoataz|https://github.com/kobrymoataz/kobrymoataz.git|git@github.com:kobrymoataz/kobrymoataz|git@github.com:kobrymoataz/kobrymoataz.git) ;;
  *) echo "STOP: origin points to unexpected repository: $REMOTE" >&2; exit 1 ;;
esac
[[ "$(git -C "$REPO" branch --show-current)" == "main" ]] || { echo "STOP: local branch is not main" >&2; exit 1; }
if [[ -n "$(git -C "$REPO" status --porcelain)" ]]; then
  echo 'STOP: local repository has uncommitted changes; no files have been replaced.' >&2
  git -C "$REPO" status --short
  exit 1
fi

printf 'Running package checks (no Git changes)...\n'
(
  cd "$PKG"
  python3 scripts/validate_site.py
  node scripts/test_studio.mjs
  node scripts/test_flow_v28.mjs
  for file in docs/studio-flow-engine.js docs/studio-flow-ui.js docs/studio-engine.js docs/studio.js; do node --check "$file"; done
)
printf '\nFetching only remote main with the existing Git repository (NO CLONE)...\n'
git -C "$REPO" fetch --no-tags origin main
LOCAL_SHA="$(git -C "$REPO" rev-parse main)"
REMOTE_SHA="$(git -C "$REPO" rev-parse refs/remotes/origin/main)"
if [[ "$REMOTE_SHA" != "$EXPECTED_V27" || "$LOCAL_SHA" != "$EXPECTED_V27" ]]; then
  echo 'STOP: main is not at the verified V27 baseline. No repository files changed.' >&2
  echo "  expected V27: $EXPECTED_V27" >&2
  echo "  local main  : $LOCAL_SHA" >&2
  echo "  origin/main : $REMOTE_SHA" >&2
  echo 'Please share this output before attempting a new version.' >&2
  exit 1
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/portfolio-v28.XXXXXX")"
cleanup() {
  cd "$PKG" || true
  git -C "$REPO" worktree remove --force "$WORK/repo" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
printf '\nCreating a temporary Git worktree from locally available V27 files...\n'
git -C "$REPO" worktree add --quiet --detach "$WORK/repo" "$REMOTE_SHA"
TARGET="$WORK/repo"
mkdir -p "$TARGET/docs" "$TARGET/assets/banners" "$TARGET/assets/logos" "$TARGET/scripts" "$TARGET/.github/workflows"
rsync -a --delete "$PKG/docs/" "$TARGET/docs/"
rsync -a "$PKG/assets/banners/" "$TARGET/assets/banners/"
rsync -a "$PKG/assets/logos/" "$TARGET/assets/logos/"
for file in README.md scripts/validate_site.py scripts/push_v28.sh scripts/test_studio.mjs scripts/test_flow_v28.mjs .github/workflows/deploy-pages.yml; do
  cp "$PKG/$file" "$TARGET/$file"
done

printf '\nValidating the actual merged GitHub Pages tree...\n'
(
  cd "$TARGET"
  python3 scripts/validate_site.py
  node scripts/test_studio.mjs
  node scripts/test_flow_v28.mjs
  for file in docs/i18n.js docs/lab.js docs/app.js docs/globe.js docs/studio.js docs/studio-engine.js docs/studio-flow-ui.js docs/studio-flow-engine.js; do node --check "$file"; done
)
git -C "$TARGET" add -A -- README.md docs assets/banners assets/logos scripts/push_v28.sh scripts/validate_site.py scripts/test_studio.mjs scripts/test_flow_v28.mjs .github/workflows/deploy-pages.yml
git -C "$TARGET" diff --cached --check
if git -C "$TARGET" diff --cached --quiet; then
  echo 'V28 files are already identical to the target branch. No commit needed.'
  exit 0
fi
printf '\nExactly these V28 file changes will be published:\n'
GIT_PAGER=cat git -C "$TARGET" diff --cached --stat
printf '\nPublish verified V28 to %s main? [y/N]: ' "$REPO_NAME"
read -r answer
case "$answer" in
  y|Y|yes|YES) ;;
  *) echo 'Canceled safely. No changes to GitHub or local main.'; exit 0 ;;
esac

[[ -n "$(git -C "$TARGET" config user.name || true)" && -n "$(git -C "$TARGET" config user.email || true)" ]] || {
  echo 'STOP: Git author name/email missing. Configure git user.name and user.email first.' >&2
  exit 1
}
printf '\nCommitting V28 in the temporary worktree...\n'
git -C "$TARGET" commit -m 'Upgrade portfolio V28 with interactive workflow observability'
printf '\nPushing V28 (fast-forward only, no force push)...\n'
git -C "$TARGET" push origin HEAD:refs/heads/main
printf '\nSynchronizing your original Developer checkout (fast-forward only)...\n'
git -C "$REPO" pull --ff-only origin main
printf '\nV28 PUSH SUCCESSFUL. Original main is updated. Old stashes are untouched.\n'
git -C "$REPO" log -1 --oneline
printf 'Site: https://kobrymoataz.github.io/kobrymoataz/\n'
