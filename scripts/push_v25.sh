#!/usr/bin/env bash
# V25 release: preserve git history, refuse dirty repositories, validate before commit.
set -euo pipefail
PKG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$HOME/Developer/kobrymoataz}"
REMOTE="https://github.com/kobrymoataz/kobrymoataz.git"
for tool in git rsync python3 node; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing required tool: $tool" >&2; exit 1; }
done
[[ -f "$PKG/README.md" && -f "$PKG/docs/index.html" && -f "$PKG/scripts/validate_site.py" ]] || { echo 'ZIP package is incomplete.' >&2; exit 1; }
mkdir -p "$(dirname "$REPO")"
if [[ ! -d "$REPO/.git" ]]; then
  [[ ! -e "$REPO" ]] || { echo "Target exists but is not a Git repository: $REPO" >&2; exit 1; }
  git clone "$REMOTE" "$REPO"
fi
cd "$REPO"
origin="$(git remote get-url origin)"
case "$origin" in
  *github.com:kobrymoataz/kobrymoataz.git|*github.com/kobrymoataz/kobrymoataz|*github.com/kobrymoataz/kobrymoataz.git) ;;
  *) echo "Unexpected origin $origin, refusing update." >&2; exit 1;;
esac
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Uncommitted changes detected. No files were replaced. Preserve or commit your work first.' >&2
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
cp "$PKG/scripts/push_v25.sh" "$REPO/scripts/push_v25.sh"
cp "$PKG/.github/workflows/deploy-pages.yml" "$REPO/.github/workflows/deploy-pages.yml"
python3 scripts/validate_site.py
for js in docs/i18n.js docs/lab.js docs/app.js docs/globe.js; do node --check "$js"; done
git add -A -- README.md assets/banners assets/logos docs scripts/validate_site.py scripts/push_v25.sh .github/workflows/deploy-pages.yml
git diff --cached --check
if git diff --cached --quiet; then echo 'Already up to date. Nothing to commit.'; exit 0; fi
printf '\nChanges prepared for V25:\n'
git diff --cached --stat
printf '\nPush V25 to main? [y/N]: '
read -r response
case "$response" in y|Y|yes|YES) ;; *) echo 'Canceled. Prepared edits remain in your local repository, not on GitHub.'; exit 0;; esac
git commit -m 'Upgrade portfolio V25 with macOS and Linux terminal labs, live timer and visual refinements'
git push origin main
printf '\nV25 pushed. GitHub Pages source: main /docs.\nhttps://kobrymoataz.github.io/kobrymoataz/\n'
