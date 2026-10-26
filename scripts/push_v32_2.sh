#!/usr/bin/env bash
# V32.2 safe publisher: detached worktree, exact source version, preserved history/stashes.
set -euo pipefail
PKG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$HOME/Developer/kobrymoataz}"
EXPECTED_V32_1='9a13f3950abe74f800248287ac4382e6747dc82e'
RELEASE_MESSAGE='Launch V32.2 incident casebook, diagnostic timeline and recovery'
for tool in git rsync node python3; do
 command -v "$tool" >/dev/null 2>&1 || { echo "STOP: Install $tool before publishing." >&2; exit 1; }
done
[[ -d "$REPO/.git" ]] || { echo "STOP: Missing local checkout $REPO" >&2; exit 1; }
[[ "$(git -C "$REPO" branch --show-current)" == main ]] || { echo 'STOP: Local checkout must be on main.' >&2; exit 1; }
REMOTE="$(git -C "$REPO" remote get-url origin)"
case "$REMOTE" in
 https://github.com/kobrymoataz/kobrymoataz|https://github.com/kobrymoataz/kobrymoataz.git|git@github.com:kobrymoataz/kobrymoataz|git@github.com:kobrymoataz/kobrymoataz.git) ;;
 *) echo "STOP: Unrecognized Git remote $REMOTE" >&2; exit 1;;
esac
if [[ -n "$(git -C "$REPO" status --porcelain)" ]]; then
 echo 'STOP: Local repository has unsaved changes. Nothing replaced.' >&2
 git -C "$REPO" status --short; exit 1
fi
validate(){
 (cd "$1";
 python3 scripts/validate_site.py;
 for test in test_studio.mjs test_flow_v28.mjs test_perspective_v29.mjs test_trustops_v30.mjs test_repo_audit_v30_2.mjs test_automation_v31.mjs test_quality_v31_1.mjs test_security_evidence_v31_2.mjs test_experience_v32.mjs test_systems_v32_1.mjs test_incidents_v32_2.mjs; do node "scripts/$test"; done;
 for js in docs/i18n.js docs/app.js docs/lab.js docs/globe.js docs/perspective.js docs/studio.js docs/studio-engine.js docs/studio-flow-ui.js docs/studio-flow-engine.js docs/trustops.js docs/trustops-core.mjs docs/repo-audit.js docs/repo-audit-core.mjs docs/automation.js docs/automation-core.mjs docs/security-evidence-core.mjs docs/experience-v32.js docs/systems.js docs/systems-core.mjs docs/systems-incidents-core.mjs; do node --check "$js"; done)
}
printf '\nRunning V32.2 checks before any remote operations...\n'
validate "$PKG"
printf '\nChecking remote main without cloning...\n'
git -C "$REPO" fetch --no-tags origin main
REMOTE_SHA="$(git -C "$REPO" rev-parse refs/remotes/origin/main)"
LOCAL_SHA="$(git -C "$REPO" rev-parse main)"
if [[ "$REMOTE_SHA" != "$EXPECTED_V32_1" ]]; then
 if [[ "$(git -C "$REPO" log -1 --format=%s "$REMOTE_SHA")" == "$RELEASE_MESSAGE" ]]; then
  echo 'V32.2 is already on main; syncing your local copy (fast forward only).'
  git -C "$REPO" pull --ff-only origin main; exit 0
 fi
 echo 'STOP: GitHub main changed since V32.1. Nothing published.' >&2
 echo "Expected V32.1 $EXPECTED_V32_1, received $REMOTE_SHA" >&2
 exit 1
fi
if ! git -C "$REPO" merge-base --is-ancestor "$LOCAL_SHA" "$REMOTE_SHA"; then
 echo 'STOP: Local main diverged; no changes made.' >&2; exit 1
fi
WORK="$(mktemp -d "${TMPDIR:-/tmp}/portfolio-v32-2.XXXXXX")"
cleanup(){
 cd "$PKG" || true
 git -C "$REPO" worktree remove --force "$WORK/repo" >/dev/null 2>&1 || true
 rm -rf "$WORK"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
git -C "$REPO" worktree add --quiet --detach "$WORK/repo" "$REMOTE_SHA"
TARGET="$WORK/repo"
mkdir -p "$TARGET/docs" "$TARGET/assets/banners" "$TARGET/assets/logos" "$TARGET/scripts" "$TARGET/.github/workflows"
rsync -a --delete "$PKG/docs/" "$TARGET/docs/"
rsync -a "$PKG/scripts/" "$TARGET/scripts/"
rsync -a "$PKG/assets/banners/" "$TARGET/assets/banners/"
rsync -a "$PKG/assets/logos/" "$TARGET/assets/logos/"
cp -p "$PKG/README.md" "$TARGET/README.md"
cp -p "$PKG/.github/workflows/deploy-pages.yml" "$TARGET/.github/workflows/deploy-pages.yml"
printf '\nValidating exact isolated checkout...\n'
validate "$TARGET"
git -C "$TARGET" add -A -- README.md docs scripts assets/banners assets/logos .github/workflows/deploy-pages.yml
git -C "$TARGET" diff --cached --check
if git -C "$TARGET" diff --cached --quiet; then echo 'No changes to publish.';exit 0;fi
printf '\nV32.2 changes to publish:\n'
GIT_PAGER=cat git -C "$TARGET" diff --cached --stat
printf '\nPublish V32.2 to kobrymoataz/kobrymoataz main? [y/N]: '
read -r ANSWER
case "$ANSWER" in y|Y|yes|YES) ;; *) echo 'Canceled; remote and local checkout unchanged.'; exit 0;; esac
if [[ -z "$(git -C "$TARGET" config user.name || true)" || -z "$(git -C "$TARGET" config user.email || true)" ]]; then
 echo 'STOP: Configure Git name and email before publishing.' >&2; exit 1
fi
git -C "$TARGET" commit -m "$RELEASE_MESSAGE"
git -C "$TARGET" push origin HEAD:refs/heads/main
printf '\nV32.2 successfully pushed; updating local checkout without rewriting history.\n'
if ! git -C "$REPO" pull --ff-only origin main; then
 echo 'Remote push succeeded, local sync failed; run git pull --ff-only origin main.' >&2
fi
git -C "$TARGET" log -1 --oneline
printf 'Website: https://kobrymoataz.github.io/kobrymoataz/\n'
