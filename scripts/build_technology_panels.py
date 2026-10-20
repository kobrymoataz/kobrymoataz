#!/usr/bin/env python3
"""Build self-contained SVG tech panels for the GitHub profile README.
No external fonts, scripts or image dependencies are required.
"""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
ASSETS.mkdir(exist_ok=True)

FONT = "Inter, Segoe UI, Arial, sans-serif"
MONO = "ui-monospace, SFMono-Regular, Consolas, monospace"

COMMON_DEFS = '''
<defs>
  <linearGradient id="panel-bg" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#070D19"/><stop offset="0.62" stop-color="#0B1426"/><stop offset="1" stop-color="#0C1B32"/>
  </linearGradient>
  <linearGradient id="cell-bg" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#12233A"/><stop offset="1" stop-color="#0A1628"/>
  </linearGradient>
  <pattern id="points" width="32" height="32" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="2" r="1" fill="#7AA5CA" opacity=".20"/>
  </pattern>
</defs>
'''

def svg_start(h, desc):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="{h}" viewBox="0 0 1280 {h}" role="img" aria-label="{escape(desc, quote=True)}">
{COMMON_DEFS}
<rect x="0" y="0" width="1280" height="{h}" rx="24" fill="url(#panel-bg)"/>
<rect x="0" y="0" width="1280" height="{h}" rx="24" fill="url(#points)"/>
<rect x="1" y="1" width="1278" height="{h-2}" rx="23" fill="none" stroke="#2B4F74" stroke-width="2"/>
<path d="M36 16h152" fill="none" stroke="#8FBFFF" stroke-opacity=".8" stroke-width="3"/>
'''

def text(x, y, value, size=24, fill='#F0F4FB', weight=500, family=FONT, spacing=None):
    a = f' letter-spacing="{spacing}"' if spacing else ''
    return f'<text x="{x}" y="{y}" fill="{fill}" font-family="{family}" font-size="{size}" font-weight="{weight}"{a}>{escape(value)}</text>\n'

# Full premium technology panel
parts = [svg_start(568, 'Languages JavaScript, Python, Java, PHP; frameworks React, Node.js, React Native, REST APIs; data MongoDB, PostgreSQL; GitHub and GitHub Actions')]
parts += [
    text(40, 57, 'TECHNOLOGY STACK', 31, '#F6F9FE', 750, spacing='1.2'),
    text(40, 89, 'Application development  /  Automation  /  Data  /  Delivery', 20, '#A8BCD4', 400),
    '<path d="M40 108h1200" stroke="#355576" stroke-opacity=".8" stroke-width="1"/>\n',
]

def card(x, y, title, icon, accent, sub=None, name_size=26):
    w,h = 286, 88
    s = f'''<g transform="translate({x},{y})">
  <rect width="{w}" height="{h}" rx="14" fill="url(#cell-bg)" stroke="#335471" stroke-width="1.3"/>
  <path d="M1 28V14Q1 1 15 1H61" stroke="{accent}" stroke-width="3" fill="none"/>
  <rect x="17" y="17" width="52" height="52" rx="13" fill="{accent}" fill-opacity=".13" stroke="{accent}" stroke-opacity=".48"/>
  <text x="43" y="52" text-anchor="middle" fill="{accent}" font-family="{FONT}" font-size="{22 if len(icon)<3 else 15}" font-weight="750">{escape(icon)}</text>
  {text(82, 45, title, name_size, '#F2F6FC', 720)}
  {text(82, 68, sub or '', 16, '#99B0CB', 400)}
