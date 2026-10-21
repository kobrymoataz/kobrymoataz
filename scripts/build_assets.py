from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageOps, ImageFilter
import math, shutil

ROOT=Path(__file__).resolve().parents[1]
BA=ROOT/'assets'/'banners'
WEB=ROOT/'docs'/'assets'
BA.mkdir(parents=True,exist_ok=True)
WEB.mkdir(parents=True,exist_ok=True)
PHOTO=ROOT/'assets'/'source-portrait.png'
FREG='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FBOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FMONO='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
BG=(10,15,20); PANEL=(17,24,30); PANEL2=(22,30,36); IVORY=(242,237,224); MUTED=(166,179,184); ACCENT=(196,170,125); BLUE=(109,167,175)

def font(s,bold=False,mono=False):return ImageFont.truetype(FMONO if mono else (FBOLD if bold else FREG),s)

def crop_photo(sz=(430,430)):
 im=Image.open(PHOTO).convert('RGB')
 im=ImageOps.fit(im,sz,method=Image.Resampling.LANCZOS,centering=(.5,.45))
 gray=ImageOps.grayscale(im)
 out=ImageOps.colorize(gray,black='#141a20',white='#d8dde0')
 return out

def bg_base(w,h):
 im=Image.new('RGB',(w,h),BG)
 d=ImageDraw.Draw(im)
 # quiet architectural vertical drafting lines on right only
 for x in range(1040,w,42): d.line((x,0,x,h),fill=(22,36,43),width=1)
 for y in range(0,h,42): d.line((1040,y,w,y),fill=(22,36,43),width=1)
 d.rectangle((0,0,11,h),fill=ACCENT)
 d.line((60,58,w-60,58),fill=(62,72,75),width=2)
 d.line((60,h-55,w-60,h-55),fill=(62,72,75),width=2)
 d.rectangle((w-255,58,w-60,63),fill=ACCENT)
 return im

def draw_base_text(im, eyebrow, title, lines, note):
 d=ImageDraw.Draw(im)
 d.text((67,86),eyebrow,fill=ACCENT,font=font(20,mono=True))
 # draw title as split lines with safe max width < 960
 ty=135
 for text in title:
  fi=font(63,bold=True)
  if d.textbbox((0,0),text,font=fi)[2]>900:fi=font(54,bold=True)
  d.text((65,ty),text,fill=IVORY,font=fi)
  ty+=74
 d.line((65,ty+1,260,ty+1),fill=ACCENT,width=5)
 ty+=23
 for line in lines:
  d.text((65,ty),line,fill=MUTED,font=font(23))
  ty+=40
 d.text((65,441),note,fill=ACCENT,font=font(18,mono=True))

def make_hero():
 W,H=1500,520
 base=bg_base(W,H)
 draw_base_text(base,'01 / COMPUTING · INTELLIGENT SYSTEMS',['MOATAZ KOBRY'],['AI automation     /     Cybersecurity     /     Digital platforms','UCLM ESI     ·     Working since 2016'],'100+ DIGITAL WEBSITES & PLATFORMS')
 d=ImageDraw.Draw(base)
 # identity info small
 d.text((67,371),'Technical direction, institutional execution, and applied AI.',fill=IVORY,font=font(21))
 d.rounded_rectangle((1046,76,1435,461),radius=18,fill=PANEL,outline=(79,91,91),width=2)
 portrait=crop_photo((356,356))
 mask=Image.new('L',(356,356),0);ImageDraw.Draw(mask).rounded_rectangle((0,0,355,355),radius=13,fill=255)
 base.paste(portrait,(1063,92),mask)
 d=ImageDraw.Draw(base)
 d.text((1078,432),'COMPUTING   /   AI AUTOMATION',font=font(13,mono=True),fill=IVORY)
 frames=[]
 for i in range(24):
  fr=base.copy(); dr=ImageDraw.Draw(fr)
  # animated systems pulse in identity rail, never overlaps text
  x=1320+(i%24)*4
  dr.line((x,53,x+32,53),fill=IVORY,width=4)
  # corner pulse dot outside photo border
  a=math.pi*2*i/24
  cx,cy=1022,425; r=16
  dr.ellipse((cx-3+math.cos(a)*r,cy-3+math.sin(a)*r,cx+3+math.cos(a)*r,cy+3+math.sin(a)*r),fill=ACCENT)
  frames.append(fr.convert('P',palette=Image.Palette.ADAPTIVE,colors=72))
 frames[0].save(BA/'hero.gif',save_all=True,append_images=frames[1:],duration=95,loop=0,optimize=True,disposal=2)
 base.save(ROOT/'qa'/'hero-preview.png')

