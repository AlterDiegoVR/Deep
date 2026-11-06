# Paseantes provisionales del pueblo (32x31, como el sprite de Deep), mirando a la derecha.
# 4 fotogramas de andar (pies alternos y un saltito) + 1 quieto.
import json, sys
from PIL import Image

W, H = 32, 31
PAL = {'0': '#000000', 'n': '#ffffff', 'k': '#000000'}

def lienzo(): return [['.'] * W for _ in range(H)]
def px(g, x, y, c):
    if 0 <= x < W and 0 <= y < H: g[y][x] = c
def elipse(g, cx, cy, rx, ry, c):
    for y in range(H):
        for x in range(W):
            if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1: g[y][x] = c
def rect(g, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): px(g, x, y, c)
def contorno(g):
    o = [r[:] for r in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] == '.' and any(0 <= x + dx < W and 0 <= y + dy < H and g[y + dy][x + dx] not in '.0' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[y][x] = '0'
    return o
def sombra_baja(g, base, osc, desde):
    # oscurece la parte baja de una masa de color (volumen simple)
    for y in range(desde, H):
        for x in range(W):
            if g[y][x] == base: g[y][x] = osc

def ojos(g, cx, cy, mira=1):
    for ex in (cx - 3 + mira, cx + 2 + mira):
        px(g, ex, cy, 'k'); px(g, ex, cy + 1, 'k'); px(g, ex, cy, 'n') if False else None
        px(g, ex, cy - 0, 'k'); px(g, ex + 0, cy, 'k')
    # brillo
    px(g, cx - 3 + mira, cy, 'n'); px(g, cx + 2 + mira, cy, 'n')

def pies(g, f, cx, y, col):
    # f: 0 quieto, 1-4 andar
    sep = {0: (-3, 2), 1: (-4, 3), 2: (-2, 1), 3: (-3, 3), 4: (-1, 2)}[f]
    for dx in sep: rect(g, cx + dx, y, cx + dx + 1, y + 1, col)

def cuerpo_base(g, f, piel, sombra, ropa, ropa_o, cab=(11, 12, 6, 5), cuerpo=(11, 20, 5, 4)):
    b = -1 if f in (2, 4) else 0   # saltito al andar
    hx, hy, hrx, hry = cab; bx, by, brx, bry = cuerpo
    elipse(g, bx, by + b, brx, bry, ropa)
    sombra_baja(g, ropa, ropa_o, by + b + 2)
    elipse(g, hx, hy + b, hrx, hry, piel)
    sombra_baja(g, piel, sombra, hy + b + 3)
    pies(g, f, int(bx), int(by + bry) + b, sombra)
    return b

def coneja(f):
    P = {'w': '#eee8dc', 's': '#cbbeaa', 'p': '#d77bba', 'r': '#e28c96', 'v': '#76428a', 'V': '#45283c', 'm': '#8f563b', 'g': '#9badb7'}
    g = lienzo()
    b = -1 if f in (2, 4) else 0
    # orejas largas
    elipse(g, 9, 6 + b, 1.6, 4.5, 'w'); elipse(g, 14, 5 + b, 1.6, 4.5, 'w')
    rect(g, 9, 4 + b, 9, 8 + b, 'p'); rect(g, 14, 3 + b, 14, 7 + b, 'p')
    cuerpo_base(g, f, 'w', 's', 'v', 'V')
    # gafas redondas (aro) y los ojos dentro
    for ex in (9, 14):
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)): px(g, ex + dx, 12 + b + dy, 'm')
        px(g, ex, 12 + b, 'k')
    px(g, 13, 14 + b, 'r'); px(g, 7, 14 + b, 'r'); px(g, 16, 14 + b, 'r')   # nariz y mofletes
    px(g, 13, 15 + b, 's')
    # chal: pico del chal
    px(g, 11, 22 + b, 'V'); px(g, 12, 21 + b, 'g')
    return contorno(g), P

def tejon(f):
    P = {'g': '#847e87', 'G': '#595652', 'w': '#eee8dc', 'k2': '#222034', 'm': '#8f563b', 'M': '#663931', 'c': '#5fcde4', 'l': '#9badb7'}
    P = {k[0] if len(k) == 2 else k: v for k, v in P.items()}
    P['q'] = '#222034'
    g = lienzo()
    b = cuerpo_base(g, f, 'g', 'G', 'm', 'M', cab=(11, 12, 6.5, 5))
    # franja blanca central y antifaces negros
    rect(g, 11, 7 + b, 12, 15 + b, 'w')
    rect(g, 8, 11 + b, 10, 13 + b, 'q'); rect(g, 13, 11 + b, 15, 13 + b, 'q')
    px(g, 9, 12 + b, 'n'); px(g, 14, 12 + b, 'n')
    px(g, 13, 15 + b, 'q')   # hocico
    # gafas de soldar en la frente
    for ex in (9, 14):
        elipse(g, ex + .5, 8.5 + b, 1.6, 1.4, 'c'); px(g, ex - 1, 8 + b, 'm'); px(g, ex + 2, 8 + b, 'm')
    rect(g, 10, 8 + b, 13, 8 + b, 'm')
    # delantal: bolsillo y llave inglesa
    rect(g, 9, 20 + b, 12, 21 + b, 'M'); px(g, 15, 19 + b, 'l'); px(g, 15, 20 + b, 'l')
    return contorno(g), P

