#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
ASSETS.mkdir(exist_ok=True)

FONT_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_R = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_M = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'


def font(path, size):
    return ImageFont.truetype(path, size)


def vertical_gradient(size, top, bottom):
    w, h = size
    img = Image.new('RGBA', size)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        for x in range(w):
            px[x, y] = (r, g, b, 255)
    return img


def radial_glow(size, center, radius, color, strength=1.0):
    w, h = size
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    px = img.load()
    cx, cy = center
    for y in range(h):
        for x in range(w):
            d = math.dist((x, y), (cx, cy))
            if d < radius:
                t = 1 - d / radius
                a = int(255 * (t ** 2.5) * 0.55 * strength)
                px[x, y] = (*color, a)
    return img.filter(ImageFilter.GaussianBlur(25))


def rounded_panel(size, rect, radius, fill, outline=None, width=1):
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=width)
    return img


def make_portrait(size=(410, 410)):
    src = Image.open(ASSETS / 'source-photo.png').convert('RGB')
    src = ImageOps.fit(src, size, method=Image.LANCZOS, centering=(0.5, 0.3))
    src = ImageOps.autocontrast(src)
    # Cool monochrome tint
    r, g, b = src.split()
    gray = Image.merge('RGB', (r, g, b)).convert('L')
    tint = Image.merge('RGB', (gray, gray, gray))
    tint = ImageOps.colorize(gray, black='#101926', white='#dbe7f7')
    tint = tint.convert('RGBA')
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).ellipse((10, 10, size[0]-10, size[1]-10), fill=255)
    out = Image.new('RGBA', size, (0, 0, 0, 0))
    out.paste(tint, (0, 0), mask)
    ring = Image.new('RGBA', size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse((6, 6, size[0]-6, size[1]-6), outline=(110, 187, 255, 150), width=3)
    rd.ellipse((16, 16, size[0]-16, size[1]-16), outline=(72, 118, 188, 100), width=1)
    ring = ring.filter(ImageFilter.GaussianBlur(0.4))
    out = Image.alpha_composite(out, ring)
    return out


def draw_grid(draw, rect, step=44, color=(58, 82, 110, 50)):
    x0, y0, x1, y1 = rect
    for x in range(x0, x1, step):
        draw.line((x, y0, x, y1), fill=color, width=1)
    for y in range(y0, y1, step):
        draw.line((x0, y, x1, y), fill=color, width=1)


def save_gif(frames, path, durations):
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True, disposal=2)


