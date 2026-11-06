import json
from PIL import Image, ImageDraw, ImageFont
exec(open('herr.py').read().split('# ---- pico del padre')[0])   # D, pal, put
pal.update({'Q':'#df7126','R':'#fbf236','S':'#9badb7','V':'#595652','Y':'#fbf236','O':'#df7126'})
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
    f=sin_pico(D['anims']['reposo'][0])
    cuerpo=['000000','0YYYO0','0YOYO0','0OOOO0','000000']
    for j,row in enumerate(cuerpo):
        for i,c in enumerate(row): put(f,16+j,18+i,c)
    a,b=('S','V') if k%2==0 else ('V','S')
    for j,y in enumerate(range(21,28)):
        w = 2 if j<4 else 1
        x0 = 20 - (1 if j<4 else 0)
        for i in range(w+ (1 if j<4 else 0)):
            put(f,y,x0+i, a if (j+i)%2==0 else b)
        put(f,y,x0-1,'0'); put(f,y,x0+w+(1 if j<4 else 0),'0')
    put(f,28,20,'0')
    CH=[[(29,18,'b'),(29,22,'n'),(28,23,'b')],[(29,21,'b'),(28,17,'n'),(30,19,'b')],[(30,22,'b'),(29,19,'n'),(28,23,'n')]][k%3]
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
filas=[('Pico del padre (naranja dorado)',None),('Quieto',[pico_padre(x) for x in D['anims']['reposo']]),('Andar',[pico_padre(x) for x in D['anims']['andar']]),('Picar',[pico_padre(x) for x in D['anims']['picar_lado']]),
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
