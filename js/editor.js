// =====================================================================
//  EDITOR DE NIVELES (solo PC; herramienta de desarrollo)
//  Para pintar piezas (zonas hechas a mano que se estampan sobre la mina generada) con el mismo formato que
//  js/piezas.js. Lo que guardas se queda en este navegador y ya sale en el juego; con «Exportar» se descarga
//  un archivo para pasárselo a Claude y que lo meta en el juego de verdad.
//  Se abre desde el botón «Editor» del mapa (solo en PC) o con #editor al final de la dirección.
// =====================================================================
window.Editor = (()=>{
  const D = window.DATOS, $ = id => document.getElementById(id);
  const COLS = 15, CEL = 30, CLAVE = 'deep-editor', BORRADOR = 'deep-editor-borrador';
  const MAT = D.materiales;
  // ---------- paleta: cada casilla del formato de las piezas ----------
  const PAL = [
    {g:'Terreno', items:[
      ['.', 'Libre (lo pone el generador)'], ['_', 'Aire'], ['t', 'Tierra'], ['p', 'Piedra'], ['d', 'Roca dura (fija)'], ['m', 'Roca maciza (taladro)'], ['x', 'Roca madre (irrompible)'],
      ['a', 'Arena'], ['g', 'Arena arcillosa (barro)'], ['~', 'Agua'], ['&', 'Barro'], ['*', 'Gas'], ['e', 'Escombro']]},
    {g:'Minerales', items:[['r', 'Arcilla'], ['c', 'Carbón'], ['u', 'Cobre'], ['q', 'Cuarzo']]},
    {g:'Objetos', items:[['o', 'Bidón de aceite'], ['k', 'Llave'], ['h', 'Escalera suelta'], ['H', 'Puntal suelto'], ['B', 'Cofre con premio'],
      ['f', 'Flor de mina'], ['j', 'Hongo luminoso'], ['R', 'Lámpara de carburo'], ['F', 'Foto de una cuadrilla'], ['N', 'Nota de la cuadrilla'], ['Q', 'Casco de la cuadrilla'],
      ['K', 'Pico con un símbolo'], ['Z', 'Pieza del ascensor'], ['w', 'Polilla']]},
    {g:'Cuadrilla (fijo)', items:[['L', 'Escalera de la cuadrilla'], ['I', 'Puntal de la cuadrilla'], ['=', 'Tablón de la cuadrilla']]},
    {g:'Mecanismos', items:[['P', 'Puerta con candado (bordes)'], ['M', 'Montacargas (sube al principal)'], ['A', 'Ascensor viejo'], ['V', 'Respiradero'],
      ['W', 'Noria'], ['G', 'Compuerta (la abre la noria)'], ['b', 'Brasas'], ['X', 'Puerta de la cuadrilla']]},
    {g:'Textos', items:[['T', 'Cartel de tutorial'], ['D', 'Frase de Deep']]},
  ];
  const NOMBRE = {}; PAL.forEach(g => g.items.forEach(([c, n]) => NOMBRE[c] = n));
  const COLOR = {'.':null, '_':'#1b1426', t:'#8f563b', p:'#696a6a', d:'#4b3f4f', m:'#2b4a8a', x:'#221c28', a:'#d9a066', g:'#c46a3a', '~':'#306082', '&':'#5a3a26', '*':'#2d4a2a', e:'#847e87',
    r:MAT.arcilla.color, c:MAT.carbon.color, u:MAT.cobre.color, q:MAT.cuarzo.color, P:'#3f3f74', G:'#3f3f74'};
  const ICONO = {o:'🛢️', k:'🔑', h:'🪜', H:'🪵', B:'📦', f:'🌸', j:'🍄', R:'🏮', F:'🖼️', N:'📜', Q:'⛑️', K:'⛏️', Z:'⚙️', w:'🦋', M:'🛗', A:'🚡', V:'♨️', W:'🎡', b:'🔥', X:'🚪', P:'🔒', T:'💬', D:'🗨️', '*':'☁️'};
  // contador: qué se cuenta en cada sector
  const CUENTA = [['Arcilla', 'r'], ['Carbón', 'c'], ['Cobre', 'u'], ['Cuarzo', 'q'], ['Agua', '~'], ['Arena', 'ag'], ['Gas', '*'], ['Aceite', 'o'], ['Flores', 'f'], ['Hongos', 'j'],
    ['Escaleras y puntales sueltos', 'hH'], ['Llaves', 'k'], ['Cofres', 'B'], ['Polillas', 'w'], ['Aire (huecos)', '_']];
  const contar = filas => { const n = {}; for(const [nom, cs] of CUENTA){ n[nom] = 0; for(const f of filas) for(const ch of f) if(cs.includes(ch)) n[nom]++; } return n; };

  // ---------- estado ----------
  let pz = null, hist = [], pincel = 'p', herr = 'lapiz', sel = null, abierto = false, cambiado = false;
  const guardadas = () => { try{ return (JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}).piezas || {}; }catch(e){ return {}; } };
  const guardarTodas = ps => { try{ localStorage.setItem(CLAVE, JSON.stringify({piezas: ps})); }catch(e){ aviso('No se ha podido guardar (¿el navegador no deja?)'); } };
  const nueva = () => ({id: 'pieza_' + Date.now().toString(36).slice(-5), pozo: 'uno', tiro: 'principal', colocar: {fila: 20}, reflejar: false, activa: true, textos: {},
    filas: Array.from({length: 8}, () => '.'.repeat(COLS)), esperado: null});
  const copia = o => JSON.parse(JSON.stringify(o));
  const norm = p => { p = copia(p); p.filas = p.filas.map(f => (f + '.'.repeat(COLS)).slice(0, COLS)); p.textos = p.textos || {}; if(p.activa === undefined) p.activa = true; return p; };

  // ---------- montar la pantalla ----------
  function montar(){
    const raiz = $('editor');
    raiz.innerHTML = `
    <header class="ed-barra">
      <button class="volver" id="edVolver">‹ Mapa</button>
      <h1>Editor de niveles</h1>
      <select id="edAbrir" title="Abrir una pieza"></select>
      <button id="edNueva">Nueva</button>
      <button id="edGenerarBtn">Generar sector</button>
      <button id="edLimpiar">Limpiar</button>
      <button id="edDeshacer" title="Ctrl+Z">Deshacer</button>
      <span class="ed-hueco"></span>
      <button id="edGuardar" class="pri">Guardar</button>
      <button id="edProbar" class="pri">Probar</button>
      <button id="edExportar">Exportar</button>
      <label class="ed-file">Importar<input type="file" id="edImportar" accept=".json,application/json"></label>
    </header>
    <div class="ed-cuerpo">
      <aside class="ed-izq">
        <div class="ed-herr">
          ${[['lapiz','✏️ Lápiz'],['rect','▭ Rectángulo'],['cubo','🪣 Relleno'],['gotero','💧 Cuentagotas'],['texto','💬 Editar texto']].map(([k, n]) => `<button data-h="${k}">${n}</button>`).join('')}
        </div>
        <p class="ed-nota">Clic: pinta · Clic derecho: libre · Ctrl+Z: deshacer</p>
        <div id="edPaleta"></div>
      </aside>
      <main class="ed-centro"><div class="ed-scroll" id="edScroll"><canvas id="edCv"></canvas></div>
        <div class="ed-filas">
          <button id="edArribaMas">+ fila arriba</button><button id="edArribaMenos">− fila arriba</button>
          <span id="edAlto"></span>
          <button id="edAbajoMas">+ fila abajo</button><button id="edAbajoMenos">− fila abajo</button>
        </div>
      </main>
      <aside class="ed-der">
        <section><h3>Pieza</h3>
          <label>Nombre (id) <input id="edId"></label>
          <div class="ed-pozos" id="edPozos"></div>
          <label>Tiro <select id="edTiro"></select></label>
          <label>Dónde va <select id="edColocar">
            <option value="fila">A una profundidad (fila)</option><option value="sala">Pegada a una sala segura</option>
            <option value="fondo">Al fondo del tiro</option><option value="tramo">En algún sitio de un tramo (al azar)</option></select></label>
          <div id="edColocarDatos"></div>
          <label class="ed-check"><input type="checkbox" id="edReflejar"> Puede salir dada la vuelta (al azar)</label>
          <label class="ed-check"><input type="checkbox" id="edActiva"> Activa en el juego (en este navegador)</label>
          <button id="edBorrar" class="peligro">Borrar mi versión</button>
        </section>
        <section id="edTextoBox" hidden><h3 id="edTextoTit">Texto</h3>
          <label id="edTxTitL">Título <input id="edTxTit"></label>
          <label>Texto <textarea id="edTxTexto" rows="3"></textarea></label>
          <label id="edTxGifL">Gif (dirección, opcional) <input id="edTxGif" placeholder="https://…"></label>
          <label id="edTxCaraL">Cara de Deep <select id="edTxCara">${['contento','alegre','sorprendido','asustado','triste','decidido','cansado','pensativo'].map(c => `<option>${c}</option>`).join('')}</select></label>
        </section>
        <section><h3>Contador del sector</h3><p class="ed-nota" id="edEsperadoNota"></p><table id="edContador"></table></section>
        <section><h3>Generar sector</h3>
          <p class="ed-nota">Genera un trozo de pozo con las reglas del juego (sin piezas) para editarlo encima. Sustituye lo que hay.</p>
          <label>Pozo <select id="edGPozo"></select></label>
          <label>Tiro <select id="edGTiro"></select></label>
          <label>Tramo <select id="edGTramo"></select></label>
          <div class="ed-dos"><label>Desde fila <input id="edGDesde" type="number" min="0"></label><label>Hasta fila <input id="edGHasta" type="number" min="0"></label></div>
          <label>Semilla (vacío = al azar) <input id="edGSemilla" type="number"></label>
          <button id="edGenerar" class="pri">Generar</button>
        </section>
      </aside>
    </div>
    <div class="ed-modal" id="edModal" hidden><div class="ed-modal-caja"><p id="edModalTxt"></p><div class="ed-modal-bot"><button id="edModalNo">Cancelar</button><button id="edModalSi" class="pri">Sí, guardar</button></div></div></div>
    <div class="ed-aviso" id="edAviso" hidden></div>`;
    // paleta
    $('edPaleta').innerHTML = PAL.map(g => `<div class="ed-grupo"><h4>${g.g}</h4>${g.items.map(([c, n]) =>
      `<button class="ed-col" data-c="${c}" title="${n} (${c})"><i style="${COLOR[c] ? 'background:' + COLOR[c] : ''}" class="${c === '.' ? 'libre' : ''}">${ICONO[c] || (c === 'L' ? '╫' : c === 'I' ? '┃' : c === '=' ? '═' : '')}</i><span>${n}</span></button>`).join('')}</div>`).join('');
    $('edPaleta').querySelectorAll('.ed-col').forEach(b => b.onclick = () => { pincel = b.dataset.c; if(herr === 'gotero' || herr === 'texto') herr = 'lapiz'; marcarPaleta(); });
    document.querySelectorAll('.ed-herr button').forEach(b => b.onclick = () => { herr = b.dataset.h; marcarPaleta(); });
    // pozos (casillas) y selects
    $('edPozos').innerHTML = '<span>Pozos:</span>' + Object.entries(D.pozos).map(([k, p]) => `<label class="ed-check"><input type="checkbox" data-pozo="${k}"> ${p.nombre}</label>`).join('');
    $('edPozos').querySelectorAll('input').forEach(i => i.onchange = () => { const v = [...$('edPozos').querySelectorAll('input:checked')].map(x => x.dataset.pozo); pz.pozo = v.length === 1 ? v[0] : v; llenarTiros(); tocar(false); });
    $('edGPozo').innerHTML = Object.entries(D.pozos).map(([k, p]) => `<option value="${k}">${p.nombre}</option>`).join('');
    $('edGPozo').onchange = llenarGenerar; $('edGTiro').onchange = llenarGenerar2;
    $('edGTramo').onchange = () => { const o = $('edGTramo').selectedOptions[0]; if(o && o.dataset.d !== undefined){ $('edGDesde').value = o.dataset.d; $('edGHasta').value = o.dataset.h; } };
    $('edGenerar').onclick = generar;
    // propiedades
    $('edId').oninput = () => { pz.id = $('edId').value.trim().replace(/\s+/g, '_') || pz.id; tocar(false); };
    $('edTiro').onchange = () => { pz.tiro = $('edTiro').value; tocar(false); };
    $('edColocar').onchange = () => { const k = $('edColocar').value; pz.colocar = k === 'fila' ? {fila: 20} : k === 'sala' ? {sala: 0, donde: 'debajo'} : k === 'fondo' ? {fondo: true} : {tramo: 1, prob: 1}; pintarColocar(); tocar(false); };
    $('edReflejar').onchange = () => { pz.reflejar = $('edReflejar').checked; tocar(false); };
    $('edActiva').onchange = () => { pz.activa = $('edActiva').checked; tocar(false); };
    $('edBorrar').onclick = () => { const ps = guardadas(); if(!ps[pz.id]){ aviso('Esta pieza no está guardada en tu navegador'); return; }
      preguntar('¿Borrar tu versión de «' + pz.id + '»? (Si es una pieza del juego, vuelve a salir la original.)', 'Sí, borrar', () => { delete ps[pz.id]; guardarTodas(ps); llenarAbrir(); aviso('Borrada'); }); };
    // textos
    const tx = () => sel && pz.textos[sel] ? pz.textos[sel] : null;
    $('edTxTit').oninput = () => { const t = tx(); if(t){ t.titulo = $('edTxTit').value; tocar(false); } };
    $('edTxTexto').oninput = () => { const t = tx(); if(t){ t.texto = $('edTxTexto').value; tocar(false); } };
    $('edTxGif').oninput = () => { const t = tx(); if(t){ t.gif = $('edTxGif').value.trim(); tocar(false); } };
    $('edTxCara').onchange = () => { const t = tx(); if(t){ t.cara = $('edTxCara').value; tocar(false); } };
    // barra
    $('edVolver').onclick = () => window.Pantallas.mostrar('mapa');
    $('edNueva').onclick = () => siCambios(() => { cargar(nueva()); });
    $('edAbrir').onchange = () => { const v = $('edAbrir').value; if(!v) return; siCambios(() => {
      const [de, id] = v.split(':'); const p = de === 'mia' ? guardadas()[id] : window.PIEZAS.find(x => x.id === id); if(p) cargar(p); }, () => llenarAbrir()); };
    $('edLimpiar').onclick = () => { apuntar(); pz.filas = pz.filas.map(() => '.'.repeat(COLS)); pz.textos = {}; sel = null; tocar(); };
    $('edDeshacer').onclick = deshacer;
    $('edGuardar').onclick = () => guardar();
    $('edProbar').onclick = probar;
    $('edExportar').onclick = exportar;
    $('edImportar').onchange = importar;
    $('edArribaMas').onclick = () => { apuntar(); pz.filas.unshift('.'.repeat(COLS)); moverTextos(1); if(pz.colocar.fila !== undefined) pz.colocar.fila = Math.max(0, pz.colocar.fila - 1); tocar(); };
    $('edArribaMenos').onclick = () => { if(pz.filas.length < 2) return; apuntar(); pz.filas.shift(); moverTextos(-1); if(pz.colocar.fila !== undefined) pz.colocar.fila++; tocar(); };
    $('edAbajoMas').onclick = () => { apuntar(); pz.filas.push('.'.repeat(COLS)); tocar(); };
    $('edAbajoMenos').onclick = () => { if(pz.filas.length < 2) return; apuntar(); pz.filas.pop(); const n = pz.filas.length; for(const k of Object.keys(pz.textos)) if(+k.split(',')[0] >= n) delete pz.textos[k]; tocar(); };
    // lienzo
    const cv = $('edCv');
    let pintando = false, ini = null, boton = 0;
    const celda = e => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientY - r.top)/CEL), Math.floor((e.clientX - r.left)/CEL)]; };
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      const [f, c] = celda(e); if(f < 0 || f >= pz.filas.length || c < 0 || c >= COLS) return;
      boton = e.button; const ch = boton === 2 ? '.' : pincel;
      if(herr === 'gotero'){ pincel = pz.filas[f][c]; herr = 'lapiz'; marcarPaleta(); return; }
      if(herr === 'texto'){ elegirTexto(f, c); return; }
      apuntar();
      if(herr === 'cubo'){ rellenar(f, c, ch); tocar(); return; }
      if(herr === 'rect'){ ini = [f, c]; pintando = true; dibujar(); return; }
      poner(f, c, ch); pintando = true; tocar(); cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', e => {
      const [f, c] = celda(e); $('edCv').title = f >= 0 && f < pz.filas.length && c >= 0 && c < COLS ? (NOMBRE[pz.filas[f][c]] || '') + ' · fila ' + filaReal(f) + ', columna ' + c : '';
      if(!pintando) return;
      if(herr === 'rect'){ dibujar([ini, [f, c]]); return; }
      if(f >= 0 && f < pz.filas.length && c >= 0 && c < COLS){ poner(f, c, boton === 2 ? '.' : pincel); tocar(); }
    });
    addEventListener('pointerup', e => {
      if(!pintando) return; pintando = false;
      if(herr === 'rect' && ini){ const [f, c] = celda(e), ch = boton === 2 ? '.' : pincel;
        for(let y = Math.min(ini[0], f); y <= Math.max(ini[0], f); y++) for(let x = Math.min(ini[1], c); x <= Math.max(ini[1], c); x++) if(y >= 0 && y < pz.filas.length && x >= 0 && x < COLS) poner(y, x, ch);
        ini = null; tocar(); }
    });
    addEventListener('keydown', e => { if(!abierto) return; if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z'){ e.preventDefault(); deshacer(); } });
    $('edModalNo').onclick = () => { $('edModal').hidden = true; if(modalNo) modalNo(); };
    $('edModalSi').onclick = () => { $('edModal').hidden = true; if(modalSi) modalSi(); };
  }
  // ---------- edición ----------
  const filaReal = f => pz.colocar && pz.colocar.fila !== undefined ? pz.colocar.fila + f : f;
  function poner(f, c, ch){
    const s = pz.filas[f]; if(s[c] === ch) return;
    pz.filas[f] = s.slice(0, c) + ch + s.slice(c + 1);
    const k = f + ',' + c;
    if(ch === 'T' || ch === 'D'){ if(!pz.textos[k] || (ch === 'D') !== (pz.textos[k].cara !== undefined)) pz.textos[k] = ch === 'D' ? {texto: '', cara: 'pensativo'} : {titulo: '', texto: '', gif: ''}; elegirTexto(f, c); }
    else if(pz.textos[k]){ delete pz.textos[k]; if(sel === k){ sel = null; pintarTexto(); } }
  }
  function rellenar(f, c, ch){
    const de = pz.filas[f][c]; if(de === ch) return;
    const q = [[f, c]], visto = new Set();
    while(q.length){ const [y, x] = q.pop(), k = y*16 + x; if(visto.has(k) || y < 0 || y >= pz.filas.length || x < 0 || x >= COLS || pz.filas[y][x] !== de) continue;
      visto.add(k); poner(y, x, ch); q.push([y+1, x], [y-1, x], [y, x+1], [y, x-1]); }
  }
  function moverTextos(d){ const t = {}; for(const [k, v] of Object.entries(pz.textos)){ const [f, c] = k.split(',').map(Number); if(f + d >= 0) t[(f + d) + ',' + c] = v; } pz.textos = t; sel = null; pintarTexto(); }
  function elegirTexto(f, c){ const ch = pz.filas[f][c]; if(ch !== 'T' && ch !== 'D'){ aviso('Esa casilla no tiene cartel ni frase de Deep'); return; } sel = f + ',' + c; pintarTexto(); dibujar(); }
  function pintarTexto(){
    const box = $('edTextoBox'), t = sel && pz.textos[sel];
    if(!t){ box.hidden = true; return; }
    box.hidden = false; const deep = t.cara !== undefined;
    $('edTextoTit').textContent = (deep ? 'Frase de Deep' : 'Cartel de tutorial') + ' · fila ' + filaReal(+sel.split(',')[0]) + ', columna ' + sel.split(',')[1];
    $('edTxTitL').hidden = deep; $('edTxGifL').hidden = deep; $('edTxCaraL').hidden = !deep;
    $('edTxTit').value = t.titulo || ''; $('edTxTexto').value = t.texto || ''; $('edTxGif').value = t.gif || ''; $('edTxCara').value = t.cara || 'pensativo';
  }
  function apuntar(){ hist.push(JSON.stringify({filas: pz.filas, textos: pz.textos, colocar: pz.colocar})); if(hist.length > 120) hist.shift(); }
  function deshacer(){ const h = hist.pop(); if(!h) return; const o = JSON.parse(h); pz.filas = o.filas; pz.textos = o.textos; pz.colocar = o.colocar; sel = null; pintarTexto(); pintarProps(); tocar(); }
  function tocar(redibujar = true){ cambiado = true; try{ localStorage.setItem(BORRADOR, JSON.stringify(pz)); }catch(e){} if(redibujar) dibujar(); pintarContador(); $('edGuardar').textContent = 'Guardar •'; }
  // ---------- dibujo ----------
  function dibujar(rect){
    const cv = $('edCv'), x = cv.getContext('2d'), n = pz.filas.length;
    cv.width = COLS*CEL; cv.height = n*CEL;
    x.font = (CEL*0.62) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for(let f=0; f<n; f++) for(let c=0; c<COLS; c++){
      const ch = pz.filas[f][c], X = c*CEL, Y = f*CEL;
      if(ch === '.'){ x.fillStyle = (f + c) % 2 ? '#3a3340' : '#2f2935'; x.fillRect(X, Y, CEL, CEL); }
      else { x.fillStyle = COLOR[ch] || COLOR['_']; x.fillRect(X, Y, CEL, CEL); }
      if(ch === 'L'){ x.fillStyle = '#d9a066'; x.fillRect(X + 7, Y, 3, CEL); x.fillRect(X + CEL - 10, Y, 3, CEL); for(let i=0;i<3;i++) x.fillRect(X + 7, Y + 4 + i*9, CEL - 14, 2); }
      else if(ch === 'I'){ x.fillStyle = '#8f563b'; x.fillRect(X + CEL/2 - 3, Y, 6, CEL); x.fillStyle = '#d9a066'; x.fillRect(X + 4, Y, CEL - 8, 4); }
      else if(ch === '='){ x.fillStyle = '#d9a066'; x.fillRect(X, Y + CEL - 10, CEL, 6); }
      else if(ch === 'G'){ x.fillStyle = '#9badb7'; for(let i=0;i<4;i++) x.fillRect(X + 3 + i*7, Y, 3, CEL); }
      else if(ch === 'd'){ x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(X + 3, Y + 3, CEL - 6, 2); }
      else if(ch === 'x'){ x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(X + 4, Y + 10, 8, 2); }
      if(ICONO[ch]){ x.fillStyle = '#fff'; x.fillText(ICONO[ch], X + CEL/2, Y + CEL/2 + 1); }
      if('rcuq'.includes(ch)){ x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(X + 9, Y + 9, CEL - 18, CEL - 18); }
    }
    // rejilla y números de fila
    x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = 1;
    for(let c=0;c<=COLS;c++){ x.beginPath(); x.moveTo(c*CEL + 0.5, 0); x.lineTo(c*CEL + 0.5, n*CEL); x.stroke(); }
    for(let f=0;f<=n;f++){ x.beginPath(); x.moveTo(0, f*CEL + 0.5); x.lineTo(COLS*CEL, f*CEL + 0.5); x.stroke(); }
    if(sel){ const [f, c] = sel.split(',').map(Number); x.strokeStyle = '#fbf236'; x.lineWidth = 3; x.strokeRect(c*CEL + 1.5, f*CEL + 1.5, CEL - 3, CEL - 3); }
    if(rect){ const [[a, b], [cc, d]] = rect; x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(Math.min(b, d)*CEL + 1, Math.min(a, cc)*CEL + 1, (Math.abs(d - b) + 1)*CEL - 2, (Math.abs(cc - a) + 1)*CEL - 2); }
    const nums = $('edScroll').querySelector('.ed-nums') || (() => { const e = document.createElement('div'); e.className = 'ed-nums'; $('edScroll').prepend(e); return e; })();
    nums.innerHTML = pz.filas.map((_, f) => `<span style="height:${CEL}px">${filaReal(f)}</span>`).join('');
    $('edAlto').textContent = n + ' filas';
  }
  function marcarPaleta(){
    document.querySelectorAll('.ed-col').forEach(b => b.classList.toggle('sel', b.dataset.c === pincel));
    document.querySelectorAll('.ed-herr button').forEach(b => b.classList.toggle('sel', b.dataset.h === herr));
  }
  function pintarContador(){
    const ahora = contar(pz.filas), esp = pz.esperado;
    $('edEsperadoNota').textContent = esp ? 'Lo que tiene ahora y lo que debería tener según las reglas (al generarlo).' : 'Genera el sector para saber lo que debería tener según las reglas.';
    $('edContador').innerHTML = '<tr><th></th><th>Ahora</th><th>Debería</th></tr>' + CUENTA.map(([nom]) => {
      const a = ahora[nom], e = esp ? (esp[nom] ?? 0) : null; if(!a && !e) return '';
      return `<tr class="${e !== null && a !== e ? 'dif' : ''}"><td>${nom}</td><td>${a}</td><td>${e === null ? '—' : e}</td></tr>`; }).join('');
  }
  function pintarProps(){
    $('edId').value = pz.id;
    const pozos = Array.isArray(pz.pozo) ? pz.pozo : [pz.pozo || 'pruebas'];
    $('edPozos').querySelectorAll('input').forEach(i => i.checked = pozos.includes(i.dataset.pozo));
    llenarTiros();
    const C = pz.colocar || {};
    $('edColocar').value = C.fila !== undefined ? 'fila' : C.sala !== undefined ? 'sala' : C.fondo ? 'fondo' : 'tramo';
    pintarColocar();
    $('edReflejar').checked = !!pz.reflejar; $('edActiva').checked = pz.activa !== false;
  }
  function llenarTiros(){
    const pozos = Array.isArray(pz.pozo) ? pz.pozo : [pz.pozo || 'pruebas'];
    const ram = []; pozos.forEach(k => (D.pozos[k] && D.pozos[k].ramales || []).forEach(r => { if(!ram.some(x => x.id === r.id)) ram.push(r); }));
    $('edTiro').innerHTML = '<option value="principal">Principal</option><option value="ramales">Cualquier ramal</option>' + ram.map(r => `<option value="${r.id}">Ramal: ${r.nombre}</option>`).join('');
    $('edTiro').value = pz.tiro || 'principal';
  }
  function pintarColocar(){
    const C = pz.colocar, el = $('edColocarDatos');
    if(C.fila !== undefined) el.innerHTML = `<label>Fila (profundidad desde la boca) <input type="number" min="0" id="edCFila" value="${C.fila}"></label>`;
    else if(C.sala !== undefined) el.innerHTML = `<div class="ed-dos"><label>Sala (0 = la primera) <input type="number" min="0" id="edCSala" value="${C.sala}"></label><label>Lado <select id="edCDonde"><option value="debajo">Debajo</option><option value="encima">Encima</option></select></label></div>`;
    else if(C.fondo) el.innerHTML = '<p class="ed-nota">Se pone pegada a la roca madre del fondo.</p>';
    else el.innerHTML = `<div class="ed-dos"><label>Tramo (0 = el primero) <input type="number" min="0" id="edCTramo" value="${C.tramo}"></label><label>Probabilidad <input type="number" min="0" max="1" step="0.1" id="edCProb" value="${C.prob ?? 1}"></label></div>`;
    const on = (id, f) => { const e = $(id); if(e) e.oninput = e.onchange = () => { f(e.value); tocar(); }; };
    on('edCFila', v => pz.colocar.fila = Math.max(0, +v || 0)); on('edCSala', v => pz.colocar.sala = Math.max(0, +v || 0)); on('edCTramo', v => pz.colocar.tramo = Math.max(0, +v || 0)); on('edCProb', v => pz.colocar.prob = +v);
    if($('edCDonde')){ $('edCDonde').value = C.donde || 'debajo'; $('edCDonde').onchange = () => { pz.colocar.donde = $('edCDonde').value; tocar(false); }; }
  }
  function llenarAbrir(){
    const mias = guardadas();
    $('edAbrir').innerHTML = '<option value="">Abrir pieza…</option>' +
      (Object.keys(mias).length ? '<optgroup label="Mías (en este navegador)">' + Object.values(mias).map(p => `<option value="mia:${p.id}">${p.id}${p.activa === false ? ' (inactiva)' : ''}</option>`).join('') + '</optgroup>' : '') +
      '<optgroup label="Del juego">' + window.PIEZAS.map(p => `<option value="juego:${p.id}">${p.id}${mias[p.id] ? ' (la tuya manda)' : ''}</option>`).join('') + '</optgroup>';
  }
  function llenarGenerar(){
    const k = $('edGPozo').value, P = D.pozos[k];
    $('edGTiro').innerHTML = '<option value="principal">Principal</option>' + (P.ramales || []).map(r => `<option value="${r.id}">Ramal: ${r.nombre}</option>`).join('');
    llenarGenerar2();
  }
  function llenarGenerar2(){
    const k = $('edGPozo').value, tiro = $('edGTiro').value, info = window.Mina.tramos(k);
    let ops = [];
    if(tiro === 'principal') ops = info.tramos.map((t, i) => `<option data-d="${t.desde}" data-h="${t.hasta}">Tramo ${i} · ${t.n} (filas ${t.desde}-${t.hasta})</option>`);
    else { const r = info.ramales.find(x => x.id === tiro); if(r) ops = [`<option data-d="0" data-h="${r.largo - 1}">Ramal entero (filas 0-${r.largo - 1})</option>`]; }
    $('edGTramo').innerHTML = ops.join(''); $('edGTramo').onchange();
  }
  // ---------- generar, guardar, probar, exportar ----------
  function generar(){
    const k = $('edGPozo').value, tiro = $('edGTiro').value, d = Math.max(0, +$('edGDesde').value || 0), h = Math.max(d, +$('edGHasta').value || d);
    if(h - d > 120){ aviso('Como mucho 120 filas de una vez'); return; }
    const g = window.Mina.generar(k, tiro, d, h, +$('edGSemilla').value || 0);
    apuntar();
    pz.filas = g.filas; pz.textos = {}; pz.pozo = k; pz.tiro = tiro; pz.colocar = {fila: d}; pz.esperado = contar(g.filas); sel = null;
    pintarProps(); pintarTexto(); tocar();
    aviso('Sector generado (semilla ' + g.semilla + ')' + (g.salas.length ? '. Las filas de sala segura (' + g.salas.join(', ') + ') quedan libres: el juego las pone' : ''));
  }
  let modalSi = null, modalNo = null;
  function preguntar(txt, si, fSi, fNo){ $('edModalTxt').textContent = txt; $('edModalSi').textContent = si; modalSi = fSi; modalNo = fNo || null; $('edModal').hidden = false; }
  function siCambios(f, fNo){ if(!cambiado){ f(); return; } preguntar('Hay cambios sin guardar en «' + pz.id + '». ¿Seguir y perderlos?', 'Sí, seguir', f, fNo); }
  function guardar(despues){
    const ahora = contar(pz.filas), esp = pz.esperado;
    const difs = esp ? CUENTA.map(([n]) => n).filter(n => (ahora[n] || 0) !== (esp[n] || 0)) : [];
    const hacer = () => { const ps = guardadas(); ps[pz.id] = norm(pz); guardarTodas(ps); cambiado = false; $('edGuardar').textContent = 'Guardar'; llenarAbrir(); aviso('Guardada en este navegador' + (pz.activa !== false ? ': ya sale en el juego' : ' (inactiva)')); if(despues) despues(); };
    if(difs.length) preguntar('El sector no tiene lo que debería según las reglas: ' + difs.map(n => n.toLowerCase() + ' ' + (ahora[n] || 0) + ' (debería ' + (esp[n] || 0) + ')').join(', ') + '. ¿Guardar igualmente?', 'Sí, guardar', hacer);
    else hacer();
  }
  function probar(){
    const pozo = Array.isArray(pz.pozo) ? pz.pozo[0] : (pz.pozo || 'pruebas');
    if(!pozo){ aviso('Elige en qué pozo va la pieza'); return; }
    window.Pantallas.mostrar('mina', pozo, {prueba: norm(pz)});
  }
  function exportar(){
    const ps = guardadas(); if(cambiado) ps[pz.id] = norm(pz);
    const lista = Object.values(ps).map(p => { const o = copia(p); delete o.activa; if(!o.reflejar) delete o.reflejar; if(!Object.keys(o.textos || {}).length) delete o.textos; return o; });
    const datos = {juego: 'Deep', version: D.version, fecha: new Date().toISOString().slice(0, 10), piezas: lista};
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], {type: 'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = 'deep-piezas-' + datos.fecha + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    aviso('Descargado: ' + lista.length + ' pieza(s). Pásale el archivo a Claude para meterlas en el juego');
  }
  function importar(e){
    const f = e.target.files[0]; if(!f) return;
    const rd = new FileReader();
    rd.onload = () => { try{ const d = JSON.parse(rd.result), ps = guardadas(); let n = 0;
      for(const p of (d.piezas || [])) if(p && p.id && Array.isArray(p.filas)){ ps[p.id] = norm(p); n++; }
      guardarTodas(ps); llenarAbrir(); aviso('Importadas ' + n + ' pieza(s)'); }catch(err){ aviso('Ese archivo no es de piezas de Deep'); } e.target.value = ''; };
    rd.readAsText(f);
  }
  let avisoT = 0;
  function aviso(t){ const el = $('edAviso'); el.textContent = t; el.hidden = false; clearTimeout(avisoT); avisoT = setTimeout(() => el.hidden = true, Math.max(2500, t.length*60)); }
  function cargar(p){ pz = norm(p); hist = []; sel = null; cambiado = false; $('edGuardar').textContent = 'Guardar'; pintarProps(); pintarTexto(); dibujar(); pintarContador(); llenarAbrir(); }
  // ---------- abrir ----------
  let montado = false;
  function abrir(){
    if(!montado){ montar(); montado = true; llenarGenerar();
      let b = null; try{ b = JSON.parse(localStorage.getItem(BORRADOR) || 'null'); }catch(e){}
      cargar(b && Array.isArray(b.filas) ? b : nueva()); if(b) cambiado = true;
      marcarPaleta(); }
    abierto = true; dibujar(); llenarAbrir();
  }
  function cerrar(){ abierto = false; }
  return {abrir, cerrar};
})();