def build_header():
    W, H = 1600, 520
    portrait = make_portrait((420, 420))
    f_name = font(FONT_B, 76)
    f_sub = font(FONT_R, 28)
    f_small = font(FONT_R, 22)
    f_micro = font(FONT_M, 18)
    frames = []
    name = 'Moataz Kobry'
    title = 'Cyber & AI Systems'
    suba = 'Computing • AI Automation • Cybersecurity • Official Platform Development'
    subb = 'UCLM ESI • 100+ Digital Projects Since 2016 • Platforms, Automation, Infrastructure'
    micro = 'GitHub profile / executive technology identity'
    for i in range(16):
        bg = vertical_gradient((W, H), (6, 10, 20), (3, 7, 14))
        bg = Image.alpha_composite(bg, radial_glow((W, H), (1080, 180), 260, (27, 112, 232), 0.9))
        bg = Image.alpha_composite(bg, radial_glow((W, H), (320, 420), 320, (0, 60, 150), 0.7))
        d = ImageDraw.Draw(bg)
        panel = rounded_panel((W, H), (18, 18, W-18, H-18), 32, (8, 14, 28, 240), outline=(52, 87, 130, 120), width=2)
        bg = Image.alpha_composite(bg, panel)
        d = ImageDraw.Draw(bg)
        draw_grid(d, (34, 34, W-34, H-34), step=50, color=(60, 88, 118, 28))

        # left text zone
        d.text((70, 72), title, font=f_micro, fill=(130, 177, 236))
        reveal = min(len(name), max(1, 2 + i))
        txt = name[:reveal]
        x = 68
        for ch in txt:
            fill = (244, 248, 255) if x < 365 else (99, 179, 255)
            d.text((x, 112), ch, font=f_name, fill=fill)
            x += d.textlength(ch, font=f_name)
        if i < 15 or i % 2 == 0:
            d.text((x, 112), '|', font=f_name, fill=(179, 223, 255))
        line_end = 68 + int(620 * min(1, (i+1)/5))
        d.rounded_rectangle((70, 206, line_end, 212), radius=3, fill=(84, 173, 255))
        d.rounded_rectangle((70, 222, 70 + int((line_end-70)*0.72), 226), radius=2, fill=(166, 212, 255))
        d.text((70, 246), suba, font=f_sub, fill=(229, 235, 244))
        d.text((70, 287), subb, font=f_small, fill=(156, 175, 199))
        d.text((70, 28), micro.upper(), font=f_micro, fill=(92, 118, 152))

        # chips
        chips = ['PYTHON', 'JAVASCRIPT', 'REACT', 'NODE.JS', 'CYBERSECURITY']
        cx = 70
        for chip in chips:
            tw = int(d.textlength(chip, font=f_micro))
            w = tw + 28
            d.rounded_rectangle((cx, 350, cx+w, 382), radius=11, fill=(12, 24, 40), outline=(71, 126, 185, 120), width=1)
            d.text((cx+14, 358), chip, font=f_micro, fill=(189, 222, 255))
            cx += w + 12

        # architecture bullets
        bullets = [
            'Builds official websites and operational platforms',
            'Designs automation workflows and API-connected systems',
            'Works across secure infrastructure, deliverability, and digital operations',
        ]
        by = 410
        for bullet in bullets:
            d.ellipse((74, by+9, 80, by+15), fill=(96, 183, 255))
            d.text((94, by), bullet, font=f_small, fill=(205, 218, 233))
            by += 28

        # portrait block right
        card_x, card_y = 1115, 52
        glow = radial_glow((W, H), (1320, 210), 210, (89, 174, 255), 1.1)
        bg = Image.alpha_composite(bg, glow)
        d = ImageDraw.Draw(bg)
        # orbit globe behind portrait
        center = (1180, 170)
        for r, alpha in [(116, 100), (136, 52), (154, 22)]:
            d.ellipse((center[0]-r, center[1]-r, center[0]+r, center[1]+r), outline=(122, 195, 255, alpha), width=2)
        # moving nodes around orbit
        ang = i / 15 * 2 * math.pi
        for shift in [0, 1.9, 4.1]:
            ox = int(center[0] + math.cos(ang + shift) * 136)
            oy = int(center[1] + math.sin(ang + shift) * 96)
            d.ellipse((ox-5, oy-5, ox+5, oy+5), fill=(215, 238, 255))
        portrait_card = rounded_panel((W, H), (1080, 50, 1510, 470), 26, (9, 16, 32, 230), outline=(74, 132, 198, 110), width=2)
        bg = Image.alpha_composite(bg, portrait_card)
        bg.alpha_composite(portrait, (1110, 75))
        d = ImageDraw.Draw(bg)
        # scanning lines inside right card only
        sy = 84 + ((i * 19) % 340)
        for t, alpha in [(-5, 22), (0, 40), (5, 22)]:
            d.line((1118, sy+t, 1496, sy+t), fill=(120, 198, 255, alpha), width=2)
        d.text((1128, 28), 'EXECUTIVE PROFILE', font=f_micro, fill=(130, 177, 236))
        d.text((1128, 447), 'Cyber • AI • Platforms • Systems', font=f_micro, fill=(130, 177, 236))
        # subtle edge shimmer
        ex = 40 + int((W - 200) * i / 15)
        d.rounded_rectangle((ex, 18, ex+120, 22), radius=1, fill=(100, 186, 255, 80))
        d.rounded_rectangle((W-ex-120, H-22, W-ex, H-18), radius=1, fill=(100, 186, 255, 60))
        frames.append(bg.convert('P', palette=Image.ADAPTIVE, colors=255))
    save_gif(frames, ASSETS / 'header-premium.gif', [110]*15 + [320])


