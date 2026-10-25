#!/usr/bin/env bash
# Safely publish V27 from a clean local checkout, preserving branch history.
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
# The approval is requested BEFORE replacing or staging any file.
python3 "$PKG/scripts/validate_site.py"
for js in docs/i18n.js docs/lab.js docs/app.js docs/globe.js docs/studio.js docs/studio-engine.js; do
  node --check "$PKG/$js"
done
printf '\nReady to update the GitHub profile site. Current revision: '
git rev-parse --short HEAD
printf 'Apply and publish V27 to main? [y/N]: '
read -r response
case "$response" in y|Y|yes|YES) ;; *) echo 'Canceled before any files were replaced.'; exit 0;; esac
git pull --ff-only origin main
if [[ -n "$(git status --porcelain)" ]]; then echo 'Checkout became dirty; stop.' >&2; exit 1; fi
mkdir -p docs assets/banners assets/logos scripts .github/workflows
rsync -a --delete "$PKG/docs/" "$REPO/docs/"
rsync -a "$PKG/assets/banners/" "$REPO/assets/banners/"
rsync -a "$PKG/assets/logos/" "$REPO/assets/logos/"
cp "$PKG/README.md" "$REPO/README.md"
cp "$PKG/scripts/validate_site.py" "$REPO/scripts/validate_site.py"
cp "$PKG/scripts/push_v27.sh" "$REPO/scripts/push_v27.sh"
cp "$PKG/scripts/test_studio.mjs" "$REPO/scripts/test_studio.mjs"
cp "$PKG/.github/workflows/deploy-pages.yml" "$REPO/.github/workflows/deploy-pages.yml"
python3 scripts/validate_site.py
node scripts/test_studio.mjs
for js in docs/i18n.js docs/lab.js docs/app.js docs/globe.js docs/studio.js docs/studio-engine.js; do node --check "$js"; done
git add -A -- README.md assets/banners assets/logos docs scripts/validate_site.py scripts/push_v27.sh scripts/test_studio.mjs .github/workflows/deploy-pages.yml
git diff --cached --check
if git diff --cached --quiet; then echo 'Already current. No commit needed.'; exit 0; fi
printf '\nV27 changes staged:\n'
GIT_PAGER=cat git diff --cached --stat
git commit -m 'Upgrade portfolio V27 with functional engineering studio'
git push origin main
printf '\nPushed V27. GitHub Pages remains main /docs.\nhttps://kobrymoataz.github.io/kobrymoataz/\n'
