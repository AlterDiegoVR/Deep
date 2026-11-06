from PIL import Image
base = Image.open('plaza.png').convert('RGBA')
ESC = 2 * 408.625 / 360          # píxeles de pantalla (x2) por píxel del sprite
T = round(32 * ESC), round(31 * ESC)
def spr(k, i, izq=False):
    im = Image.open(f'{k}_{i}.png').resize(T, Image.NEAREST)
    return im.transpose(Image.FLIP_LEFT_RIGHT) if izq else im
# cada paseante: (sprite, punto A, punto B, fase); los pies en el punto
P = [
    ('coneja',  (110, 905), (250, 945), 0.0, 'va'),
    ('alcalde', (330, 600), (520, 610), 0.3, 'va'),
    ('tejon',   (300, 620), (300, 620), 0.0, 'quieto'),
    ('ardilla', (650, 1090), (520, 1180), 0.5, 'puerta'),
    ('castor',  (240, 1060), (340, 1090), 0.6, 'va'),
]
N = 32
frames = []
for t in range(N):
    fr = base.copy()
    capa = []
    for k, a, b, fase, modo in P:
        u = ((t / N) + fase) % 1
        if modo == 'quieto':
            x, y, izq, f, vis = a[0], a[1], False, 0, True
        else:
            ida = u < 0.5; w = u * 2 if ida else (1 - u) * 2
            x = a[0] + (b[0] - a[0]) * w; y = a[1] + (b[1] - a[1]) * w
            izq = (b[0] < a[0]) == ida
            f = 1 + (t % 4); vis = True
            if modo == 'puerta' and w < 0.15: vis = False   # entra por la puerta y desaparece un momento
            if (modo != 'puerta') and abs(w - 1) < 0.08: f = 0  # se para un instante al llegar
        if vis: capa.append((y, k, f, izq, x))
    for y, k, f, izq, x in sorted(capa):
        im = spr(k, f, izq); fr.alpha_composite(im, (int(x - T[0] * 0.36), int(y - T[1] * 0.83)))
    frames.append(fr.crop((0, 440, 800, 1260)).convert('RGB'))
frames[0].save('plaza_vecinos.gif', save_all=True, append_images=frames[1:], duration=130, loop=0, optimize=True)
frames[5].save('plaza_vecinos.png')
print('ok')
