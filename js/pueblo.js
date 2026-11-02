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
  function ajustar(cv, cont, W, H){
    const r = cont.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const fit = Math.min(r.width/W, r.height/H), n = Math.floor(fit * dpr);
    // escala entera si no desperdicia mucho espacio; si no, se ajusta al hueco
    const css = n >= 1 && (n/dpr) / fit > 0.85 ? n/dpr : fit;
    cv.width = W; cv.height = H; cv.style.width = (W*css)+'px'; cv.style.height = (H*css)+'px';
    return {css, left:(r.width - W*css)/2, top:(r.height - H*css)/2};
  }
  const R = (x, c, X, Y, w, h) => { x.fillStyle = c; x.fillRect(X|0, Y|0, w|0, h|0); };

  // ---------- sprite del topo (reposo) ----------
  const topoCv = (()=>{
    const f = S.topo.anims.reposo[0], c = document.createElement('canvas'); c.width = 32; c.height = 31;
    const x = c.getContext('2d');
    f.forEach((row, y) => { for(let i=0;i<row.length;i++){ const ch = row[i]; if(ch === '.') continue; x.fillStyle = S.topo.pal[ch]; x.fillRect(i, y, 1, 1); } });
    return c;
  })();

  // topo andando (para la plaza): fotogramas de andar y de reposo
  const frameCv = f => { const c = document.createElement('canvas'); c.width = 32; c.height = 31; const x = c.getContext('2d');
    f.forEach((row, y) => { for(let i=0;i<row.length;i++){ const ch = row[i]; if(ch === '.') continue; x.fillStyle = S.topo.pal[ch]; x.fillRect(i, y, 1, 1); } }); return c; };
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
  let mapaSel = null, mapaGeo = null;
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
  function componerMapa(prog){
    const firma = prog.map(v => v.toFixed(3)).join(',');
    if(firma === MAPA.firma || !MAPA.seca || !MAPA.viva) return;
    MAPA.firma = firma;
    const out = mx.createImageData(MW, MH), o = out.data, S = MAPA.seca, V = MAPA.viva;
    for(let k=0;k<MW*MH;k++){
      const p = prog[MAPA.dueno[k]];
      const viva = p >= 1 || (p > 0 && MAPA.dist[k] < p*160 + (MAPA.fino[k] - 0.5)*18);
      const src = viva ? V : S, j = k*4; o[j] = src[j]; o[j+1] = src[j+1]; o[j+2] = src[j+2]; o[j+3] = 255;
    }
    MAPA.cv.getContext('2d').putImageData(out, 0, 0);
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
      if(mapaSel === i){ const k = Math.floor(t*4)%2; x.strokeStyle = k ? C.amarillo : C.blanco; x.lineWidth = 1; x.strokeRect(p.x-12.5, p.y-12.5, 25, 23); }
    });
    if(mapaSel === 'viejo'){ const k = Math.floor(t*4)%2; x.strokeStyle = k ? C.amarillo : C.blanco; x.lineWidth = 1; x.strokeRect(VIEJO.x-20.5, VIEJO.y-20.5, 41, 37); }
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
    pueblo.onclick = () => { mapaSel = null; marcar(); window.Pantallas.mostrar('plaza'); };
    pueblo.setAttribute('aria-label', 'Entrar al pueblo');
    cont.appendChild(pueblo);
    D.minas.forEach((m, i) => {
      const b = document.createElement('button'); b.className = 'punto' + (abierta(m) ? '' : ' cerrada');
      const q = at(POS[i].x, POS[i].y); b.style.left = q.left+'px'; b.style.top = q.top+'px';
      b.style.transform = `translate(-50%, -${12*g.css}px)`;
      b.innerHTML = `<span class="zona" style="width:${26*g.css}px;height:${24*g.css}px"></span><span class="etq">${m.id}</span>`;
      b.setAttribute('aria-label', 'Mina ' + m.id + ': ' + m.nombre);
      b.onclick = () => { mapaSel = i; marcar(); };
      cont.appendChild(b);
    });
    const v = document.createElement('button'); v.className = 'punto';
    const qv = at(VIEJO.x, VIEJO.y); v.style.left = qv.left+'px'; v.style.top = qv.top+'px';
    v.style.transform = `translate(-50%, -${12*g.css}px)`;
    v.innerHTML = `<span class="zona" style="width:${40*g.css}px;height:${34*g.css}px"></span><span class="etq">Viejo topo</span>`;
    v.style.transform = `translate(-50%, -${17*g.css}px)`;
    v.setAttribute('aria-label', 'Casa del viejo topo');
    v.onclick = () => { mapaSel = 'viejo'; marcar(); };
    cont.appendChild(v);
    marcar();
  }
  function marcar(){
    const pts = document.querySelectorAll('#mapaPuntos .punto');
    pts.forEach((b, j) => b.classList.toggle('sel', mapaSel === 'viejo' ? j === pts.length - 1 : j-1 === mapaSel));
    const btn = $('mpBoton'); $('mpBoton2').hidden = true;
    if(mapaSel === 'viejo'){
      $('mpEyebrow').textContent = 'Apartada del pueblo'; $('mpTitulo').textContent = 'Casa del viejo topo';
      $('mpTexto').textContent = 'Una casita junto al camino del molino. Sale humo de la chimenea, pero las contraventanas están cerradas.';
      btn.hidden = false; btn.disabled = false; btn.textContent = 'Llamar a la puerta'; return;
    }
    if(mapaSel === null){
      $('mpEyebrow').textContent = 'Mapa'; $('mpTitulo').textContent = 'Elige adónde ir';
      const o = Pa.objetivo();
      $('mpTexto').innerHTML = 'Toca el pueblo para entrar en la plaza, o una mina para ver si puedes bajar.' + (o ? '<br><b>Siguiente objetivo:</b> ' + o.nombre + '<span class="coste">' +
        Object.entries(o.coste).map(([k, n]) => `<span class="chip${(Pa.almacen[k]||0) >= n ? '' : ' muted'}"><i style="background:${MAT[k].color}"></i>${MAT[k].nombre} <b>${Math.min(Pa.almacen[k]||0, n)}/${n}</b></span>`).join('') + '</span>' : '');
      btn.hidden = true; return;
    }
    const m = D.minas[mapaSel];
    $('mpEyebrow').textContent = 'Mina ' + m.id; $('mpTitulo').textContent = m.nombre; $('mpTexto').textContent = m.texto;
    btn.hidden = false;
    if(abierta(m)){
      btn.disabled = false; btn.textContent = 'Bajar a la mina';
      // Pozo viejo: el ascensor según la historia
      if(m.pozo === 'uno' && Pa.bandera('ascensor_pozo1_roto') && !Pa.bandera('ascensor_pozo1_apanado')) $('mpTexto').textContent = m.texto + ' El ascensor del fondo está estropeado: así no hay forma de volver a subir.';
      if(m.pozo === 'uno' && Pa.bandera('ascensor_pozo1_fino')){ $('mpBoton2').hidden = false; btn.textContent = 'Bajar por la boca'; }
      return;
    }
    if(m.desbloqueo){
      // mina cerrada que se abre con materiales del almacén
      const tiene = k => Pa.almacen[k] || 0, ok = Pa.puedePagar(m.desbloqueo);
      $('mpTexto').innerHTML = m.texto + '<br><b>Para abrirla hace falta:</b><span class="coste">' +
        Object.entries(m.desbloqueo).map(([k, n]) => `<span class="chip${tiene(k) >= n ? '' : ' muted'}"><i style="background:${MAT[k].color}"></i>${MAT[k].nombre} <b>${Math.min(tiene(k), n)}/${n}</b></span>`).join('') + '</span>';
      btn.disabled = !ok; btn.textContent = ok ? 'Abrir la mina' : 'Faltan materiales';
      return;
    }
    btn.disabled = true; btn.textContent = 'Cerrada por ahora';
  }
  $('mpBoton2').onclick = () => { if(mapaSel !== null && mapaSel !== 'viejo') window.Pantallas.mostrar('mina', D.minas[mapaSel].pozo || 'viejo', {fondo: true}); };
  $('mpBoton').onclick = () => {
    if(mapaSel === null) return;
    if(mapaSel === 'viejo'){
      const conv = window.Conversaciones && window.Conversaciones.alEntrar('viejo');
      if(conv && window.Dialogo) window.Dialogo.mostrar(conv.lineas, () => { if(conv.fin) conv.fin(); marcar(); });
      return;
    }
    const m = D.minas[mapaSel];
    if(abierta(m)){ window.Pantallas.mostrar('mina', m.pozo || 'viejo'); return; }
    if(m.desbloqueo && Pa.puedePagar(m.desbloqueo)){
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
  const vidaPueblo = () => Math.min(1, D.minas.filter(m => typeof m.id === 'number' && respiradero(m)).length / 8);
  function componerPlaza(){
    const f = vidaPueblo(), firma = f.toFixed(3);
    if(firma === PLZ.firma || !PLZ.seca || !PLZ.viva) return;
    PLZ.firma = firma;
    const out = px.createImageData(PW, PH), o = out.data;
    for(let k=0;k<PW*PH;k++){ const src = PLZ.ruido[k] < f*1.05 ? PLZ.viva : PLZ.seca, j = k*4; o[j] = src[j]; o[j+1] = src[j+1]; o[j+2] = src[j+2]; o[j+3] = 255; }
    PLZ.cv.getContext('2d').putImageData(out, 0, 0);
  }
  const CASA = c => PL.edificios[c.id];
  function dibujarPlaza(t){
    const x = px;
    componerPlaza();
    x.drawImage(PLZ.cv, 0, 0);
    if(plazaSel !== null){ const e = CASA(D.casas[plazaSel]); if(e){ const [x0, y0, x1, y1] = e.caja, k = Math.floor(t*4)%2;
      x.strokeStyle = k ? C.amarillo : C.blanco; x.lineWidth = 2; x.strokeRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2); } }
    moverTopo(t);
    const andando = topo.camino.length > 0, frs = andando ? TOPO_ANDAR : TOPO_REPOSO;
    const fr = frs[Math.floor(t*(andando ? 9 : 2)) % frs.length];
    const X = Math.round(topo.x - 16), Y = Math.round(topo.y - 29);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(Math.round(topo.x), Math.round(topo.y), 9, 3, 0, 0, Math.PI*2); x.fill();
    x.save();
    if(topo.cara < 0){ x.translate(X + 32, Y); x.scale(-1, 1); x.drawImage(fr, 0, 0); }
    else x.drawImage(fr, X, Y);
    x.restore();
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
  const topo = {x: INICIO.x, y: INICIO.y, cara: 1, camino: [], alLlegar: null, tPaso: 0, tUlt: 0};
  const puerta = i => { const e = CASA(D.casas[i]); return e ? e.puerta : PL.inicio; };
  function irA(celda, alLlegar){
    const a = cercana(...celdaDe(topo.x, topo.y)), b = cercana(celda[0], celda[1]);
    topo.camino = buscar(a, b); topo.alLlegar = alLlegar;
    if(!topo.camino.length && alLlegar){ topo.alLlegar = null; alLlegar(); }
  }
  function moverTopo(t){
    const dt = Math.min(0.05, Math.max(0, t - topo.tUlt)); topo.tUlt = t;
    if(!topo.camino.length) return;
    const p = topo.camino[0], dx = p.x - topo.x, dy = p.y - topo.y, d = Math.hypot(dx, dy), v = 90*dt;
    if(Math.abs(dx) > 0.5) topo.cara = Math.sign(dx);
    if(d <= v){ topo.x = p.x; topo.y = p.y; topo.camino.shift(); if(!topo.camino.length && topo.alLlegar){ const f = topo.alLlegar; topo.alLlegar = null; f(); } }
    else { topo.x += dx/d*v; topo.y += dy/d*v; }
    topo.tPaso += dt; if(topo.tPaso > 0.22){ topo.tPaso = 0; window.Sonido && window.Sonido.tocar('pasoPlaza', 0.7); }
  }
  function montarPuntosPlaza(){
    const cont = $('plazaPuntos'); cont.innerHTML = '';
    const g = plazaGeo, at = (qx, qy) => ({left: g.left + qx*g.css, top: g.top + qy*g.css});
    D.casas.forEach((c, i) => {
      const e = CASA(c); if(!e) return;
      const [x0, y0, x1, y1] = e.caja, b = document.createElement('button');
      b.className = 'punto' + (c.tipo === 'cerrada' ? ' cerrada' : ''); const q = at((x0 + x1)/2, (y0 + y1)/2); b.style.left = q.left+'px'; b.style.top = q.top+'px';
      b.innerHTML = `<span class="zona" style="width:${(x1-x0)*g.css}px;height:${(y1-y0)*g.css}px"></span>` + (c.tipo === 'cerrada' ? '' : `<span class="etq">${c.nombre}</span>`);
      b.style.transform = `translate(-50%, -${(y1-y0)/2*g.css}px)`;
      b.setAttribute('aria-label', c.nombre);
      b.onclick = () => { plazaSel = i;
        $('ppEyebrow').textContent = c.dueno; $('ppTitulo').textContent = c.nombre; $('ppCuerpo').innerHTML = '<p class="note">Deep va hacia la puerta…</p>';
        irA(puerta(i), () => {
          if(plazaSel !== i) return;
          // al llegar a la puerta: si toca conversación, primero el diálogo y luego la casa
          const conv = window.Conversaciones && window.Conversaciones.alEntrar(c.id);
          if(conv && window.Dialogo) window.Dialogo.mostrar(conv.lineas, () => { if(conv.fin) conv.fin(); panelCasa(); });
          else panelCasa();
        }); };
      cont.appendChild(b);
    });
    const salida = document.createElement('button'); salida.className = 'punto';
    const q = at(SALIDA.x, SALIDA.y - 34); salida.style.left = q.left+'px'; salida.style.top = q.top+'px';
    salida.innerHTML = `<span class="zona" style="width:${50*g.css}px;height:${30*g.css}px"></span><span class="etq">Al mapa</span>`;
    salida.setAttribute('aria-label', 'Salir al mapa');
    salida.onclick = () => { plazaSel = null; panelCasa(); irA(PL.salida, () => window.Pantallas.mostrar('mapa')); };
    cont.appendChild(salida);
  }
  const chip = (k, n) => `<span class="chip"><i style="background:${MAT[k] && MAT[k].color || '#999'}"></i>${MAT[k] ? MAT[k].nombre : k} <b>${n}</b></span>`;
  const precioTxt = p => Object.entries(p).map(([m, n]) => n + ' de ' + (MAT[m] ? MAT[m].nombre.toLowerCase() : m)).join(', ');
  // las herramientas se guardan en el almacén; en cada bajada te llevas una tanda (ajustes de la mina)
  const LLEVAR = () => { let c = {}; try{ c = JSON.parse(localStorage.getItem('deep-cfg') || '{}') || {}; }catch(e){}
    const L = D.herramientas.llevarPorBajada || {puntales: 12, escaleras: 8}; return {p: c.llevP ?? L.puntales, l: c.llevL ?? L.escaleras}; };
  function kitTxt(){ const L = LLEVAR(); return 'En el almacén: ' + (Pa.kit.puntales||0) + ' puntales y ' + (Pa.kit.escaleras||0) + ' escaleras. En cada bajada te llevas ' + L.p + ' y ' + L.l + ' (si los tienes)'; }
  const OBJ = D.objetos || {}, HB = D.herboristeria || {encargos: [], unguentos: {}};
  const objTxt = o => Object.entries(o).map(([k, n]) => n + ' ' + (OBJ[k] ? (n > 1 && OBJ[k].plural ? OBJ[k].plural : OBJ[k].nombre.toLowerCase()) : k)).join(', ');
  const puedeObj = o => Object.entries(o).every(([k, n]) => (Pa.coleccion[k] || 0) >= n);
  const objChip = (k, tiene, n) => `<span class="chip${tiene >= n ? '' : ' muted'}">${OBJ[k] ? OBJ[k].icono : ''} ${OBJ[k] ? OBJ[k].nombre : k} <b>${Math.min(tiene, n)}/${n}</b></span>`;
  // kit del tejón: 1,5 veces lo que pide ese montacargas abajo (redondeando hacia arriba)
  const kitPrecio = c => Object.fromEntries(Object.entries(c).map(([k, n]) => [k, Math.ceil(n * ((D.montacargas && D.montacargas.kit) || 1.5))]));
  function panelCasa(){
    document.querySelectorAll('#plazaPuntos .punto').forEach((b, j) => b.classList.toggle('sel', j === plazaSel));
    $('plazaKit').textContent = kitTxt();
    const cuerpo = $('ppCuerpo');
    if(plazaSel === null){ $('ppEyebrow').textContent = 'Plaza del pueblo'; $('ppTitulo').textContent = '¿Dónde entras?'; cuerpo.innerHTML = '<p>Toca una casa. Para ir a las minas, sal al mapa.</p>'; return; }
    const c = D.casas[plazaSel];
    $('ppEyebrow').textContent = c.dueno; $('ppTitulo').textContent = c.nombre;
    if(c.tipo === 'tienda'){
      cuerpo.innerHTML = '<div class="shop">' + D.tienda.map((it, j) =>
        `<div class="row"><span>${it.nombre}<small>${it.texto} ${precioTxt(it.precio)}.</small></span><button data-j="${j}" ${Pa.puedePagar(it.precio) ? '' : 'disabled'}>Comprar</button></div>`).join('') + '</div>' +
        `<p class="note">${kitTxt()}.</p>`;
      cuerpo.querySelectorAll('button[data-j]').forEach(b => b.onclick = () => { Pa.comprar(D.tienda[+b.dataset.j]); panelCasa(); });
    } else if(c.tipo === 'almacen'){
      const ks = Object.keys(Pa.almacen).filter(k => Pa.almacen[k] > 0);
      cuerpo.innerHTML = `<div class="list">${ks.length ? ks.map(k => chip(k, Pa.almacen[k])).join('') : '<span class="chip muted">Vacío</span>'}</div>
        <p class="note">${kitTxt()}.</p>
        <p class="lbl">Colección · ${colTxt()}</p>
        <div class="list">${colChips()}</div>
        <div class="fila"><button class="btn ghost" id="borrarTodo">Empezar de cero (borra mina, almacén, colección y herramientas)</button></div>`;
      let armado = false;
      $('borrarTodo').onclick = () => {
        if(!armado){ armado = true; $('borrarTodo').textContent = 'Pulsa otra vez para borrarlo todo'; return; }
        Pa.borrarTodo(); panelCasa();
      };
    } else if(c.tipo === 'taller'){
      // kits de reparación: uno para cada montacargas roto que ya hayas visto; solo se puede tener uno a la vez
      const V = Object.values(Pa.pueblo.mcVistos || {}), K = Pa.pueblo.kitMc;
      let h = '<p class="note">Kits de reparación de montacargas: arreglan uno concreto allí mismo, sin gastar lo que lleves. Cuestan más que arreglarlo abajo, y solo puedes llevar uno a la vez.</p>';
      if(K) h += `<p><b>Tienes un kit</b> para ${K.pozoNombre}, sala ${K.sala}${Pa.pueblo.kitMcMochila ? ' (está en tu mochila perdida: recupérala)' : ''}.</p>`;
      if(!V.length) h += '<p>Aún no has visto ningún montacargas roto.</p>';
      else h += '<div class="shop">' + V.map((v, j) => { const pr = kitPrecio(v.coste);
        return `<div class="row"><span>${v.pozoNombre}, sala ${v.sala}<small>Abajo pide ${precioTxt(v.coste)}. El kit: ${precioTxt(pr)}.</small></span><button data-j="${j}" ${!K && Pa.puedePagar(pr) ? '' : 'disabled'}>Fabricar</button></div>`; }).join('') + '</div>';
      cuerpo.innerHTML = h;
      cuerpo.querySelectorAll('button[data-j]').forEach(b => b.onclick = () => {
        const v = V[+b.dataset.j], pr = kitPrecio(v.coste); if(Pa.pueblo.kitMc || !Pa.puedePagar(pr)) return;
        for(const [k, n] of Object.entries(pr)) Pa.almacen[k] -= n;
        Pa.pueblo.kitMc = {key: v.key, pozo: v.pozo, pozoNombre: v.pozoNombre, sala: v.sala}; Pa.pueblo.kitMcMochila = false; Pa.guardar();
        window.Sonido && window.Sonido.tocar('abrir'); panelCasa(); });
    } else if(c.tipo === 'herbolaria'){
      if(!Pa.bandera('ardilla_intro')){ cuerpo.innerHTML = '<p>La ardilla va de un lado a otro entre frascos y manojos de hierbas. No te hace ni caso.</p>'; return; }
      const e = HB.encargos.find(x => Pa.pueblo.encargos[x.id] !== 'hecho');
      let h = e ? `<p class="lbl">Encargo · ${e.nombre}</p><div class="list">${Object.entries(e.pide).map(([k, n]) => objChip(k, Pa.coleccion[k] || 0, n)).join('')}</div>` : '<p class="note">No hay encargos pendientes. ¡Gracias por todas las plantas!</p>';
      const U = Pa.kit.unguentos || {}, LL = Pa.kit.llevarUng || {};
      const recetas = Object.entries(HB.unguentos).filter(([id]) => Pa.bandera('receta_' + id) || U[id]);
      if(recetas.length){
        h += '<p class="lbl">Ungüentos</p><div class="shop">' + recetas.map(([id, u]) => `<div class="row"><span>${u.icono} ${u.nombre} · tienes ${U[id] || 0}<small>${u.texto}${Pa.bandera('receta_' + id) ? ' Cuesta ' + objTxt(u.precio) + '.' : ''}</small>
          <label class="llevar"><input type="checkbox" data-l="${id}" ${LL[id] !== false ? 'checked' : ''}> Llevármelo a la mina</label></span>
          ${Pa.bandera('receta_' + id) ? `<button data-u="${id}" ${puedeObj(u.precio) ? '' : 'disabled'}>Preparar</button>` : ''}</div>`).join('') + '</div>';
        h += '<p class="note">Los ungüentos se gastan cuando hacen efecto. Si no hace falta, vuelve contigo.</p>';
      }
      cuerpo.innerHTML = h;
      cuerpo.querySelectorAll('button[data-u]').forEach(b => b.onclick = () => { const u = HB.unguentos[b.dataset.u]; if(!puedeObj(u.precio)) return;
        for(const [k, n] of Object.entries(u.precio)){ Pa.coleccion[k] -= n; if(Pa.coleccion[k] <= 0) delete Pa.coleccion[k]; }
        const UU = Pa.kit.unguentos || (Pa.kit.unguentos = {}); UU[b.dataset.u] = (UU[b.dataset.u] || 0) + 1; Pa.guardar(); window.Sonido && window.Sonido.tocar('abrir'); panelCasa(); });
      cuerpo.querySelectorAll('input[data-l]').forEach(i => i.onchange = () => { const L2 = Pa.kit.llevarUng || (Pa.kit.llevarUng = {}); L2[i.dataset.l] = i.checked; Pa.guardar(); });
    } else if(c.tipo === 'cerrada'){
      cuerpo.innerHTML = `<p>${c.texto || 'Está cerrada.'}</p>`;
    } else {
      cuerpo.innerHTML = '<p>Aún no tiene nada que pedirte. Pronto vendrán aquí los encargos.</p>';
    }
  }
  // colección: lo encontrado en las minas (base del futuro museo)
  function colTxt(){ const all = Object.keys(D.objetos || {}), n = all.filter(id => Pa.coleccion[id]).length; return n + ' de ' + all.length + ' objetos'; }
  function colChips(){
    const ids = Object.keys(D.objetos || {}).filter(id => Pa.coleccion[id]);
    return ids.length ? ids.map(id => { const o = D.objetos[id]; return `<span class="chip" title="${o.texto}">${o.icono} ${o.nombre} <b>${Pa.coleccion[id]}</b></span>`; }).join('') : '<span class="chip muted">Aún nada</span>';
  }
  $('plazaVolver').onclick = () => window.Pantallas.mostrar('mapa');

  // =================== bucle ===================
  let activa = null, t0 = performance.now();
  function bucle(now){
    const t = (now - t0)/1000;
    if(activa === 'mapa') dibujarMapa(t);
    if(activa === 'plaza') dibujarPlaza(t);
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);
  function recolocar(){
    if(activa === 'mapa'){ mapaGeo = ajustar(mapaCv, $('mapaLienzo'), MW, MH); montarPuntosMapa(); }
    if(activa === 'plaza'){ plazaGeo = ajustar(plazaCv, $('plazaLienzo'), PW, PH); montarPuntosPlaza(); panelCasa(); }
  }
  const ro = new ResizeObserver(() => recolocar());
  ro.observe($('mapaLienzo')); ro.observe($('plazaLienzo'));
  return {
    mapa(){ activa = 'mapa'; requestAnimationFrame(recolocar); },
    plaza(){ activa = 'plaza'; plazaSel = null; topo.x = SALIDA.x; topo.y = SALIDA.y; topo.camino = []; topo.alLlegar = null; irA(PL.inicio, null); requestAnimationFrame(recolocar); },
    parar(){ activa = null; },
  };
})();
