import json, copy
from PIL import Image, ImageDraw, ImageFont
D=json.load(open('deep.json')); pal=dict(D['pal'])
pal.update({'S':'#9badb7','T':'#e8f0ff','Y':'#fbf236','O':'#df7126','V':'#595652','W':'#cbdbfc'})
def put(f,y,x,c):
    if 0<=y<31 and 0<=x<32: f[y]=f[y][:x]+c+f[y][x+1:]
# ---- pico del padre: la cabeza (f, g) en acero claro, con el símbolo dorado de la cuadrilla
def pico_padre(fr):
    f=list(fr); gs=[]
    for y,r in enumerate(f):
        for x,c in enumerate(r):
            if c=='f': put(f,y,x,'S')
            elif c=='g': put(f,y,x,'T'); gs.append((y,x))
    if gs:
        y,x=gs[len(gs)//2]; put(f,y,x,'b')   # el símbolo
    return f
# ---- taladro: Deep quieto, sin el pico, con el taladro en la mano apuntando a la derecha
def sin_pico(fr):
    f=list(fr)
    for y in range(9,14):
        for x in range(17,32): put(f,y,x,'.')
    for x in range(19,32): put(f,14,x,'.')
    for x in range(20,32): put(f,15,x,'.')
    return f
def taladro(k):
    f=sin_pico(D['anims']['reposo'][0])
    cuerpo=['000000','0YYYO0','0YYOY0','0OOOO0','.0YY0.']
    for j,row in enumerate(cuerpo):
        for i,c in enumerate(row):
            if c!='.': put(f,13+j,19+i,c)
    # broca que gira: las rayas cambian de sitio en cada fotograma
    a,b=('S','V') if k%2==0 else ('V','S')
    for i,x in enumerate(range(25,29)):
        put(f,14,x,a if i%2==0 else b); put(f,16,x,b if i%2==0 else a)
    for i,x in enumerate(range(25,31)): put(f,15,x,a if i%2 else b)
    put(f,14,29,'0'); put(f,16,29,'0'); put(f,15,31,'0')
    for x in range(25,29): put(f,13,x,'0'); put(f,17,x,'0')
    # chispas
    CH=[[(12,30,'n'),(18,31,'b'),(14,31,'b')],[(13,31,'b'),(17,30,'n'),(11,29,'b')],[(16,31,'n'),(12,31,'b'),(18,29,'b')]][k%3]
    for y,x,c in CH: put(f,y,x,c)
    return f
TAL=[taladro(k) for k in range(3)]
json.dump({'taladro':TAL,'pal':{k:pal[k] for k in 'STYOVW'}},open('herr.json','w'))
S=7
def img(fr,s=S):
    im=Image.new('RGBA',(32,31),(0,0,0,0))
    for y,r in enumerate(fr):
        for x,c in enumerate(r):
            if c!='.': h=pal[c]; im.putpixel((x,y),tuple(int(h[j:j+2],16) for j in (1,3,5))+(255,))
    return im.resize((32*s,31*s),Image.NEAREST)
fB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',30); f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
LW=190; CW=32*S+12; RH=31*S+12
filas=[('Pico del padre',None),('Quieto · antes',D['anims']['reposo']),('Quieto · ahora',[pico_padre(x) for x in D['anims']['reposo']]),
       ('Andar · antes',D['anims']['andar']),('Andar · ahora',[pico_padre(x) for x in D['anims']['andar']]),
       ('Picar · antes',D['anims']['picar_lado']),('Picar · ahora',[pico_padre(x) for x in D['anims']['picar_lado']]),
       ('Taladro (roca maciza)',None),('Taladrando',TAL)]
H=sum(50 if v is None else RH for _,v in filas)+10
out=Image.new('RGB',(LW+4*CW+10,H),(58,48,40)); d=ImageDraw.Draw(out); y=0
for et,L in filas:
    if L is None: d.text((10,y+10),et,font=fB,fill=(251,242,54)); y+=50; continue
    d.text((10,y+RH//2-12),et,font=f,fill=(240,230,210))
    for i,fr in enumerate(L):
        x0=LW+i*CW; d.rectangle((x0-2,y-2,x0+32*S+1,y+31*S+1),fill=(80,66,56)); t=img(fr); out.paste(t,(x0,y),t)
    y+=RH
out.save('pico_y_taladro.png')
# gifs
def gif(frames,name,dur,fondo=(58,48,40),bloque=False,sacude=False):
    fs=[]
    for k,fr in enumerate(frames):
        base=Image.new('RGBA',(32*6+60,31*6),fondo+(255,))
        if bloque:
            dr=ImageDraw.Draw(base); dr.rectangle((32*6-12,0,32*6+60,31*6),fill=(43,74,138)); dr.rectangle((32*6-12,0,32*6-6,31*6),fill=(30,52,100))
        t=img(fr,6); base.alpha_composite(t,((k%2 if sacude else 0),0)); fs.append(base.convert('RGB'))
    fs[0].save(name,save_all=True,append_images=fs[1:],duration=dur,loop=0)
gif([pico_padre(x) for x in D['anims']['andar']],'pico_padre_andar.gif',110)
gif([pico_padre(x) for x in D['anims']['picar_lado']]*1,'pico_padre_picar.gif',90)
gif(TAL*4,'taladro.gif',60,bloque=True,sacude=True)
print(out.size)
