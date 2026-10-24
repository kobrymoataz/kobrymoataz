#!/usr/bin/env bash
# Publish V24 to kobrymoataz profile without deleting other repos or changing Pages mode.
set -euo pipefail
PACK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$HOME/Developer/kobrymoataz}"
REMOTE='https://github.com/kobrymoataz/kobrymoataz.git'
for tool in git rsync python3 node; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing $tool. Install it first." >&2; exit 1; }
done
for file in "$PACK/README.md" "$PACK/docs/index.html" "$PACK/scripts/validate_site.py"; do
  [[ -f "$file" ]] || { echo "Missing package file: $file" >&2; exit 1; }
done
mkdir -p "$(dirname "$REPO")"
if [[ ! -d "$REPO/.git" ]]; then
  [[ ! -e "$REPO" ]] || { echo "Target exists but is not a Git repository: $REPO" >&2; exit 1; }
  git clone "$REMOTE" "$REPO"
fi
cd "$REPO"
origin="$(git remote get-url origin)"
case "$origin" in
  *github.com:kobrymoataz/kobrymoataz.git|*github.com/kobrymoataz/kobrymoataz|*github.com/kobrymoataz/kobrymoataz.git) ;;
  *) echo "Wrong Git remote ($origin). Aborting." >&2; exit 1;;
esac
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Repository contains uncommitted changes; nothing was replaced.' >&2
  git status --short
  exit 1
fi
git switch main
git pull --ff-only origin main
# Replaces only the old GitHub Pages website. Do not delete Git history or other projects.
mkdir -p docs assets/banners assets/logos scripts .github/workflows
rsync -a --delete "$PACK/docs/" "$REPO/docs/"
rsync -a "$PACK/assets/banners/" "$REPO/assets/banners/"
rsync -a "$PACK/assets/logos/" "$REPO/assets/logos/"
cp "$PACK/README.md" "$REPO/README.md"
cp "$PACK/scripts/validate_site.py" "$REPO/scripts/validate_site.py"
cp "$PACK/.github/workflows/deploy-pages.yml" "$REPO/.github/workflows/deploy-pages.yml"
cp "$PACK/scripts/push_v24.sh" "$REPO/scripts/push_v24.sh"
python3 scripts/validate_site.py
for js in docs/i18n.js docs/lab.js docs/app.js docs/globe.js; do node --check "$js"; done
git add -A -- README.md assets/banners assets/logos docs scripts/validate_site.py scripts/push_v24.sh .github/workflows/deploy-pages.yml
git diff --cached --check
if git diff --cached --quiet; then echo 'No updates needed.'; exit 0; fi
echo; git diff --cached --stat
echo
printf 'Publish V24 to GitHub main? [y/N]: '
read -r reply
case "$reply" in y|Y|yes|YES) ;; *) git reset --quiet; echo 'Push canceled; files remain updated locally.'; exit 0;; esac
git commit -m 'Refine portfolio V24: private CV request, unique visuals and terminal simulator v3'
git push origin main
echo
printf 'Updated GitHub profile and Pages source main/docs.\nOpen: https://kobrymoataz.github.io/kobrymoataz/\n'
