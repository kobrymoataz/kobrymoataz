#!/usr/bin/env bash
# V31.1 verified publisher: reuse local Git history in an isolated worktree.
# Never clone the repo, rewrite remote history, drop stashes, or overwrite dirty local files.
set -euo pipefail
PKG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$HOME/Developer/kobrymoataz}"
EXPECTED_V31='fdb7c1ec06356ea1311edc5609ae9f6a4f2fd777'
RELEASE_MESSAGE='Refine V31.1 portfolio accessibility, editing safety and lazy studio loading'

for tool in git rsync node python3; do
  command -v "$tool" >/dev/null 2>&1 || { echo "STOP: Required command not installed: $tool" >&2; exit 1; }
done
[[ -d "$REPO/.git" ]] || { echo "STOP: Git repository not found: $REPO" >&2; exit 1; }
[[ "$(git -C "$REPO" branch --show-current)" == 'main' ]] || { echo 'STOP: Local checkout must be on main.' >&2; exit 1; }
REMOTE="$(git -C "$REPO" remote get-url origin)"
case "$REMOTE" in
  https://github.com/kobrymoataz/kobrymoataz|https://github.com/kobrymoataz/kobrymoataz.git|git@github.com:kobrymoataz/kobrymoataz|git@github.com:kobrymoataz/kobrymoataz.git) ;;
  *) echo "STOP: Unexpected origin: $REMOTE" >&2; exit 1 ;;
esac
if [[ -n "$(git -C "$REPO" status --porcelain)" ]]; then
  echo 'STOP: Your Developer checkout has uncommitted changes. No changes made.' >&2
  git -C "$REPO" status --short
  exit 1
fi

for f in README.md docs/index.html docs/trustops.js docs/trustops-core.mjs docs/trustops.css docs/repo-audit.js docs/repo-audit-core.mjs docs/repo-audit.css scripts/validate_site.py scripts/test_studio.mjs scripts/test_flow_v28.mjs scripts/test_perspective_v29.mjs scripts/test_trustops_v30.mjs scripts/test_repo_audit_v30_2.mjs scripts/test_automation_v31.mjs scripts/test_quality_v31_1.mjs scripts/qa_v31_1_browser.py docs/automation.js docs/automation-core.mjs docs/automation.css scripts/push_v28.sh scripts/push_v29.sh scripts/push_v30_1.sh scripts/push_v30_2.sh scripts/push_v31.sh scripts/push_v31_1.sh .github/workflows/deploy-pages.yml; do
  [[ -f "$PKG/$f" ]] || { echo "STOP: Missing V31.0 package file: $f" >&2; exit 1; }
done

validate() {
  (
    cd "$1"
    python3 scripts/validate_site.py
    node scripts/test_studio.mjs
    node scripts/test_flow_v28.mjs
    node scripts/test_perspective_v29.mjs
    node scripts/test_trustops_v30.mjs
    node scripts/test_repo_audit_v30_2.mjs
    node scripts/test_automation_v31.mjs
    node scripts/test_quality_v31_1.mjs
    for file in docs/i18n.js docs/lab.js docs/app.js docs/globe.js docs/perspective.js docs/studio.js docs/studio-engine.js docs/studio-flow-ui.js docs/studio-flow-engine.js docs/trustops.js docs/trustops-core.mjs docs/repo-audit.js docs/repo-audit-core.mjs docs/automation.js docs/automation-core.mjs; do
      node --check "$file"
    done
  )
}

printf '\nValidating V31.1 source package...\n'
validate "$PKG"
printf '\nFetching GitHub main without cloning...\n'
git -C "$REPO" fetch --no-tags origin main
LOCAL_SHA="$(git -C "$REPO" rev-parse main)"
REMOTE_SHA="$(git -C "$REPO" rev-parse refs/remotes/origin/main)"
if [[ "$REMOTE_SHA" != "$EXPECTED_V31" ]]; then
  if [[ "$(git -C "$REPO" log -1 --format=%s "$REMOTE_SHA")" == "$RELEASE_MESSAGE" ]]; then
    echo 'V31.1 already appears on GitHub main. Checking your local checkout...'
    git -C "$REPO" pull --ff-only origin main
    git -C "$REPO" log -1 --oneline
    exit 0
  fi
  echo 'STOP: Remote main no longer matches the verified V31.0 starting point.' >&2
  echo "  expected V31.0: $EXPECTED_V31" >&2
  echo "  actual remote : $REMOTE_SHA" >&2
  echo 'Inspect GitHub before continuing; no publication attempted.' >&2
  exit 1
