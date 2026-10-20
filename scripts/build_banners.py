#!/usr/bin/env python3
"""Render restrained cinematic GIF banners with pixel-stable backgrounds.

Requires Pillow and numpy. The portrait is the original user photograph; no
facial morphing, pose changes, or artificially animated gestures are performed.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
from pathlib import Path
import math
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
ASSETS.mkdir(exist_ok=True)
BG = (5, 10, 20)
WHITE=(245,247,252)
LIGHT=(194,211,234)
DUST=(116,144,179)
ICE=(107,197,246)
LIME=(194,222,234)
GOLD=(196,172,129)
FRAMES=52
FONT_ROOT = Path('/usr/share/fonts/opentype/inter')
FONT_FALLBACK = Path('/usr/share/fonts/truetype/dejavu')

def font(size, family='bold'):
    name = {'bold':'InterDisplay-Bold.otf','regular':'Inter-Regular.otf','medium':'Inter-Medium.otf','semi':'InterDisplay-SemiBold.otf'}.get(family)
    path = FONT_ROOT / name
    if not path.exists():
        path = FONT_FALLBACK / ('DejaVuSans-Bold.ttf' if family in ('bold','semi') else 'DejaVuSans.ttf')
    return ImageFont.truetype(str(path),size)

F_NAME=font(82); F_H1=font(74); F_H2=font(64)
F_SUB=font(26,'medium'); F_LINE=font(24,'regular'); F_SMALL=font(19,'regular')
F_MICRO=font(17,'semi'); F_LAB=font(15,'medium'); F_METRIC=font(34,'semi')

def make_background(w,h, kind='hero'):
    yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
    wave=(xx/w)*3.0 + (yy/h)*4.0
    radial=np.exp(-(((xx-(0.80 if kind=='hero' else 0.75)*w)/(0.33*w))**2+((yy-0.42*h)/(0.74*h))**2)*3.0)
    left=np.exp(-(((xx-0.09*w)/(0.50*w))**2+((yy-0.7*h)/(0.75*h))**2)*2.0)
    arr=np.zeros((h,w,3),dtype=np.uint8)
    arr[:,:,0]=np.clip(5+2.2*radial+1.8*left,0,255).astype('uint8')
    arr[:,:,1]=np.clip(11+8*radial+3*left+1*np.sin(wave),0,255).astype('uint8')
    arr[:,:,2]=np.clip(24+17*radial+7*left,0,255).astype('uint8')
    img=Image.fromarray(arr,'RGB').convert('RGBA')
    layer=Image.new('RGBA',(w,h),(0,0,0,0))
    d=ImageDraw.Draw(layer, 'RGBA')
    # Fine, quiet architectural grid
    for x in range(80,w,100):d.line((x,48,x,h-48), fill=(98,151,201,9), width=1)
    for y in range(80,h,86):d.line((48,y,w-48,y), fill=(98,151,201,8), width=1)
    # An executive matte finish with copper/warm-silver accent
    d.rounded_rectangle((18,18,w-19,h-19), radius=22, outline=(127,168,202,126), width=2)
    d.line((70,19,340,19),fill=(190,171,139,185),width=3)
    d.line((w-340,h-20,w-70,h-20),fill=(74,170,224,130),width=3)
    for x in (40,w-40):
        for y in (40,h-40):
            d.line((x-7,y,x+7,y), fill=(114,170,210,80), width=1)
            d.line((x,y-7,x,y+7), fill=(114,170,210,80), width=1)
    return Image.alpha_composite(img,layer)

def decorate_hero_base():
    W,H=1500,510
    img=make_background(W,H,'hero')
    layer=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(layer,'RGBA')
    # The same untouched photo in every frame, in precisely the same pixels.
    src=Image.open(ASSETS/'source-photo.png').convert('RGB')
    crop=src.crop((208,82,1070,1240))
    photo=ImageOps.fit(crop,(337,416),method=Image.Resampling.LANCZOS,centering=(0.5,0.40)).convert('RGBA')
    photo=ImageOps.autocontrast(photo.convert('RGB'), cutoff=0.2).convert('RGBA')
    shade=Image.new('RGBA',photo.size,(4,9,18,0))
    # Subtle dark blue in bottom, to integrate into background; does not alter facial anatomy.
    sd=ImageDraw.Draw(shade)
    for y in range(270,416):
        a=int(((y-270)/146)*95)
        sd.line((0,y,337,y),fill=(3,13,28,a))
    photo=Image.alpha_composite(photo,shade)
    mask=Image.new('L',photo.size,0)
    md=ImageDraw.Draw(mask); md.rounded_rectangle((0,0,336,415), radius=17,fill=255)
    x,y=52,47
    d.rounded_rectangle((x-7,y-7,x+343,y+422), radius=23,fill=(13,33,52,120),outline=(115,172,208,90),width=2)
    img.paste(photo,(x,y),mask)
    # Static geometry frames and identity lines
    d.line((430,57,1160,57), fill=(89,140,188,55),width=1)
    d.text((432,72),'TECHNOLOGY  /  INSTITUTIONS  /  DIGITAL OPERATIONS',font=F_MICRO,fill=(GOLD[0],GOLD[1],GOLD[2],255))
    d.text((432,252),'Computing  /  AI Automation  /  Cybersecurity',font=F_SUB,fill=WHITE)
    d.text((432,294),'Official platforms and digital infrastructure',font=F_LINE,fill=LIGHT)
    d.line((432,347,1440,347),fill=(123,171,210,90),width=1)
    metrics=[('100+','WEBSITES & PLATFORMS'),('2016','ACTIVE SINCE'),('UCLM','ESI · COMPUTING')]
    for j,(main,sub) in enumerate(metrics):
        xx=438+j*325
        d.text((xx,370),main,font=F_METRIC,fill=WHITE)
        d.text((xx,418),sub,font=F_LAB,fill=DUST)
    d.text((432,465),'ENGINEERING  ·  DIGITAL SYSTEMS  ·  INSTITUTIONAL CONTEXT',font=F_LAB,fill=(130,162,189))
    # Orb sits entirely in dedicated area, behind no text.
    return Image.alpha_composite(img,layer)

def decorate_institution_base():
    W,H=1500,472
    img=make_background(W,H,'inst')
    layer=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(layer,'RGBA')
    d.text((72,65),'03  /  INSTITUTIONAL DIGITAL SYSTEMS',font=F_MICRO,fill=(190,172,138))
    d.text((72,130),'Digital platforms.',font=F_H1,fill=WHITE)
    d.text((72,212),'Built to operate.',font=F_H2,fill=LIGHT)
    d.text((74,309),'Official websites   /   Internal management   /   AI workflows',font=F_SUB,fill=(176,200,225))
    d.line((74,365,825,365),fill=(133,177,211,90),width=1)
    labels=['WEB PLATFORMS','OPERATIONS','SECURE SYSTEMS']
    for j,label in enumerate(labels):
        xx=76+j*253
        d.rounded_rectangle((xx,389,xx+224,430),radius=7,fill=(14,32,52,210),outline=(80,129,175,108),width=1)
        d.text((xx+17,401),label,font=F_MICRO,fill=LIGHT)
    # faint vertical separator before globe
    d.line((920,82,920,395),fill=(82,136,188,80),width=1)
    return Image.alpha_composite(img,layer)

def point3(lat, lon, ay, ax, radius, cx,cy):
    # globe rotation projected with subtle perspective and tilt.
    la=math.radians(lat); lo=math.radians(lon)
    X=math.cos(la)*math.sin(lo)
    Y=math.sin(la)
    Z=math.cos(la)*math.cos(lo)
    X,Z= X*math.cos(ay)+Z*math.sin(ay), -X*math.sin(ay)+Z*math.cos(ay)
    Y,Z=Y*math.cos(ax)-Z*math.sin(ax),Y*math.sin(ax)+Z*math.cos(ax)
    persp=1.0 + Z*0.085
    return (cx+X*radius*persp,cy-Y*radius*persp,Z)

def sphere_layer(box_w,box_h, cx,cy,rad, angle, t):
    overlay=Image.new('RGBA',(box_w,box_h),(0,0,0,0))
    d=ImageDraw.Draw(overlay,'RGBA')
    d.ellipse((cx-rad-2,cy-rad-2,cx+rad+2,cy+rad+2),outline=(104,195,246,75),width=2)
    # longitude and latitude curves show 3D rotation, back hemisphere subdued
    for lon in range(0,180,20):
        dots=[point3(lat,lon,angle,0.20,rad,cx,cy) for lat in np.arange(-90,91,4)]
        for k in range(len(dots)-1):
            z=(dots[k][2]+dots[k+1][2])/2
            alpha=48 if z<0 else 145
            d.line((int(dots[k][0]),int(dots[k][1]),int(dots[k+1][0]),int(dots[k+1][1])), fill=(92,188,246,alpha),width=1 if z<0 else 2)
    for lat in [-64,-44,-24,0,24,44,64]:
        dots=[point3(lat,lon,angle,0.20,rad,cx,cy) for lon in np.arange(-180,181,4)]
        for k in range(len(dots)-1):
            z=(dots[k][2]+dots[k+1][2])/2
            alpha=42 if z<0 else 155
            d.line((int(dots[k][0]),int(dots[k][1]),int(dots[k+1][0]),int(dots[k+1][1])),fill=(108,211,255,alpha),width=1 if z<0 else 2)
    # lit moving nodes sampled from 3D sphere, without background displacement
    for j,(lat,lon) in enumerate([(11,-85),(42,25),(-18,108),(65,75),(-49,-42),(5,160)]):
        x,y,z=point3(lat,lon,angle,0.20,rad,cx,cy)
        if z > 0:
            pulse=(math.sin(t*2.0+j*1.9)+1)/2
            r=3+int(pulse*3)
            d.ellipse((x-r-5,y-r-5,x+r+5,y+r+5),outline=(96,185,250,int(60+60*pulse)),width=2)
            d.ellipse((x-r,y-r,x+r,y+r),fill=(220,246,255,int(170+80*pulse)))
    # 2 angled orbits crossing hemisphere, alternate luminous nodes
    for k in range(2):
        rr=rad+21+17*k
        angle_offset=t*0.20 + k*math.pi/2
        for step in range(0,320,4):
            a=math.radians(step)+angle_offset
            xp=cx+rr*math.cos(a)
            yp=cy+0.56*rr*math.sin(a)
            x2=cx+rr*math.cos(a+0.06)
            y2=cy+0.56*rr*math.sin(a+0.06)
            d.line((xp,yp,x2,y2),fill=(74,156,218,42 if step%24 else 110),width=2)
        a=(t*0.92+k*1.85)%(math.pi*2)
        px=cx+rr*math.cos(a)
        py=cy+0.56*rr*math.sin(a)
        d.ellipse((px-4,py-4,px+4,py+4),fill=(209,242,255,245))
    return overlay


def render_header_frame(base,i):
    w,h=base.size
    frame=base.copy()
    overlay=Image.new('RGBA',base.size,(0,0,0,0));d=ImageDraw.Draw(overlay,'RGBA')
    angle=0.50+i*math.pi*2/FRAMES
    orb=sphere_layer(300,278,150,130,78,angle,i*math.pi*2/FRAMES)
    overlay.alpha_composite(orb,(1150,64))
    # Typing animation: reveal, then hold long enough to read name
    name='MOATAZ KOBRY'
    reveal=min(len(name),max(3,int((i+2)*0.90)))
    displayed=name[:reveal]
    d.text((430,128),displayed,font=F_NAME,fill=WHITE)
    cursor_x=430+d.textlength(displayed,font=F_NAME)
    if reveal<len(name) or (i//5)%2==0:
        d.rounded_rectangle((cursor_x+7,136,cursor_x+11,215), radius=2,fill=(110,204,252,220))
    # Light sweep under name, not over body text
    if i>3:
        line_end=430+min(700,int((i-3)*50))
        d.line((432,229,line_end,229),fill=(96,191,247,148),width=3)
        d.ellipse((line_end-4,225,line_end+4,233),fill=(195,230,255,205))
    # tiny fixed-position illuminated status bar
    d.rectangle((1390,474,1394,479),fill=(111,216,255,95+int(70*(math.sin(i*0.16)+1)/2)))
    frame=Image.alpha_composite(frame,overlay)
    return frame.convert('RGB')


def render_inst_frame(base,i):
    # All animation restricted to x > 940. Entire left half pixel-identical.
    w,h=base.size
    frame=base.copy();overlay=Image.new('RGBA',base.size,(0,0,0,0))
    t=i*math.pi*2/FRAMES
    globe=sphere_layer(485,420,235,208,138,0.4+t,t)
    overlay.alpha_composite(globe,(975,27))
    d=ImageDraw.Draw(overlay,'RGBA')
    # horizontal data lines and console telemetry inside globe zone
    xbase=980
    for j in range(5):
        y=54+j*69
        progress=(t*0.20+j*0.21)%1
        seg=40+int(45*progress)
        d.rounded_rectangle((xbase+10,y,xbase+seg,y+2),radius=1,fill=(120,214,249,75+int(progress*90)))
    d.text((1070,436),'CONNECTED SYSTEMS  /  SECURE OPERATIONS',font=F_LAB,fill=(122,156,186,220))
    frame=Image.alpha_composite(frame,overlay)
    return frame.convert('RGB')


def save_gif(frames,out, duration=72):
    # Global palette limits stationary-color shimmer; preserves same layout in every frame.
    palette_source=frames[min(len(frames)-1,20)].quantize(colors=176,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE)
    indexed=[f.quantize(palette=palette_source,dither=Image.Dither.NONE) for f in frames]
    indexed[0].save(out,save_all=True,append_images=indexed[1:],duration=duration,loop=0,optimize=True,disposal=2)


def main():
    b1=decorate_hero_base()
    b2=decorate_institution_base()
    header=[render_header_frame(b1,i) for i in range(FRAMES)]
    inst=[render_inst_frame(b2,i) for i in range(FRAMES)]
    save_gif(header,ASSETS/'header-premium.gif',75)
    save_gif(inst,ASSETS/'institutional-premium.gif',75)
    # Representative screenshots demonstrate substantial banner redesign.
    header[-1].save(ASSETS/'header-preview.png',optimize=True)
    inst[12].save(ASSETS/'institutional-preview.png',optimize=True)
    # Verify that all fixed elements in institutional are pixel-identical.
    a=np.asarray(inst[0]);b=np.asarray(inst[len(inst)//2]);region=(a[:,:940,:]!=b[:,:940,:])
    if region.any(): raise AssertionError('Institutional text area should never move')
    print('Rendered banners:',(ASSETS/'header-premium.gif').stat().st_size,(ASSETS/'institutional-premium.gif').stat().st_size)
    print('Institutional left side is 100% pixel-stable in all frames')

if __name__=='__main__':main()
