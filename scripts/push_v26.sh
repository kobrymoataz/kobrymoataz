#!/usr/bin/env bash
# Safely publish V26 from a clean local checkout, preserving branch history.
set -euo pipefail
PKG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$HOME/Developer/kobrymoataz}"
REMOTE='https://github.com/kobrymoataz/kobrymoataz.git'
for tool in git rsync python3 node; do command -v "$tool" >/dev/null 2>&1 || { printf 'Missing dependency: %s\n' "$tool" >&2; exit 1; }; done
[[ -f "$PKG/docs/lab.js" && -f "$PKG/scripts/validate_site.py" && -f "$PKG/README.md" ]] || { echo 'Package is incomplete.' >&2; exit 1; }
mkdir -p "$(dirname "$REPO")"
if [[ ! -d "$REPO/.git" ]]; then
  [[ ! -e "$REPO" ]] || { echo 'Existing path is not a Git repository.' >&2; exit 1; }
  git clone "$REMOTE" "$REPO"
fi
cd "$REPO"
origin="$(git remote get-url origin)"
case "$origin" in
  *github.com:kobrymoataz/kobrymoataz.git|*github.com/kobrymoataz/kobrymoataz.git|*github.com/kobrymoataz/kobrymoataz) ;;
  *) echo "Wrong repository origin: $origin" >&2; exit 1;;
esac
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Uncommitted changes detected. Nothing replaced. Commit, stash or back up your work first.' >&2
  git status --short
  exit 1
fi
git switch main
git pull --ff-only origin main
mkdir -p docs assets/banners assets/logos scripts .github/workflows
rsync -a --delete "$PKG/docs/" "$REPO/docs/"
rsync -a "$PKG/assets/banners/" "$REPO/assets/banners/"
rsync -a "$PKG/assets/logos/" "$REPO/assets/logos/"
cp "$PKG/README.md" "$REPO/README.md"
cp "$PKG/scripts/validate_site.py" "$REPO/scripts/validate_site.py"
cp "$PKG/scripts/push_v26.sh" "$REPO/scripts/push_v26.sh"
cp "$PKG/.github/workflows/deploy-pages.yml" "$REPO/.github/workflows/deploy-pages.yml"
python3 scripts/validate_site.py
for js in docs/i18n.js docs/lab.js docs/app.js docs/globe.js; do node --check "$js"; done
git add -A -- README.md assets/banners assets/logos docs scripts/validate_site.py scripts/push_v26.sh .github/workflows/deploy-pages.yml
git diff --cached --check
if git diff --cached --quiet; then echo 'Already current. No commit needed.'; exit 0; fi
printf '\nV26 changes staged:\n'
GIT_PAGER=cat git diff --cached --stat
printf '\nPush V26 to main? [y/N]: '
read -r response
case "$response" in y|Y|yes|YES) ;; *) echo 'Canceled. Changes remain staged locally; no commit/push performed.'; exit 0;; esac
git commit -m 'Upgrade portfolio V26 with persistent browser engineering workstation'
git push origin main
printf '\nPushed V26. GitHub Pages remains main /docs.\nhttps://kobrymoataz.github.io/kobrymoataz/\n'
