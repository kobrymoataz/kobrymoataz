#!/usr/bin/env bash
# V30.1 safe publisher: use the existing Git checkout and a temporary worktree.
# Never clone the entire repo, force-push, delete stashes, or overwrite local changes.
set -euo pipefail
PKG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$HOME/Developer/kobrymoataz}"
EXPECTED_V29='2c648e573aff702382623ceef801a2510f1a5925'
EXPECTED_REPO='kobrymoataz/kobrymoataz'
RELEASE_MESSAGE='Launch TrustOps Studio V30.1 public DNS audit and evidence reports'

for tool in git rsync node python3; do
  command -v "$tool" >/dev/null 2>&1 || { echo "STOP: Missing required command: $tool" >&2; exit 1; }
done
[[ -d "$REPO/.git" ]] || { echo "STOP: Local repository not found: $REPO" >&2; exit 1; }
[[ "$(git -C "$REPO" branch --show-current)" == 'main' ]] || { echo 'STOP: Local checkout must be on main.' >&2; exit 1; }
REMOTE="$(git -C "$REPO" remote get-url origin)"
case "$REMOTE" in
  https://github.com/kobrymoataz/kobrymoataz|https://github.com/kobrymoataz/kobrymoataz.git|git@github.com:kobrymoataz/kobrymoataz|git@github.com:kobrymoataz/kobrymoataz.git) ;;
  *) echo "STOP: Unexpected origin remote: $REMOTE" >&2; exit 1 ;;
esac
if [[ -n "$(git -C "$REPO" status --porcelain)" ]]; then
  echo 'STOP: Local checkout has uncommitted changes. No files were changed.' >&2
  git -C "$REPO" status --short
  exit 1
fi

for f in README.md docs/index.html docs/trustops.js docs/trustops-core.mjs docs/trustops.css scripts/validate_site.py scripts/test_studio.mjs scripts/test_flow_v28.mjs scripts/test_perspective_v29.mjs scripts/test_trustops_v30.mjs scripts/qa_trustops_v30.py scripts/qa_perspective_v29.py scripts/push_v28.sh scripts/push_v29.sh scripts/push_v30_1.sh .github/workflows/deploy-pages.yml; do
  [[ -f "$PKG/$f" ]] || { echo "STOP: Incomplete V30.1 package: $f" >&2; exit 1; }
done

validate() {
  (
    cd "$1"
    python3 scripts/validate_site.py
    node scripts/test_studio.mjs
    node scripts/test_flow_v28.mjs
    node scripts/test_perspective_v29.mjs
    node scripts/test_trustops_v30.mjs
    for file in docs/i18n.js docs/lab.js docs/app.js docs/globe.js docs/perspective.js docs/studio.js docs/studio-engine.js docs/studio-flow-ui.js docs/studio-flow-engine.js docs/trustops.js docs/trustops-core.mjs; do
      node --check "$file"
    done
  )
}

printf '\nValidating V30.1 source package...\n'
validate "$PKG"

printf '\nChecking current GitHub main (fetch only, without cloning)...\n'
git -C "$REPO" fetch --no-tags origin main
LOCAL_SHA="$(git -C "$REPO" rev-parse main)"
REMOTE_SHA="$(git -C "$REPO" rev-parse refs/remotes/origin/main)"
if [[ "$REMOTE_SHA" != "$EXPECTED_V29" ]]; then
  if [[ "$(git -C "$REPO" log -1 --format=%s "$REMOTE_SHA")" == "$RELEASE_MESSAGE" ]]; then
    printf '\nV30.1 is already on GitHub main. Updating your local checkout, fast-forward only...\n'
    git -C "$REPO" pull --ff-only origin main
    git -C "$REPO" log -1 --oneline
    exit 0
  fi
  echo 'STOP: Remote main is not the verified V29 baseline. Nothing published.' >&2
  echo "  expected V29: $EXPECTED_V29" >&2
  echo "  remote main : $REMOTE_SHA" >&2
  exit 1
fi
if ! git -C "$REPO" merge-base --is-ancestor "$LOCAL_SHA" "$REMOTE_SHA"; then
  echo 'STOP: Local main diverged from remote main. Nothing changed.' >&2
  echo "  local main  : $LOCAL_SHA" >&2
  echo "  remote main : $REMOTE_SHA" >&2
  exit 1
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/portfolio-v30-1.XXXXXX")"
cleanup() {
  cd "$PKG" || true
  git -C "$REPO" worktree remove --force "$WORK/repo" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf '\nPreparing verified V30.1 in a temporary Git worktree...\n'
git -C "$REPO" worktree add --quiet --detach "$WORK/repo" "$REMOTE_SHA"
TARGET="$WORK/repo"
mkdir -p "$TARGET/docs" "$TARGET/assets/banners" "$TARGET/assets/logos" "$TARGET/scripts" "$TARGET/.github/workflows"
rsync -a --delete "$PKG/docs/" "$TARGET/docs/"
rsync -a "$PKG/assets/banners/" "$TARGET/assets/banners/"
rsync -a "$PKG/assets/logos/" "$TARGET/assets/logos/"
for f in README.md scripts/validate_site.py scripts/test_studio.mjs scripts/test_flow_v28.mjs scripts/test_perspective_v29.mjs scripts/test_trustops_v30.mjs scripts/qa_perspective_v29.py scripts/qa_trustops_v30.py scripts/push_v28.sh scripts/push_v29.sh scripts/push_v30_1.sh .github/workflows/deploy-pages.yml; do
  cp "$PKG/$f" "$TARGET/$f"
done

printf '\nValidating exact files that would be deployed...\n'
validate "$TARGET"
git -C "$TARGET" add -A -- README.md docs assets/banners assets/logos scripts/validate_site.py scripts/test_studio.mjs scripts/test_flow_v28.mjs scripts/test_perspective_v29.mjs scripts/test_trustops_v30.mjs scripts/qa_perspective_v29.py scripts/qa_trustops_v30.py scripts/push_v28.sh scripts/push_v29.sh scripts/push_v30_1.sh .github/workflows/deploy-pages.yml
git -C "$TARGET" diff --cached --check
if git -C "$TARGET" diff --cached --quiet; then
  echo 'No changes: remote main already matches V30.1 files.'
  exit 0
fi
printf '\nProposed V30.1 change summary:\n'
GIT_PAGER=cat git -C "$TARGET" diff --cached --stat
printf '\nPublish verified V30.1 to %s main? [y/N]: ' "$EXPECTED_REPO"
read -r ANSWER
case "$ANSWER" in y|Y|yes|YES) ;; *) echo 'Canceled. No changes published.'; exit 0 ;; esac
if [[ -z "$(git -C "$TARGET" config user.name || true)" || -z "$(git -C "$TARGET" config user.email || true)" ]]; then
  echo 'STOP: Git author name/email is not configured. Set git config --global user.name and user.email.' >&2
  exit 1
fi
printf '\nCreating V30.1 commit in temporary worktree...\n'
git -C "$TARGET" commit -m "$RELEASE_MESSAGE"
printf '\nPushing to GitHub main (fast-forward only)...\n'
git -C "$TARGET" push origin HEAD:refs/heads/main
printf '\nUpdating your original checkout (fast-forward only)...\n'
git -C "$REPO" pull --ff-only origin main
printf '\nV30.1 PUSH SUCCESSFUL. Your original checkout is up to date, and stashes were preserved.\n'
git -C "$REPO" log -1 --oneline
printf 'Website: https://kobrymoataz.github.io/kobrymoataz/?trustops=1\n'