def build_systems_architecture():
    W, H = 1600, 580
    f_title = font(FONT_B, 54)
    f_sub = font(FONT_R, 26)
    f_small = font(FONT_R, 22)
    f_micro = font(FONT_M, 18)
    base = vertical_gradient((W, H), (4, 8, 18), (2, 5, 12))
    base = Image.alpha_composite(base, rounded_panel((W, H), (18, 18, W-18, H-18), 28, (8, 14, 28, 244), outline=(50, 82, 128, 120), width=2))
    d = ImageDraw.Draw(base)
    draw_grid(d, (34, 34, W-34, H-34), step=48, color=(60, 88, 118, 24))
    d.text((70, 56), 'SYSTEMS ARCHITECTURE', font=f_micro, fill=(130, 177, 236))
    d.text((70, 98), 'How digital systems are designed to operate.', font=f_title, fill=(240, 245, 252))
    d.text((70, 172), 'Platforms • APIs • Data • Automation • Documents • Verification', font=f_sub, fill=(190, 214, 242))
    d.text((70, 210), 'A practical model for official platforms, operations, communication flows, and secure digital execution.', font=f_small, fill=(154, 176, 202))

    boxes = {
        'Public Website': (70, 286, 290, 368),
        'Admin Platform': (70, 404, 290, 486),
        'API Layer': (414, 344, 620, 426),
        'Operational Data': (744, 230, 980, 312),
        'Automation Engine': (744, 344, 980, 426),
        'Email & Docs': (744, 458, 980, 540),
        'Verification': (1110, 286, 1360, 368),
        'Public Output': (1110, 404, 1360, 486),
    }
    labels = {
        'Public Website': 'Public-facing institutional presence',
        'Admin Platform': 'Internal management and workflows',
        'API Layer': 'Rules, integrations and routing',
        'Operational Data': 'Records, forms, files and structured data',
        'Automation Engine': 'Apps Script, workflows and task logic',
        'Email & Docs': 'Receipts, assignments, PDFs and mail',
        'Verification': 'Reference checks and public validation',
        'Public Output': 'Official communications and user responses',
    }
    base_boxes = base.copy()
    db = ImageDraw.Draw(base_boxes)
    for title, rect in boxes.items():
        db.rounded_rectangle(rect, radius=20, fill=(12, 24, 40, 235), outline=(75, 128, 190, 140), width=2)
        db.text((rect[0]+18, rect[1]+14), title, font=f_sub, fill=(239, 244, 250))
        db.text((rect[0]+18, rect[1]+48), labels[title], font=f_micro, fill=(145, 177, 212))
    nodes = {
        'Public Website': (290, 327),
        'Admin Platform': (290, 445),
        'API LayerL': (414, 385),
        'API LayerR': (620, 385),
        'Operational Data': (744, 271),
        'Automation Engine': (744, 385),
        'Email & Docs': (744, 499),
        'Verification': (1110, 327),
        'Public Output': (1110, 445),
    }
    paths = [
        [(290, 327), (352, 327), (352, 385), (414, 385)],
        [(290, 445), (352, 445), (352, 385), (414, 385)],
        [(620, 385), (684, 385), (684, 271), (744, 271)],
        [(620, 385), (684, 385), (684, 385), (744, 385)],
        [(620, 385), (684, 385), (684, 499), (744, 499)],
        [(980, 271), (1040, 271), (1040, 327), (1110, 327)],
        [(980, 385), (1040, 385), (1040, 327), (1110, 327)],
        [(980, 499), (1040, 499), (1040, 445), (1110, 445)],
    ]
    frames=[]
    for i in range(18):
        frame = base_boxes.copy()
        d = ImageDraw.Draw(frame)
        for p in paths:
            d.line(p, fill=(78, 132, 198, 150), width=4)
            for x, y in p:
                d.ellipse((x-5, y-5, x+5, y+5), fill=(120, 188, 255, 190))
        # animate pulses along paths
        for idx, p in enumerate(paths):
            # approximate segment traversal
            pts = p
            # total lengths per segment
            segs=[]
            total=0
            for a,b in zip(pts, pts[1:]):
                l = abs(a[0]-b[0]) + abs(a[1]-b[1])
                segs.append((a,b,l,total))
                total += l
            t = ((i*36 + idx*84) % max(total,1))
            px, py = pts[0]
            for a,b,l,start in segs:
                if t <= start + l:
                    rem = t - start
                    if a[0] == b[0]:
                        px = a[0]
                        py = a[1] + (1 if b[1] > a[1] else -1) * rem
                    else:
                        px = a[0] + (1 if b[0] > a[0] else -1) * rem
                        py = a[1]
                    break
            d.ellipse((px-9, py-9, px+9, py+9), fill=(219, 240, 255, 255), outline=(96, 182, 255), width=2)
        frames.append(frame.convert('P', palette=Image.ADAPTIVE, colors=255))
    save_gif(frames, ASSETS / 'systems-architecture.gif', [110]*17 + [260])


def write_svg(path, content):
    path.write_text(content, encoding='utf-8')


