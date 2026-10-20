from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parent.parent
errors = []
files = ['README.md', 'INSTALL.md', 'site/index.html', 'site/src/App.tsx', 'site/src/components/OrbScene.tsx', 'site/src/styles.css', 'site/src/assets/portrait.webp', 'assets/github-hero.webp', '.github/workflows/deploy-portfolio.yml', 'site/scripts/verify-dist.mjs']
for filename in files:
    if not (root / filename).is_file(): errors.append(f'Missing {filename}')
readme = (root / 'README.md').read_text(encoding='utf8') if (root/'README.md').exists() else ''
for src in re.findall(r'<img[^>]+src="([^"]+)"', readme):
    if src.startswith('./') and not (root/src[2:]).is_file(): errors.append('Missing README image '+src)
if (root / 'site/src/assets/portrait.webp').exists():
    p = root/'site/src/assets/portrait.webp'
    if p.stat().st_size < 10000: errors.append('Portrait unexpectedly small')
if 'base: "/kobrymoataz/"' not in (root/'site/vite.config.ts').read_text().replace("'",'"'):
    errors.append('Missing /kobrymoataz/ Vite base')
if (root/'docs').exists(): errors.append('Legacy /docs found: site must deploy from GitHub Actions')
if 'assets/hero.gif' in (root/'site/src/App.tsx').read_text(): errors.append('Legacy animated banner referenced')
for f in (root/'site/public').glob('*.svg'):
    try: ET.parse(f)
    except ET.ParseError as exc: errors.append(f'Invalid SVG {f}: {exc}')
print('Validation checks:', len(files), 'files and README/image/base-path verification')
if errors:
    for err in errors: print('ERROR:',err,file=sys.stderr)
    sys.exit(1)
print('PASS: All required repository files and assets exist.')
