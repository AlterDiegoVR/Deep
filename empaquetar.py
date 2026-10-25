# Junta todo en un solo HTML (para probarlo como artefacto o pasarlo en un archivo).
import re, pathlib
raiz = pathlib.Path(__file__).parent
html = (raiz/'index.html').read_text(encoding='utf-8')
css = (raiz/'css/estilo.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="css/estilo.css">', '<style>\n' + css + '\n</style>')
def js(m):
    return '<script>\n' + (raiz/m.group(1)).read_text(encoding='utf-8') + '\n</script>'
html = re.sub(r'<script src="(js/[^"]+)"></script>', js, html)
(raiz/'dist').mkdir(exist_ok=True)
(raiz/'dist/pozo-viejo.html').write_text(html, encoding='utf-8')
print('dist/pozo-viejo.html', len(html))