def build_track_record_svg():
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="430" viewBox="0 0 1600 430" role="img" aria-label="Track record timeline">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#08111f"/>
      <stop offset="100%" stop-color="#040a13"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#2f5d8b"/>
      <stop offset="100%" stop-color="#6fc3ff"/>
    </linearGradient>
  </defs>
  <rect x="18" y="18" width="1564" height="394" rx="28" fill="url(#bg)" stroke="#36587a" stroke-opacity="0.55"/>
  <g opacity="0.18" stroke="#47627d">
    <path d="M40 64H1560"/><path d="M40 110H1560"/><path d="M40 156H1560"/><path d="M40 202H1560"/><path d="M40 248H1560"/><path d="M40 294H1560"/><path d="M40 340H1560"/>
  </g>
  <text x="70" y="64" font-family="DejaVu Sans Mono, monospace" font-size="20" fill="#89b9ea">TRACK RECORD / EXPERIENCE</text>
  <text x="70" y="122" font-family="DejaVu Sans, Arial, sans-serif" font-size="54" font-weight="700" fill="#edf4fb">A practical path built through systems.</text>
  <text x="70" y="162" font-family="DejaVu Sans, Arial, sans-serif" font-size="24" fill="#b7c9dd">Selected milestones reflecting continuity, technical execution, and institutional digital work.</text>
  <line x1="110" y1="270" x2="1490" y2="270" stroke="url(#line)" stroke-width="6" stroke-linecap="round"/>
  <g font-family="DejaVu Sans, Arial, sans-serif">
    <circle cx="180" cy="270" r="13" fill="#d9efff" stroke="#65b8ff" stroke-width="4"/>
    <text x="145" y="246" font-size="28" font-weight="700" fill="#f2f7fc">2016</text>
    <text x="118" y="318" font-size="22" fill="#d7e2ee">Started building digital projects</text>

    <circle cx="510" cy="270" r="13" fill="#d9efff" stroke="#65b8ff" stroke-width="4"/>
    <text x="448" y="246" font-size="28" font-weight="700" fill="#f2f7fc">100+</text>
    <text x="406" y="318" font-size="22" fill="#d7e2ee">Websites and digital platforms</text>

    <circle cx="840" cy="270" r="13" fill="#d9efff" stroke="#65b8ff" stroke-width="4"/>
    <text x="733" y="246" font-size="28" font-weight="700" fill="#f2f7fc">Official Systems</text>
    <text x="706" y="318" font-size="22" fill="#d7e2ee">Council website and internal management platform</text>

    <circle cx="1170" cy="270" r="13" fill="#d9efff" stroke="#65b8ff" stroke-width="4"/>
    <text x="1090" y="246" font-size="28" font-weight="700" fill="#f2f7fc">Cyber &amp; AI</text>
    <text x="1014" y="318" font-size="22" fill="#d7e2ee">Automation, deliverability, secure operations</text>

    <circle cx="1450" cy="270" r="13" fill="#d9efff" stroke="#65b8ff" stroke-width="4"/>
    <text x="1366" y="246" font-size="28" font-weight="700" fill="#f2f7fc">Today</text>
    <text x="1290" y="318" font-size="22" fill="#d7e2ee">Computing at UCLM ESI with institutional execution</text>
  </g>