def make_architecture():
 W,H=1500,520
 base=bg_base(W,H)
 draw_base_text(base,'02 / ARCHITECTURE',['CONNECTED SYSTEMS','BUILT TO OPERATE'],['Interfaces  /  Data  /  Workflows','Automation  /  Verification'],'DESIGN · DELIVER · MAINTAIN')
 d=ImageDraw.Draw(base)
 # right diagram in reserved 1038-1440 zone, separate panel
 d.rounded_rectangle((1045,80,1435,452),radius=18,fill=PANEL,outline=(78,91,95),width=2)
 centers=[(1120,162),(1320,162),(1120,286),(1320,286)]
 node_labels=['INPUT','LOGIC','DATA','OUTPUT']
 connectors=[(0,1),(0,2),(1,3),(2,3)]
 for ia,ib in connectors:
  (x1,y1),(x2,y2)=centers[ia],centers[ib];d.line((x1,y1,x2,y2),fill=(66,96,101),width=2)
 for (cx,cy),lab in zip(centers,node_labels):
  d.ellipse((cx-37,cy-37,cx+37,cy+37),fill=PANEL2,outline=BLUE,width=2)
  bb=d.textbbox((0,0),lab,font=font(13,mono=True)); d.text((cx-(bb[2]-bb[0])/2,cy-8),lab,fill=IVORY,font=font(13,mono=True))
 d.text((1082,387),'WORKFLOW / ROUTING',font=font(19,mono=True),fill=ACCENT)
 frames=[]
 for i in range(32):
  fr=base.copy(); dr=ImageDraw.Draw(fr)
  for idx,(a,b) in enumerate(connectors):
   x1,y1=centers[a];x2,y2=centers[b];t=((i/31)+idx*.19)%1
   px=x1+(x2-x1)*t;py=y1+(y2-y1)*t
   dr.ellipse((px-5,py-5,px+5,py+5),fill=ACCENT)
  frames.append(fr.convert('P',palette=Image.Palette.ADAPTIVE,colors=64))
 frames[0].save(BA/'architecture.gif',save_all=True,append_images=frames[1:],duration=85,loop=0,optimize=True,disposal=2)
 base.save(ROOT/'qa'/'architecture-preview.png')

def make_institutional():
 W,H=1500,520
 base=bg_base(W,H)
 draw_base_text(base,'03 / INSTITUTIONAL DIMENSION',['TECHNOLOGY WITH','INSTITUTIONAL REACH'],['MYCDIC  /  Structured public presence','Wikimedia ecosystem  /  Media relations'],'COLLABORATION · INFORMATION · DELIVERY')
 d=ImageDraw.Draw(base)
 d.rounded_rectangle((1045,80,1435,452),radius=18,fill=PANEL,outline=(78,91,95),width=2)
 cx,cy=1240,249
 # fixed arcs + horizontal axis
 for r in [52,95,139]:d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=(80,111,112),width=2)
 d.line((1084,cy,1395,cy),fill=(80,111,112),width=2)
 d.line((cx,107,cx,389),fill=(80,111,112),width=2)
 d.text((1088,390),'NETWORK / CONTEXT',font=font(19,mono=True),fill=ACCENT)
 frames=[]
 for i in range(32):
  fr=base.copy();dr=ImageDraw.Draw(fr)
  a=2*math.pi*i/32
  for offset,r in [(0,138),(2.1,94),(4.2,52)]:
   x=cx+math.cos(a+offset)*r;y=cy+math.sin(a+offset)*r
   dr.ellipse((x-6,y-6,x+6,y+6),fill=ACCENT)
  frames.append(fr.convert('P',palette=Image.Palette.ADAPTIVE,colors=72))
 frames[0].save(BA/'institutional.gif',save_all=True,append_images=frames[1:],duration=85,loop=0,optimize=True,disposal=2)
 base.save(ROOT/'qa'/'institutional-preview.png')

if __name__=='__main__':
 make_hero();make_architecture();make_institutional()
 photo=crop_photo((840,840)); photo.save(WEB/'portrait.webp','WEBP',quality=88,method=6)
 print('Done assets:')
 for p in BA.glob('*'):print(p.name,p.stat().st_size)
