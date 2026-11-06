import json
from PIL import Image, ImageDraw, ImageFont
exec(open('herr.py').read().split('# ---- pico del padre')[0])   # D, pal, put
pal.update({'Q':'#b8862f','R':'#e3b85a','S':'#9badb7','V':'#595652','Y':'#fbf236','O':'#df7126'})
# 1) pico del padre: toda la cabeza del pico naranja dorado
def pico_padre(fr):
    f=list(fr)
    for y,r in enumerate(f):
        for x,c in enumerate(r):
            if c=='f': put(f,y,x,'Q')
            elif c=='g': put(f,y,x,'R')
    return f
def sin_pico(fr):
    f=list(fr)
    for y in range(9,14):
        for x in range(17,32): put(f,y,x,'.')
    for x in range(19,32): put(f,14,x,'.')
    for x in range(20,32): put(f,15,x,'.')
    return f
# 2) taladrar hacia abajo: el taladro en vertical, delante de Deep, la broca hacia el suelo
def tal_abajo(k):
    # como Mr. Driller: el taladro delante de Deep, agarrado con las dos manos, la broca hacia el suelo entre las patas
    f=sin_pico(D['anims']['reposo'][0])
    for y,xs in ((14,range(17,19)),(15,range(16,20)),(16,range(17,20))):
        for x in xs: put(f,y,x,'.')   # fuera la mano del pico
    cuerpo=['.0000000.','0YYYYYYO0','0YOYYYOO0','0OOOOOOO0','.0000000.']
    for j,row in enumerate(cuerpo):
        for i,c in enumerate(row):
            if c!='.': put(f,17+j,5+i,c)
    for y in (18,19):  # manos a los lados
        put(f,y,4,'k'); put(f,y,14,'k')
    put(f,17,4,'0'); put(f,20,4,'0'); put(f,17,14,'0'); put(f,20,14,'0'); put(f,18,3,'0'); put(f,19,3,'0'); put(f,18,15,'0'); put(f,19,15,'0')
    a,b=('S','V') if k%2==0 else ('V','S')
    for j,y in enumerate(range(22,29)):
        w = 3 if j<3 else (2 if j<5 else 1)
        x0 = 9 - (w//2)
        for i in range(w): put(f,y,x0+i, a if (j+i)%2==0 else b)
        put(f,y,x0-1,'0'); put(f,y,x0+w,'0')
    put(f,29,9,'0')
    CH=[[(30,7,'b'),(30,11,'n'),(29,12,'b')],[(30,9,'b'),(29,6,'n'),(30,12,'b')],[(30,6,'b'),(30,10,'n'),(29,12,'n')]][k%3]
    for y,x,c in CH: put(f,y,x,c)
    return f
# 3) picar hacia arriba: preparar (pico levantado, el de picar de lado) y golpe arriba (pico por encima del casco)
def golpe_arriba(k):
    f=sin_pico(D['anims']['reposo'][0])
    # brazo y mango en vertical junto al casco
    for y in range(3,15): put(f,y,17,'h'); put(f,y,16,'0') if f[y][16]=='.' else None; put(f,y,18,'0')
    put(f,14,17,'k'); put(f,15,17,'k'); put(f,13,17,'k')
    # cabeza del pico, horizontal, arriba
    yy = 2 - k
    for x in range(12,23): put(f,yy,x,'g' if x%3 else 'f'); put(f,yy-1,x,'0'); put(f,yy+1,x,'0') if x!=17 else None
    put(f,yy,11,'0'); put(f,yy,23,'0'); put(f,yy+1,12,'f'); put(f,yy+1,22,'f'); put(f,yy+2,12,'0'); put(f,yy+2,22,'0')
    if k==1:
        for y,x,c in [(0,14,'b'),(0,20,'n'),(0,17,'b')]: put(f,y,x,c)
    return f
ARR=[D['anims']['picar_lado'][1], golpe_arriba(0), golpe_arriba(1)]
TAB=[tal_abajo(k) for k in range(3)]
S=7
def img(fr,s=S):
    im=Image.new('RGBA',(32,31),(0,0,0,0))
    for y,r in enumerate(fr):
        for x,c in enumerate(r):
            if c!='.': h=pal[c]; im.putpixel((x,y),tuple(int(h[j:j+2],16) for j in (1,3,5))+(255,))
    return im.resize((32*s,31*s),Image.NEAREST)
fB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',30); f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
LW=190; CW=32*S+12; RH=31*S+12
filas=[('Pico del padre (ocre)',None),('Quieto',[pico_padre(x) for x in D['anims']['reposo']]),('Andar',[pico_padre(x) for x in D['anims']['andar']]),('Picar',[pico_padre(x) for x in D['anims']['picar_lado']]),
       ('Taladrar hacia abajo',None),('Taladrando',TAB),('Picar hacia arriba (nuevo)',None),('Picar arriba',ARR)]
H=sum(50 if v is None else RH for _,v in filas)+10
out=Image.new('RGB',(LW+4*CW+10,H),(58,48,40)); d=ImageDraw.Draw(out); y=0
for et,L in filas:
    if L is None: d.text((10,y+10),et,font=fB,fill=(251,242,54)); y+=50; continue
    d.text((10,y+RH//2-12),et,font=f,fill=(240,230,210))
    for i,fr in enumerate(L):
        x0=LW+i*CW; d.rectangle((x0-2,y-2,x0+32*S+1,y+31*S+1),fill=(80,66,56)); t=img(fr); out.paste(t,(x0,y),t)
    y+=RH
out.save('pico_y_taladro_2.png')
def gif(frames,name,dur,suelo=False,techo=False,sacude=False):
    fs=[]
    for k,fr in enumerate(frames):
        base=Image.new('RGBA',(32*6,31*6+40),(58,48,40,255)); dr=ImageDraw.Draw(base)
        if suelo: dr.rectangle((0,31*6-6,32*6,31*6+40),fill=(43,74,138))
        if techo: dr.rectangle((0,0,32*6,30),fill=(105,106,106))
        t=img(fr,6); base.alpha_composite(t,((k%2 if sacude else 0), 20 if techo else 0)); fs.append(base.convert('RGB'))
    fs[0].save(name,save_all=True,append_images=fs[1:],duration=dur,loop=0)
gif([pico_padre(x) for x in D['anims']['picar_lado']],'pico_padre_picar_2.gif',90)
gif(TAB*4,'taladro_abajo.gif',60,suelo=True,sacude=True)
gif(ARR*2,'picar_arriba.gif',140,techo=True)
print(out.size)