</svg>'''
    write_svg(ASSETS / 'track-record.svg', svg)


def build_stack_svg():
    tech_groups = [
        ('Languages', ['JavaScript', 'Python', 'Java', 'PHP']),
        ('Frontend', ['React', 'HTML/CSS', 'UI Systems']),
        ('Backend', ['Node.js', 'REST APIs', 'Automation Logic']),
        ('Mobile', ['React Native', 'Cross-platform Apps']),
        ('Databases', ['MongoDB', 'PostgreSQL', 'SQL Workflows']),
        ('DevOps & Collaboration', ['GitHub', 'GitHub Actions', 'Workflow Automation']),
    ]
    card_w = 470
    card_h = 118
    positions = []
    start_x = 70
    start_y = 148
    gap_x = 44
    gap_y = 28
    for row in range(2):
        for col in range(3):
            positions.append((start_x + col*(card_w+gap_x), start_y + row*(card_h+gap_y)))
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="470" viewBox="0 0 1600 470" role="img" aria-label="Technology stack grouped by area">',
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#08111f"/><stop offset="100%" stop-color="#040a13"/></linearGradient></defs>',
        '<rect x="18" y="18" width="1564" height="434" rx="28" fill="url(#bg)" stroke="#36587a" stroke-opacity="0.55"/>',
        '<text x="70" y="66" font-family="DejaVu Sans Mono, monospace" font-size="20" fill="#89b9ea">ENGINEERING STACK / ECOSYSTEM</text>',
        '<text x="70" y="118" font-family="DejaVu Sans, Arial, sans-serif" font-size="50" font-weight="700" fill="#edf4fb">Tools grouped by how they are used.</text>'
    ]
    for (title, items), (x, y) in zip(tech_groups, positions):
        parts.append(f'<rect x="{x}" y="{y}" width="{card_w}" height="{card_h}" rx="22" fill="#0c1a2e" stroke="#47729f" stroke-opacity="0.65"/>')
        safe_title = title.replace('&', '&amp;')
        parts.append(f'<text x="{x+24}" y="{y+34}" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" font-weight="700" fill="#f1f7fc">{safe_title}</text>')
        ix = x + 24
        iy = y + 70
        line = '  •  '.join(items).replace('&', '&amp;')
        parts.append(f'<text x="{ix}" y="{iy}" font-family="DejaVu Sans, Arial, sans-serif" font-size="21" fill="#c4d7ea">{line}</text>')
    parts.append('</svg>')
    write_svg(ASSETS / 'stack.svg', ''.join(parts))


def build_google_svg():
    items = ['Google Apps Script', 'Sheets', 'Drive', 'Gmail', 'Forms', 'Docs', 'Workspace APIs']
    x_positions = [72, 280, 430, 560, 690, 815, 930]
    widths = [182, 118, 106, 112, 112, 112, 206]
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="280" viewBox="0 0 1600 280" role="img" aria-label="Google Workspace and Apps Script automation stack">',
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#08111f"/><stop offset="100%" stop-color="#040a13"/></linearGradient></defs>',
        '<rect x="18" y="18" width="1564" height="244" rx="28" fill="url(#bg)" stroke="#36587a" stroke-opacity="0.55"/>',
        '<text x="70" y="68" font-family="DejaVu Sans Mono, monospace" font-size="20" fill="#89b9ea">GOOGLE AUTOMATION / WORKSPACE</text>',
        '<text x="70" y="118" font-family="DejaVu Sans, Arial, sans-serif" font-size="46" font-weight="700" fill="#edf4fb">Operational automation through Google services.</text>',
        '<text x="70" y="156" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" fill="#bfd3e6">Used for forms, data synchronization, email flows, document generation, and workflow orchestration.</text>'
    ]
    for x, w, item in zip(x_positions, widths, items):
        parts.append(f'<rect x="{x}" y="190" width="{w}" height="42" rx="14" fill="#0d1f35" stroke="#4b79a8" stroke-opacity="0.75"/>')
        parts.append(f'<text x="{x+16}" y="216" font-family="DejaVu Sans Mono, monospace" font-size="18" fill="#d8ecff">{item}</text>')
    parts.append('</svg>')
    write_svg(ASSETS / 'google-workspace.svg', ''.join(parts))


def build_cyber_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="360" viewBox="0 0 1600 360" role="img" aria-label="Cybersecurity and deliverability panel">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#08111f"/>
      <stop offset="100%" stop-color="#040a13"/>
    </linearGradient>
  </defs>
  <rect x="18" y="18" width="1564" height="324" rx="28" fill="url(#bg)" stroke="#36587a" stroke-opacity="0.55"/>
  <text x="70" y="68" font-family="DejaVu Sans Mono, monospace" font-size="20" fill="#89b9ea">CYBERSECURITY / DELIVERABILITY</text>
  <text x="70" y="118" font-family="DejaVu Sans, Arial, sans-serif" font-size="48" font-weight="700" fill="#edf4fb">Secure operations and trusted communications.</text>
  <text x="70" y="156" font-family="DejaVu Sans, Arial, sans-serif" font-size="24" fill="#bfd3e6">Security-aware systems include infrastructure discipline, identity controls, and reliable email authentication.</text>
  <g>
    <rect x="70" y="206" width="160" height="46" rx="14" fill="#0d1f35" stroke="#4b79a8" stroke-opacity="0.75"/><text x="127" y="236" font-family="DejaVu Sans Mono, monospace" font-size="22" fill="#d8ecff">SPF</text>
    <rect x="248" y="206" width="170" height="46" rx="14" fill="#0d1f35" stroke="#4b79a8" stroke-opacity="0.75"/><text x="303" y="236" font-family="DejaVu Sans Mono, monospace" font-size="22" fill="#d8ecff">DKIM</text>
    <rect x="436" y="206" width="190" height="46" rx="14" fill="#0d1f35" stroke="#4b79a8" stroke-opacity="0.75"/><text x="492" y="236" font-family="DejaVu Sans Mono, monospace" font-size="22" fill="#d8ecff">DMARC</text>
    <rect x="644" y="206" width="180" height="46" rx="14" fill="#0d1f35" stroke="#4b79a8" stroke-opacity="0.75"/><text x="700" y="236" font-family="DejaVu Sans Mono, monospace" font-size="22" fill="#d8ecff">DNS</text>
    <rect x="842" y="206" width="220" height="46" rx="14" fill="#0d1f35" stroke="#4b79a8" stroke-opacity="0.75"/><text x="876" y="236" font-family="DejaVu Sans Mono, monospace" font-size="22" fill="#d8ecff">SMTP</text>
    <rect x="1080" y="206" width="300" height="46" rx="14" fill="#0d1f35" stroke="#4b79a8" stroke-opacity="0.75"/><text x="1108" y="236" font-family="DejaVu Sans Mono, monospace" font-size="22" fill="#d8ecff">Authentication Alignment</text>
  </g>
  <g font-family="DejaVu Sans, Arial, sans-serif" fill="#d7e2ee" font-size="22">
    <text x="70" y="300">Focus: sender reputation, secure domain configuration, responsible delivery patterns, and operational reliability.</text>
  </g>
  <g transform="translate(1330,82)">
    <circle cx="84" cy="84" r="76" fill="#0c1a2e" stroke="#4b79a8" stroke-opacity="0.75"/>
    <path d="M84 42l42 18v34c0 28-18 54-42 68-24-14-42-40-42-68V60l42-18z" fill="none" stroke="#8ed0ff" stroke-width="6"/>
    <path d="M65 84l14 14 28-30" fill="none" stroke="#d8ecff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>'''
    write_svg(ASSETS / 'cyber-deliverability.svg', svg)


