#!/bin/bash
# Apply the V22 profile package to the profile repository, validate and push.
set -euo pipefail
PACK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$HOME/Developer/kobrymoataz}"
URL="https://github.com/kobrymoataz/kobrymoataz.git"
mkdir -p "$(dirname "$REPO")"
if [[ ! -d "$REPO/.git" ]]; then
  if [[ -e "$REPO" ]]; then echo "Target exists but is not a Git repository: $REPO" >&2;exit 1;fi
  git clone "$URL" "$REPO"
fi
cd "$REPO"
if [[ "$(git remote get-url origin)" != *"kobrymoataz/kobrymoataz"* ]]; then
  if [[ "$(git remote get-url origin)" != *"kobrymoataz/kobrymoataz.git"* ]]; then echo "Wrong origin; aborting." >&2; exit 1;fi
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "You have uncommitted changes. Commit or stash them first; nothing changed." >&2
  git status --short;exit 1
fi
git checkout main
git pull --ff-only origin main
# Intentionally replaces the prior website only, not other repositories or user Git history.
mkdir -p docs assets/banners assets/logos .github/workflows scripts
rsync -a --delete "$PACK/docs/" "$REPO/docs/"
rsync -a "$PACK/assets/banners/" "$REPO/assets/banners/"
rsync -a "$PACK/assets/logos/" "$REPO/assets/logos/"
cp "$PACK/README.md" "$REPO/README.md"
cp "$PACK/.github/workflows/deploy-pages.yml" "$REPO/.github/workflows/deploy-pages.yml"
cp "$PACK/scripts/validate_site.py" "$REPO/scripts/validate_site.py"
cp "$PACK/scripts/push_v22.sh" "$REPO/scripts/push_v22.sh"
python3 scripts/validate_site.py
node --check docs/i18n.js
node --check docs/lab.js
node --check docs/app.js
node --check docs/globe-v22.js
git add README.md assets/banners assets/logos docs scripts/validate_site.py scripts/push_v22.sh .github/workflows/deploy-pages.yml
git diff --cached --check
if git diff --cached --quiet;then echo 'No changes to publish.';exit 0;fi
printf '\nChanges staged:\n';git diff --cached --stat
printf '\nPublishing on main ...\n'
git commit -m "Refine executive portfolio V22 with multilingual lab and 3D globe"
git push origin main
printf '\nPushed. GitHub Pages should publish from main /docs.\n'
