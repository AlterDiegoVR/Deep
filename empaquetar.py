# Junta todo en un solo HTML (para probarlo como artefacto o pasarlo en un archivo).
#   python3 empaquetar.py  ->  dist/deep.html (el juego) y dist/deep-arcade.html (el arcade)
import re, pathlib
raiz = pathlib.Path(__file__).parent

def juntar(pagina, base):
    html = (raiz/pagina).read_text(encoding='utf-8')
    def css(m):
        return '<style>\n' + (base/m.group(1)).resolve().read_text(encoding='utf-8') + '\n</style>'
    def js(m):
        return '<script>\n' + (base/m.group(1)).resolve().read_text(encoding='utf-8') + '\n</script>'
    html = re.sub(r'<link rel="stylesheet" href="((?:\.\./)?css/[^"?]+)(?:\?[^"]*)?">', css, html)
    html = re.sub(r'<script src="((?:\.\./)?js/[^"?]+)(?:\?[^"]*)?"></script>', js, html)
    return html

(raiz/'dist').mkdir(exist_ok=True)
for pagina, base, salida in [('index.html', raiz, 'deep.html'), ('arcade/index.html', raiz/'arcade', 'deep-arcade.html')]:
    h = juntar(pagina, base)
    (raiz/'dist'/salida).write_text(h, encoding='utf-8')
    print('dist/' + salida, len(h))
