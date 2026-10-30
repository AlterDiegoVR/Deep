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

  // =================== MAPA ===================
  const MW = 200, MH = 300;
  const mapaCv = $('mapaCv'), mx = mapaCv.getContext('2d');
  let mapaSel = null, mapaGeo = null;
  // posiciones: el pueblo en el centro y las minas alrededor
  const CENTRO = {x: 100, y: 150};
  const POS = D.minas.map((m, i) => {
    const a = -Math.PI/2 + i * (Math.PI*2/D.minas.length);
    return {x: Math.round(CENTRO.x + Math.cos(a)*74), y: Math.round(CENTRO.y + Math.sin(a)*112)};
  });
  function dibujarMapa(t){
    const x = mx;
    // hierba con textura
    R(x, C.verdeO, 0, 0, MW, MH);
    for(let y=0;y<MH;y+=2) for(let i=0;i<MW;i+=2){ const k = h2(i, y, 3); if(k < 0.18) R(x, C.verdeM, i, y, 2, 2); else if(k > 0.95) R(x, C.verde, i, y, 1, 1); }
    // río
    x.fillStyle = C.azul;
    for(let y=0;y<MH;y++){ const cx = 18 + Math.sin(y/23)*8; x.fillRect(cx|0, y, 7, 1); }
    x.fillStyle = C.celeste;
    for(let y=0;y<MH;y+=5){ const cx = 18 + Math.sin(y/23)*8; if((y + Math.floor(t*6)) % 15 < 5) x.fillRect((cx+2)|0, y, 2, 1); }
    // árboles
    for(let i=0;i<70;i++){ const ax = h2(i, 1, 9)*MW, ay = h2(i, 2, 9)*MH;
      if(Math.hypot(ax-CENTRO.x, (ay-CENTRO.y)*0.7) < 40 || POS.some(p => Math.hypot(ax-p.x, ay-p.y) < 16)) continue;
      R(x, C.neg, ax-3, ay-4, 7, 7); R(x, C.verdeM, ax-2, ay-3, 5, 5); R(x, C.verde, ax-2, ay-3, 2, 2); R(x, C.marron, ax, ay+3, 1, 2); }
    // caminos del pueblo a cada mina
    for(const [i, p] of POS.entries()){
      const n = Math.ceil(Math.hypot(p.x-CENTRO.x, p.y-CENTRO.y));
      for(let k=0;k<n;k+=1){ const px = CENTRO.x + (p.x-CENTRO.x)*k/n, py = CENTRO.y + (p.y-CENTRO.y)*k/n;
        R(x, D.minas[i].abierta ? C.tostado : C.oliva, px-1, py-1, 3, 3); }
    }
    // pueblo
    R(x, C.oliva, CENTRO.x-26, CENTRO.y-18, 52, 36); R(x, C.marronC, CENTRO.x-24, CENTRO.y-16, 48, 32);
    const casitas = [[-18,-12, C.rojo],[ 6,-12, C.azulO],[-18, 4, C.verdeM],[ 6, 4, C.naranja]];
    for(const [dx, dy, col] of casitas){ const X = CENTRO.x+dx, Y = CENTRO.y+dy;
      R(x, C.neg, X-1, Y-1, 14, 11); R(x, C.crema, X, Y+3, 12, 7); R(x, col, X, Y, 12, 4); R(x, C.marron, X+5, Y+6, 2, 4); R(x, C.cian, X+2, Y+5, 2, 2); }
    R(x, C.neg, CENTRO.x-4, CENTRO.y-3, 8, 7); R(x, C.gris, CENTRO.x-3, CENTRO.y-2, 6, 5); R(x, C.cian, CENTRO.x-2, CENTRO.y-1, 4, 3);
    if(Math.floor(t*3) % 2) R(x, C.blanco, CENTRO.x-1, CENTRO.y-1, 1, 1);
    // minas
    D.minas.forEach((m, i) => {
      const p = POS[i], X = p.x, Y = p.y;
      R(x, C.neg, X-9, Y-5, 18, 12); R(x, m.abierta ? C.piedra : C.grisO, X-8, Y-4, 16, 10);
      R(x, C.neg, X-4, Y-1, 8, 7);                                       // boca
      R(x, m.abierta ? C.marronC : C.marron, X-6, Y-10, 2, 9); R(x, m.abierta ? C.marronC : C.marron, X+4, Y-10, 2, 9); R(x, m.abierta ? C.marronC : C.marron, X-7, Y-11, 14, 2);   // castillete
      if(m.abierta){ R(x, C.amarillo, X-1, Y+1, 2, 2); }
      else { R(x, C.grisM, X-2, Y+1, 4, 3); R(x, C.grisM, X-1, Y-1, 2, 2); }   // candado
      if(mapaSel === i){ const k = Math.floor(t*4)%2; x.strokeStyle = k ? C.amarillo : C.blanco; x.lineWidth = 1; x.strokeRect(X-11.5, Y-13.5, 23, 22); }
    });
  }
  function montarPuntosMapa(){
    const cont = $('mapaPuntos'); cont.innerHTML = '';
    const g = mapaGeo, at = (px, py) => ({left: g.left + px*g.css, top: g.top + py*g.css});
    const pueblo = document.createElement('button'); pueblo.className = 'punto';
    const a = at(CENTRO.x, CENTRO.y); pueblo.style.left = a.left+'px'; pueblo.style.top = a.top+'px';
    pueblo.innerHTML = `<span class="zona" style="width:${54*g.css}px;height:${38*g.css}px"></span><span class="etq">El pueblo</span>`;
    pueblo.style.transform = `translate(-50%, -${19*g.css}px)`;
    pueblo.onclick = () => { mapaSel = null; marcar(); window.Pantallas.mostrar('plaza'); };
    pueblo.setAttribute('aria-label', 'Entrar al pueblo');
    cont.appendChild(pueblo);
    D.minas.forEach((m, i) => {
      const b = document.createElement('button'); b.className = 'punto' + (m.abierta ? '' : ' cerrada');
      const q = at(POS[i].x, POS[i].y); b.style.left = q.left+'px'; b.style.top = q.top+'px';
      b.style.transform = `translate(-50%, -${12*g.css}px)`;
      b.innerHTML = `<span class="zona" style="width:${26*g.css}px;height:${24*g.css}px"></span><span class="etq">${m.id}</span>`;
      b.setAttribute('aria-label', 'Mina ' + m.id + ': ' + m.nombre);
      b.onclick = () => { mapaSel = i; marcar(); };
      cont.appendChild(b);
    });
    marcar();
  }
  function marcar(){
    document.querySelectorAll('#mapaPuntos .punto').forEach((b, j) => b.classList.toggle('sel', j-1 === mapaSel));
    const btn = $('mpBoton');
    if(mapaSel === null){
      $('mpEyebrow').textContent = 'Mapa'; $('mpTitulo').textContent = 'Elige adónde ir';
      $('mpTexto').textContent = 'Toca el pueblo para entrar en la plaza, o una mina para ver si puedes bajar.'; btn.hidden = true; return;
    }
    const m = D.minas[mapaSel];
    $('mpEyebrow').textContent = 'Mina ' + m.id; $('mpTitulo').textContent = m.nombre; $('mpTexto').textContent = m.texto;
    btn.hidden = false; btn.disabled = !m.abierta; btn.textContent = m.abierta ? 'Bajar a la mina' : 'Cerrada por ahora';
  }
  $('mpBoton').onclick = () => { if(mapaSel !== null && D.minas[mapaSel].abierta) window.Pantallas.mostrar('mina', D.minas[mapaSel].pozo || 'viejo'); };

  // =================== PLAZA ===================
  const PW = 200, PH = 260;
  const plazaCv = $('plazaCv'), px = plazaCv.getContext('2d');
  let plazaSel = null, plazaGeo = null;
  // casas: tres arriba, dos a los lados, una abajo a la izquierda (la salida va abajo a la derecha)
  const HUECOS = [{x:12, y:22}, {x:76, y:14}, {x:140, y:22}, {x:6, y:118}, {x:146, y:118}, {x:20, y:196}];
  function casa(x, X, Y, col, sel, t){
    const W = 48, H = 44;
    R(x, C.neg, X-1, Y+12, W+2, H-11);                      // contorno muro
    R(x, C.crema, X, Y+13, W, H-13); R(x, C.tostado, X, Y+H-4, W, 3);
    for(let i=0;i<6;i++) R(x, C.tostado, X + 4 + i*8, Y + 18 + (i%2)*9, 3, 1);
    // tejado
    for(let i=0;i<14;i++){ R(x, C.neg, X - 3 + i, Y + 13 - i, W + 6 - i*2, 1); }
    for(let i=0;i<13;i++){ R(x, col, X - 2 + i, Y + 12 - i, W + 4 - i*2, 1); }
    R(x, C.neg, X-3, Y+13, W+6, 1);
    // puerta y ventanas
    R(x, C.neg, X+W/2-6, Y+H-18, 12, 18); R(x, C.marron, X+W/2-5, Y+H-17, 10, 17); R(x, C.marronC, X+W/2-5, Y+H-17, 10, 2); R(x, C.amarillo, X+W/2+2, Y+H-9, 1, 1);
    for(const wx of [X+5, X+W-15]){ R(x, C.neg, wx-1, Y+20, 12, 10); R(x, C.cian, wx, Y+21, 10, 8); R(x, C.neg, wx+4, Y+21, 1, 8); R(x, C.hielo, wx+1, Y+22, 2, 2); }
    if(sel){ const k = Math.floor(t*4)%2; x.strokeStyle = k ? C.amarillo : C.blanco; x.lineWidth = 1; x.strokeRect(X-4.5, Y-2.5, W+9, H+5); }
  }
  function dibujarPlaza(t){
    const x = px;
    // suelo de adoquines
    R(x, C.piedra, 0, 0, PW, PH);
    for(let y=0;y<PH;y+=6) for(let i=(y/6%2)*4;i<PW;i+=8){ R(x, C.grisB, i, y, 7, 5); if(h2(i,y,4) < 0.3) R(x, C.grisM, i+1, y+1, 3, 1); }
    // hierba en los bordes
    for(let i=0;i<PW;i+=3){ R(x, C.verdeO, i, 0, 3, 8 + (h2(i,0,5)*4|0)); R(x, C.verdeO, i, PH-6 - (h2(i,1,5)*3|0), 3, 9); }
    // fuente
    const fx = 100, fy = 132;
    x.fillStyle = C.neg; x.beginPath(); x.ellipse(fx, fy, 30, 18, 0, 0, Math.PI*2); x.fill();
    x.fillStyle = C.gris; x.beginPath(); x.ellipse(fx, fy, 29, 17, 0, 0, Math.PI*2); x.fill();
    x.fillStyle = C.azul; x.beginPath(); x.ellipse(fx, fy+1, 25, 13, 0, 0, Math.PI*2); x.fill();
    for(let i=0;i<10;i++){ const a = t*0.8 + i*0.63; R(x, C.celeste, fx + Math.cos(a)*18, fy + 1 + Math.sin(a)*8, 3, 1); }
    R(x, C.neg, fx-4, fy-20, 8, 22); R(x, C.gris, fx-3, fy-19, 6, 20); R(x, C.hielo, fx-3, fy-19, 2, 20);
    R(x, C.neg, fx-9, fy-23, 18, 4); R(x, C.gris, fx-8, fy-22, 16, 2);
    for(let i=0;i<6;i++){ const k = (t*2 + i/6) % 1, side = i%2 ? 1 : -1;      // chorros
      R(x, C.cian, fx + side*(3 + k*12), fy - 22 + k*k*22 - k*6, 2, 2); }
    // casas
    D.casas.forEach((c, i) => { const h = HUECOS[i % HUECOS.length]; casa(x, h.x, h.y, c.color, plazaSel === i, t); });
    // salida hacia el mapa
    R(x, C.tostado, 150, 212, 50, 30); for(let i=0;i<6;i++) R(x, C.marronC, 152 + i*8, 216 + (i%2)*10, 4, 2);
    R(x, C.neg, 172, 196, 3, 26); R(x, C.marron, 173, 197, 1, 24); R(x, C.neg, 160, 196, 26, 9); R(x, C.marronC, 161, 197, 24, 7);
    R(x, C.crema, 164, 199, 3, 3); R(x, C.crema, 170, 199, 10, 1); R(x, C.crema, 170, 202, 8, 1);
    // Deep: junto a la fuente o andando hacia la puerta de la casa que elegiste
    moverTopo(t);
    const andando = topo.camino.length > 0, frs = andando ? TOPO_ANDAR : TOPO_REPOSO;
    const fr = frs[Math.floor(t*(andando ? 9 : 2)) % frs.length];
    x.save();
    if(topo.cara < 0){ x.translate(Math.round(topo.x) + 32, Math.round(topo.y)); x.scale(-1, 1); x.drawImage(fr, 0, 0); }
    else x.drawImage(fr, Math.round(topo.x), Math.round(topo.y));
    x.restore();
  }
  // Deep camina por la plaza: rodea la fuente por abajo y llega a la puerta de la casa; al llegar se abre el panel
  const INICIO = {x: 122, y: 116};
  const topo = {x: INICIO.x, y: INICIO.y, cara: 1, camino: [], alLlegar: null, tPaso: 0, tUlt: 0};
  const puerta = i => { const h = HUECOS[i % HUECOS.length]; return {x: h.x + 24 - 16, y: h.y + 44 - 30}; };
  function irA(dest, alLlegar){
    // pasa por el pasillo de debajo de la fuente si hay que cruzar de un lado a otro
    const ruta = [], bajo = 158;
    if(Math.abs(dest.x - topo.x) > 40){ ruta.push({x: topo.x, y: bajo}, {x: dest.x, y: bajo}); }
    ruta.push(dest);
    topo.camino = ruta; topo.alLlegar = alLlegar;
  }
  function moverTopo(t){
    const dt = Math.min(0.05, Math.max(0, t - topo.tUlt)); topo.tUlt = t;
    if(!topo.camino.length) return;
    const p = topo.camino[0], dx = p.x - topo.x, dy = p.y - topo.y, d = Math.hypot(dx, dy), v = 70*dt;
    if(Math.abs(dx) > 0.5) topo.cara = Math.sign(dx);
    if(d <= v){ topo.x = p.x; topo.y = p.y; topo.camino.shift(); if(!topo.camino.length && topo.alLlegar){ const f = topo.alLlegar; topo.alLlegar = null; f(); } }
    else { topo.x += dx/d*v; topo.y += dy/d*v; }
    topo.tPaso += dt; if(topo.tPaso > 0.22){ topo.tPaso = 0; window.Sonido && window.Sonido.tocar('pasoPlaza', 0.7); }
  }
  function montarPuntosPlaza(){
    const cont = $('plazaPuntos'); cont.innerHTML = '';
    const g = plazaGeo, at = (qx, qy) => ({left: g.left + qx*g.css, top: g.top + qy*g.css});
    D.casas.forEach((c, i) => {
      const h = HUECOS[i % HUECOS.length], b = document.createElement('button');
      b.className = 'punto'; const q = at(h.x + 24, h.y + 22); b.style.left = q.left+'px'; b.style.top = q.top+'px';
      b.style.transform = `translate(-50%, -${24*g.css}px)`;
      b.innerHTML = `<span class="zona" style="width:${50*g.css}px;height:${46*g.css}px"></span><span class="etq">${c.nombre}</span>`;
      b.setAttribute('aria-label', c.nombre);
      b.onclick = () => { plazaSel = i; document.querySelectorAll('#plazaPuntos .punto').forEach((bb, j) => bb.classList.toggle('sel', j === i));
        $('ppEyebrow').textContent = D.casas[i].dueno; $('ppTitulo').textContent = D.casas[i].nombre; $('ppCuerpo').innerHTML = '<p class="note">Deep va hacia la puerta…</p>';
        irA(puerta(i), () => { if(plazaSel === i) panelCasa(); }); };
      cont.appendChild(b);
    });
    const salida = document.createElement('button'); salida.className = 'punto';
    const q = at(173, 222); salida.style.left = q.left+'px'; salida.style.top = q.top+'px';
    salida.style.transform = `translate(-50%, -${16*g.css}px)`;
    salida.innerHTML = `<span class="zona" style="width:${34*g.css}px;height:${30*g.css}px"></span><span class="etq">Al mapa</span>`;
    salida.setAttribute('aria-label', 'Salir al mapa');
    salida.onclick = () => { plazaSel = null; panelCasa(); irA({x: 158, y: 196}, () => window.Pantallas.mostrar('mapa')); };
    cont.appendChild(salida);
  }
  const MAT = D.materiales;
  const chip = (k, n) => `<span class="chip"><i style="background:${MAT[k] && MAT[k].color || '#999'}"></i>${MAT[k] ? MAT[k].nombre : k} <b>${n}</b></span>`;
  const precioTxt = p => Object.entries(p).map(([m, n]) => n + ' de ' + (MAT[m] ? MAT[m].nombre.toLowerCase() : m)).join(', ');
  function kitTxt(){ return 'Llevas ' + (Pa.kit.puntales||0) + ' puntales y ' + (Pa.kit.escaleras||0) + ' escaleras'; }
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
    plaza(){ activa = 'plaza'; plazaSel = null; topo.x = INICIO.x; topo.y = INICIO.y; topo.camino = []; topo.alLlegar = null; requestAnimationFrame(recolocar); },
    parar(){ activa = null; },
  };
})();
