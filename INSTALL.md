# Profile installation (kobrymoataz)

This package is a complete GitHub Profile README. It is already configured for the public repository `kobrymoataz/kobrymoataz`.

## Upload it in GitHub's web interface

1. Open: https://github.com/kobrymoataz/kobrymoataz
2. Select **uploading an existing file** (or Add file > Upload files).
3. Extract the ZIP first; upload the **contents** of the `kobrymoataz-profile-v2` folder, not the ZIP or its containing folder.
4. Preserve the `README.md`, `assets/`, `scripts/` and `.github/workflows/` paths. **Do not omit the hidden `.github` folder.**
5. Commit to the `main` branch.
6. Open https://github.com/kobrymoataz to view the profile.

Note: Browser-based folder uploads vary. If your browser does not keep folders or hidden files, use Git from the command line instead (below), or create the files in their matching paths directly on GitHub.

## Reliable command-line upload (recommended for hidden files)

Run the following in the **extracted** package folder:

```bash
git clone https://github.com/kobrymoataz/kobrymoataz.git
cp -R README.md assets scripts .github .gitignore INSTALL.md kobrymoataz/
cd kobrymoataz
git add README.md assets scripts .github .gitignore INSTALL.md
git commit -m "Launch professional animated profile"
git push origin main
```

On Windows, copy the files and folders into the cloned repository using File Explorer with hidden items enabled; then run the last four Git commands.

## Live 3D contribution map

The visual starts as a clearly labeled placeholder. It is deliberately NOT fabricated activity.

The workflow `.github/workflows/profile.yml`:
- Runs automatically on first push to `main` and once per day.
- Can also be started manually via **Actions > Update 3D contribution map > Run workflow**.
- Uses only the repository's built-in `GITHUB_TOKEN`, not a personal access token.
- Reads the public GitHub contribution calendar and commits the generated SVG into `assets/contributions-3d.svg`.

If GitHub Actions are disabled, enable them in the repository. If your repository policy blocks pushes by GitHub Actions, allow the workflow's `contents: write` permission or configure workflow permissions accordingly in Settings > Actions > General. No private keys or manual tokens need to be placed in the README.

## Editing the presentation later

- `README.md` controls content and links.
- `assets/hero.svg` and `assets/leadership.svg` are the original animated SVG artworks.
- `assets/hero-motion.gif` and `assets/leadership-motion.gif` are their GitHub-compatible animated display files.
- `assets/stack.svg` is the language and tooling graphic.
- `scripts/render_contributions.py` generates a chart from real GitHub data.

The profile photograph is pulled from the current GitHub avatar using `https://github.com/kobrymoataz.png`, so updating your GitHub avatar also updates the profile photo in the README.

### Animation note

GitHub can display SVG graphics, but browser, proxy and sanitization behavior can make SVG animation inconsistent. For reliable motion, the README uses animated GIFs while keeping the original animated SVG sources in the package. The contribution graph is a standard, dynamically generated SVG.

### Verification

A second workflow (`.github/workflows/quality.yml`) verifies linked assets, SVG validity, GIF signatures and Python syntax on changes. Run the same check locally with `python3 scripts/validate_profile.py`.

### Privacy & maintenance

Only public details requested for this profile are included. The workflow does not use additional permissions beyond writing the generated file, and it does not require external dependencies.
