#!/usr/bin/env python3
"""Create a true 3D-style GitHub contribution map (stdlib only, no synthetic data)."""
import json
import math
import os
from pathlib import Path
from datetime import date
from html import escape
from urllib.request import Request, urlopen

USER = os.getenv('GH_PROFILE_USER', 'kobrymoataz')
TOKEN = os.getenv('GH_TOKEN') or os.getenv('GITHUB_TOKEN')
OUTPUT = Path(__file__).resolve().parent.parent / 'assets' / 'contributions-3d.svg'

QUERY = """
query ProfileContributions($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays { date contributionCount }
        }
      }
    }
  }
}
"""


def fetch_calendar():
    if not TOKEN:
        raise RuntimeError('GH_TOKEN was not provided. Run the GitHub workflow, which provides GITHUB_TOKEN automatically.')
    payload = json.dumps({'query': QUERY, 'variables': {'login': USER}}).encode('utf-8')
    req = Request('https://api.github.com/graphql', data=payload, headers={
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type': 'application/json',
        'User-Agent': 'kobrymoataz-profile-chart/1.0',
        'Accept': 'application/vnd.github+json',
    }, method='POST')
    with urlopen(req, timeout=25) as res:
        parsed = json.load(res)
    if 'errors' in parsed:
        raise RuntimeError('GitHub GraphQL API errors: ' + json.dumps(parsed['errors']))
    data = parsed.get('data', {}).get('user')
    if not data:
        raise RuntimeError(f'GitHub user {USER!r} not found')
    return data['contributionsCollection']['contributionCalendar']


def polygon(points, fill, stroke='none', width=0, opacity=1):
    coords = ' '.join(f'{x:.1f},{y:.1f}' for x, y in points)
    return f'<polygon points="{coords}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" opacity="{opacity}"/>'


def render(data):
    weeks = data['weeks']
    if not weeks:
        raise RuntimeError('The contribution calendar contains no weeks.')
    total = int(data['totalContributions'])
    width = 1340
    height = 374
    left = 151
    top = 173
    inc_week_x = 19.3
    inc_day_x = -9.2
    inc_day_y = 14.0
    inc_week_y = 0.55
    out = [f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{total} real GitHub contributions over the last year, represented as isometric 3D blocks">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#080E17"/><stop offset="1" stop-color="#101D2B"/></linearGradient><pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#52738F" stroke-opacity=".12"/></pattern></defs>
<rect width="{width}" height="{height}" rx="20" fill="url(#bg)"/><rect width="{width}" height="{height}" rx="20" fill="url(#grid)"/>
<rect x="1" y="1" width="{width-2}" height="{height-2}" rx="19" fill="none" stroke="#38546B" stroke-width="2"/>
<path d="M43 81H1297" stroke="#41607A" stroke-opacity=".5"/>
<g font-family="DejaVu Sans Mono,monospace" letter-spacing="2"><text x="44" y="43" font-size="18" fill="#A9D9F2">GITHUB / LIVE CONTRIBUTIONS</text><text x="1295" y="43" text-anchor="end" font-size="14" fill="#7CACC8">REAL ACTIVITY  /  3D</text></g>
<text x="44" y="70" font-family="DejaVu Sans,Arial,sans-serif" font-size="16" fill="#B1C2D5">{total:,} contributions over the last year</text>
"""]
    for j, week in enumerate(weeks):
        days = week.get('contributionDays', [])
        if days and (j == 0 or not weeks[j-1].get('contributionDays') or days[0]['date'][:7] != weeks[j-1]['contributionDays'][0]['date'][:7]):
            if days:
                try:
                    m = date.fromisoformat(days[0]['date']).strftime('%b').upper()
                    lx = left + j * inc_week_x
                    out.append(f'<text x="{lx:.1f}" y="108" fill="#6F95B0" font-family="DejaVu Sans Mono,monospace" font-size="11" letter-spacing="1.3">{m}</text>')
                except ValueError:
                    pass

    # Draw back-to-front to keep closer cubes in front where they overlap.
    blocks = []
    for j, week in enumerate(weeks):
        for k, d in enumerate(week.get('contributionDays', [])):
            count = max(0, int(d['contributionCount']))
            x = left + j * inc_week_x + k * inc_day_x
            y = top + j * inc_week_y + k * inc_day_y
            height_bar = 2.0 if count == 0 else min(35.0, 6.0 + math.sqrt(count) * 7.2)
            # diamond top center is (x,y-height_bar)
            hw, hh = 8.6, 4.25
            a=(x,y-height_bar-hh)
            b=(x+hw,y-height_bar)
            c=(x,y-height_bar+hh)
            dpt=(x-hw,y-height_bar)
            lowc=(x,y+hh)
            lowb=(x+hw,y)
            lowd=(x-hw,y)
            if count==0:
                top_fill='#233245';left_fill='#182637';right_fill='#1C2E41'
            elif count<=2:
                top_fill='#36749A';left_fill='#215270';right_fill='#285F82'
            elif count<=5:
                top_fill='#62C2E4';left_fill='#317B9F';right_fill='#439ABD'
            else:
                top_fill='#B7F3FA';left_fill='#4FAFC4';right_fill='#78DCEB'
            blocks.append((y, polygon([dpt,c,lowc,lowd],left_fill)+polygon([c,b,lowb,lowc],right_fill)+polygon([a,b,c,dpt],top_fill)))
    for _, s in sorted(blocks,key=lambda x:x[0]):
        out.append(s)
    out.append("""<path d="M44 330H1298" stroke="#41607A" opacity=".45"/><g font-family="DejaVu Sans Mono,monospace" font-size="12" letter-spacing=".9" fill="#849FB7"><text x="44" y="357">SOURCE: GITHUB CONTRIBUTION CALENDAR</text><text x="1296" y="357" text-anchor="end">AUTO REFRESH / DAILY</text></g></svg>""")
    return '\n'.join(out)


def main():
    calendar = fetch_calendar()
    svg = render(calendar)
    OUTPUT.write_text(svg, encoding='utf-8')
    print(f'Updated {OUTPUT} with {calendar["totalContributions"]} real contributions.')


if __name__ == '__main__':
    main()
