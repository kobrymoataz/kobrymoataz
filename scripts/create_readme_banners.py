#!/usr/bin/env python3
"""Generate GitHub-safe artwork with strictly bounded typography and motion inside fixed panels."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageEnhance
import math
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
FONTS = Path('/usr/share/fonts/truetype/dejavu')
B = str(FONTS / 'DejaVuSans-Bold.ttf')
R = str(FONTS / 'DejaVuSans.ttf')
M = str(FONTS / 'DejaVuSansMono.ttf')
W = 1600
COLOR = dict(bg='#060d13', paper='#eaf3f4', muted='#acc0cb', teal='#86d7dc', blue='#537c91', gold='#bca784', card='#0e1d27')

def f(name, size):
    return ImageFont.truetype({'b':B,'r':R,'m':M}[name], size)

def base(h):
    yy = np.linspace(0, 1, h, dtype=np.float32)[:,None,None]
    arr = np.zeros((h,W,3),dtype=np.uint8)
    top=np.array((6,13,20),dtype=np.float32); bottom=np.array((5,16,23),dtype=np.float32)
    arr[:,:,:] = (top*(1-yy)+bottom*yy).astype(np.uint8)
    image = Image.fromarray(arr, 'RGB').convert('RGBA')
    d = ImageDraw.Draw(image,'RGBA')
    # The background is intentionally clean: no grid lines crossing live typography.
    d.line((42,h-48,1010,h-48), fill=(96,143,155,35), width=1)
    d.rounded_rectangle((20,20,W-20,h-20),radius=24,outline=(107,158,178,85),width=2)
    d.line((43,43,160,43),fill=(116,212,218,190),width=3)
    return image

def type_safe(d,xy,text,font,fill,region):
    bbox=d.textbbox(xy,text,font=font)
    if bbox[0]<region[0] or bbox[1]<region[1] or bbox[2]>region[2] or bbox[3]>region[3]:
        raise ValueError(f'Text exceeds safe region: {text!r}, bbox={bbox}, region={region}')
    d.text(xy,text,font=font,fill=fill)

def publish(frames,filename,duration=85):
    p=ASSETS/filename
    converted=[]
    # keep palette stable enough for smooth animation
    for im in frames:
        converted.append(im.convert('RGB').quantize(colors=256,method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE))
    converted[0].save(p,save_all=True,append_images=converted[1:],duration=[duration]*(len(converted)-1)+[1200],loop=0,optimize=True,disposal=2)
    frames[-1].convert('RGB').save(ASSETS/(filename.replace('.gif','-poster.webp')),format='WEBP',quality=88,method=6)
    print(filename,len(frames),'frames',p.stat().st_size,'bytes')

def hero():
    H=510
    bg=base(H)
    d=ImageDraw.Draw(bg,'RGBA')
    d.text((71,64),'COMPUTING   /   AI AUTOMATION   /   CYBERSECURITY',font=f('m',20),fill=(147,205,211,220))
    d.text((72,319),'Digital platforms and secure institutional systems',font=f('r',27),fill='#e5eeef')
    d.text((72,365),'Building real products, platforms and workflows since 2016.',font=f('r',20),fill='#9cafbd')
    data=[('2016','WORKING SINCE'),('100+','DIGITAL PLATFORMS'),('UCLM / ESI','COMPUTING')]
    for i,(value,label) in enumerate(data):
        x=70+i*298
        d.rounded_rectangle((x,412,x+275,472),radius=11,fill=(15,31,43,255),outline=(72,118,137,180),width=1)
        type_safe(d,(x+17,421),value,f('b',23),'#eff5f4',(x+10,416,x+264,449))
        type_safe(d,(x+18,450),label,f('m',11),'#93b7c1',(x+10,440,x+264,473))
    # fixed portrait in a bounded panel (only once)
    d.rounded_rectangle((1157,54,1531,454),radius=19,fill=(15,25,34,255),outline=(110,161,178,178),width=2)
    source=Image.open(ROOT/'site/src/assets/portrait.webp').convert('RGB')
    source=ImageEnhance.Contrast(source).enhance(1.05)
    image=ImageOps.fit(source,(350,367),method=Image.Resampling.LANCZOS,centering=(0.5,0.35))
    photo=Image.new('RGBA',(350,367),(0,0,0,0))
    mask=Image.new('L',(350,367),0)
    ImageDraw.Draw(mask).rounded_rectangle((0,0,349,366),radius=14,fill=255)
    photo.paste(image,(0,0),mask)
    bg.alpha_composite(photo,(1169,67))
    d=ImageDraw.Draw(bg,'RGBA')
    d.rectangle((1170,403,1519,433),fill=(6,13,20,218))
    type_safe(d,(1192,409),'DIGITAL SYSTEMS  /  01',f('m',14),'#c1dddd',(1180,401,1516,435))
    # fixed line behind name
    d.line((74,290,975,290),fill=(91,134,150,95),width=1)
    frames=[]
    first='MOATAZ'; second='KOBRY.'
    for i in range(26):
        im=bg.copy(); draw=ImageDraw.Draw(im,'RGBA')
        n1=min(len(first),i//2+1)
        n2=min(len(second),max(0,(i-10)//2+1))
        type_safe(draw,(70,123),first[:n1],f('b',83),'#f1f7f7',(62,114,1100,218))
        if n2:
            type_safe(draw,(70,214),second[:n2],f('b',83),'#87d8dc',(62,206,1100,304))
        if i%5<3 and i<23:
            line_y = 215 if n2==0 else 303
            x0=70+(draw.textlength(first[:n1] if n2==0 else second[:n2],font=f('b',83)))
            if x0<1080: draw.line((x0+4,line_y-74,x0+4,line_y-9),fill=(192,235,237,210),width=3)
        # tiny orbit nodes behind photo, leftmost cannot cross text column
        angle = 2*math.pi*i/26
        center=(1340,245)
        # A highlight travels exclusively around the photo frame, never over the face.
        border_x=1178 + int(i*330/25)
        draw.line((border_x,55,border_x+18,55),fill=(168,224,221,210),width=3)
        frames.append(im)
    publish(frames,'hero.gif',83)


def architecture():
    H=458
    bg=base(H);d=ImageDraw.Draw(bg,'RGBA')
    type_safe(d,(70,60),'02  /  SYSTEMS ARCHITECTURE',f('m',20),'#9ecfd4',(60,50,1050,97))
    type_safe(d,(70,106),'From interface to verified output.',f('b',50),'#f0f6f5',(60,98,1512,183))
    type_safe(d,(71,187),'Five connected layers. One dependable operating model.',f('r',24),'#aabec8',(60,176,1420,225))
    cards=[('PUBLIC WEB','Digital experience'),('OPERATIONS','People and tasks'),('DATA & APIs','Records and services'),('AUTOMATION','Apps Script + logic'),('VALIDATION','Proof and output')]
    boxes=[]
    for i,(heading,body) in enumerate(cards):
        x=62+i*303;y=255;w=268;h=112
        d.rounded_rectangle((x,y,x+w,y+h),radius=14,fill=(14,29,41,245),outline=(68,116,135,210),width=2)
        d.rounded_rectangle((x+13,y+14,x+48,y+48),radius=8,fill=(26,64,72,200))
        type_safe(d,(x+19,y+22),str(i+1).zfill(2),f('m',15),'#b6e8e8',(x+13,y+14,x+48,y+48))
        type_safe(d,(x+61,y+20),heading,f('b',19),'#edf5f5',(x+56,y+9,x+w-8,y+60))
        type_safe(d,(x+18,y+77),body,f('r',18),'#b4c7cc',(x+10,y+66,x+w-7,y+109))
        boxes.append((x,y,w,h))
    d.text((70,409),'A conceptual engineering workflow, not a schematic of a particular production environment.',font=f('r',17),fill='#7c9ba9')
    frames=[]
    for i in range(22):
        im=bg.copy(); di=ImageDraw.Draw(im,'RGBA')
        for k in range(4):
            x0=boxes[k][0]+boxes[k][2]+3
            x1=boxes[k+1][0]-3
            y=310
            di.line((x0,y,x1,y),fill=(91,151,166,150),width=3)
            phase=(i*3+k*11)%max(1,x1-x0)
            xx=x0+phase
            di.ellipse((xx-4,y-4,xx+4,y+4),fill=(201,245,242,255))
        frames.append(im)
    publish(frames,'architecture.gif',100)


def institutional():
    H=374
    bg=base(H);d=ImageDraw.Draw(bg,'RGBA')
    type_safe(d,(67,63),'06  /  INSTITUTIONAL DIGITAL SYSTEMS',f('m',19),'#9ecfd4',(58,54,1050,102))
    type_safe(d,(67,112),'Platforms built for operations.',f('b',54),'#edf5f4',(57,99,1133,194))
    type_safe(d,(70,203),'Official website  /  Internal management platform',f('r',25),'#c2d4d7',(60,192,1120,246))
    type_safe(d,(70,245),'Automation  •  Documents  •  Verification',f('r',24),'#9eb9c4',(60,232,1120,289))
    type_safe(d,(70,321),'ENGINEERING WITH INSTITUTIONAL CONTEXT',f('m',17),'#8dbcc3',(60,309,1070,352))
    # independent globe portal right
    d.rounded_rectangle((1167,52,1538,326),radius=16,fill=(12,29,40,240),outline=(72,117,138,160),width=2)
    center=(1353,182); radius=105
    # static latitudes and outline
    d.ellipse((center[0]-radius,center[1]-radius,center[0]+radius,center[1]+radius),outline=(127,201,214,160),width=2)
    for j in (-2,-1,0,1,2):
        dy=j*29
        width=int(radius*math.sqrt(max(0.01,1-(dy/radius)**2)))
        d.ellipse((center[0]-width,center[1]+dy-12,center[0]+width,center[1]+dy+12),outline=(91,159,174,65),width=1)
    frames=[]
    for i in range(26):
        im=bg.copy();di=ImageDraw.Draw(im,'RGBA')
        phi=2*math.pi*i/26
        for j in range(6):
            a=phi+j*math.pi/3
            xx=int(center[0]+math.sin(a)*radius*0.92)
            if xx<1238 or xx>1468: continue
            di.arc((xx-37,center[1]-radius,xx+37,center[1]+radius),90,270,fill=(105,179,190,95),width=1)
        for shift in (0,math.pi):
            ox=int(center[0]+math.cos(phi+shift)*113)
            oy=int(center[1]+math.sin(phi+shift)*56)
            di.ellipse((ox-4,oy-4,ox+4,oy+4),fill=(202,244,238,230))
        # bottom signal bars, within portal only
        for j in range(6):
            h=5+int((1+math.sin(phi+j))*5)
            x=1210+j*15
            di.rounded_rectangle((x,303-h,x+5,303),radius=2,fill=(100,206,208,150))
        frames.append(im)
    publish(frames,'institutional.gif',90)

if __name__=='__main__':
    hero();architecture();institutional()
