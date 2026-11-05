// =====================================================================
//  PUEBLO: el mapa con las minas y la plaza con las casas
//  Los dibujos son de píxel (lienzo pequeño ampliado sin suavizar);
//  los nombres y botones son HTML encima, para que se lean bien.
// =====================================================================
window.Pueblo = (()=>{
  const D = window.DATOS, Pa = window.Partida, S = window.SPRITES;
  const $ = id => document.getElementById(id);
  const C = {neg:'#000000', noche:'#222034', vino:'#45283c', marron:'#663931', marronC:'#8f563b', naranja:'#df7126', tostado:'#d9a066', crema:'#eec39a',
    amarillo:'#fbf236', verdeC:'#99e550', verde:'#6abe30', verdeM:'#37946e', verdeO:'#4b692f', oliva:'#524b24', grisO:'#323c39', azulO:'#3f3f74',
    azul:'#306082', azulC:'#5b6ee1', celeste:'#639bff', cian:'#5fcde4', hielo:'#cbdbfc', blanco:'#ffffff', gris:'#9badb7', grisM:'#847e87', grisB:'#696a6a', piedra:'#595652', rojo:'#ac3232'};
  const h2 = (x, y, s) => { let n = Math.imul(x,374761393) + Math.imul(y,668265263) + Math.imul(s,982451653); n = Math.imul(n^(n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967295; };

  // ---------- utilidades de lienzo ----------
  // La imagen llena todo el hueco. Si sobra por un lado (la pantalla es más alargada que la imagen), se recorta
  // y se puede arrastrar para ver lo que queda fuera (pan guarda cuánto se ha movido).
  function ajustar(cv, cont, W, H, pan){
    const r = cont.getBoundingClientRect();
    const cubre = Math.max(r.width/W, r.height/H), cabe = Math.min(r.width/W, r.height/H);
    const css = cubre/cabe <= 1.6 ? cubre : cabe;
    const lim = (v, tam, hueco) => tam <= hueco ? (hueco - tam)/2 : Math.max(hueco - tam, Math.min(0, v));
    const left = lim((r.width - W*css)/2 + (pan ? pan.x : 0), W*css, r.width), top = lim((r.height - H*css)/2 + (pan ? pan.y : 0), H*css, r.height);
    if(pan){ pan.x = left - (r.width - W*css)/2; pan.y = top - (r.height - H*css)/2; }
    cv.width = W; cv.height = H; cv.style.width = (W*css)+'px'; cv.style.height = (H*css)+'px';
    cv.style.position = 'absolute'; cv.style.left = left + 'px'; cv.style.top = top + 'px';
    return {css, left, top};
  }
  // arrastrar la imagen (si no cabe entera); un arrastre no cuenta como toque
  function arrastrable(cont, pan, alMover){
    let x0 = 0, y0 = 0, p0 = null, movido = false;
    cont.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; p0 = {x: pan.x, y: pan.y}; movido = false; });
    cont.addEventListener('pointermove', e => { if(!p0 || !(e.buttons & 1)) return; const dx = e.clientX - x0, dy = e.clientY - y0;
      if(!movido && Math.hypot(dx, dy) < 8) return; movido = true; pan.x = p0.x + dx; pan.y = p0.y + dy; alMover(); });
    cont.addEventListener('pointerup', () => { p0 = null; });
    cont.addEventListener('click', e => { if(movido){ e.stopPropagation(); e.preventDefault(); movido = false; } }, true);
  }
  const R = (x, c, X, Y, w, h) => { x.fillStyle = c; x.fillRect(X|0, Y|0, w|0, h|0); };

  // ---------- sprite del topo (reposo) ----------
  // el móvil puede vaciar los lienzos guardados cuando la pestaña pasa a segundo plano: cada uno guarda cómo se pinta
  // para volver a pintarlo al volver (ver «al volver a la pestaña», más abajo)
  const LIENZOS = [];
  const lienzo = (w, h, pintar) => { const c = document.createElement('canvas'); c.width = w; c.height = h; pintar(c.getContext('2d')); LIENZOS.push([c, pintar]); return c; };
  const topoCv = lienzo(32, 31, x => { const f = S.topo.anims.reposo[0];
    f.forEach((row, y) => { for(let i=0;i<row.length;i++){ const ch = row[i]; if(ch === '.') continue; x.fillStyle = S.topo.pal[ch]; x.fillRect(i, y, 1, 1); } }); });

  // topo andando (para la plaza): fotogramas de andar y de reposo
  const frameCv = f => lienzo(32, 31, x => { f.forEach((row, y) => { for(let i=0;i<row.length;i++){ const ch = row[i]; if(ch === '.') continue; x.fillStyle = S.topo.pal[ch]; x.fillRect(i, y, 1, 1); } }); });
  const TOPO_ANDAR = (S.topo.anims.andar || S.topo.anims.reposo).map(frameCv);
  const TOPO_REPOSO = S.topo.anims.reposo.map(frameCv);

  // una mina está abierta si lo está en datos.js o si ya la desbloqueaste pagando materiales
  const MAT = D.materiales;
  const abierta = m => !!(m.abierta || Pa.bandera('mina_' + m.id + '_abierta'));

  // =================== MAPA ===================
  // Imagen de la montaña (js/escenarios.js) en dos versiones: seca y verde. Cada mina tiene su zona (la parte del mapa
  // más cercana a su boca, con el borde irregular); al abrir su respiradero (llegar al fondo), esa zona reverdece.
  // La primera vez que vuelves al mapa después, el verde crece desde la boca hacia fuera.
  const ESC = window.ESCENARIOS;
  const MW = ESC.mapa.ancho, MH = ESC.mapa.alto;
  const mapaCv = $('mapaCv'), mx = mapaCv.getContext('2d');
  let mapaSel = null, mapaGeo = null, esperando = false;
  const CENTRO = {x: D.mapa.pueblo[0], y: D.mapa.pueblo[1]};
  const POS = D.minas.map(m => ({x: m.boca[0], y: m.boca[1]}));
  const VIEJO = {x: D.mapa.viejo[0], y: D.mapa.viejo[1]};
  // ruido suave para los bordes de las zonas y el crecimiento
  const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
    const a = h2(xi, yi, s), b = h2(xi+1, yi, s), c = h2(xi, yi+1, s), d = h2(xi+1, yi+1, s); return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v; };
  // carga una imagen y devuelve sus píxeles
  function pixeles(src, w, h, listo){ const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0); listo(x.getImageData(0, 0, w, h).data); }; im.src = src; }
  const MAPA = {seca: null, viva: null, dueno: null, dist: null, fino: null, img: null, cv: document.createElement('canvas'), firma: ''};
  MAPA.cv.width = MW; MAPA.cv.height = MH;
  pixeles(ESC.mapa.seca, MW, MH, d => { MAPA.seca = d; MAPA.firma = ''; });
  pixeles(ESC.mapa.viva, MW, MH, d => { MAPA.viva = d; MAPA.firma = ''; });
  // zona de cada mina: la boca más cercana, con el borde deformado por ruido
  (function zonas(){
    const n = MW*MH; MAPA.dueno = new Uint8Array(n); MAPA.dist = new Float32Array(n); MAPA.fino = new Float32Array(n);
    for(let y=0;y<MH;y++) for(let x=0;x<MW;x++){
      const ox = (vn(x/14, y/14, 3) - 0.5)*40, oy = (vn(x/14, y/14, 4) - 0.5)*40;
      let best = 1e9, bi = 0;
      POS.forEach((p, i) => { const d = Math.hypot(x + ox - p.x, (y + oy - p.y)*0.9); if(d < best){ best = d; bi = i; } });
      const k = y*MW + x; MAPA.dueno[k] = bi; MAPA.dist[k] = best; MAPA.fino[k] = h2(x, y, 9);
    }
  })();
  // cuánto ha revivido cada zona: 0 seca, 1 verde (con el crecimiento animado la primera vez)
  const respiradero = m => Pa.bandera('respiradero_' + m.id);
  let crece = null;   // {i, t0}: zona que está reverdeciendo ahora
  function progreso(t){
    if(!crece){ const i = D.minas.findIndex(m => respiradero(m) && !Pa.bandera('respiradero_visto_' + m.id)); if(i >= 0) crece = {i, t0: t + 0.6}; }
    return D.minas.map((m, i) => { if(crece && crece.i === i) return Math.max(0, Math.min(1, (t - crece.t0)/2.2)); return respiradero(m) ? 1 : 0; });
  }
  // cada mina reverdece hasta su radio (datos: mapa.verde); con el pueblo revivido del todo, su zona entera
  const RADIO = D.minas.map(m => (D.mapa.verde && D.mapa.verde[m.id]) ?? 160);
  function componerMapa(prog){
    const entero = vidaPueblo() >= 1, firma = prog.map(v => v.toFixed(3)).join(',') + (entero ? '+' : '');
    if(firma === MAPA.firma || !MAPA.seca || !MAPA.viva) return;
    MAPA.firma = firma;
    const out = mx.createImageData(MW, MH), o = out.data, S = MAPA.seca, V = MAPA.viva;
    for(let k=0;k<MW*MH;k++){
      const i = MAPA.dueno[k], p = prog[i], rad = entero ? 400 : RADIO[i];
      const viva = p > 0 && MAPA.dist[k] < p*rad + (MAPA.fino[k] - 0.5)*10;
      const src = viva ? V : S, j = k*4; o[j] = src[j]; o[j+1] = src[j+1]; o[j+2] = src[j+2]; o[j+3] = 255;
    }
    MAPA.cv.getContext('2d').putImageData(out, 0, 0);
  }
  // lo elegido (en el mapa y en la plaza): una flechita de píxel que bota, con la punta en (cx, cy)
  const FLECHA = ['.00000.', '.0bbb0.', '00bbb00', '0bbbbb0', '.0bbb0.', '..0b0..', '...0...'];
  function flecha(x, cx, cy, t, e = 2){
    const bote = Math.round((0.5 - 0.5*Math.cos(t*6))*3*e), X = Math.round(cx) - 3*e - Math.floor(e/2), Y = Math.round(cy) - 7*e - bote;
    FLECHA.forEach((f, j) => { for(let i=0;i<7;i++){ const ch = f[i]; if(ch === '.') continue; x.fillStyle = ch === '0' ? C.neg : C.amarillo; x.fillRect(X + i*e, Y + j*e, e, e); } });
  }
  // el Deep pequeñito del mapa (8x10): casco amarillo, gafas, pañuelo y dos pasos
  const MINI = [
    ['..0000..', '.0bbbb0.', '0abbbbb0', '0aaaaaa0', '0kiikik0', '0kkkkkk0', '.022220.', '0hhhhhh0', '.0hh0hh0', '.00..00.'],
    ['..0000..', '.0bbbb0.', '0abbbbb0', '0aaaaaa0', '0kiikik0', '0kkkkkk0', '.022220.', '0hhhhhh0', '.0hhhh0.', '..0..0..'],
  ];
  const MINI_PAL = {'0': C.neg, b: C.amarillo, a: '#959025', k: C.tostado, i: '#131313', '2': '#d95763', h: C.marron};
  const miniCv = MINI.map(f => lienzo(8, 10, x => { f.forEach((row, j) => { for(let i=0;i<8;i++){ const ch = row[i]; if(ch === '.') continue; x.fillStyle = MINI_PAL[ch]; x.fillRect(i, j, 1, 1); } }); }));
  // caminos del mapa: grafo de puntos (datos: mapa.nodos y mapa.tramos)
  const NOD = D.mapa.nodos, ADJ = {}, OCULTO = D.mapa.oculto || [];
  const unir = (a, b) => { (ADJ[a] || (ADJ[a] = [])).push(b); (ADJ[b] || (ADJ[b] = [])).push(a); };
  D.mapa.tramos.split(/\s+/).forEach(t => { const [a, b] = t.split('-'); if(NOD[a] && NOD[b]) unir(a, b); });
  if(OCULTO.length === 2) unir(OCULTO[0], OCULTO[1]);
  const largo = (a, b) => Math.hypot(NOD[a][0] - NOD[b][0], NOD[a][1] - NOD[b][1]);
  const esOculto = (a, b) => OCULTO.includes(a) && OCULTO.includes(b) && a !== b;
  function ruta(a, b){
    const d = {[a]: 0}, de = {}, hecho = new Set();
    for(;;){
      let u = null; for(const k in d) if(!hecho.has(k) && (u === null || d[k] < d[u])) u = k;
      if(u === null || u === b) break; hecho.add(u);
      for(const v of ADJ[u] || []){ const nd = d[u] + largo(u, v); if(d[v] === undefined || nd < d[v]){ d[v] = nd; de[v] = u; } }
    }
    if(d[b] === undefined) return [];
    const r = []; for(let k = b; k !== a; k = de[k]) r.unshift(k); return r;
  }
  const mini = {nodo: 'pueblo', x: 0, y: 0, camino: [], alLlegar: null, cara: 1, tUlt: 0, tPaso: 0};
  const parada = sel => sel === 'pueblo' || sel === 'viejo' ? D.mapa.paradas[sel] : D.mapa.paradas[D.minas[sel].id];
  function colocarMini(){ const n = NOD[mini.nodo] || NOD.pueblo; mini.x = n[0]; mini.y = n[1]; mini.camino = []; mini.alLlegar = null; }
  // ir a un punto: si ya iba andando, primero termina el tramo en el que está
  function irMapa(destino, alLlegar){
    const desde = mini.camino.length ? mini.camino[0] : mini.nodo;
    const r = ruta(desde, destino);
    mini.camino = mini.camino.length ? [mini.camino[0], ...r] : r;
    mini.alLlegar = alLlegar;
    if(!mini.camino.length){ mini.alLlegar = null; alLlegar && alLlegar(); }
  }
  function moverMini(t){
    const dt = Math.min(0.05, Math.max(0, t - mini.tUlt)); mini.tUlt = t;
    if(!mini.camino.length) return;
    const b = mini.camino[0], q = NOD[b], dx = q[0] - mini.x, dy = q[1] - mini.y, d = Math.hypot(dx, dy), v = (D.mapa.velocidad || 70)*dt;
    if(Math.abs(dx) > 0.3) mini.cara = Math.sign(dx);
    if(d <= v){ mini.x = q[0]; mini.y = q[1]; mini.nodo = b; mini.camino.shift();
      if(!mini.camino.length && mini.alLlegar){ const f = mini.alLlegar; mini.alLlegar = null; f(); } }
    else { mini.x += dx/d*v; mini.y += dy/d*v; }
    if(!esOculto(mini.nodo, b)){ mini.tPaso += dt; if(mini.tPaso > 0.3){ mini.tPaso = 0; window.Sonido && window.Sonido.tocar('pasoPlaza', 0.4); } }
  }
  function dibujarMini(x, t){
    // por el sendero oculto no se le ve (va por detrás del peñasco)
    if(mini.camino.length && esOculto(mini.nodo, mini.camino[0])) return;
    const fr = miniCv[mini.camino.length ? Math.floor(t*8) % 2 : 0], X = Math.round(mini.x) - 4, Y = Math.round(mini.y) - 10;
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(X + 1, Y + 10, 6, 1);
    x.save(); if(mini.cara < 0){ x.translate(X + 8, Y); x.scale(-1, 1); x.drawImage(fr, 0, 0); } else x.drawImage(fr, X, Y); x.restore();
  }
  function dibujarMapa(t){
    const x = mx, prog = progreso(t);
    componerMapa(prog);
    if(crece && t > crece.t0 + 2.4){ Pa.ponerBandera('respiradero_visto_' + D.minas[crece.i].id); crece = null; }
    if(crece && Math.abs(t - crece.t0) < 0.05) window.Sonido && window.Sonido.tocar('abrir', 0.6);
    x.drawImage(MAPA.cv, 0, 0);
    // minas cerradas: un candado sobre la boca
    D.minas.forEach((m, i) => {
      const p = POS[i];
      if(!abierta(m)){ R(x, C.neg, p.x-4, p.y-4, 9, 8); R(x, C.grisM, p.x-3, p.y-3, 7, 6); R(x, C.neg, p.x, p.y-1, 1, 2);
        R(x, C.neg, p.x-3, p.y-8, 7, 5); R(x, C.grisM, p.x-2, p.y-7, 5, 4); R(x, C.neg, p.x-1, p.y-6, 3, 3); }
    });
    moverMini(t); dibujarMini(x, t);
    if(typeof mapaSel === 'number') flecha(x, POS[mapaSel].x, POS[mapaSel].y - 11, t);
    if(mapaSel === 'viejo') flecha(x, VIEJO.x, VIEJO.y - 14, t);
    if(mapaSel === 'pueblo') flecha(x, CENTRO.x, CENTRO.y - 24, t);
    // zona reverdeciendo: chispas verdes sobre la boca
    if(crece && t > crece.t0){ const p = POS[crece.i]; for(let i=0;i<6;i++){ const ph = (t*0.8 + i/6) % 1; R(x, i%2 ? C.verdeC : C.amarillo, p.x - 10 + i*4, p.y - 4 - ph*24, 1, 1); } }
  }
  function montarPuntosMapa(){
    const cont = $('mapaPuntos'); cont.innerHTML = '';
    const g = mapaGeo, at = (px, py) => ({left: g.left + px*g.css, top: g.top + py*g.css});
    const pueblo = document.createElement('button'); pueblo.className = 'punto';
    const a = at(CENTRO.x, CENTRO.y); pueblo.style.left = a.left+'px'; pueblo.style.top = a.top+'px';
    pueblo.innerHTML = `<span class="zona" style="width:${110*g.css}px;height:${80*g.css}px"></span><span class="etq">El pueblo</span>`;
    pueblo.style.transform = `translate(-50%, -${40*g.css}px)`;
    pueblo.onclick = () => { mapaSel = 'pueblo'; esperando = true; marcar(); irMapa(parada('pueblo'), () => { if(mapaSel === 'pueblo'){ esperando = false; window.Pantallas.mostrar('plaza'); } }); };
    pueblo.setAttribute('aria-label', 'Entrar al pueblo');
    cont.appendChild(pueblo);
    D.minas.forEach((m, i) => {
      const b = document.createElement('button'); b.className = 'punto' + (abierta(m) ? '' : ' cerrada');
      const q = at(POS[i].x, POS[i].y); b.style.left = q.left+'px'; b.style.top = q.top+'px';
      b.style.transform = `translate(-50%, -${12*g.css}px)`;
      b.innerHTML = `<span class="zona" style="width:${26*g.css}px;height:${24*g.css}px"></span><span class="etq">${m.id}</span>`;
      b.setAttribute('aria-label', 'Mina ' + m.id + ': ' + m.nombre);
      b.onclick = () => { if(mapaSel === i && !esperando) return; mapaSel = i; esperando = true; marcar(); irMapa(parada(i), () => { if(mapaSel === i){ esperando = false; marcar(); } }); };
      cont.appendChild(b);
    });
    const v = document.createElement('button'); v.className = 'punto';
    const qv = at(VIEJO.x, VIEJO.y); v.style.left = qv.left+'px'; v.style.top = qv.top+'px';
    v.style.transform = `translate(-50%, -${12*g.css}px)`;
    v.innerHTML = `<span class="zona" style="width:${40*g.css}px;height:${34*g.css}px"></span><span class="etq">Viejo topo</span>`;
    v.style.transform = `translate(-50%, -${17*g.css}px)`;
    v.setAttribute('aria-label', 'Casa del viejo topo');
    v.onclick = () => { if(mapaSel === 'viejo' && !esperando) return; mapaSel = 'viejo'; esperando = true; marcar(); irMapa(parada('viejo'), () => { if(mapaSel === 'viejo'){ esperando = false; marcar(); } }); };
    cont.appendChild(v);
    marcar(); encajarEtiquetas(cont);
  }
  const costeChips = c => '<span class="coste">' + Object.entries(c).map(([k, n]) => `<span class="chip${(Pa.almacen[k]||0) >= n ? '' : ' muted'}"><i style="background:${MAT[k].color}"></i>${MAT[k].nombre} <b>${Math.min(Pa.almacen[k]||0, n)}/${n}</b></span>`).join('') + '</span>';
  // bocadillo encima de la imagen, junto a la mina (o la casa) que tocas; se cierra tocando fuera
  function colocarBurbuja(x, y){
    const el = $('mapaPanel'), g = mapaGeo; if(!g) return;
    const cont = $('mapaLienzo').getBoundingClientRect(), X = g.left + x*g.css, Y = g.top + y*g.css;
    el.hidden = false; const w = el.offsetWidth, h = el.offsetHeight;
    let left = Math.max(8, Math.min(cont.width - w - 8, X - w/2));
    let top = Y > cont.height*0.5 ? Y - h - 26 : Y + 26;
    top = Math.max(8, Math.min(cont.height - h - 8, top));
    el.style.left = left + 'px'; el.style.top = top + 'px';
  }
  function marcar(){
    const pts = document.querySelectorAll('#mapaPuntos .punto');
    pts.forEach((b, j) => b.classList.toggle('sel', mapaSel === 'viejo' ? j === pts.length - 1 : mapaSel === 'pueblo' ? j === 0 : j-1 === mapaSel));
    // objetivo: una etiqueta pequeña en una esquina
    const o = Pa.objetivo(), oc = $('mapaObjetivo');
    oc.hidden = !o; if(o) oc.textContent = '🎯 ' + o.corto[0].toUpperCase() + o.corto.slice(1);
    const btn = $('mpBoton'); $('mpBoton2').hidden = true;
    // mientras Deep va andando hacia lo elegido, el bocadillo espera a que llegue
    if(mapaSel === null || mapaSel === 'pueblo' || (esperando && mapaSel !== 'objetivo')){ $('mapaPanel').hidden = true; return; }
    if(mapaSel === 'objetivo'){
      $('mpEyebrow').textContent = 'Siguiente objetivo'; $('mpTitulo').textContent = o ? o.nombre[0].toUpperCase() + o.nombre.slice(1) : '';
      $('mpTexto').innerHTML = o ? costeChips(o.coste) : ''; btn.hidden = true;
      colocarBurbuja(MW/2, 40); return;
    }
    if(mapaSel === 'viejo'){
      $('mpEyebrow').textContent = 'Apartada del pueblo'; $('mpTitulo').textContent = 'Casa del viejo topo';
      $('mpTexto').innerHTML = ''; btn.hidden = false; btn.disabled = false; btn.textContent = 'Llamar a la puerta';
      colocarBurbuja(VIEJO.x, VIEJO.y); return;
    }
    const m = D.minas[mapaSel];
    $('mpEyebrow').textContent = 'Mina ' + m.id; $('mpTitulo').textContent = m.nombre; $('mpTexto').innerHTML = '';
    btn.hidden = false;
    if(abierta(m)){
      btn.disabled = false; btn.textContent = 'Bajar';
      // Pozo viejo: el ascensor según la historia
      if(m.pozo === 'uno' && Pa.bandera('ascensor_pozo1_roto') && !Pa.bandera('ascensor_pozo1_apanado')) $('mpTexto').innerHTML = '<p>El ascensor del fondo está estropeado.</p>';
      if(m.pozo === 'uno' && Pa.bandera('ascensor_pozo1_fino')){ $('mpBoton2').hidden = false; $('mpBoton2').textContent = 'Ascensor (al fondo)'; btn.textContent = 'Bajar por la boca'; }
    } else if(m.id === 5 && Pa.bandera('respiradero_4')){
      // el socavón del viejo: al acercarte, el viejo topo sale a cortarte el paso
      $('mpTexto').innerHTML = Pa.bandera('viejo_mina5') ? '<p>El viejo topo no te deja pasar. 🚧 Próximamente.</p>' : '';
      btn.disabled = false; btn.textContent = 'Acercarse a la boca';
    } else if(m.desbloqueo && !m.pozo){
      // ya se sabe lo que pedirá, pero la mina aún no está hecha
      $('mpTexto').innerHTML = costeChips(m.desbloqueo) + '<p>🚧 Próximamente.</p>';
      btn.disabled = true; btn.textContent = 'Próximamente';
    } else if(m.desbloqueo){
      // mina cerrada que se abre con materiales del almacén
      const ok = Pa.puedePagar(m.desbloqueo);
      $('mpTexto').innerHTML = costeChips(m.desbloqueo);
      btn.disabled = !ok; btn.textContent = ok ? 'Abrir la mina' : 'Faltan materiales';
    } else { btn.hidden = true; $('mpTexto').innerHTML = '<p>🔒 Aún no se puede llegar.</p>'; }
    colocarBurbuja(POS[mapaSel].x, POS[mapaSel].y);
  }
  $('mapaObjetivo').onclick = e => { e.stopPropagation(); esperando = false; mapaSel = mapaSel === 'objetivo' ? null : 'objetivo'; marcar(); };
  // tocar la imagen fuera de un punto cierra el bocadillo
  $('mapaCv').addEventListener('click', () => { if(mapaSel !== null){ mapaSel = null; esperando = false; mini.alLlegar = null; marcar(); } });
  $('mpBoton2').onclick = () => { if(mapaSel !== null && mapaSel !== 'viejo') window.Pantallas.mostrar('mina', D.minas[mapaSel].pozo || 'viejo', {fondo: true}); };
  $('mpBoton').onclick = () => {
    if(mapaSel === null || esperando) return;
    if(mapaSel === 'viejo'){
      const conv = window.Conversaciones && window.Conversaciones.alEntrar('viejo');
      if(conv && window.Dialogo) window.Dialogo.mostrar(conv.lineas, () => { if(conv.fin) conv.fin(); marcar(); });
      return;
    }
    const m = D.minas[mapaSel];
    if(m.id === 5 && !abierta(m) && Pa.bandera('respiradero_4')){
      const conv = window.Conversaciones && window.Conversaciones.alEntrar('mina5');
      if(conv && window.Dialogo) window.Dialogo.mostrar(conv.lineas, () => { if(conv.fin) conv.fin(); marcar(); });
      return;
    }
    if(abierta(m)){ window.Pantallas.mostrar('mina', m.pozo || 'viejo'); return; }
    if(m.desbloqueo && m.pozo && Pa.puedePagar(m.desbloqueo)){
      for(const [k, n] of Object.entries(m.desbloqueo)) Pa.almacen[k] -= n;
      Pa.ponerBandera('mina_' + m.id + '_abierta'); Pa.sumarProsperidad(2);
      window.Sonido && window.Sonido.tocar('abrir');
      montarPuntosMapa(); marcar();
      $('mpEyebrow').textContent = '¡Mina abierta!';
    }
  };

  // =================== PLAZA ===================
  // Imagen de la plaza (js/escenarios.js), seca y verde: revive según los respiraderos abiertos (provisional).
  // Deep anda por los caminos de tierra (rejilla de paso) buscando el camino más corto hasta la puerta.
  const PL = ESC.plaza, PW = PL.ancho, PH = PL.alto, CEL = PL.celda;
  const plazaCv = $('plazaCv'), px = plazaCv.getContext('2d');
  let plazaSel = null, plazaGeo = null;
  const PLZ = {seca: null, viva: null, cv: document.createElement('canvas'), firma: '', ruido: new Float32Array(PW*PH)};
  PLZ.cv.width = PW; PLZ.cv.height = PH;
  for(let y=0;y<PH;y++) for(let x=0;x<PW;x++) PLZ.ruido[y*PW + x] = vn(x/18, y/18, 13)*0.7 + h2(x, y, 14)*0.3;
  pixeles(PL.seca, PW, PH, d => { PLZ.seca = d; PLZ.firma = ''; });
  pixeles(PL.viva, PW, PH, d => { PLZ.viva = d; PLZ.firma = ''; });
  // cuánto ha revivido el pueblo (provisional: la parte de las 8 minas con el respiradero abierto)
  // (datos: mapa.plazaVerde, la parte de la imagen que reverdece con cada respiradero; manda el más alto)
  const PV = (D.mapa && D.mapa.plazaVerde) || {};
  const vidaPueblo = () => D.minas.reduce((f, m) => typeof m.id === 'number' && respiradero(m) ? Math.max(f, PV[m.id] ?? 0) : f, 0);
  const RUIDO_ORD = Float32Array.from(PLZ.ruido).sort();
  function componerPlaza(){
    const f = vidaPueblo(), firma = f.toFixed(3);
    if(firma === PLZ.firma || !PLZ.seca || !PLZ.viva) return;
    PLZ.firma = firma;
    const out = px.createImageData(PW, PH), o = out.data, umbral = f <= 0 ? -1 : f >= 1 ? 2 : RUIDO_ORD[Math.floor(f*(RUIDO_ORD.length - 1))];
    for(let k=0;k<PW*PH;k++){ const src = PLZ.ruido[k] <= umbral ? PLZ.viva : PLZ.seca, j = k*4; o[j] = src[j]; o[j+1] = src[j+1]; o[j+2] = src[j+2]; o[j+3] = 255; }
    PLZ.cv.getContext('2d').putImageData(out, 0, 0);
  }
  const CASA = c => PL.edificios[c.id];
  // casas que se abren a lo largo del juego (el museo, las casas de paja): cómo están ahora
  const casaVer = c => c.abreCon && Pa.bandera(c.abreCon) ? Object.assign({}, c, c.abierta) : c;
  // casa abierta: se pinta encima su versión de la imagen verde (puertas y ventanas sin tablas), solo la silueta del edificio
  const SILUETA = {};
  function silueta(id){
    if(SILUETA[id] !== undefined) return SILUETA[id];
    const runs = (PL.contornos || {})[id]; if(!runs || !PLZ.viva){ return null; }
    const filas = {}; for(const [y, a, b] of runs){ const f = filas[y] || (filas[y] = [1e9, -1]); f[0] = Math.min(f[0], a); f[1] = Math.max(f[1], b); }
    const ys = Object.keys(filas).map(Number); if(!ys.length) return (SILUETA[id] = null);
    const y0 = Math.min(...ys), y1 = Math.max(...ys), x0 = Math.min(...ys.map(y => filas[y][0])), x1 = Math.max(...ys.map(y => filas[y][1]));
    const cv = document.createElement('canvas'); cv.width = x1 - x0 + 1; cv.height = y1 - y0 + 1;
    const g = cv.getContext('2d'), im = g.createImageData(cv.width, cv.height);
    for(let y=y0;y<=y1;y++){ const f = filas[y]; if(!f) continue;
      for(let x=f[0];x<=f[1];x++){ const k = (y*PW + x)*4, j = ((y - y0)*cv.width + (x - x0))*4; im.data[j] = PLZ.viva[k]; im.data[j+1] = PLZ.viva[k+1]; im.data[j+2] = PLZ.viva[k+2]; im.data[j+3] = 255; } }
    g.putImageData(im, 0, 0);
    return (SILUETA[id] = {cv, x: x0, y: y0});
  }
  function dibujarPlaza(t){
    const x = px;
    componerPlaza();
    x.drawImage(PLZ.cv, 0, 0);
    for(const c of D.casas) if(c.abreCon && Pa.bandera(c.abreCon)){ const sl = silueta(c.id); if(sl) x.drawImage(sl.cv, sl.x, sl.y); }
    moverTopo(t);
    const andando = topo.camino.length > 0, frs = andando ? TOPO_ANDAR : TOPO_REPOSO;
    const fr = frs[Math.floor(t*(andando ? 9 : 2)) % frs.length];
    const X = Math.round(topo.x - 16), Y = Math.round(topo.y - 29);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(Math.round(topo.x), Math.round(topo.y), 9, 3, 0, 0, Math.PI*2); x.fill();
    x.save();
    if(topo.cara < 0){ x.translate(X + 32, Y); x.scale(-1, 1); x.drawImage(fr, 0, 0); }
    else x.drawImage(fr, X, Y);
    x.restore();
    // casa elegida: la flechita encima del tejado
    if(plazaSel !== null){ const e = CASA(D.casas[plazaSel]); if(e) flecha(x, (e.caja[0] + e.caja[2])/2, e.caja[1] - 1, t); }
  }
  // ---- caminos: búsqueda en la rejilla de paso (8 direcciones) y alisado en línea recta donde se pueda
  const pasa = (cx, cy) => cx >= 0 && cy >= 0 && cx < PL.cols && cy < PL.filas && PL.paso[cy][cx] === '1';
  const celdaDe = (x, y) => [Math.floor(x/CEL), Math.floor(y/CEL)];
  const centro = ([cx, cy]) => ({x: cx*CEL + CEL/2, y: cy*CEL + CEL/2});
  function cercana(cx, cy){
    if(pasa(cx, cy)) return [cx, cy];
    for(let r=1;r<40;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++) if(Math.max(Math.abs(dx), Math.abs(dy)) === r && pasa(cx+dx, cy+dy)) return [cx+dx, cy+dy];
    return [cx, cy];
  }
  function buscar(a, b){
    const W2 = PL.cols, key = (x, y) => y*W2 + x, g = new Float32Array(W2*PL.filas).fill(Infinity), de = new Int32Array(W2*PL.filas).fill(-1);
    const abiertos = [[a[0], a[1], 0]]; g[key(a[0], a[1])] = 0;
    const hz = (x, y) => Math.hypot(x - b[0], y - b[1]);
    while(abiertos.length){
      let bi = 0; for(let i=1;i<abiertos.length;i++) if(abiertos[i][2] < abiertos[bi][2]) bi = i;
      const [x, y] = abiertos.splice(bi, 1)[0];
      if(x === b[0] && y === b[1]) break;
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
        if(!dx && !dy) continue; const nx = x+dx, ny = y+dy; if(!pasa(nx, ny)) continue;
        if(dx && dy && (!pasa(x+dx, y) || !pasa(x, y+dy))) continue;   // sin cortar esquinas
        const ng = g[key(x, y)] + (dx && dy ? 1.414 : 1);
        if(ng < g[key(nx, ny)]){ g[key(nx, ny)] = ng; de[key(nx, ny)] = key(x, y); abiertos.push([nx, ny, ng + hz(nx, ny)]); }
      }
    }
    const camino = []; let k = key(b[0], b[1]); if(de[k] < 0 && !(a[0] === b[0] && a[1] === b[1])) return [];
    while(k >= 0){ camino.unshift([k % W2, Math.floor(k / W2)]); k = de[k]; }
    // alisar: de cada punto, saltar al más lejano que se vea en línea recta por el camino
    const visto = (p, q) => { const n = Math.ceil(Math.hypot(q[0]-p[0], q[1]-p[1])*2); for(let i=0;i<=n;i++){ const tt = i/n; if(!pasa(Math.round(p[0] + (q[0]-p[0])*tt), Math.round(p[1] + (q[1]-p[1])*tt))) return false; } return true; };
    const liso = [camino[0]]; let i = 0;
    while(i < camino.length - 1){ let j = camino.length - 1; while(j > i + 1 && !visto(camino[i], camino[j])) j--; liso.push(camino[j]); i = j; }
    return liso.slice(1).map(centro);
  }
  const INICIO = centro(PL.inicio), SALIDA = centro(PL.salida);
  const topo = {x: INICIO.x, y: INICIO.y, cara: 1, camino: [], alLlegar: null, tPaso: 0, tUlt: 0, rapido: false};
  const puerta = i => { const e = CASA(D.casas[i]); return e ? e.puerta : PL.inicio; };
  function irA(celda, alLlegar){
    const a = cercana(...celdaDe(topo.x, topo.y)), b = cercana(celda[0], celda[1]);
    topo.camino = buscar(a, b); topo.alLlegar = alLlegar; topo.rapido = false;
    if(!topo.camino.length && alLlegar){ topo.alLlegar = null; alLlegar(); }
  }
  function moverTopo(t){
    const dt = Math.min(0.05, Math.max(0, t - topo.tUlt)); topo.tUlt = t;
    if(!topo.camino.length) return;
    const p = topo.camino[0], dx = p.x - topo.x, dy = p.y - topo.y, d = Math.hypot(dx, dy), v = 90*(topo.rapido ? 2 : 1)*dt;
    if(Math.abs(dx) > 0.5) topo.cara = Math.sign(dx);
    if(d <= v){ topo.x = p.x; topo.y = p.y; topo.camino.shift(); if(!topo.camino.length && topo.alLlegar){ const f = topo.alLlegar; topo.alLlegar = null; f(); } }
    else { topo.x += dx/d*v; topo.y += dy/d*v; }
    topo.tPaso += dt; if(topo.tPaso > (topo.rapido ? 0.13 : 0.22)){ topo.tPaso = 0; window.Sonido && window.Sonido.tocar('pasoPlaza', 0.7); }
  }
  function montarPuntosPlaza(){
    const cont = $('plazaPuntos'); cont.innerHTML = '';
    const g = plazaGeo, at = (qx, qy) => ({left: g.left + qx*g.css, top: g.top + qy*g.css});
    D.casas.forEach((c0, i) => {
      const e = CASA(c0); if(!e) return;
      const c = casaVer(c0);
      const [x0, y0, x1, y1] = e.caja, b = document.createElement('button');
      b.className = 'punto' + (c.tipo === 'cerrada' ? ' cerrada' : ''); const q = at((x0 + x1)/2, (y0 + y1)/2); b.style.left = q.left+'px'; b.style.top = q.top+'px';
      b.innerHTML = `<span class="zona" style="width:${(x1-x0)*g.css}px;height:${(y1-y0)*g.css}px"></span>` + (c.tipo === 'cerrada' ? '' : `<span class="etq">${c.nombre}</span>`);
      b.style.transform = `translate(-50%, -${(y1-y0)/2*g.css}px)`;
      b.setAttribute('aria-label', c.nombre);
      b.onclick = () => { plazaSel = i; $('plazaPanel').hidden = true;
        irA(puerta(i), () => {
          if(plazaSel !== i) return;
          // al llegar a la puerta: si toca conversación, primero el diálogo y luego la casa
          const cv2 = casaVer(D.casas[i]), cerrada = cv2.tipo === 'cerrada' && c0.id !== 'museo';
          const conv = !cerrada && window.Conversaciones && window.Conversaciones.alEntrar(c0.id);
          if(conv && window.Dialogo) window.Dialogo.mostrar(conv.lineas, () => { if(conv.fin) conv.fin(); montarPuntosPlaza(); panelCasa(); });
          else panelCasa();
        }); };
      cont.appendChild(b);
    });
    const salida = document.createElement('button'); salida.className = 'punto';
    const q = at(SALIDA.x, SALIDA.y - 34); salida.style.left = q.left+'px'; salida.style.top = q.top+'px';
    salida.innerHTML = `<span class="zona" style="width:${50*g.css}px;height:${30*g.css}px"></span><span class="etq">Al mapa</span>`;
    salida.setAttribute('aria-label', 'Salir al mapa');
    salida.onclick = () => { plazaSel = null; panelCasa(); irA(PL.salida, () => window.Pantallas.mostrar('mapa')); topo.rapido = true; };
    cont.appendChild(salida);
    encajarEtiquetas(cont);
  }
  const chip = (k, n) => `<span class="chip"><i style="background:${MAT[k] && MAT[k].color || '#999'}"></i>${MAT[k] ? MAT[k].nombre : k} <b>${n}</b></span>`;
  const precioTxt = p => Object.entries(p).map(([m, n]) => n + ' de ' + (MAT[m] ? MAT[m].nombre.toLowerCase() : m)).join(', ');
  // las herramientas se guardan en el almacén; en cada bajada te llevas una tanda (ajustes de la mina)
  const LLEVAR = () => { let c = {}; try{ c = JSON.parse(localStorage.getItem('deep-cfg') || '{}') || {}; }catch(e){}
    const L = D.herramientas.llevarPorBajada || {puntales: 12, escaleras: 8}; return {p: c.llevP ?? L.puntales, l: c.llevL ?? L.escaleras}; };
  function kitTxt(){ const L = LLEVAR(); return 'En el almacén: ' + (Pa.kit.puntales||0) + ' puntales y ' + (Pa.kit.escaleras||0) + ' escaleras. En cada bajada te llevas ' + L.p + ' y ' + L.l + ' (si los tienes)'; }
  const OBJ = D.objetos || {}, HB = D.herboristeria || {encargos: [], unguentos: {}};
  const objTxt = o => Object.entries(o).map(([k, n]) => OBJ[k] ? n + ' ' + (n > 1 && OBJ[k].plural ? OBJ[k].plural : OBJ[k].nombre.toLowerCase()) : n + ' de ' + (D.materiales[k] ? D.materiales[k].nombre.toLowerCase() : k)).join(', ');
  const puedeObj = o => Pa.puedeDar(o);   // plantas de la colección y minerales del almacén
  const objChip = (k, tiene, n) => `<span class="chip${tiene >= n ? '' : ' muted'}">${OBJ[k] ? OBJ[k].icono : ''} ${OBJ[k] ? OBJ[k].nombre : k} <b>${Math.min(tiene, n)}/${n}</b></span>`;
  // kit del tejón: 1,5 veces lo que pide ese montacargas abajo (redondeando hacia arriba)
  const kitPrecio = c => Object.fromEntries(Object.entries(c).map(([k, n]) => [k, Math.ceil(n * ((D.montacargas && D.montacargas.kit) || 1.5))]));
  // elegir los ungüentos que te llevas (en la herboristería y en el almacén)
  function bindUng(cuerpo, HUECOS){
    cuerpo.querySelectorAll('input[data-l]').forEach(i => i.onchange = () => {
      const L2 = Pa.kit.llevarUng || (Pa.kit.llevarUng = {}), antes = Pa.ungElegidos();
      if(i.checked && antes.length >= HUECOS){ i.checked = false; $('ungNota').textContent = `Solo caben ${HUECOS} ungüentos. Quita uno antes de elegir otro.`; window.Sonido && window.Sonido.tocar('tropiezo', 0.5); return; }
      for(const id of Object.keys(HB.unguentos)) L2[id] = antes.includes(id);   // a partir de ahora, la elección es la que ves
      L2[i.dataset.l] = i.checked; Pa.guardar(); panelCasa(); });
  }
  const chipFalta = (k, tiene, n) => `<span class="chip${tiene >= n ? '' : ' muted'}"><i style="background:${MAT[k] && MAT[k].color || '#999'}"></i>${MAT[k] ? MAT[k].nombre : k} <b>${Math.min(tiene, n)}/${n}</b></span>`;
  // ---- casa de Deep: diario, armario, dormir y datos ----
  let casaTab = 'diario', diarioPag = null, armVisto = null;
  function panelCasaDeep(cuerpo){
    const CD = D.casaDeep || {diario: [], dormir: {cada: 3}}, tabs = {diario: '📖 Diario', armario: '👕 Armario', dormir: '🛏️ Dormir', datos: '📊 Datos'};
    let h = '<div class="tabs">' + Object.entries(tabs).map(([k, n]) => `<button class="tab${casaTab === k ? ' on' : ''}" data-t="${k}">${n}</button>`).join('') + '</div>';
    if(casaTab === 'diario'){
      // el diario: un cuaderno a toda pantalla, una entrada por página (se abre por la última; tocar la hoja pasa a la siguiente)
      const se = e => !e.si || (e.si.startsWith('col:') ? !!(Pa.coleccion[e.si.slice(4)] || Pa.visto[e.si.slice(4)]) : Pa.bandera(e.si));
      const ents = CD.diario.filter(se), n = ents.length;
      if(diarioPag === null || diarioPag >= n) diarioPag = n - 1;
      h += `<div class="cuaderno" id="cuaderno"><div class="pag">${ents[diarioPag] ? ents[diarioPag].texto : ''}</div>
        <div class="pie"><button id="pagAnt" ${diarioPag <= 0 ? 'disabled' : ''} aria-label="Página anterior">‹</button><span>Página ${diarioPag + 1} de ${n}</span><button id="pagSig" ${diarioPag >= n - 1 ? 'disabled' : ''} aria-label="Página siguiente">›</button></div></div>`;
    } else if(casaTab === 'armario'){
      const AS = (D.arcade && D.arcade.aspectos) || [], gan = Pa.aspectosGanados(), act = Pa.pueblo.aspecto || 'clasico';
      const total = new Set(['clasico', ...Object.values(CD.armario.minas), ...Object.values(CD.armario.flores)]).size;
      h += `<p class="lbl">${gan.length}/${total}</p><div class="armario">` +
        gan.map(id => { const a = AS.find(x => x.id === id) || {id: 'clasico', nombre: 'Clásico'};
          const img = window.Mina && window.Mina.retratoAspecto ? window.Mina.retratoAspecto(a.pal ? a : null, 2) : '';
          return `<button class="asp${id === act ? ' on' : ''}" data-a="${id}"><img src="${img}" alt=""><span>${a.nombre}</span></button>`; }).join('') + '</div>';
      if(armVisto){ const mm = Object.entries(CD.armario.minas).find(([, x]) => x === armVisto), ff = Object.entries(CD.armario.flores).find(([, x]) => x === armVisto);
        const m = mm && D.minas.find(x => String(x.id) === mm[0]);
        h += `<p class="burbujaAsp">${armVisto === 'clasico' ? 'El de siempre.' : m ? 'Por terminar ' + m.nombre + '.' : ff ? 'Por llevarle a la coneja una flor de mina ' + ff[0] + '.' : ''}</p>`; }
    } else if(casaTab === 'dormir'){
      const E = Pa.estad(), ult = Pa.pueblo.siesta ?? -99, faltan = (CD.dormir.cada || 3) - (E.bajadas - ult);
      const pc = Math.round(((CD.dormir.carga || 1.25) - 1)*100);
      const cuenta = n => `<p class="cuenta">🕒 Podrás volver a dormir dentro de <b>${n} ${n === 1 ? 'bajada' : 'bajadas'}</b>.</p>`;
      if(Pa.pueblo.descansado) h += `<p>Has dormido como un tronco. En la próxima bajada te cabe un ${pc} % más en la mochila.</p>` + cuenta(Math.max(1, faltan));
      else if(faltan > 0) h += `<p>Aún no tienes sueño.</p>` + cuenta(faltan);
      else h += `<p>Estás molido de tanto bajar. Una buena siesta y en la próxima bajada te cabe un ${pc} % más en la mochila.</p><div class="fila"><button class="btn" id="dormirBtn">Dormir</button></div>`;
    } else {
      const E = Pa.estad(), mins = Object.entries(E.minerales || {}).filter(([, n]) => n > 0);
      const abiertas = D.minas.filter(m => typeof m.id === 'number' && (m.abierta || Pa.bandera('mina_' + m.id + '_abierta'))).length;
      const terminadas = D.minas.filter(m => typeof m.id === 'number' && Pa.bandera('respiradero_' + m.id)).length;
      h += `<div class="datos"><p>⛏️ Bajadas <b>${E.bajadas}</b></p><p>💀 Veces que te quedaste abajo <b>${E.muertes}</b></p><p>📏 Lo más hondo <b>${E.record} m</b></p>
        <p>🗺️ Minas abiertas <b>${abiertas}</b> · terminadas <b>${terminadas}</b></p><p>🏛️ Colección <b>${colTxt()}</b></p><p>🌱 El pueblo revive <b>${Pa.pueblo.prosperidad}</b></p></div>
        <p class="lbl">Minerales subidos</p><div class="list">${mins.length ? mins.map(([k, n]) => chip(k, n)).join('') : '<span class="chip muted">Aún nada</span>'}</div>`;
    }
    cuerpo.innerHTML = h;
    const pasar = d => { const v = diarioPag + d; if(v < 0 || v >= (D.casaDeep.diario || []).length) return; diarioPag = v; window.Sonido && window.Sonido.tocar('clic', 0.5); panelCasa(); };
    if($('pagAnt')){ $('pagAnt').onclick = e => { e.stopPropagation(); pasar(-1); }; $('pagSig').onclick = e => { e.stopPropagation(); if(!$('pagSig').disabled) pasar(1); };
      $('cuaderno').onclick = () => { if(!$('pagSig').disabled) pasar(1); }; }
    cuerpo.querySelectorAll('button[data-t]').forEach(b => b.onclick = () => { casaTab = b.dataset.t; if(casaTab === 'diario') diarioPag = null; panelCasa(); });
    cuerpo.querySelectorAll('button[data-a]').forEach(b => b.onclick = () => { Pa.pueblo.aspecto = b.dataset.a; armVisto = b.dataset.a; Pa.guardar(); window.Sonido && window.Sonido.tocar('abrir', 0.6); panelCasa(); });
    const db = $('dormirBtn'); if(db) db.onclick = () => { Pa.pueblo.descansado = true; Pa.pueblo.siesta = Pa.estad().bajadas; Pa.guardar(); window.Sonido && window.Sonido.tocar('sala', 0.6); panelCasa(); };
  }
  function panelCasa(){
    document.querySelectorAll('#plazaPuntos .punto').forEach((b, j) => b.classList.toggle('sel', j === plazaSel));
    $('plazaKit').textContent = kitTxt();
    const cuerpo = $('ppCuerpo');
    if(plazaSel === null){ $('plazaPanel').hidden = true; return; }
    // la ventana crece solo hasta lo que necesita; a pantalla completa, solo la casa de Deep (diario, armario) y el almacén
    $('plazaPanel').hidden = false; $('plazaPanel').classList.remove('completa'); $('plazaPanel').classList.add('crece');
    const c = casaVer(D.casas[plazaSel]);
    const apunte = txt => { $('plazaPanel').classList.remove('completa', 'crece'); cuerpo.innerHTML = `<p>${txt}</p>`; };
    $('ppEyebrow').textContent = c.dueno; $('ppTitulo').textContent = c.nombre;
    if(c.tipo === 'tienda'){
      $('plazaPanel').classList.remove('completa');
      cuerpo.innerHTML = `<div class="list">${chip('arcilla', Pa.almacen.arcilla || 0)}</div>` + '<div class="shop">' + D.tienda.map((it, j) =>
        `<div class="row"><span>${it.nombre}<small>${precioTxt(it.precio)}</small></span><button data-j="${j}" ${Pa.puedePagar(it.precio) ? '' : 'disabled'}>Comprar</button></div>`).join('') + '</div>';
      cuerpo.querySelectorAll('button[data-j]').forEach(b => b.onclick = () => { Pa.comprar(D.tienda[+b.dataset.j]); panelCasa(); });
    } else if(c.tipo === 'almacen'){
      $('plazaPanel').classList.add('completa');
      // preparar la bajada: lo que te llevas (puntales, escaleras y ungüentos), los minerales con lo que falta y las mejoras
      const ks = Object.keys(Pa.almacen).filter(k => Pa.almacen[k] > 0);
      const obj = Pa.objetivo(), U = Pa.kit.unguentos || {}, ELEG = Pa.ungElegidos(), HUECOS = HB.huecos || 2;
      const Mi = window.Mina, L = Mi && Mi.llevo ? Mi.llevo : LLEVAR(), lp = L.p ?? L.llevP, ll = L.l ?? L.llevL;
      const tope = k => Mi && Mi.topeLlevar ? Mi.topeLlevar(k) : 40;
      const paso = (id, txt, v, max) => `<div class="row"><span>${txt}<small>En el almacén: ${max} · máximo ${tope(id)}</small></span><button data-p="${id}" data-d="-1">−</button><b class="num">${Math.min(v, max)}</b><button data-p="${id}" data-d="1">+</button></div>`;
      let h = '<p class="lbl">Para la próxima bajada</p><div class="shop">' + paso('p', '🪵 Puntales', lp, Pa.kit.puntales || 0) + paso('l', '🪜 Escaleras', ll, Pa.kit.escaleras || 0) + '</div>';
      const misU = Object.keys(HB.unguentos).filter(id => U[id]);
      if(misU.length) h += `<div class="list">${misU.map(id => `<label class="chip llevar"><input type="checkbox" data-l="${id}" ${ELEG.includes(id) ? 'checked' : ''}> ${HB.unguentos[id].icono} ${HB.unguentos[id].nombre} <b>${U[id]}</b></label>`).join('')}</div>
        <p class="note" id="ungNota">Llevas ${ELEG.length}/${HUECOS}</p>`;
      const extra = [Pa.pueblo.kitMc ? `🧰 Kit: ${Pa.pueblo.kitMc.pozoNombre}, sala ${Pa.pueblo.kitMc.sala}` : '', Pa.pueblo.descansado ? '😴 +25 % de mochila' : ''].filter(Boolean);
      if(extra.length) h += '<div class="list">' + extra.map(x => `<span class="chip">${x}</span>`).join('') + '</div>';
      h += '<p class="lbl">Minerales</p><div class="list">' + (ks.length ? ks.map(k => chip(k, Pa.almacen[k])).join('') : '<span class="chip muted">Vacío</span>') + '</div>';
      if(obj) h += `<p class="lbl">Para ${obj.nombre}</p><div class="list">${Object.entries(obj.coste).map(([k, n]) => chipFalta(k, Pa.almacen[k] || 0, n)).join('')}</div>`;
      const MJ = ((D.taller && D.taller.mejoras) || []).filter(m => (Pa.pueblo.mejoras || {})[m.id]);
      if(MJ.length) h += '<p class="lbl">Mejoras</p><div class="list">' + MJ.map(m => `<span class="chip">${m.icono} ${m.nombre}</span>`).join('') + '</div>';
      if(!Pa.bandera('museo_abierto')) h += `<p class="lbl">Colección · ${colTxt()}</p><div class="list">${colChips()}</div>`;
      h += '<div class="fila"><button class="btn ghost" id="borrarTodo">Empezar de cero (borra mina, almacén, colección y herramientas)</button></div>';
      cuerpo.innerHTML = h;
      cuerpo.querySelectorAll('button[data-p]').forEach(b => b.onclick = () => {
        const k = b.dataset.p, guard = k === 'p' ? (Pa.kit.puntales || 0) : (Pa.kit.escaleras || 0),
          cur = Math.min(k === 'p' ? lp : ll, guard), v = Math.max(0, Math.min(tope(k), guard, cur + +b.dataset.d));
        if(Mi && Mi.llevar) Mi.llevar(k, v); window.Sonido && window.Sonido.tocar('clic', 0.6); panelCasa(); });
      bindUng(cuerpo, HUECOS);
      let armado = false;
      $('borrarTodo').onclick = () => {
        if(!armado){ armado = true; $('borrarTodo').textContent = 'Pulsa otra vez para borrarlo todo'; return; }
        Pa.borrarTodo(); panelCasa();
      };
    } else if(c.tipo === 'taller'){
      // kits de reparación: uno para cada montacargas roto que ya hayas visto; solo se puede tener uno a la vez
      const V = Object.values(Pa.pueblo.mcVistos || {}), K = Pa.pueblo.kitMc;
      // mejoras para siempre (cada una pide dos materiales distintos)
      const MJ = ((D.taller && D.taller.mejoras) || []).filter(m => Pa.bandera(m.desde) && (!m.necesita || Pa.coleccion[m.necesita] || Pa.bandera('viejo_pico')));
      const HM = Pa.pueblo.mejoras || {};
      let h = '';
      if(MJ.length) h += '<p class="lbl">Mejoras</p><div class="shop">' + MJ.map(m => `<div class="row"><span>${m.icono} ${m.nombre}<small>${m.texto}${HM[m.id] ? '' : ' ' + precioTxt(m.precio)}</small></span>${HM[m.id] ? '<span class="chip">Hecha</span>' : `<button data-m="${m.id}" ${Pa.puedePagar(m.precio) ? '' : 'disabled'}>Fabricar</button>`}</div>`).join('') + '</div>';
      // sin mejoras ni kits que fabricar, el tejón solo habla: no se abre nada
      if(!MJ.length && !V.length && !K){ plazaSel = null; $('plazaPanel').hidden = true; return; }
      if(K) h += `<div class="list"><span class="chip">🧰 Kit: ${K.pozoNombre}, sala ${K.sala}</span></div>`;
      if(V.length) h += '<p class="lbl">Kits de montacargas</p><div class="shop">' + V.map((v, j) => { const pr = kitPrecio(v.coste);
        return `<div class="row"><span>${v.pozoNombre}, sala ${v.sala}<small>${precioTxt(pr)}</small></span><button data-j="${j}" ${!K && Pa.puedePagar(pr) ? '' : 'disabled'}>Fabricar</button></div>`; }).join('') + '</div>';
      cuerpo.innerHTML = h;
      cuerpo.querySelectorAll('button[data-m]').forEach(b => b.onclick = () => {
        const m = MJ.find(x => x.id === b.dataset.m); if(!m || (Pa.pueblo.mejoras || {})[m.id] || !Pa.puedePagar(m.precio)) return;
        for(const [k, n] of Object.entries(m.precio)) Pa.almacen[k] -= n;
        (Pa.pueblo.mejoras || (Pa.pueblo.mejoras = {}))[m.id] = true; Pa.sumarProsperidad(1); Pa.guardar();
        window.Sonido && window.Sonido.tocar('abrir'); panelCasa(); });
      cuerpo.querySelectorAll('button[data-j]').forEach(b => b.onclick = () => {
        const v = V[+b.dataset.j], pr = kitPrecio(v.coste); if(Pa.pueblo.kitMc || !Pa.puedePagar(pr)) return;
        for(const [k, n] of Object.entries(pr)) Pa.almacen[k] -= n;
        Pa.pueblo.kitMc = {key: v.key, pozo: v.pozo, pozoNombre: v.pozoNombre, sala: v.sala}; Pa.pueblo.kitMcMochila = false; Pa.guardar();
        window.Sonido && window.Sonido.tocar('abrir'); panelCasa(); });
    } else if(c.tipo === 'herbolaria'){
      if(!Pa.bandera('ardilla_intro')){ apunte('La ardilla va de un lado a otro entre frascos y manojos de hierbas. No te hace ni caso.'); return; }
      const EE = Pa.encargosDisponibles();
      let h = EE.length ? EE.map(e => `<p class="lbl">Encargo · ${e.nombre}</p><div class="list">${Object.entries(e.pide).map(([k, n]) => D.materiales[k] ? chipFalta(k, Pa.almacen[k] || 0, n) : objChip(k, Pa.coleccion[k] || 0, n)).join('')}</div>`).join('') : '';
      const U = Pa.kit.unguentos || {}, ELEG = Pa.ungElegidos(), HUECOS = HB.huecos || 2;
      const recetas = Object.entries(HB.unguentos).filter(([id]) => Pa.bandera('receta_' + id) || U[id]);
      if(recetas.length){
        h += '<p class="lbl">Ungüentos</p><div class="shop">' + recetas.map(([id, u]) => `<div class="row"><span>${u.icono} ${u.nombre} · ${U[id] || 0}<small>${u.texto}${Pa.bandera('receta_' + id) ? ' ' + objTxt(u.precio) : ''}</small>
          ${U[id] ? `<label class="llevar"><input type="checkbox" data-l="${id}" ${ELEG.includes(id) ? 'checked' : ''}> Llevármelo a la mina</label>` : ''}</span>
          ${Pa.bandera('receta_' + id) ? `<button data-u="${id}" ${puedeObj(u.precio) ? '' : 'disabled'}>Preparar</button>` : ''}</div>`).join('') + '</div>';
        h += `<p class="note" id="ungNota">Llevas ${ELEG.length}/${HUECOS}</p>`;
      }
      cuerpo.innerHTML = h;
      cuerpo.querySelectorAll('button[data-u]').forEach(b => b.onclick = () => { const u = HB.unguentos[b.dataset.u]; if(!puedeObj(u.precio)) return;
        Pa.cobrarCosas(u.precio);
        const UU = Pa.kit.unguentos || (Pa.kit.unguentos = {}); UU[b.dataset.u] = (UU[b.dataset.u] || 0) + 1; Pa.guardar(); window.Sonido && window.Sonido.tocar('abrir'); panelCasa(); });
      bindUng(cuerpo, HUECOS);
    } else if(c.tipo === 'alcaldia'){
      apunte(Pa.bandera('museo_abierto') ? 'El alcalde mira por la ventana hacia el museo. Hace como que no.' : 'El alcalde firma papeles con mucha ceremonia. En la pared, un mapa de las minas con una cruz roja encima.');
    } else if(c.tipo === 'casa'){
      $('plazaPanel').classList.add('completa');
      panelCasaDeep(cuerpo);
    } else if(c.tipo === 'museo'){
      // el museo guarda la colección, por secciones
      const SEC = {mineria: '⛏️ Minería', herbario: '🌿 Herbario', mineralogia: '💎 Mineralogía', bestiario: '🦇 Bestiario'};
      let h = `<p class="lbl">Colección · ${colTxt()}</p>`;
      for(const [cat, nom] of Object.entries(SEC)){
        const ids = Object.keys(OBJ).filter(id => (OBJ[id].categoria || 'mineria') === cat && !OBJ[id].color);
        if(!ids.length) continue;
        h += `<p class="lbl">${nom}</p><div class="list">` + ids.map(id => Pa.coleccion[id] || Pa.visto[id]
          ? `<span class="chip" title="${OBJ[id].texto}">${OBJ[id].icono} ${OBJ[id].nombre}${Pa.coleccion[id] ? ' <b>' + Pa.coleccion[id] + '</b>' : ''}</span>`
          : '<span class="chip muted">❔ ???</span>').join('') + '</div>';
      }
      cuerpo.innerHTML = h;
    } else if(c.tipo === 'vecino'){
      const V = (D.vecinos || {})[c.vecino] || {encargos: []}, est = Pa.vecino(c.vecino), e = V.encargos[est.hechos || 0];
      const cosa = (k, n) => MAT[k] ? chipFalta(k, Pa.almacen[k] || 0, n) : objChip(k, Pa.coleccion[k] || 0, n);
      cuerpo.innerHTML = e ? `<p class="lbl">Encargo ${(est.hechos || 0) + 1} de ${V.encargos.length}</p><div class="list">${Object.entries(e.pide).map(([k, n]) => cosa(k, n)).join('')}</div>
        <p class="lbl">Te da</p><div class="list"><span class="chip">🪜 ${e.da.escaleras || 0}</span><span class="chip">🪵 ${e.da.puntales || 0}</span></div>` : '';
      if(!e){ plazaSel = null; $('plazaPanel').hidden = true; return; }
    } else if(c.tipo === 'cerrada'){
      apunte(c.texto || 'Está cerrada.');
    } else {
      plazaSel = null; $('plazaPanel').hidden = true;
    }
  }
  // colección: lo encontrado en las minas (base del futuro museo)
  function colTxt(){ const all = Object.keys(D.objetos || {}).filter(id => !D.objetos[id].color), n = all.filter(id => Pa.coleccion[id]).length; return n + ' de ' + all.length + ' objetos'; }
  function colChips(){
    const ids = Object.keys(D.objetos || {}).filter(id => Pa.coleccion[id] && !D.objetos[id].color);
    return ids.length ? ids.map(id => { const o = D.objetos[id]; return `<span class="chip" title="${o.texto}">${o.icono} ${o.nombre} <b>${Pa.coleccion[id]}</b></span>`; }).join('') : '<span class="chip muted">Aún nada</span>';
  }
  $('plazaVolver').onclick = () => window.Pantallas.mostrar('mapa');
  $('ppCerrar').onclick = () => { plazaSel = null; panelCasa(); };

  // =================== bucle ===================
  let activa = null, t0 = performance.now();
  function bucle(now){
    const t = (now - t0)/1000;
    if(activa === 'mapa') dibujarMapa(t);
    if(activa === 'plaza') dibujarPlaza(t);
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);
  // al volver a la pestaña (el móvil puede haber vaciado los lienzos): se repintan y se recolocan los botones
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) return;
    for(const [c, pintar] of LIENZOS){ const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); pintar(x); }
    MAPA.firma = ''; PLZ.firma = ''; for(const k in SILUETA) delete SILUETA[k];
    requestAnimationFrame(recolocar);
  });
  function recolocar(){
    if(activa === 'mapa'){ mapaGeo = ajustar(mapaCv, $('mapaLienzo'), MW, MH, panMapa); montarPuntosMapa(); }
    if(activa === 'plaza'){ plazaGeo = ajustar(plazaCv, $('plazaLienzo'), PW, PH, panPlaza); montarPuntosPlaza(); panelCasa(); }
  }
  const panMapa = {x: 0, y: 0}, panPlaza = {x: 0, y: 0};
  // las etiquetas que se salen por un borde se meten dentro
  function encajarEtiquetas(capa){
    const r = capa.getBoundingClientRect();
    capa.querySelectorAll('.etq').forEach(e => { e.style.transform = ''; const q = e.getBoundingClientRect();
      const dx = q.left < r.left + 4 ? r.left + 4 - q.left : q.right > r.right - 4 ? r.right - 4 - q.right : 0; if(dx) e.style.transform = `translateX(${dx}px)`; });
  }
  arrastrable($('mapaLienzo'), panMapa, () => { mapaGeo = ajustar(mapaCv, $('mapaLienzo'), MW, MH, panMapa); montarPuntosMapa(); });
  arrastrable($('plazaLienzo'), panPlaza, () => { plazaGeo = ajustar(plazaCv, $('plazaLienzo'), PW, PH, panPlaza); montarPuntosPlaza(); });
  // cuando termina de cargar la letra de las etiquetas, se ensanchan: se vuelven a encajar
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => { encajarEtiquetas($('mapaPuntos')); encajarEtiquetas($('plazaPuntos')); });
  const ro = new ResizeObserver(() => recolocar());
  ro.observe($('mapaLienzo')); ro.observe($('plazaLienzo'));
  return {
    mapa(){ activa = 'mapa'; mapaSel = null; esperando = false; colocarMini(); $('mapaPanel').hidden = true; requestAnimationFrame(recolocar); },
    plaza(){ activa = 'plaza'; mini.nodo = D.mapa.paradas.pueblo; plazaSel = null; topo.x = SALIDA.x; topo.y = SALIDA.y; topo.camino = []; topo.alLlegar = null; irA(PL.inicio, null); requestAnimationFrame(recolocar); },
    parar(){ activa = null; },
  };
})();