</g>\n'''
    return s

rows = [
    (121, '01  /  PROGRAMMING LANGUAGES', [
        ('JavaScript','JS','#F0D96A','Web applications'),
        ('Python','Py','#81BAEC','Automation & data'),
        ('Java','J','#FF9B77','Applications & systems'),
        ('PHP','PHP','#B7A5EF','Web & backend')
    ]),
    (266, '02  /  WEB & MOBILE', [
        ('React','R','#7DE3F7','User interfaces'),
        ('Node.js','N','#A1DB88','JavaScript runtime'),
        ('React Native','RN','#80D7F1','Mobile applications'),
        ('REST APIs','API','#9EB7D5','Services & integrations')
    ]),
    (411, '03  /  DATA & DELIVERY', [
        ('MongoDB','M','#8BDBA9','Document database'),
        ('PostgreSQL','PG','#9DC8EC','Relational database'),
        ('GitHub','GH','#DFE7F5','Source control'),
        ('GitHub Actions','GA','#9EAFFB','Automation & CI')
    ])
]
for y,label,items in rows:
    parts.append(text(40, y, label, 17, '#8FAFCE', 700, MONO, '1.0'))
    cy=y+16
    for idx,(title,icon,accent,sub) in enumerate(items):
        parts.append(card(40+idx*307, cy, title, icon, accent, sub, 24 if len(title)>11 else 26))

parts += [text(40,555,'PLATFORMS  •  FRAMEWORKS  •  DATA  •  DEVOPS',14,'#7894B5',550,MONO,'1.2'), '</svg>']
(ASSETS/'stack.svg').write_text(''.join(parts), encoding='utf-8')

# Google Workspace panel
h=432
parts = [svg_start(h, 'Google Workspace integration toolkit with Google Apps Script, Sheets, Drive, Gmail, Forms, Docs and Google Workspace APIs')]
parts += [
    text(40, 58, 'GOOGLE WORKSPACE & AUTOMATION', 31, '#F5F9FF', 750, spacing='0.5'),
    text(40, 90, 'Google Apps Script  /  Workspace APIs  /  Automated operational workflows', 20, '#ADC5E0', 400),
    '<path d="M40 110h1200" stroke="#355576" stroke-opacity=".8" stroke-width="1"/>\n',
]
# highlighted Apps Script block on left, other Google integrations on right
parts.append('''<rect x="40" y="136" width="405" height="248" rx="18" fill="url(#cell-bg)" stroke="#4277AA" stroke-width="1.5"/>
<path d="M41 192V156Q41 137 60 137H156" fill="none" stroke="#7BAFF5" stroke-width="3"/>
<rect x="68" y="168" width="84" height="84" rx="18" fill="#204D82" stroke="#5C9ADE" stroke-width="2"/>
<path d="M99 191l-16 19 16 19M121 191l16 19-16 19M114 186l-12 48" stroke="#CAE3FF" fill="none" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
''')
parts += [
    text(174, 195, 'Google Apps', 30, '#F3F7FC', 750),
    text(174, 234, 'Script', 30, '#94C7FB', 750),
    text(68, 290, 'Workflow orchestration', 22, '#DEE9F6', 600),
    text(68, 320, 'Triggers  •  APIs  •  Integrations', 17, '#AAC0D6', 400),
    '<path d="M68 346h344" stroke="#49688C" opacity=".5"/>\n',
    text(68, 369, 'GOOGLE WORKSPACE AUTOMATION', 14, '#78A7D9', 650, MONO, '0.6'),
]

def google_card(x,y,title,subtitle,letter,accent):
    return f'''<g transform="translate({x},{y})">
  <rect width="245" height="112" rx="15" fill="url(#cell-bg)" stroke="#335572" stroke-width="1.3"/>
  <rect x="17" y="24" width="56" height="56" rx="13" fill="{accent}" fill-opacity=".14" stroke="{accent}" stroke-opacity=".70"/>
  <text x="45" y="60" text-anchor="middle" fill="{accent}" font-family="{FONT}" font-weight="800" font-size="{22 if len(letter)<3 else 15}">{escape(letter)}</text>
  {text(85, 53, title, 22 if len(title)>12 else 25, '#EFF5FC', 680)}
  {text(85, 78, subtitle, 15, '#A3BCD4', 400)}
</g>\n'''

apps = [
    ('Google Sheets','Data & records','S','#79D79C'),
    ('Google Drive','File workflows','D','#F3CA75'),
    ('Gmail / API','Email delivery','G','#F6A2A0'),
    ('Google Forms','Structured intake','F','#B9A7FF'),
    ('Google Docs','Documents','D','#9CCAFF'),
    ('Workspace APIs','System links','API','#9EDBD5'),
]
for idx,(name,sub,letter,color) in enumerate(apps):
    x=465+(idx%3)*258
    y=136+(idx//3)*124
    parts.append(google_card(x,y,name,sub,letter,color))
parts += [
    '<path d="M40 402h1200" stroke="#355576" stroke-opacity=".65"/>\n',
    text(40,424,'SPREADSHEETS  /  EMAIL  /  DOCUMENTS  /  FORM INTAKE  /  SYSTEM SYNCHRONIZATION',15,'#96B6D5',550,MONO,'0.15'),
    '</svg>'
]
(ASSETS/'google-workspace.svg').write_text(''.join(parts), encoding='utf-8')
print('Created stack.svg and google-workspace.svg')
