// =====================================================================
//  EDITOR DE SPRITES (solo PC; herramienta de desarrollo, 0.302)
//  Para retocar los sprites de los personajes que andan: Deep y los vecinos que pasean por el pueblo.
//  Mismo formato que el juego: 32 x 31, una letra por color (pal) y «.» transparente.
//  Lo que guardas se queda en este navegador; si está activo, el juego lo usa (al recargar la página).
//  Con «Exportar» se descarga un archivo para pasárselo a Claude. Se abre con «✎ Sprites» del mapa o con #sprites.
// =====================================================================
window.EditorSprites = (()=>{
  const $ = id => document.getElementById(id);
  const W = 32, H = 31, CEL = 16, CLAVE = 'deep-sprites';
  // colores del juego para elegir (la paleta de 32 colores del arte, más algunos de los retratos)
  const PALETA = ['#000000','#222034','#45283c','#663931','#8f563b','#df7126','#d9a066','#eec39a','#fbf236','#99e550','#6abe30','#37946e','#4b692f','#524b24','#323c39','#3f3f74',
    '#306082','#5b6ee1','#639bff','#5fcde4','#cbdbfc','#ffffff','#9badb7','#847e87','#696a6a','#595652','#76428a','#ac3232','#d95763','#d77bba','#8f974a','#8a6f30',
    '#eee8dc','#cbbeaa','#aaaab2','#b47850','#f09646','#ac4a28','#e28c96','#eeaad2'];
  const CH = '0abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789!$%&()+';

  // ---------- qué se puede editar ----------
  const original = id => {
    if(id === 'deep'){ const T = window.SPRITES.topo; return {nombre: 'Deep', pal: T.pal, anims: {reposo: T.anims.reposo, andar: T.anims.andar}}; }
    const P = window.PASEANTES[id]; return P ? {nombre: P.nombre, pal: P.pal, anims: P.anims} : null;
  };
  const LISTA = () => [['deep', 'Deep'], ...Object.entries(window.PASEANTES).map(([k, p]) => [k, p.nombre])];
  const copia = o => JSON.parse(JSON.stringify(o));
  const guardados = () => { try{ return (JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}).sprites || {}; }catch(e){ return {}; } };
  const guardarTodos = s => { try{ localStorage.setItem(CLAVE, JSON.stringify({sprites: s})); }catch(e){ aviso('No se ha podido guardar'); } };

  // ---------- estado ----------
  let sp = null, id = 'deep', anim = 'andar', fr = 0, color = '0', herr = 'lapiz', hist = [], cebolla = true, espejo = false, cambiado = false, montado = false, abierto = false, anT = 0, anF = 0, raf = 0;
  const F = () => sp.anims[anim][fr];
  const set = (g, x, y, c) => { if(x < 0 || x >= W || y < 0 || y >= H) return; const r = g[y]; g[y] = r.slice(0, x) + c + r.slice(x + 1); };

  function montar(){
    $('sprEd').innerHTML = `
    <header class="ed-barra">
      <button class="volver" id="spVolver">‹ Mapa</button>
      <h1>Editor de sprites</h1>
      <select id="spQuien" title="Personaje"></select>
      <select id="spAnim" title="Animación"></select>
      <button id="spDeshacer" title="Ctrl+Z">Deshacer</button>
      <span class="ed-hueco"></span>
      <button id="spGuardar" class="pri">Guardar</button>
      <button id="spExportar">Exportar</button>
      <label class="ed-file">Importar<input type="file" id="spImportar" accept=".json,application/json"></label>
    </header>
    <div class="ed-cuerpo">
      <aside class="ed-izq">
        <div class="ed-herr">${[['lapiz','✏️ Lápiz'],['goma','🧽 Goma'],['cubo','🪣 Relleno'],['gotero','💧 Cuentagotas']].map(([k, n]) => `<button data-h="${k}">${n}</button>`).join('')}</div>
        <p class="ed-nota">Clic: pinta · Clic derecho: borra · Ctrl+Z: deshacer</p>
        <h4>Colores de este personaje</h4><div class="sp-pal" id="spPalPropia"></div>
        <h4>Más colores del juego</h4><div class="sp-pal" id="spPalJuego"></div>
      </aside>
      <main class="ed-centro">
        <div class="ed-estado" id="spEstado">Fotograma 1</div>
        <div class="ed-scroll"><canvas id="spCv"></canvas></div>
        <div class="ed-filas">
          <button id="spAntes">◀</button><span id="spNum"></span><button id="spDespues">▶</button>
          <button id="spDup">Duplicar fotograma</button><button id="spBorrarF">Borrar fotograma</button>
          <button id="spReflejar">Reflejar ↔</button>
          <label class="ed-check sp-chk"><input type="checkbox" id="spCebolla" checked> Ver el anterior</label>
        </div>
        <div class="sp-tira" id="spTira"></div>
      </main>
      <aside class="ed-der">
        <section><details><summary><b>¿Cómo funciona?</b></summary><div class="ed-ayuda">
          <p>Cada personaje tiene animaciones (<b>quieto</b> y <b>andar</b>) hechas de <b>fotogramas</b> de 32 × 31 casillas. Mira a la derecha: para la izquierda, el juego lo refleja.</p>
          <p>Pinta casilla a casilla. «Ver el anterior» enseña en transparencia el fotograma de antes, para que los pies avancen bien.</p>
          <p><b>Guardar</b> lo deja en este navegador. Si «Usar en el juego» está marcado, el juego lo usa al recargar la página. <b>Exportar</b> descarga un archivo para pasárselo a Claude.</p>
        </div></details></section>
        <section><h3>Así se ve</h3>
          <div class="sp-prev"><canvas id="spPrev" width="96" height="93"></canvas><canvas id="spPrev1" width="32" height="31"></canvas></div>
          <label class="ed-check"><input type="checkbox" id="spEspejo"> Andando hacia la izquierda</label>
        </section>
        <section><h3>Este personaje</h3>
          <label class="ed-check"><input type="checkbox" id="spActivo" checked> Usar en el juego (en este navegador)</label>
          <button id="spBorrar" class="peligro">Borrar mi versión</button>
          <p class="ed-nota">Los vecinos aún no pasean por el pueblo: de momento se ven aquí.</p>
        </section>
      </aside>
    </div>
    <div class="ed-aviso" id="spAviso" hidden></div>`;
    $('spQuien').innerHTML = LISTA().map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
    $('spQuien').onchange = () => siCambios(() => cargar($('spQuien').value), () => $('spQuien').value = id);
    $('spAnim').onchange = () => { anim = $('spAnim').value; fr = 0; pintarTodo(); };
    document.querySelectorAll('#sprEd .ed-herr button').forEach(b => b.onclick = () => { herr = b.dataset.h; marcar(); });
    $('spVolver').onclick = () => siCambios(() => window.Pantallas.mostrar('mapa'));
    $('spDeshacer').onclick = deshacer;
    $('spGuardar').onclick = guardar;
    $('spExportar').onclick = exportar;
    $('spImportar').onchange = importar;
    $('spAntes').onclick = () => { fr = (fr - 1 + sp.anims[anim].length) % sp.anims[anim].length; pintarTodo(); };
    $('spDespues').onclick = () => { fr = (fr + 1) % sp.anims[anim].length; pintarTodo(); };
    $('spDup').onclick = () => { apuntar(); sp.anims[anim].splice(fr + 1, 0, F().slice()); fr++; tocar(); };
    $('spBorrarF').onclick = () => { if(sp.anims[anim].length < 2) return aviso('Tiene que quedar al menos un fotograma'); apuntar(); sp.anims[anim].splice(fr, 1); fr = Math.max(0, fr - 1); tocar(); };
    $('spReflejar').onclick = () => { apuntar(); sp.anims[anim][fr] = F().map(r => r.split('').reverse().join('')); tocar(); };
    $('spCebolla').onchange = () => { cebolla = $('spCebolla').checked; dibujar(); };
    $('spEspejo').onchange = () => { espejo = $('spEspejo').checked; };
    $('spActivo').onchange = () => { sp.activa = $('spActivo').checked; tocar(false); };
    $('spBorrar').onclick = () => { const g = guardados(); if(!g[id]) return aviso('No tienes una versión guardada de este personaje'); delete g[id]; guardarTodos(g); cargar(id); aviso('Borrada: vuelve la original (recarga la página para verla en el juego)'); };
    $('spPalJuego').innerHTML = PALETA.map(h => `<button class="sp-c" data-hex="${h}" title="${h}" style="background:${h}"></button>`).join('');
    $('spPalJuego').querySelectorAll('.sp-c').forEach(b => b.onclick = () => { color = letraDe(b.dataset.hex); if(herr === 'goma' || herr === 'gotero') herr = 'lapiz'; pintarPaleta(); marcar(); });
    // lienzo
    const cv = $('spCv'); let pintando = false, boton = 0;
    const celda = e => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / (r.width / W)), Math.floor((e.clientY - r.top) / (r.height / H))]; };
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      const [x, y] = celda(e); if(x < 0 || x >= W || y < 0 || y >= H) return;
      boton = e.button;
      if(herr === 'gotero'){ const c = F()[y][x]; if(c !== '.'){ color = c; herr = 'lapiz'; pintarPaleta(); marcar(); } return; }
      apuntar();
      const c = boton === 2 || herr === 'goma' ? '.' : color;
      if(herr === 'cubo'){ rellenar(x, y, c); tocar(); return; }
      set(F(), x, y, c); pintando = true; cv.setPointerCapture(e.pointerId); tocar();
    });
    cv.addEventListener('pointermove', e => {
      const [x, y] = celda(e);
      if(x >= 0 && x < W && y >= 0 && y < H){ const c = F()[y][x]; $('spEstado').textContent = `Fotograma ${fr + 1} de ${sp.anims[anim].length} · casilla ${x}, ${y} · ${c === '.' ? 'transparente' : (sp.pal[c] || c)}`; }
      if(pintando) { set(F(), x, y, boton === 2 || herr === 'goma' ? '.' : color); tocar(); }
    });
    addEventListener('pointerup', () => { pintando = false; });
    addEventListener('keydown', e => { if(!abierto) return; if((e.ctrlKey || e.metaKey) && e.key === 'z'){ e.preventDefault(); deshacer(); } });
  }
  // color nuevo: se le da una letra libre en la paleta del personaje
  function letraDe(hex){
    for(const [c, h] of Object.entries(sp.pal)) if(h.toLowerCase() === hex.toLowerCase()) return c;
    const c = [...CH].find(ch => !sp.pal[ch]); sp.pal[c] = hex; return c;
  }
  function rellenar(x, y, c){
    const g = F(), de = g[y][x]; if(de === c) return;
    const pila = [[x, y]];
    while(pila.length){ const [a, b] = pila.pop(); if(a < 0 || a >= W || b < 0 || b >= H || g[b][a] !== de) continue; set(g, a, b, c); pila.push([a+1, b], [a-1, b], [a, b+1], [a, b-1]); }
  }
  function apuntar(){ hist.push(JSON.stringify({anims: sp.anims, pal: sp.pal})); if(hist.length > 100) hist.shift(); }
  function deshacer(){ const h = hist.pop(); if(!h) return; const o = JSON.parse(h); sp.anims = o.anims; sp.pal = o.pal; fr = Math.min(fr, sp.anims[anim].length - 1); tocar(); }
  function tocar(redibujar = true){ cambiado = true; $('spGuardar').textContent = 'Guardar •'; if(redibujar) pintarTodo(); }
  function marcar(){ document.querySelectorAll('#sprEd .ed-herr button').forEach(b => b.classList.toggle('sel', b.dataset.h === herr)); }
  function pintarPaleta(){
    const usados = new Set(); Object.values(sp.anims).forEach(fs => fs.forEach(g => g.forEach(r => { for(const ch of r) usados.add(ch); })));
    $('spPalPropia').innerHTML = Object.entries(sp.pal).filter(([c]) => usados.has(c) || c === color).map(([c, h]) => `<button class="sp-c${c === color ? ' sel' : ''}" data-c="${c}" title="${h}" style="background:${h}"></button>`).join('');
    $('spPalPropia').querySelectorAll('.sp-c').forEach(b => b.onclick = () => { color = b.dataset.c; if(herr === 'goma' || herr === 'gotero') herr = 'lapiz'; pintarPaleta(); marcar(); });
  }
  const pintarFrame = (x, g, ox, oy, s, alfa = 1, flip = false) => {
    x.globalAlpha = alfa;
    for(let y = 0; y < H; y++) for(let i = 0; i < W; i++){ const c = g[y][i]; if(c === '.') continue; x.fillStyle = sp.pal[c] || '#f0f'; x.fillRect(ox + (flip ? W - 1 - i : i)*s, oy + y*s, s, s); }
    x.globalAlpha = 1;
  };
  function dibujar(){
    const cv = $('spCv'), x = cv.getContext('2d'); cv.width = W*CEL; cv.height = H*CEL;
    for(let y = 0; y < H; y++) for(let i = 0; i < W; i++){ x.fillStyle = (i + y) % 2 ? '#3a3340' : '#2f2935'; x.fillRect(i*CEL, y*CEL, CEL, CEL); }
    const L = sp.anims[anim]; if(cebolla && L.length > 1) pintarFrame(x, L[(fr - 1 + L.length) % L.length], 0, 0, CEL, 0.25);
    pintarFrame(x, F(), 0, 0, CEL);
    x.strokeStyle = 'rgba(255,255,255,0.07)';
    for(let i = 0; i <= W; i++){ x.beginPath(); x.moveTo(i*CEL + .5, 0); x.lineTo(i*CEL + .5, H*CEL); x.stroke(); }
    for(let y = 0; y <= H; y++){ x.beginPath(); x.moveTo(0, y*CEL + .5); x.lineTo(W*CEL, y*CEL + .5); x.stroke(); }
  }
  function pintarTira(){
    $('spNum').textContent = `${fr + 1} / ${sp.anims[anim].length}`;
    $('spTira').innerHTML = ''; sp.anims[anim].forEach((g, i) => { const c = document.createElement('canvas'); c.width = W*2; c.height = H*2; c.className = i === fr ? 'sel' : ''; pintarFrame(c.getContext('2d'), g, 0, 0, 2); c.onclick = () => { fr = i; pintarTodo(); }; $('spTira').appendChild(c); });
  }
  function pintarTodo(){ dibujar(); pintarTira(); pintarPaleta(); }
  // vista previa: anima la animación elegida (si es «quieto», alterna quieto y andar)
  function animar(t){
    if(!abierto) return; raf = requestAnimationFrame(animar);
    if(t - anT < 130) return; anT = t; anF++;
    const L = sp.anims[anim], g = L[anF % L.length];
    for(const [idc, s] of [['spPrev', 3], ['spPrev1', 1]]){ const c = $(idc), x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.fillStyle = '#c8a874'; x.fillRect(0, c.height - 6*s, c.width, 6*s); pintarFrame(x, g, 0, 0, s, 1, espejo); }
  }
  function cargar(nuevo){
    id = nuevo; const g = guardados()[id], o = original(id);
    sp = copia(g ? {nombre: o.nombre, pal: Object.assign({}, o.pal, g.pal), anims: Object.assign({}, o.anims, g.anims), activa: g.activa !== false} : Object.assign({activa: true}, o));
    anim = sp.anims[anim] ? anim : 'andar'; fr = 0; hist = []; cambiado = false; $('spGuardar').textContent = 'Guardar';
    $('spQuien').value = id; $('spAnim').innerHTML = Object.keys(sp.anims).map(a => `<option value="${a}">${a === 'reposo' ? 'Quieto' : a === 'andar' ? 'Andar' : a}</option>`).join(''); $('spAnim').value = anim;
    $('spActivo').checked = sp.activa !== false;
    color = Object.keys(sp.pal)[0]; pintarTodo(); marcar();
  }
  function siCambios(f, no){ if(!cambiado){ f(); return; } if(confirmar('Hay cambios sin guardar. ¿Seguir y perderlos?')) f(); else if(no) no(); }
  const confirmar = t => window.confirm(t);
  function guardar(){
    const g = guardados(); g[id] = {pal: sp.pal, anims: sp.anims, activa: sp.activa !== false}; guardarTodos(g);
    cambiado = false; $('spGuardar').textContent = 'Guardar';
    aviso(sp.activa !== false ? 'Guardado. Recarga la página para verlo en el juego' : 'Guardado (sin usar en el juego)');
  }
  function exportar(){
    const g = guardados(); if(cambiado) g[id] = {pal: sp.pal, anims: sp.anims, activa: sp.activa !== false};
    const datos = {juego: 'Deep', tipo: 'sprites', version: window.DATOS.version, fecha: new Date().toISOString().slice(0, 10), sprites: g};
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos)], {type: 'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = 'deep-sprites-' + datos.fecha + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    aviso('Descargado: ' + Object.keys(g).length + ' personaje(s). Pásale el archivo a Claude');
  }
  function importar(e){
    const f = e.target.files[0]; if(!f) return;
    const rd = new FileReader();
    rd.onload = () => { try{ const d = JSON.parse(rd.result); if(d.tipo !== 'sprites' || !d.sprites) throw 0; const g = guardados(); Object.assign(g, d.sprites); guardarTodos(g); cargar(id); aviso('Importados ' + Object.keys(d.sprites).length + ' personaje(s)'); }catch(err){ aviso('Ese archivo no es de sprites de Deep'); } e.target.value = ''; };
    rd.readAsText(f);
  }
  let avisoT = 0;
  function aviso(t){ const el = $('spAviso'); el.textContent = t; el.hidden = false; clearTimeout(avisoT); avisoT = setTimeout(() => el.hidden = true, Math.max(2500, t.length*60)); }
  function abrir(){ if(!montado){ montar(); montado = true; cargar('deep'); } abierto = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(animar); }
  function cerrar(){ abierto = false; cancelAnimationFrame(raf); }
  return {abrir, cerrar};
})();