def build_institutional_media_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="340" viewBox="0 0 1600 340" role="img" aria-label="Institutional and media dimension">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#08111f"/><stop offset="100%" stop-color="#040a13"/></linearGradient></defs>
  <rect x="18" y="18" width="1564" height="304" rx="28" fill="url(#bg)" stroke="#36587a" stroke-opacity="0.55"/>
  <text x="70" y="66" font-family="DejaVu Sans Mono, monospace" font-size="20" fill="#89b9ea">INSTITUTIONAL / MEDIA DIMENSION</text>
  <text x="70" y="116" font-family="DejaVu Sans, Arial, sans-serif" font-size="48" font-weight="700" fill="#edf4fb">Technology aligned with institutional visibility.</text>
  <text x="70" y="156" font-family="DejaVu Sans, Arial, sans-serif" font-size="23" fill="#bfd3e6">Work extends beyond building platforms to shaping how organizations appear, communicate, and structure knowledge online.</text>
  <g font-family="DejaVu Sans, Arial, sans-serif" font-size="22" fill="#d7e2ee">
    <text x="86" y="224">• Wikipedia, Wikimedia, and Wikidata work</text>
    <text x="86" y="260">• Institutional digital visibility and structured information presence</text>
    <text x="820" y="224">• PR support and media-facing communication</text>
    <text x="820" y="260">• Public positioning across digital channels</text>
  </g>
  <g transform="translate(1290,86)">
    <rect x="0" y="0" width="180" height="112" rx="18" fill="#0d1f35" stroke="#4b79a8" stroke-opacity="0.75"/>
    <rect x="18" y="22" width="70" height="12" rx="6" fill="#89b9ea" opacity="0.75"/>
    <rect x="18" y="48" width="144" height="10" rx="5" fill="#bfd3e6" opacity="0.75"/>
    <rect x="18" y="70" width="110" height="10" rx="5" fill="#bfd3e6" opacity="0.6"/>
    <circle cx="144" cy="82" r="18" fill="#0c1a2e" stroke="#89b9ea" stroke-opacity="0.8"/>
    <path d="M144 72v20M134 82h20" stroke="#d8ecff" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>'''
    write_svg(ASSETS / 'institutional-media.svg', svg)


def build_institutional_gif():
    W, H = 1600, 430
    f_title = font(FONT_B, 54)
    f_sub = font(FONT_R, 28)
    f_small = font(FONT_R, 22)
    f_micro = font(FONT_M, 18)
    base = vertical_gradient((W, H), (5, 10, 22), (3, 7, 14))
    base = Image.alpha_composite(base, rounded_panel((W, H), (18, 18, W-18, H-18), 28, (8, 14, 28, 242), outline=(50, 82, 128, 120), width=2))
    d = ImageDraw.Draw(base)
    draw_grid(d, (34, 34, W-34, H-34), step=50, color=(60, 88, 118, 22))
    d.text((70, 62), 'INSTITUTIONAL DIGITAL SYSTEMS', font=f_micro, fill=(130, 177, 236))
    d.text((70, 118), 'Digital platforms. Built to operate.', font=f_title, fill=(240, 245, 252))
    d.text((70, 196), 'Website architecture • Internal management systems • Automation • Verification • Structured output', font=f_sub, fill=(190, 214, 242))
    d.text((70, 240), 'Institutional technology is designed here for continuity, execution, and operational clarity.', font=f_small, fill=(154, 176, 202))
    d.text((70, 278), 'The objective is not only to build interfaces, but to build dependable digital ecosystems.', font=f_small, fill=(154, 176, 202))
    # right globe scaffold
    globe_center = (1260, 214)
    radius = 96
    frames=[]
    for i in range(18):
        frame = base.copy()
        d = ImageDraw.Draw(frame)
        angle = i / 18 * 2 * math.pi
        d.rounded_rectangle((1120, 56, 1490, 374), radius=28, fill=(10, 20, 36, 150), outline=(70, 120, 186, 95), width=2)
        # fixed arcs
        for r, alpha in [(82, 130), (100, 60), (118, 28)]:
            d.ellipse((globe_center[0]-r, globe_center[1]-r, globe_center[0]+r, globe_center[1]+r), outline=(124, 196, 255, alpha), width=2)
        # latitude / longitude rotating feel via phase shift
        for lat in [-0.7, -0.35, 0, 0.35, 0.7]:
            ry = int(radius * (1 - abs(lat) * 0.4))
            y = int(globe_center[1] + lat * radius)
            d.ellipse((globe_center[0]-radius, y-ry//6, globe_center[0]+radius, y+ry//6), outline=(110, 182, 248, 85), width=1)
        for k in range(6):
            a = angle + k*math.pi/3
            x = globe_center[0] + math.cos(a)*radius*0.78
            # meridian as arcs using lines
            d.line((globe_center[0], globe_center[1]-radius, x, globe_center[1]), fill=(110, 182, 248, 90), width=1)
            d.line((x, globe_center[1], globe_center[0], globe_center[1]+radius), fill=(110, 182, 248, 90), width=1)
        # moving scan line inside box only
        sy = 90 + ((i*13) % 230)
        for off, alpha in [(-3, 25), (0, 45), (3, 25)]:
            d.line((1138, sy+off, 1472, sy+off), fill=(120, 198, 255, alpha), width=2)
        # moving small dashes
        for n in range(5):
            x = 1142 + ((i*18 + n*58) % 280)
            y = 82 + (n*46)
            d.rounded_rectangle((x, y, x+24, y+4), radius=2, fill=(145, 220, 255, 135))
        d.text((1138, 336), 'network / operations / continuity', font=f_micro, fill=(130, 177, 236))
        frames.append(frame.convert('P', palette=Image.ADAPTIVE, colors=255))
    save_gif(frames, ASSETS / 'institutional-premium.gif', [100]*17 + [260])


def build_docs():
    docs = ROOT / 'docs'
    (docs / 'assets').mkdir(parents=True, exist_ok=True)
    html = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Moataz Kobry | Cyber & AI Systems</title>
  <meta name="description" content="Cyber & AI identity portfolio for Moataz Kobry." />
  <link rel="stylesheet" href="./style.css" />
</head>
<body>
  <canvas id="bg-canvas" aria-hidden="true"></canvas>
  <header class="hero wrap">
    <div class="hero-copy">
      <span class="eyebrow">Cyber & AI Identity</span>
      <h1>Moataz Kobry</h1>
      <p class="lead">Computing, AI Automation, Cybersecurity, and official digital platforms designed to operate with structure and continuity.</p>
      <div class="chips">
        <span>UCLM ESI</span><span>Since 2016</span><span>100+ Digital Projects</span><span>Platforms & Automation</span>
      </div>
      <div class="cta-row">
        <a class="btn" href="mailto:president@mycdic.org?subject=Curriculum%20Vitae%20Request%20-%20Moataz%20Kobry&body=Hello%20Mr%20Kobry%2C%0D%0A%0D%0AI%20would%20like%20to%20request%20your%20CV.%0D%0A%0D%0AName%3A%0D%0AOrganization%3A%0D%0APurpose%3A%0D%0A%0D%0ARegards%2C">Request CV</a>
        <a class="btn secondary" href="https://github.com/kobrymoataz">GitHub</a>
        <a class="btn secondary" href="https://www.linkedin.com/in/kobrymoataz/">LinkedIn</a>
      </div>
    </div>
    <div class="hero-visual card">
      <img src="../assets/header-premium.gif" alt="Animated Moataz Kobry header" />
    </div>
  </header>

  <main class="wrap sections">
    <section class="card grid-2">
      <div>
        <span class="section-id">01 / Systems Architecture</span>
        <h2>Operational systems, not isolated interfaces.</h2>
        <p>Architecture is approached as a chain of public presence, management workflows, data, automation, documents, verification, and trusted output.</p>
      </div>
      <img src="../assets/systems-architecture.gif" alt="Animated systems architecture diagram" />
    </section>

    <section class="card grid-2">
      <div>
        <span class="section-id">02 / Track Record</span>
        <h2>Built through continuity and practical execution.</h2>
        <p>From early digital work in 2016 to official platforms, operational systems, and cyber-aware infrastructure, the focus has remained practical and execution-oriented.</p>
      </div>
      <img src="../assets/track-record.svg" alt="Track record timeline" />
    </section>

    <section class="card grid-2">
      <div>
        <span class="section-id">03 / Technology</span>
        <h2>Stack, automation, and engineering environment.</h2>
        <p>JavaScript, Python, Java, PHP, React, React Native, Node.js, MongoDB, PostgreSQL, GitHub, and Google Apps Script integrated into real workflows.</p>
      </div>
      <div class="stack-double">
        <img src="../assets/stack.svg" alt="Technology stack" />
        <img src="../assets/google-workspace.svg" alt="Google Workspace automation" />
      </div>
    </section>

    <section class="card grid-2">
      <div>
        <span class="section-id">04 / Cybersecurity & Deliverability</span>
        <h2>Secure operations and trusted communications.</h2>
        <p>Email infrastructure, authentication alignment, operational security, and dependable communications are treated as part of the engineering stack.</p>
      </div>
      <img src="../assets/cyber-deliverability.svg" alt="Cybersecurity and deliverability" />
    </section>

    <section class="card grid-2">
      <div>
        <span class="section-id">05 / Institutional Dimension</span>
        <h2>Technology aligned with institutional visibility.</h2>
        <p>The work extends beyond development to structured public presence, knowledge visibility, and media-facing digital positioning.</p>
      </div>
      <div class="stack-double">
        <img src="../assets/institutional-premium.gif" alt="Institutional digital systems" />
        <img src="../assets/institutional-media.svg" alt="Institutional and media work" />
      </div>
    </section>
  </main>
  <script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
  <script src="./app.js"></script>
</body>
</html>'''
    css = '''*{box-sizing:border-box}html,body{margin:0;padding:0;background:#040a13;color:#ecf3fb;font-family:Inter,Segoe UI,Arial,sans-serif}body{position:relative;overflow-x:hidden}a{text-decoration:none}.wrap{width:min(1180px,calc(100% - 40px));margin:0 auto}#bg-canvas{position:fixed;inset:0;z-index:0;opacity:.9}header,main{position:relative;z-index:1}.hero{display:grid;grid-template-columns:1fr 1.1fr;gap:24px;padding:46px 0 26px;align-items:center}.eyebrow,.section-id{display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(17,31,53,.85);border:1px solid rgba(114,170,230,.35);color:#9cc8f4;font-size:.92rem;letter-spacing:.06em;text-transform:uppercase}.hero h1{font-size:clamp(2.7rem,6vw,4.6rem);margin:18px 0 12px}.lead{font-size:1.12rem;line-height:1.7;color:#c8d8e8;max-width:640px}.chips{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0}.chips span{padding:10px 14px;border-radius:999px;background:rgba(12,26,46,.9);border:1px solid rgba(71,114,159,.5);color:#d9edff;font-size:.92rem}.cta-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}.btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:12px;background:#0f2038;border:1px solid rgba(107,170,232,.45);color:#edf4fb;font-weight:600}.btn.secondary{background:rgba(12,26,46,.76)}.card{background:rgba(8,15,28,.72);border:1px solid rgba(65,97,132,.55);border-radius:28px;backdrop-filter:blur(9px);box-shadow:0 12px 40px rgba(0,0,0,.28)}.hero-visual img,.sections img{width:100%;display:block;border-radius:22px}.hero-visual{padding:14px}.sections{display:grid;gap:24px;padding-bottom:40px}.grid-2{display:grid;grid-template-columns:.9fr 1.1fr;gap:22px;align-items:center;padding:26px}.grid-2 h2{font-size:2rem;margin:16px 0 12px}.grid-2 p{color:#c2d4e7;line-height:1.7}.stack-double{display:grid;gap:16px}.stack-double img{background:rgba(0,0,0,.1)}@media (max-width: 980px){.hero,.grid-2{grid-template-columns:1fr}.hero{padding-top:22px}.grid-2{padding:18px}}'''
    js = '''const canvas=document.getElementById('bg-canvas');const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(45,window.innerWidth/window.innerHeight,.1,100);camera.position.z=8;const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setSize(window.innerWidth,window.innerHeight);const group=new THREE.Group();scene.add(group);const geo=new THREE.IcosahedronGeometry(1.5,1);const wire=new THREE.WireframeGeometry(geo);const line=new THREE.LineSegments(wire,new THREE.LineBasicMaterial({color:0x6fc3ff,transparent:true,opacity:.35}));group.add(line);const ring=new THREE.Mesh(new THREE.TorusGeometry(2.35,.02,12,100),new THREE.MeshBasicMaterial({color:0x3f87c9,transparent:true,opacity:.45}));ring.rotation.x=1.05;group.add(ring);const particles=new THREE.Group();for(let i=0;i<180;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.018,8,8),new THREE.MeshBasicMaterial({color:0xa7dcff,transparent:true,opacity:.65}));const r=4+Math.random()*6;const a=Math.random()*Math.PI*2;const y=(Math.random()-.5)*5;p.position.set(Math.cos(a)*r,y,Math.sin(a)*r);particles.add(p);}scene.add(particles);const ambient=new THREE.AmbientLight(0x88bbff,.9);scene.add(ambient);let targetX=0,targetY=0;window.addEventListener('pointermove',e=>{targetX=(e.clientX/window.innerWidth-.5)*0.6;targetY=(e.clientY/window.innerHeight-.5)*0.35;});function animate(){requestAnimationFrame(animate);group.rotation.y+=.003;group.rotation.x+=.001;group.rotation.y+=(targetX-group.rotation.y)*.01;group.rotation.x+=(targetY-group.rotation.x)*.01;ring.rotation.z+=.0022;particles.rotation.y-=.0009;renderer.render(scene,camera)}animate();window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});'''
    (docs / 'index.html').write_text(html, encoding='utf-8')
    (docs / 'style.css').write_text(css, encoding='utf-8')
    (docs / 'app.js').write_text(js, encoding='utf-8')


def main():
    build_header()
    build_systems_architecture()
    build_track_record_svg()
    build_stack_svg()
    build_google_svg()
    build_cyber_svg()
    build_institutional_media_svg()
    build_institutional_gif()
    build_docs()
    print('V9 assets built.')


if __name__ == '__main__':
    main()