fi
if ! git -C "$REPO" merge-base --is-ancestor "$LOCAL_SHA" "$REMOTE_SHA"; then
  echo 'STOP: Local main has diverged from remote. No publication attempted.' >&2
  echo "  local main: $LOCAL_SHA" >&2
  echo "  remote   : $REMOTE_SHA" >&2
  exit 1
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/portfolio-v31-1.XXXXXX")"
cleanup() {
  cd "$PKG" || true
  git -C "$REPO" worktree remove --force "$WORK/repo" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
printf '\nPreparing isolated V31.1 worktree...\n'
git -C "$REPO" worktree add --quiet --detach "$WORK/repo" "$REMOTE_SHA"
TARGET="$WORK/repo"
mkdir -p "$TARGET/docs" "$TARGET/assets/banners" "$TARGET/assets/logos" "$TARGET/scripts" "$TARGET/.github/workflows"
rsync -a --delete "$PKG/docs/" "$TARGET/docs/"
rsync -a "$PKG/assets/banners/" "$TARGET/assets/banners/"
rsync -a "$PKG/assets/logos/" "$TARGET/assets/logos/"
for f in README.md scripts/validate_site.py scripts/test_studio.mjs scripts/test_flow_v28.mjs scripts/test_perspective_v29.mjs scripts/test_trustops_v30.mjs scripts/test_repo_audit_v30_2.mjs scripts/test_automation_v31.mjs scripts/test_quality_v31_1.mjs scripts/qa_v31_1_browser.py scripts/qa_perspective_v29.py scripts/qa_trustops_v30.py scripts/push_v28.sh scripts/push_v29.sh scripts/push_v30_1.sh scripts/push_v30_2.sh scripts/push_v31.sh scripts/push_v31_1.sh .github/workflows/deploy-pages.yml; do
  cp -p "$PKG/$f" "$TARGET/$f"
done

printf '\nValidating exact proposed publication...\n'
validate "$TARGET"
git -C "$TARGET" add -A -- README.md docs assets/banners assets/logos scripts/validate_site.py scripts/test_studio.mjs scripts/test_flow_v28.mjs scripts/test_perspective_v29.mjs scripts/test_trustops_v30.mjs scripts/test_repo_audit_v30_2.mjs scripts/test_automation_v31.mjs scripts/test_quality_v31_1.mjs scripts/qa_v31_1_browser.py scripts/qa_perspective_v29.py scripts/qa_trustops_v30.py scripts/push_v28.sh scripts/push_v29.sh scripts/push_v30_1.sh scripts/push_v30_2.sh scripts/push_v31.sh scripts/push_v31_1.sh .github/workflows/deploy-pages.yml
git -C "$TARGET" diff --cached --check
if git -C "$TARGET" diff --cached --quiet; then
  echo 'GitHub main already has these V31 files; nothing to push.'
  exit 0
fi
printf '\nProposed V31.1 changes:\n'
GIT_PAGER=cat git -C "$TARGET" diff --cached --stat
printf '\nPublish V31.1 to kobrymoataz/kobrymoataz main? [y/N]: '
read -r ANSWER
case "$ANSWER" in y|Y|yes|YES) ;; *) echo 'Canceled; GitHub and your checkout remain unchanged.'; exit 0 ;; esac
if [[ -z "$(git -C "$TARGET" config user.name || true)" || -z "$(git -C "$TARGET" config user.email || true)" ]]; then
  echo 'STOP: Configure Git author name and email, then rerun.' >&2
  exit 1
fi
printf '\nCommitting in temporary worktree...\n'
git -C "$TARGET" commit -m "$RELEASE_MESSAGE"
printf '\nPushing main, fast-forward only...\n'
git -C "$TARGET" push origin HEAD:refs/heads/main
printf '\nV31.1 successfully pushed to GitHub main.\n'
if git -C "$REPO" pull --ff-only origin main; then
  printf 'Original checkout updated safely; old stashes preserved.\n'
else
  printf 'WARNING: GitHub push succeeded but local sync failed. Run git pull --ff-only origin main manually.\n' >&2
fi
git -C "$TARGET" log -1 --oneline
printf 'Website: https://kobrymoataz.github.io/kobrymoataz/?automation=1\n'