def ardilla(f):
    P = {'o': '#f09646', 'O': '#df7126', 'R': '#ac4a28', 'c': '#eec39a', 'v': '#4b692f', 'V': '#2f4a1f', 'm': '#8f563b'}
    g = lienzo()
    b = -1 if f in (2, 4) else 0
    # cola enorme detrás (a la izquierda), que se mece
    sw = [0, 0, 1, 0, -1][f]
    elipse(g, 4.5 + sw * .5, 12 + b, 3.6, 7, 'O'); elipse(g, 5 + sw * .5, 9 + b, 2.6, 4, 'o')
    px(g, 3, 6 + b, 'R'); px(g, 4, 5 + b, 'R')
    # orejas con penacho
    rect(g, 8, 5 + b, 9, 7 + b, 'O'); px(g, 8, 4 + b, 'R')
    rect(g, 14, 5 + b, 15, 7 + b, 'O'); px(g, 15, 4 + b, 'R')
    cuerpo_base(g, f, 'o', 'O', 'v', 'V', cab=(12, 12, 6, 5))
    elipse(g, 12.5, 14.5 + b, 4, 2.2, 'c')   # morro y mofletes claros
    ojos(g, 12, 12 + b)
    px(g, 14, 14 + b, 'k'); px(g, 13, 16 + b, 'n')   # nariz y dientecito
    # gafitas
    px(g, 9, 11 + b, 'm'); px(g, 15, 11 + b, 'm'); rect(g, 11, 12 + b, 12, 12 + b, 'm')
    elipse(g, 11.5, 21 + b, 2.5, 1.5, 'c')   # tripa
    return contorno(g), P

def alcalde(f):
    P = {'g': '#aaaab2', 'G': '#847e87', 'p': '#eeaad2', 'h': '#222034', 'H': '#3f3f74', 'r': '#ac3232', 'y': '#fbf236', 'l': '#cbdbfc'}
    g = lienzo()
    b = -1 if f in (2, 4) else 0
    # orejas redondas grandes
    elipse(g, 6, 10 + b, 2.6, 2.6, 'g'); elipse(g, 17, 10 + b, 2.6, 2.6, 'g')
    elipse(g, 6, 10 + b, 1.5, 1.5, 'p'); elipse(g, 17, 10 + b, 1.5, 1.5, 'p')
    # pecho hinchado: cuerpo más ancho, levita azul
    cuerpo_base(g, f, 'g', 'G', 'H', 'h', cab=(11.5, 13, 5.5, 4.5), cuerpo=(11.5, 21, 5.5, 3.6))
    elipse(g, 12, 20.5 + b, 2.5, 2, 'l')   # camisa
    # banda de alcalde en diagonal y medalla
    for i in range(7): px(g, 7 + i, 18 + b + i // 2, 'r')
    px(g, 12, 21 + b, 'y'); px(g, 13, 21 + b, 'y')
    ojos(g, 11, 13 + b)
    px(g, 14, 15 + b, 'p')   # nariz rosa
    # chistera
    rect(g, 8, 3 + b, 14, 8 + b, 'h'); rect(g, 6, 8 + b, 16, 8 + b, 'h'); rect(g, 8, 7 + b, 14, 7 + b, 'H')
    # colita fina detrás
    for i in range(4): px(g, 5 - i, 22 + b - (i % 2), 'G')
    return contorno(g), P

def castor(f):
    P = {'b': '#b47850', 'B': '#8f563b', 'm': '#d9a066', 'u': '#639bff', 'U': '#306082', 'd': '#663931', 'q': '#222034', 'y': '#fbf236'}
    g = lienzo()
    b = -1 if f in (2, 4) else 0
    # cola plana detrás, apoyada en el suelo
    rect(g, 2, 22 + b, 6, 24 + b, 'd'); px(g, 3, 23 + b, 'q'); px(g, 5, 23 + b, 'q')
    # orejitas
    elipse(g, 7.5, 8 + b, 1.4, 1.4, 'B'); elipse(g, 15.5, 8 + b, 1.4, 1.4, 'B')
    cuerpo_base(g, f, 'b', 'B', 'u', 'U', cab=(11.5, 12, 6, 5))
    elipse(g, 12.5, 14.5 + b, 3.2, 2, 'm')
    ojos(g, 11, 11 + b)
    px(g, 13, 13 + b, 'q'); rect(g, 12, 16 + b, 13, 17 + b, 'n')   # nariz y dientazos
    # tirantes del peto y botón
    px(g, 9, 18 + b, 'U'); px(g, 14, 18 + b, 'U'); px(g, 14, 20 + b, 'y')
    return contorno(g), P

PJ = {'coneja': coneja, 'tejon': tejon, 'ardilla': ardilla, 'alcalde': alcalde, 'castor': castor}

def a_img(grid, pal):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y in range(H):
        for x in range(W):
            c = grid[y][x]
            if c == '.': continue
            h = pal.get(c) or PAL.get(c)
            im.putpixel((x, y), tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
    return im

if __name__ == '__main__':
    out = sys.argv[1]
    frames = {}
    for k, fn in PJ.items():
        frames[k] = [a_img(*fn(f)) for f in range(5)]
        for i, im in enumerate(frames[k]): im.save(f'{out}/{k}_{i}.png')
    print('ok')
