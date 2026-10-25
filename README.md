# Deep

Juego de minería vertical (prototipo, nombre provisional). Un topo minero baja por pozos picando roca, recoge materiales y vuelve al pueblo para ayudar a los vecinos. Si muere, la mochila se queda en la mina.

## Jugar

- **En el navegador:** abre `index.html`. No hace falta instalar nada.
- **En el móvil:** activa GitHub Pages en el repositorio (Settings → Pages → rama `main`, carpeta `/`) y abre la dirección que te da.

El progreso (almacén, herramientas y estado de la mina) se guarda en el navegador.

## Ajustar el juego

Todos los números están en **`js/datos.js`**: herramientas iniciales y por sala segura, tienda y precios, lámpara, velocidad del topo, derrumbes y escombro, materiales, peligros, cámara y zoom, las 8 minas del mapa, los tramos del pozo 1 y las casas de la plaza. Cambia un valor, guarda y recarga.

Dentro de la mina, el botón de ajustes permite probar cambios rápidos sin tocar el archivo (solo valen en ese navegador).

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Las tres pantallas: mapa, plaza y mina |
| `css/estilo.css` | Estilos y mandos táctiles |
| `js/datos.js` | **Datos del juego (editable)** |
| `js/sprites.js` | Sprites del topo y de las casillas (generados, no editar a mano) |
| `js/partida.js` | Almacén y herramientas guardados entre bajadas |
| `js/mina.js` | La excavación |
| `js/pueblo.js` | Mapa con las minas y plaza con las casas |
| `js/main.js` | Cambio entre pantallas |

## Controles

- Móvil: cruceta a la izquierda (arriba sube por escaleras), herramientas a la derecha (puntal, escalera, mecha).
- Teclado: flechas o WASD, P puntal, E escalera, M mecha.
