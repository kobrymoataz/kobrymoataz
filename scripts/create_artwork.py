#!/usr/bin/env python3
"""High resolution, layout-safe GitHub profile artwork. No external services."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import math

ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / 'assets'
ASSET.mkdir(exist_ok=True)
W = 1600
C = dict(bg='#070B12',panel='#0C1420', panel2='#0F1B2B',line='#27425D',white='#F1F5FA',mute='#91A7BD',faint='#5B7895',blue='#6EB8FF',cyan='#74F1D5',silver='#CEDDEB')
FB = '/usr/share/fonts/opentype/cabin/Cabin-Bold.otf'
FR = '/usr/share/fonts/truetype/clear-sans/ClearSans-Regular.ttf'
FM = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

def font(size, bold=False, mono=False): return ImageFont.truetype(FM if mono else FB if bold else FR, size)

def txt(d, pos, s, sz, fill='white', bold=False, mono=False, maxw=None):
    f=font(sz,bold,mono)
    if maxw is not None:
        while d.textbbox((0,0),s,font=f)[2]>maxw and sz>14:
            sz-=1; f=font(sz,bold,mono)
    d.text(pos,s,font=f,fill=C.get(fill,fill),stroke_width=0)
    return d.textbbox(pos,s,font=f)

def canvas(h, outline=True):
    im=Image.new('RGB',(W,h),C['bg']); d=ImageDraw.Draw(im)
    for y in range(h):
        r=7;g=11+int(9*y/h);b=18+int(16*y/h)
        d.line((0,y,W,y), fill=(r,g,b))
    # restrained grid in empty regions; background stays static
    for x in range(32,W-31,88): d.line((x,30,x,h-30),fill=(20,34,49),width=1)
    for y in range(30,h-29,88): d.line((30,y,W-30,y),fill=(19,32,47),width=1)
    if outline:
        d.rounded_rectangle((18,18,W-19,h-19),radius=28,outline='#31506B',width=2)
        d.line((60,38,182,38),fill='#79CAFF',width=3)
    return im

def header():
    H=474
    base=canvas(H)
    d=ImageDraw.Draw(base)
    # Portrait card on right; source photo is not altered beyond crop and grading
    d.rounded_rectangle((1160,56,1538,421),radius=28,fill='#111923',outline='#496988',width=2)
    p=Image.open(ASSET/'moataz-photo.png').convert('RGB')
    p=ImageOps.fit(p,(352,336),method=Image.Resampling.LANCZOS,centering=(0.5,0.29))
    # Original grayscale only; preserve face, avoid speculative editing
    mask=Image.new('L',p.size,0); ImageDraw.Draw(mask).rounded_rectangle((0,0,p.width-1,p.height-1),radius=18,fill=255)
    base.paste(p,(1173,70),mask)
    d=ImageDraw.Draw(base)
    d.rectangle((1175,390,1520,407),fill='#0B111B')
    txt(d,(1196,392),'PORTRAIT / MOATAZ KOBRY',13,'silver',mono=True)
    # Right card includes no moving text
    txt(d,(67,61),'KOBRY / COMPUTING & DIGITAL SYSTEMS',18,'cyan',mono=True)
    txt(d,(65,105),'Moataz Kobry',94,'white',bold=True,maxw=985)
    txt(d,(69,220),'COMPUTING     /     AI AUTOMATION     /     CYBERSECURITY',23,'silver',bold=True,maxw=1010)
    txt(d,(69,266),'Official platforms  ·  Secure digital infrastructure  ·  Intelligent workflows',22,'mute',maxw=1010)
    # honest claims, no invented badges
    labels=[('2016','BUILDING SINCE'),('100+','DIGITAL WEBSITES'),('UCLM ESI','COMPUTING')]
    x=69
    for big,cap in labels:
        d.rounded_rectangle((x,338,x+297,408),radius=13,fill='#101C2B',outline='#2E506A',width=2)
        txt(d,(x+18,347),big,26,'white',bold=True)
        txt(d,(x+18,382),cap,13,'mute',mono=True)
        x+=319
    frames=[]
    fixed_palette=base.convert('P',palette=Image.Palette.ADAPTIVE,colors=128)
    # Deliberate motion only in a small bottom accent + text typewriter, no whole-frame jitter
    name_box=(67,100,985,205)
    for i in range(28):
        frame=base.copy(); d=ImageDraw.Draw(frame)
        d.rectangle((65,99,1125,203),fill='#070B12')
        # redraw title with dark fill and stable role text
        name='Moataz Kobry'; reveal=min(len(name), max(0, i-1))
        txt(d,(65,105),name[:reveal],94,'white',bold=True)
        width=d.textbbox((0,0),name[:reveal],font=font(94,bold=True))[2] if reveal else 0
        if i<18 and i%4<3:
            d.rectangle((65+width+7,118,65+width+11,185),fill='#6EB8FF')
        # subtle light pulse exclusively in lower line
        t=(i%14)/14
        d.line((70,423,1110,423),fill='#253B56',width=2)
        bx=70+int(t*985)
        d.rounded_rectangle((bx,421,bx+82,425),radius=2,fill='#74F1D5')
        frames.append(frame.quantize(palette=fixed_palette,dither=Image.Dither.NONE))
    frames[0].save(ASSET/'hero.gif',save_all=True,append_images=frames[1:],duration=[85]*20+[130]*7+[520],loop=0,optimize=True,disposal=2)
    frames[-1].convert('RGB').save(ASSET/'hero-preview.png',optimize=True)

def card(d,xy,title,sub,idx):
    x,y,w,h=xy
    d.rounded_rectangle((x,y,x+w,y+h),radius=16,fill='#111C2B',outline='#375B77',width=2)
    txt(d,(x+17,y+17),'0'+str(idx),16,'cyan',mono=True)
    txt(d,(x+18,y+48),title,23,'white',bold=True,maxw=w-34)
    txt(d,(x+18,y+82),sub,17,'mute',maxw=w-34)

def architecture():
    H=464; base=canvas(H); d=ImageDraw.Draw(base)
    txt(d,(68,62),'02  /  SYSTEM ARCHITECTURE',16,'cyan',mono=True)
    txt(d,(68,104),'From a public entry point to a verified result.',53,'white',bold=True,maxw=1460)
    txt(d,(69,173),'An operating model for official platforms, data, automated delivery and trustworthy records.',23,'mute',maxw=1430)
    boxes=[(72,259,260,120),(372,259,260,120),(672,259,260,120),(972,259,260,120),(1272,259,260,120)]
    node_text=[('Public platform','Web / applications'),('API & logic','Rules / integrations'),('Data & records','SQL / file storage'),('Automation','Apps Script / email'),('Verification','Documents / status')]
    for k,(xy,(t,s)) in enumerate(zip(boxes,node_text),start=1):card(d,xy,t,s,k)
    for a,b in zip(boxes,boxes[1:]):
        x=a[0]+a[2]; xx=b[0]; y=a[1]+a[3]/2
        d.line((x,y,xx,y),fill='#416E92',width=3)
    txt(d,(68,415),'PUBLIC INTAKE   →   WORKFLOW   →   STORAGE   →   DELIVERY   →   TRACEABILITY',17,'mute',mono=True)
    frames=[]
    for i in range(24):
        fr=base.copy();dr=ImageDraw.Draw(fr)
        for k,(a,b) in enumerate(zip(boxes,boxes[1:])):
            start=a[0]+a[2]+6; end=b[0]-6; yy=a[1]+a[3]//2
            x=start+((i*4 + k*13)%(end-start))
            dr.ellipse((x-4,yy-4,x+4,yy+4),fill='#A4EDFF')
        frames.append(fr.convert('P',palette=Image.Palette.ADAPTIVE,colors=128))
    frames[0].save(ASSET/'architecture.gif',save_all=True,append_images=frames[1:],duration=[110]*24,loop=0,optimize=True,disposal=2)
    frames[10].convert('RGB').save(ASSET/'architecture-preview.png',optimize=True)

def section(h,meta,title,desc=None):
    im=canvas(h); d=ImageDraw.Draw(im)
    txt(d,(65,50),meta,16,'cyan',mono=True)
    txt(d,(65,86),title,49,'white',bold=True,maxw=1470)
    if desc:txt(d,(66,151),desc,21,'mute',maxw=1470)
    return im

def stats():
    im=section(365,'03  /  EXPERIENCE','A track record measured in systems, not claims.','A concise record of delivery, scope and technical practice.')
    d=ImageDraw.Draw(im)
    items=[('2016','Technology since'),('100+','Websites & digital platforms'),('02','Council platforms built'),('UCLM','ESI · Computing & AI')]
    x=64
    for big,cap in items:
        d.rounded_rectangle((x,215,x+347,311),radius=17,fill='#111C2B',outline='#38536D',width=2)
        txt(d,(x+20,230),big,37,'white',bold=True)
        txt(d,(x+21,280),cap,19,'mute',maxw=310)
        x+=377
    im.save(ASSET/'experience.png',optimize=True)

def tech():
    im=section(520,'04  /  TECHNOLOGY','The tools behind the work.','Grouped by engineering function, not by invented proficiency scores.')
    d=ImageDraw.Draw(im)
    groups=[('LANGUAGES','JavaScript · Python · Java · PHP'),('FRONTEND','React · HTML/CSS · UI systems'),('BACKEND','Node.js · APIs · Server logic'),('MOBILE','React Native · Cross-platform'),('DATABASES','MongoDB · PostgreSQL · SQL'),('WORKFLOW','GitHub · Actions · Apps Script')]
    for idx,(title,items) in enumerate(groups):
        col=idx%3;row=idx//3;x=65+col*507;y=207+row*137
        d.rounded_rectangle((x,y,x+467,y+116),radius=17,fill='#111C2B',outline='#33526F',width=2)
        d.rounded_rectangle((x+18,y+18,x+57,y+56),radius=11,fill='#122B38')
        txt(d,(x+31,y+27),str(idx+1),16,'cyan',mono=True)
        txt(d,(x+72,y+20),title,19,'silver',mono=True)
        txt(d,(x+20,y+74),items,20,'white',maxw=425)
    im.save(ASSET/'tech-stack.png',optimize=True)

def google():
    im=section(319,'05  /  GOOGLE WORKSPACE AUTOMATION','Google Apps Script, connected to real processes.','Form intake · Sheet registers · Gmail delivery · Drive storage · document generation')
    d=ImageDraw.Draw(im)
    items=['Apps Script','Sheets','Drive','Gmail API','Forms','Docs','Workspace APIs']
    x=62
    for label in items:
        f=font(19,bold=True);tw=d.textbbox((0,0),label,font=f)[2]
        w=tw+40
        d.rounded_rectangle((x,219,x+w,273),radius=14,fill='#142635',outline='#3A667A',width=2)
        txt(d,(x+20,234),label,19,'white',bold=True)
        x+=w+12
    im.save(ASSET/'google-automation.png',optimize=True)

def cyber():
    im=section(330,'06  /  CYBERSECURITY & DELIVERABILITY','Secure by design. Reliable by default.','Practical infrastructure and sender authentication for dependable institutional communication.')
    d=ImageDraw.Draw(im)
    items=['SPF','DKIM','DMARC','DNS','SMTP','Reputation','Alignment']
    x=68
    for label in items:
        width=max(144,int(d.textbbox((0,0),label,font=font(22,bold=True))[2]+50))
        d.rounded_rectangle((x,211,x+width,268),radius=14,fill='#121F2F',outline='#36647D',width=2)
        txt(d,(x+23,227),label,22,'white',bold=True)
        x+=width+13
    im.save(ASSET/'cyber-security.png',optimize=True)

def institutional():
    im=section(356,'07  /  TECHNOLOGY & INSTITUTIONS','Building systems with institutional context.','Digital platforms, knowledge infrastructure, and media-aware communications.')
    d=ImageDraw.Draw(im)
    labels=[('01','Institutional systems','MYCDIC / public and internal platforms'),('02','Wikimedia ecosystem','Wikipedia · Wikimedia · Wikidata'),('03','PR & media','Digital visibility · editorial relations')]
    for k,(idx,title,sub) in enumerate(labels):
        x=64+k*507;y=217
        d.rounded_rectangle((x,y,x+470,y+100),radius=16,fill='#111C2B',outline='#33526F',width=2)
        txt(d,(x+19,y+22),idx,18,'cyan',mono=True)
        txt(d,(x+65,y+17),title,23,'white',bold=True)
        txt(d,(x+65,y+58),sub,18,'mute',maxw=390)
    im.save(ASSET/'institutions-media.png',optimize=True)

def institutional_motion():
    W_=1600;H=382
    base=canvas(H);d=ImageDraw.Draw(base)
    txt(d,(70,55),'08  /  INSTITUTIONAL DIGITAL SYSTEMS',17,'cyan',mono=True)
    txt(d,(70,115),'Digital infrastructure that holds together.',54,'white',bold=True,maxw=1000)
    txt(d,(70,202),'Public platforms  ·  Internal operations  ·  Automation  ·  Verification',23,'silver',maxw=1050)
    txt(d,(70,252),'Built to support real institutional processes beyond a single interface.',21,'mute',maxw=1000)
    # Fixed badge on right; moving dots limited to badge
    bx,by=1200,65;cx,cy=1370,205
    d.rounded_rectangle((bx,by,1530,318),radius=24,fill='#0F1A28',outline='#466987',width=2)
    for rad in [62,90]:d.ellipse((cx-rad,cy-rad,cx+rad,cy+rad),outline='#355675',width=2)
    for y in [170,205,240]:d.arc((cx-65,y-25,cx+65,y+25),0,360,fill='#355675',width=1)
    frames=[]
    for i in range(24):
        fr=base.copy();dd=ImageDraw.Draw(fr)
        for n in range(3):
            angle=(i/24*math.pi*2 + n*2*math.pi/3)
            px=cx+int(math.cos(angle)*87);py=cy+int(math.sin(angle)*58)
            dd.ellipse((px-6,py-6,px+6,py+6),fill='#A0E8FF')
        frames.append(fr.convert('P',palette=Image.Palette.ADAPTIVE,colors=128))
    frames[0].save(ASSET/'institutional.gif',save_all=True,append_images=frames[1:],duration=[95]*24,loop=0,optimize=True,disposal=2)
    frames[12].convert('RGB').save(ASSET/'institutional-preview.png',optimize=True)

if __name__=='__main__':
    header();architecture();stats();tech();google();cyber();institutional();institutional_motion();print('Generated all redesigned premium panels')
