// =====================================================================
//  DEEP ARCADE: la página arcade/index.html. Usa la misma mina (js/mina.js) con un pozo nuevo en cada partida,
//  sin mochila ni pueblo. Aquí van los puntos, el reloj, los combos, los cajones, los modos, los desbloqueos
//  (modos y aspectos) y los récords.
// =====================================================================
window.Arcade = (()=>{
  const D = window.DATOS, A = D.arcade, M = D.materiales, Mi = window.Mina, So = window.Sonido;
  const $ = id => document.getElementById(id);
  const FASES = A.fases, NF = FASES.length, CADA = A.cajonCada || 4, CB = A.combo || {tope: 9, cobrar: 3, fuegoDesde: 3};
  const ASP = A.aspectos || [], ASPID = Object.fromEntries(ASP.map(a => [a.id, a]));

  // ---------- progreso guardado (solo el del arcade) ----------
  const GUARDA = 'deep-arcade';
  const nuevoProg = () => ({desbloq: {}, records: {}, completos: {}, aspectos: {}, nuevos: {}, aspecto: 'clasico',
    stats: {arcilla: 0, carbon: 0, cobre: 0, cuarzo: 0, cofres: 0, herr: 0, plantas: 0, muertes: 0, muertesArcade: 0}, tuto: {}});
  const cargar = () => { const n = nuevoProg(); try{ const o = JSON.parse(localStorage.getItem(GUARDA) || '{}'); for(const k in n) if(o[k] !== undefined) n[k] = typeof n[k] === 'object' ? Object.assign(n[k], o[k]) : o[k]; }catch(e){} return n; };
  const guardar = () => { try{ localStorage.setItem(GUARDA, JSON.stringify(prog)); }catch(e){} };
  let prog = cargar();

  // ---------- modos ----------
  const MODOS = {
    arcade: { nombre: 'Arcade',       cajones: true, puntos: true },
    ta:     { nombre: 'Contrarreloj', cajones: true, puntos: false, siempre: true },
    vidas:  { nombre: 'Tres vidas',   cajones: true, puntos: true, vidas: true },
    r100:   { nombre: '100 m',        metros: 100, puntos: true },
    r300:   { nombre: '300 m',        metros: 300, puntos: true },
    r500:   { nombre: '500 m',        metros: 500, puntos: true },
    sinfin: { nombre: 'Sin fin',      cajones: true, puntos: true, sinFin: true },
    mrdeep: { nombre: 'Mr. Deep',     metros: Infinity, puntos: true, grupo: true },
  };
  const ORDEN = ['arcade', 'ta', 'vidas', 'r100', 'r300', 'r500', 'sinfin', 'mrdeep'];
  const abierto = m => m === 'arcade' || !!prog.desbloq[m];
  const hayMenu = () => true;   // el arcade abre siempre en el menú principal, aunque solo tengas un modo
  // todo lo que se puede desbloquear (para la lista de la estrella)
  const DESB = [
    {id: 'ta', tipo: 'modo', nombre: 'Contrarreloj', como: 'Pasar la fase 1'},
    {id: 'r100', tipo: 'modo', nombre: '100 m', como: 'Pasar la fase 1'},
    {id: 'vidas', tipo: 'modo', nombre: 'Tres vidas', como: 'Morir 3 veces en el arcade o pasar la fase 2'},
    {id: 'r300', tipo: 'modo', nombre: '300 m', como: 'Pasar la fase 3'},
    {id: 'r500', tipo: 'modo', nombre: '500 m', como: 'Pasar la fase 4'},
    {id: 'sinfin', tipo: 'modo', nombre: 'Sin fin', como: 'Terminar el arcade'},
    {id: 'mrdeep', tipo: 'modo', nombre: 'Mr. Deep', como: 'Llegar al fondo en 500 m'},
    ...ASP.filter(a => a.id !== 'clasico').map(a => ({id: 'asp_' + a.id, tipo: a.tipo, nombre: a.nombre, como: a.como, asp: a})),
  ];
  const tiene = id => id.startsWith('asp_') ? (id === 'asp_clasico' || !!prog.aspectos[id.slice(4)]) : abierto(id);

  // ---------- pozos ----------
  const CONTENIDO = { cartas: false, puertas: false, llaves: false, ramales: false, salaSellada: false, barro: false, grisu: false, objetos: true, piezas: false };
  const DESDE = { carbon: 0, cobre: 0, cuarzo: 0, cuevas: 0, agua: 0, polillas: 0, gas: 99, barro: 99 };
  const tema = (F, nombre) => ({ nombre, min: F.min, arena: F.arena, cuevas: F.cuevas, agua: F.agua, polillas: F.polillas });
  // las fases del pozo: las cinco del arcade o, en el sin fin, vueltas que se repiten cada vez más largas y pidiendo más
  // 0.302: los cajones piden más en Arcade y Tres vidas (x1,5) y algo más en Contrarreloj (x1,25); el cuarzo, escaso, sube la mitad
  const MULT = (A.multCajon || { arcade: 1.5, vidas: 1.5, ta: 1.25 });
  const subir = (pide, m) => Object.fromEntries(Object.entries(pide).map(([k, n]) => [k, Math.round(n * (k === 'cuarzo' ? 1 + (m - 1)/2 : m))]));
  function listaFases(sinFin, modo){
    if(!sinFin) return FASES.map(F => ({F, largo: F.largo, pide: subir(F.pide, MULT[modo] || 1), nombre: F.nombre, color: 0}));
    const SF = A.sinFin || {crece: 4, largoMax: 40, pideCrece: 0.5}, out = [];
    for(let v=0; v<15; v++) FASES.forEach((F, i) => out.push({F, largo: Math.min(SF.largoMax, F.largo + v*SF.crece), color: i,
      pide: Object.fromEntries(Object.entries(F.pide).map(([k, n]) => [k, Math.round(n*(1 + v*SF.pideCrece))])),
      nombre: (v ? 'Vuelta ' + (v + 1) + ' · ' : '') + F.nombre}));
    return out;
  }
  function pozoFases(LF, sinFin){
    const tramos = [], temas = [];
    LF.forEach(fa => { for(let i=0;i<CADA;i++){ const nm = fa.nombre + ' · ' + (i + 1) + ' de ' + CADA; tramos.push({nombre: nm, largo: fa.largo}); temas.push(tema(fa.F, nm)); } });
    if(!sinFin){ tramos.push({nombre: 'El fondo', largo: 1}); temas.push(tema(FASES[NF - 1], 'El fondo')); }
    return { nombre: 'Deep Arcade', guardado: 'deep-arcade-pozo', columnas: 15, tramos, conFondo: !sinFin, altoSala: 4, temas, temasDesde: 0,
      contenido: CONTENIDO, desdeTramo: DESDE, sueltos: A.plantas };
  }
  function pozoRecorrido(m, mr){
    const R = A.recorridos, nm = mr ? 'Mr. Deep' : 'Recorrido de ' + m + ' m';
    return { nombre: nm, guardado: 'deep-arcade-pozo', columnas: 15, tramos: [{nombre: nm, largo: 99999}], conFondo: false,
      altoSala: 4, temas: [Object.assign({nombre: nm}, R.tema)], temasDesde: 0, franjas: mr ? null : R.franjas, aceiteFilas: mr ? (A.mrDeep || {}).aceiteFilas || 9 : R.aceiteFilas, aceiteAzar: mr ? 0 : R.aceiteAzar,
      contenido: CONTENIDO, desdeTramo: DESDE, sueltos: A.plantas };
  }

  // ---------- partida ----------
  let S = null, LF = listaFases(false);
  const refFase = f => Math.round(CADA*(LF[f].largo + 4)*A.segundosPorFila);
  const mmss = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s/60) + ':' + String(s % 60).padStart(2, '0'); };
  const nombreMat = k => M[k] ? M[k].nombre : k;
  const pideTxt = p => Object.entries(p).map(([k, n]) => n + ' de ' + nombreMat(k).toLowerCase()).join(', ');
  const numero = n => Math.round(n).toLocaleString('es-ES');
  const comboNuevo = () => ({n: 0, mult: 0, ultimo: null, pot: 0, t: 0, tipos: {}, puro: true, tono: 0, enMax: 0});
  function empezar(modo, vidas){
    const MO = MODOS[modo];
    LF = listaFases(!!MO.sinFin, modo);
    S = {modo, puntos: 0, tiempo: 0, tFase: 0, fase: 0, combo: comboNuevo(), vidas: MO.vidas ? (A.vidas || 3) : (vidas || 1), vidasMax: MO.vidas ? (A.vidas || 3) : (vidas || 1),
      fin: false, parciales: [], fasesPts: [], ptsFase: 0, metros: MO.metros || 0, corre: {}, agua: 0, mecha: true, ultimoPuntal: 0, prevHerr: null, prevProps: null, fuego: 0};
    const key = 'arcade_' + modo;
    D.pozos[key] = MO.metros ? pozoRecorrido(MO.metros, MO.grupo) : pozoFases(LF, !!MO.sinFin);
    cerrarTodo();
    Mi.arcade({ pozo: key, puntales: A.puntales, escaleras: A.escaleras, cajonCada: MO.cajones ? CADA : 0, finalEn: MO.cajones && !MO.sinFin ? NF*CADA - 1 : -1,
      grupo: !!MO.grupo, golpe, sala, muerte, dano, cofre, objeto, jaula, tinte });
    Mi.aspecto(ASPID[prog.aspecto] || null);
    if(MO.grupo) Mi.avisar('Mr. Deep', 'Al picar un mineral se rompe todo su grupo. ¿Hasta dónde llegas?');
    else if(MO.metros) Mi.avisar(MO.nombre, 'Llega a ' + MO.metros + ' m lo antes posible. Ve a por el aceite');
    else if(modo === 'ta') Mi.avisar('Contrarreloj · Fase 1', 'El cajón pide ' + pideTxt(LF[0].pide) + '. El reloj no para');
    else Mi.avisar('Fase 1 · ' + LF[0].nombre, 'El cajón del fondo de la fase pide ' + pideTxt(LF[0].pide));
    colorFase(0); pintar(true); jaulaEtiqueta();
  }
  // ---- combo: picar mineral seguido sube el multiplicador; sus puntos no son tuyos hasta cobrarlo ----
  function golpe(key, esMineral){
    if(!S || S.fin || !key) return;   // sin clave: las vigas de las salas (no cuentan)
    if(esMineral && prog.stats[key] !== undefined){ prog.stats[key]++; logrosMinerales(); }
    if(!MODOS[S.modo].puntos) return;   // contrarreloj: sin puntos ni combos
    const C = S.combo;
    if(esMineral){
      tuto('combo');
      const antes = C.mult;
      C.mult = C.n === 0 ? 1 : Math.min(CB.tope, C.mult + 1);
      if(C.n && key !== C.ultimo) C.puro = false;
      C.racha = C.n && key === C.ultimo ? (C.racha || 1) + 1 : 1;
      C.n++; C.ultimo = key; C.t = CB.cobrar;
      const nuevoTipo = !C.tipos[key]; C.tipos[key] = true;
      // 0.304: racha del mismo mineral seguido: desde el 5.º, cada uno vale un poco más (se queda en el bote aunque cambies)
      const RA = CB.racha, extra = RA && C.racha >= RA.desde ? Math.min(RA.max, (C.racha - RA.desde + 1)*RA.paso) : 0;
      const pts = Math.round((A.puntos[key] || 10)*C.mult*(1 + extra)); C.pot += pts;
      if(extra) Mi.flotar('Racha ×' + C.racha + ' +' + Math.round(extra*100) + ' %', '#ffd27a', 0.5);
      // el pling sube siempre de tono; en ¡MAX!, doble toque y vuelve a subir desde abajo
      if(So && So.pling){
        if(C.mult >= CB.tope){ So.pling((C.enMax % 7)*2, 1, true); C.enMax++; }
        else So.pling(Math.min(24, (C.n - 1)*2));
      }
      const EN = CB.enlace;
      if(EN && nuevoTipo && Object.keys(C.tipos).length === EN.tipos) Mi.flotar('¡Enlace a punto!', '#5fcde4', 1.2);
      if(C.mult >= CB.tope && antes < CB.tope){ desbloquear('asp_neon'); }
      pintar();
    } else if(C.n) perder();
  }
  function cobrar(){
    const C = S.combo; if(!C.n) return;
    const puro = C.puro && C.n >= (CB.puroDesde || 3), EN = CB.enlace, enlace = EN && Object.keys(C.tipos).length >= EN.tipos;
    if(puro) C.pot *= (CB.puroMult || 2);
    if(enlace) C.pot *= (EN.mult || 1);   // 0.303: el enlace, como una escalera de color: también el doble
    S.puntos += C.pot; S.ptsFase += C.pot;
    if(C.n >= 2) tuto('cobrar');
    if(C.n >= 2){
      // 0.303: cobrar se nota: número grande que vuela al marcador, destello, sacudida y caja registradora
      const max = C.mult >= CB.tope, nivel = enlace || max ? 3 : puro ? 2 : C.mult >= 5 ? 1 : 0;
      const col = enlace ? '#5fcde4' : puro ? '#ff7bd5' : max ? '#ff9b3d' : '#fbf236';
      const sub = (enlace ? '¡ENLACE! ' : puro ? '¡PURO! ' : max ? '¡MAX! ' : '') + 'Combo ×' + C.mult + (enlace || puro ? ' ×2' : '');
      volarNumero('+' + numero(C.pot), sub, col, nivel);
      Mi.fxCobro(nivel, col);
      if(So && So.caja) So.caja(C.mult, nivel); else Mi.sonar('cobrar', 0.8);
    }
    if(enlace){ Mi.arcadeDar({puntales: EN.puntales || 0, escaleras: EN.escaleras || 0}); Mi.flotar('+' + (EN.puntales || 0) + ' puntales y +' + (EN.escaleras || 0) + ' escaleras', '#5fcde4', 0.9); setTimeout(() => Mi.sonar('desbloqueo', 0.7), 350); }
    S.combo = comboNuevo(); pintar();
  }
  function perder(){
    const C = S.combo; if(!C.n) return;
    if(C.n >= 2 || C.pot > 0){ Mi.flotar('Combo perdido: −' + numero(C.pot), '#d95763', 0.6); Mi.sonar('cristales'); }
    S.combo = comboNuevo(); pintar();
  }
  function dano(causa){ if(S && !S.fin){ perder(); if(causa === 'polilla') tuto('polilla'); } }
  function cofre(){ prog.stats.cofres++; if(prog.stats.cofres >= 50) desbloquear('asp_coneja'); guardar(); }
  function objeto(id){ tuto(id === 'hongo_azul' ? 'hongo' : 'flor'); prog.stats.plantas++; if(prog.stats.plantas >= 25) desbloquear('asp_ardilla'); guardar(); }
  function logrosMinerales(){
    const st = prog.stats;
    if(st.arcilla >= 300) desbloquear('asp_alfarero'); if(st.carbon >= 500) desbloquear('asp_carbonero');
    if(st.cobre >= 300) desbloquear('asp_cobrizo'); if(st.cuarzo >= 100) desbloquear('asp_cuarzo');
  }
  // fase superada en el arcade o en tres vidas: desbloqueos de modos
  function faseSuperada(f){
    if(S.modo === 'arcade' || S.modo === 'vidas'){
      if(f >= 0){ desbloquear('ta'); desbloquear('r100'); }
      if(f >= 1) desbloquear('vidas');
      if(f >= 2) desbloquear('r300');
      if(f >= 3) desbloquear('r500');
    }
    if(S.mecha) desbloquear('asp_singafas');
    S.mecha = true;
  }
  function sala(i){
    if(!S || S.fin) return;
    cobrar();   // entrar en una sala segura cobra el combo
    if((i + 1) % CADA !== 0) tuto('sala');
    if((i + 1) % CADA !== 0) return;
    const f = Math.floor(i / CADA), MO = MODOS[S.modo];
    if(!MO.cajones || f >= LF.length) return;
    const est = Mi.arcadeEstado(), bag = est ? est.bag : {}, pide = LF[f].pide;
    const falta = Object.entries(pide).filter(([k, n]) => (bag[k] || 0) < n).map(([k, n]) => (n - (bag[k] || 0)) + ' de ' + nombreMat(k).toLowerCase());
    if(falta.length){ S.faltaba = falta; Mi.pausa(true); return finPartida('cajon'); }
    Mi.arcadeQuitar(pide);
    const sobra = Mi.arcadeEstado().bag; Mi.arcadeVaciar();
    faseSuperada(f);
    const ultima = !MO.sinFin && f >= NF - 1;
    if(S.modo === 'ta'){   // contrarreloj: solo cuentan el cajón y el tiempo
      S.parciales.push(S.tFase); S.tFase = 0; S.fase = f + 1;
      if(ultima){ Mi.pausa(true); return finPartida('fondo'); }
      Mi.arcadeAbrir(i); colorFase(f + 1);
      Mi.avisar('Fase ' + (f + 2) + ' · ' + LF[f + 1].nombre, 'Parcial ' + mmss(S.parciales[f]) + '. El cajón pide ' + pideTxt(LF[f + 1].pide));
      return;
    }
    const tf = S.tFase, ref = refFase(f), bonT = Math.max(0, Math.round((ref - tf)*A.porSegundo));
    const bonM = Object.entries(sobra).reduce((a, [k, n]) => a + n*(A.puntos[k] || 10), 0);
    const mult = (f % NF) + 1, total = (bonT + bonM)*mult;
    S.puntos += total; S.fasesPts.push(S.ptsFase + total); S.ptsFase = 0; S.tFase = 0; S.fase = f + 1;
    if(!ultima) Mi.arcadeAbrir(i);
    Mi.pausa(true);
    recuento({f, tf, ref, bonT, sobra, bonM, mult, total, ultima, sala: i});
  }
  function muerte(causa){
    if(!S || S.fin) return;
    S.combo = comboNuevo();
    prog.stats.muertes++; if(prog.stats.muertes >= 20) desbloquear('asp_fantasma');
    if(S.modo === 'arcade'){ prog.stats.muertesArcade++; if(prog.stats.muertesArcade >= 3) desbloquear('vidas'); }
    guardar();
    if(S.vidas > 1){ S.vidas--; pintar(true);
      setTimeout(() => { if(!S || S.fin) return; Mi.arcadeReaparecer(); Mi.avisar('Te quedan ' + S.vidas + (S.vidas === 1 ? ' vida' : ' vidas'), 'Vuelves a la última sala segura'); }, 1400); return; }
    S.vidas = 0; setTimeout(() => finPartida(causa), 1500);
  }

  // ---------- desbloqueos y avisos ----------
  function desbloquear(id){
    if(tiene(id)) return false;
    if(id.startsWith('asp_')) prog.aspectos[id.slice(4)] = true; else prog.desbloq[id] = true;
    prog.nuevos[id] = true; guardar();
    const d = DESB.find(x => x.id === id); if(d) banner(d);
    if((id === 'asp_sincasco' || id === 'asp_singafas') && prog.aspectos.sincasco && prog.aspectos.singafas) desbloquear('asp_natural');
    marcarEstrella();
    return true;
  }
  const colaBanner = []; let bannerActivo = false;
  function banner(d){ colaBanner.push(d); if(!bannerActivo) siguienteBanner(); }
  function siguienteBanner(){
    const d = colaBanner.shift(); if(!d){ bannerActivo = false; return; }
    bannerActivo = true;
    const el = $('arcBanner');
    $('bnImg').innerHTML = d.asp ? `<img src="${Mi.retratoAspecto(d.asp, 2)}" alt="">` : '<span class="bnEstrella">★</span>';
    $('bnNombre').textContent = d.nombre; $('bnTipo').textContent = d.tipo === 'modo' ? '¡Modo desbloqueado!' : '¡Desbloqueado!';
    el.hidden = false; el.classList.remove('fuera'); void el.offsetWidth; el.classList.add('dentro');
    Mi.sonar('desbloqueo');
    setTimeout(() => { el.classList.remove('dentro'); el.classList.add('fuera'); setTimeout(() => { el.hidden = true; siguienteBanner(); }, 350); }, colaBanner.length ? 1800 : 3000);
  }
  function marcarEstrella(){ const hay = Object.keys(prog.nuevos).length > 0; $('mnEstrella').classList.toggle('nuevo', hay); }

  // ---------- jaula: elegir aspecto ----------
  const aspectosTengo = () => ASP.filter(a => a.id === 'clasico' || prog.aspectos[a.id]);
  function jaula(dir){
    const L = aspectosTengo(); if(L.length < 2) return false;
    let i = L.findIndex(a => a.id === prog.aspecto); if(i < 0) i = 0;
    const a = L[(i + dir + L.length) % L.length];
    prog.aspecto = a.id; guardar(); Mi.aspecto(a); Mi.sonar('clic'); jaulaEtiqueta();
    return true;
  }
  function jaulaEtiqueta(){
    const L = aspectosTengo(), est = Mi.arcadeEstado(), el = $('arcJaula');
    const ver = !!(S && !S.fin && est && est.enJaula && L.length > 1);
    el.hidden = !ver; if(ver) $('jaNombre').textContent = (ASPID[prog.aspecto] || ASP[0]).nombre;
  }

  // ---------- color de cada fase: el fondo de la página y el tinte de la roca ----------
  const COL = A.colores || [];
  let colorActual = -1;
  function colorFase(f){
    if(!S || S.metros){ fondo(null); return; }
    const i = LF[f] ? LF[f].color : (f % NF); if(i === colorActual) return; colorActual = i; fondo(COL[i]);
  }
  let capa = 0;
  function fondo(c){
    const a = $('arcFondoA'), b = $('arcFondoB'), sig = capa ? a : b, ant = capa ? b : a;
    sig.style.background = c ? `linear-gradient(180deg, ${c.fondo[0]} 0%, ${c.fondo[1]} 100%)` : '';
    sig.style.opacity = c ? 1 : 0; ant.style.opacity = 0; capa = 1 - capa;
    if(!c) colorActual = -1;
  }
  function tinte(r, seg){ if(!S || S.metros || seg === undefined) return null; const fa = LF[Math.floor(seg/CADA)]; const c = fa ? COL[fa.color] : null; return c ? c.roca : null; }

  // ---------- reloj, combo y marcador ----------
  let tUlt = performance.now();
  function bucle(now){
    const dt = Math.min(0.1, (now - tUlt)/1000); tUlt = now;
    if(S && !S.fin){
      const est = Mi.arcadeEstado();
      if(est) tutoMirar(est);
      if(est && est.started && !est.dead && !est.superficie){
        if(MODOS[S.modo].siempre || S.metros || !est.inRoom){ S.tiempo += dt; S.tFase += dt; }
        if(S.metros && est.profundidad >= S.metros) finRecorrido();
        // el combo se cobra solo si pasa un rato sin picar otro mineral
        // la cuenta no corre mientras golpeas un mineral; si te quedas quieto de verdad un rato, corre más deprisa
        if(S.combo.n && Mi.golpeMineralHace() > (CB.golpeMargen ?? 0.6)){
          const q = Mi.quietoDesde() - (CB.quietoMargen ?? 0.7), q0 = CB.quieto || 3, q1 = CB.quietoMax || q0;
          // 0.303: quieto, empieza a ×3 y acelera hasta ×6 en un segundo; al moverte vuelve a la normal
          S.combo.t -= dt*(q > 0 ? Math.min(q1, q0 + (q1 - q0)*q/(CB.quietoRampa || 1)) : 1); if(S.combo.t <= 0) cobrar(); }
        // logros que se miran sobre la marcha
        if(est.bajoAgua){ S.agua += dt; if(S.agua >= 30) desbloquear('asp_buzo'); } else S.agua = 0;
        if(!est.inRoom && est.wick) S.mecha = false;
        const herr = est.props + est.ladders;
        if(S.prevHerr !== null && herr < S.prevHerr){ prog.stats.herr += S.prevHerr - herr; if(prog.stats.herr >= 100) desbloquear('asp_tejon'); }
        if(S.prevProps !== null && est.props < S.prevProps) S.ultimoPuntal = est.profundidad;
        S.prevHerr = herr; S.prevProps = est.props;
        if(est.profundidad - S.ultimoPuntal >= 50) desbloquear('asp_sincasco');
        // contrarreloj: en cuanto llevas lo que pide el cajón, ¡a correr!
        if(S.modo === 'ta' && LF[S.fase] && !S.corre[S.fase] && Object.entries(LF[S.fase].pide).every(([k, n]) => (est.bag[k] || 0) >= n)){
          S.corre[S.fase] = true; corre(); }
        if(est.seg !== undefined && !S.metros) colorFase(Math.floor(est.seg/CADA));
      }
      jaulaEtiqueta();
      const fz = S.combo.mult >= (CB.fuegoDesde || 3) ? Math.min(1, (S.combo.mult - 2)/(CB.tope - 2)) : 0;
      S.fuego += (fz - S.fuego)*Math.min(1, dt*6); Mi.fuego(S.fuego < 0.02 ? 0 : S.fuego);
      pintar();
    }
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);
  function corre(){
    const el = $('arcCorre'); el.hidden = false; el.classList.remove('sale'); void el.offsetWidth; el.classList.add('sale');
    Mi.sonar('corre'); clearTimeout(corre.tm); corre.tm = setTimeout(() => { el.hidden = true; }, 2600);
  }
  const ult = {};
  function pintar(forzar){
    if(!S) return;
    const est = Mi.arcadeEstado() || {bag: {}}, MO = MODOS[S.modo];
    const parado = !MO.siempre && !S.metros && est.inRoom;
    $('arcCajaPuntos').hidden = !MO.puntos;
    set('arcPuntos', numero(S.puntos), forzar);
    set('arcTiempo', (parado ? '⏸ ' : '') + mmss(MO.siempre || S.metros ? S.tiempo : S.tFase), forzar);
    $('arcTiempo').classList.toggle('parado', parado);
    const C = S.combo, hayC = MO.puntos && C.n > 0;
    $('arcComboCaja').hidden = true;   // el combo se ve encima de Deep (la caja de la barra hacía moverse la pantalla)
    Mi.combo(hayC ? {mult: C.mult, max: C.mult >= CB.tope, pot: numero(C.pot), t: Math.max(0, Math.min(1, C.t/CB.cobrar)), puro: C.puro && C.n >= 2,
      tipos: ['arcilla', 'carbon', 'cobre', 'cuarzo'].map(k => C.tipos[k] ? k : null)} : null);
    if(hayC){ set('arcCombo', C.mult >= CB.tope ? '¡MAX!' : '×' + C.mult, forzar); $('arcCombo').classList.toggle('max', C.mult >= CB.tope);
      set('arcPot', '+' + numero(C.pot), forzar); $('arcCobrar').style.width = Math.max(0, Math.min(100, C.t/CB.cobrar*100)) + '%'; }
    let obj = '';
    if(S.metros) obj = '🎯 ' + (S.metros === Infinity ? (est.profundidad || 0) + ' m' : Math.min(est.profundidad || 0, S.metros) + ' / ' + S.metros + ' m');
    else if(MO.cajones && LF[S.fase]){
      const pide = LF[S.fase].pide, listo = Object.entries(pide).every(([k, n]) => (est.bag[k] || 0) >= n);
      if(S.modo === 'ta' && listo){ const fs = Mi.filaSala(S.fase*CADA + CADA - 1), m = fs !== null ? Math.max(0, fs - (est.profundidad || 0)) : 0;
        obj = `<span class="corre">¡Al cajón! Faltan ${m} m</span>`; }
      else obj = 'Cajón ' + (S.fase + 1) + ': ' + Object.entries(pide).map(([k, n]) =>
        `<span class="${(est.bag[k] || 0) >= n ? 'ok' : ''}"><i style="background:${M[k].color}"></i>${nombreMat(k)} <b>${Math.min(est.bag[k] || 0, n)}/${n}</b></span>`).join('');
    }
    if(S.vidasMax > 1) obj += ` <span class="vidas">${'❤️'.repeat(Math.max(0, S.vidas))}</span>`;
    set('arcObjetivo', obj, forzar, true);
  }
  function set(id, v, forzar, html){ if(!forzar && ult[id] === v) return; ult[id] = v; if(html) $(id).innerHTML = v; else $(id).textContent = v; }
  function pulso(id, clase = 'pulso'){ const e = $(id); e.classList.remove('pulso', 'pulsoGordo'); void e.offsetWidth; e.classList.add(clase); }
  // 0.303: el número del combo cobrado sale grande de encima de Deep y vuela hasta el marcador de puntos
  function volarNumero(txt, sub, col, nivel){
    const cv = $('cv'), dest = $('arcPuntos'); if(!cv || !dest || !document.body.animate){ pulso('arcPuntos'); return; }
    const r = cv.getBoundingClientRect(), d = Mi.deepPantalla() || {x: 0.5, y: 0.35}, q = dest.getBoundingClientRect();
    const x0 = Math.max(r.left + 110, Math.min(r.right - 110, r.left + d.x*r.width)), y0 = r.top + d.y*r.height - 24, dx = q.left + q.width/2 - x0, dy = q.top + q.height/2 - y0;
    const e = document.createElement('div'); e.className = 'arcVuela n' + nivel; e.style.left = x0 + 'px'; e.style.top = y0 + 'px'; e.style.color = col;
    e.innerHTML = '<small></small><span></span>'; e.firstChild.textContent = sub; e.lastChild.textContent = txt;
    document.body.appendChild(e);
    const tt = 'translate(-50%,-50%) ';
    const a = e.animate([
      {transform: tt + 'scale(.2)', opacity: 0, easing: 'ease-out'},
      {transform: tt + 'translateY(-26px) scale(1.3) rotate(-4deg)', opacity: 1, offset: 0.16, easing: 'ease-in-out'},
      {transform: tt + 'translateY(-34px) scale(1)', opacity: 1, offset: 0.5 + nivel*0.04, easing: 'cubic-bezier(.5,0,.75,.4)'},
      {transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.3)`, opacity: 0.85}
    ], {duration: 1050 + nivel*170});
    a.onfinish = () => { e.remove(); pulso('arcPuntos', nivel >= 2 ? 'pulsoGordo' : 'pulso'); if(So && So.tocar) So.tocar('cobrar', 0.35 + nivel*0.1); };
  }

  // ---------- pantallas ----------
  // ---------- tarjetas de cómo se juega: cada una sale la primera vez que aparece esa cosa (con su gif) ----------
  const TUT = Object.fromEntries((A.tutorial || []).map(x => [x.id, x]));
  let tutoAbierta = null, colaTuto = [];
  function tuto(id){
    if(!S || S.fin || !TUT[id] || prog.tuto[id] || colaTuto.includes(id) || (tutoAbierta && tutoAbierta.id === id)) return;
    colaTuto.push(id); if(!tutoAbierta) siguienteTuto();
  }
  function siguienteTuto(){
    const id = colaTuto.shift(); if(!id){ tutoAbierta = null; return; }
    const T = TUT[id]; tutoAbierta = T; prog.tuto[id] = true; guardar();
    Mi.pausa(true);
    $('tuTitulo').textContent = T.titulo; $('tuTexto').innerHTML = T.texto;
    const g = (window.TUTO_GIFS || {})[T.gif || id]; $('tuGif').hidden = !g; if(g) $('tuGif').src = g;
    $('arcTuto').hidden = false; Mi.sonar('carta');
    // el botón empieza apagado: se enciende pasado un segundo y cuando sueltas el dedo que estaba en los mandos
    const btn = $('tuBtn'), presos = new Set(dedos), t0 = performance.now(); btn.disabled = true;
    const mirar = () => { if(!tutoAbierta || tutoAbierta !== T) return;
      for(const d of presos) if(!dedos.has(d)) presos.delete(d);
      if(performance.now() - t0 >= (A.tutoEspera ?? 1000) && !presos.size){ btn.disabled = false; return; }
      requestAnimationFrame(mirar); };
    requestAnimationFrame(mirar);
  }
  function cerrarTuto(){
    $('arcTuto').hidden = true; tutoAbierta = null;
    if(colaTuto.length) return siguienteTuto();
    // sigue el juego si no hay otra ventana del arcade encima (recuento, fin, menú, pausa…)
    const otra = ['arcRecuento', 'arcFin', 'arcMenu', 'arcLista', 'arcElige', 'arcPausa'].some(id => !$(id).hidden);
    if(!otra && S && !S.fin) Mi.pausa(false);
  }
  // lo que se mira en cada fotograma: al empezar, al bajar, la lámpara, el agua, los derrumbes
  function tutoMirar(est){
    if(tutoAbierta || !S || S.fin || !$('arcPausa').hidden || !est.started) return;
    const MO = MODOS[S.modo];
    if(!prog.tuto.picar){ tuto('picar'); tuto(MO.cajones ? 'cajon' : 'recorrido'); return; }
    if(est.profundidad >= 5) tuto('escaleras');
    if(est.lamp < 70) tuto('lampara');
    if(est.bajoAgua) tuto('agua');
    if(est.cayendo) tuto('derrumbe');
  }
  function cerrarTodo(){ ['arcRecuento', 'arcFin', 'arcMenu', 'arcLista', 'arcElige', 'arcCorre'].forEach(id => $(id).hidden = true); }
  function chipsSobra(o){ const ks = Object.keys(o).filter(k => o[k] > 0); return ks.length ? ks.map(k => `<span class="chip"><i style="background:${M[k].color}"></i>${nombreMat(k)} <b>${o[k]}</b></span>`).join('') : '<span class="chip muted">Nada</span>'; }
  function recuento(r){
    const F = LF[r.f];
    $('rcEyebrow').textContent = 'Fase ' + (r.f + 1) + ' superada';
    $('rcTitulo').textContent = F.nombre;
    $('rcFilas').innerHTML = `
      <div class="rc"><span>Tiempo ${mmss(r.tf)} <small>(referencia ${mmss(r.ref)})</small></span><b>+${numero(r.bonT)}</b></div>
      <div class="rc"><span>Te sobra<div class="list">${chipsSobra(r.sobra)}</div></span><b>+${numero(r.bonM)}</b></div>
      <div class="rc mult"><span>Fase ${(r.f % NF) + 1}</span><b>×${r.mult}</b></div>
      <div class="rc total"><span>Esta fase</span><b>+${numero(r.total)}</b></div>
      <div class="rc"><span>Puntos</span><b>${numero(S.puntos)}</b></div>`;
    $('rcSig').textContent = r.ultima ? 'Has llenado el último cajón: el ascensor viejo ya funciona.' : 'Fase ' + (r.f + 2) + ': ' + LF[r.f + 1].nombre + '. El cajón pide ' + pideTxt(LF[r.f + 1].pide) + '.';
    $('rcBtn').textContent = r.ultima ? 'Subir en el ascensor' : 'Seguir bajando';
    $('rcBtn').onclick = () => { $('arcRecuento').hidden = true;
      if(r.ultima){ Mi.arcadeSubir(() => { Mi.pausa(true); finPartida('fondo'); }); return; }
      Mi.pausa(false); colorFase(r.f + 1);
      Mi.avisar('Fase ' + (r.f + 2) + ' · ' + LF[r.f + 1].nombre, 'El cajón pide ' + pideTxt(LF[r.f + 1].pide)); };
    $('arcRecuento').hidden = false; Mi.sonar('cofre');
  }
  function finRecorrido(){
    const est = Mi.arcadeEstado(), ref = Math.round(S.metros*A.segundosPorFila*0.8);
    cobrar();
    const bonT = Math.max(0, Math.round((ref - S.tiempo)*A.porSegundo)), bonM = Object.entries(est.bag).reduce((a, [k, n]) => a + n*(A.puntos[k] || 10), 0);
    S.puntos += bonT + bonM; S.recorrido = {ref, bonT, bonM, bag: est.bag};
    S.fin = 'subiendo'; Mi.pausa(true);
    Mi.arcadeSubir(() => { Mi.pausa(true); S.fin = false; finPartida('meta'); });
  }
  function finPartida(causa){
    if(!S || S.fin === true) return;
    if(S.combo.n) cobrar();
    S.fin = true; Mi.fuego(0); pintar(true); $('arcJaula').hidden = true; $('arcTuto').hidden = true; $('arcPausa').hidden = true; tutoAbierta = null; colaTuto = [];
    const modo = S.modo, MO = MODOS[modo], gana = causa === 'fondo' || causa === 'meta';
    // bonus final del arcade: lo que te queda de lámpara y de herramientas
    let bonus = null;
    if(gana && MO.cajones && MO.puntos){ const est = Mi.arcadeEstado() || {lamp: 0, props: 0, ladders: 0}, BF = A.bonusFinal || {lampara: 10, puntal: 50, escalera: 50};
      bonus = {lamp: Math.round(Math.max(0, est.lamp))*BF.lampara, herr: (est.props || 0)*BF.puntal + (est.ladders || 0)*BF.escalera, props: est.props || 0, ladders: est.ladders || 0, pct: Math.round(Math.max(0, est.lamp))};
      S.puntos += bonus.lamp + bonus.herr; }
    if(S.modo === 'mrdeep'){ const est = Mi.arcadeEstado(); S.metrosHechos = est ? est.maxima : 0; S.puntos += S.metrosHechos*((A.mrDeep || {}).porMetro || 5); }
    // desbloqueos de final de partida
    if(gana){
      prog.completos[modo] = true;
      if(modo === 'arcade' || modo === 'vidas'){ desbloquear('sinfin'); desbloquear('asp_oro'); }
      if(modo === 'ta' && S.tiempo < 360) desbloquear('asp_rayo');
      if(modo === 'r100') desbloquear('asp_azul');
      if(modo === 'r300') desbloquear('asp_explorador');
      if(modo === 'r500'){ desbloquear('mrdeep'); desbloquear('asp_viejo'); }
    }
    // récords: tiempo en el contrarreloj (solo si llegas), puntos en lo demás
    let rec = false;
    const rk = modo === 'sinfin' ? 'sinfin' + S.vidasMax : modo;
    if(modo === 'ta'){ if(gana && (!prog.records.ta || S.tiempo < prog.records.ta)){ prog.records.ta = S.tiempo; rec = true; } }
    else if(S.puntos > 0 && (!prog.records[rk] || S.puntos > prog.records[rk])){ prog.records[rk] = S.puntos; rec = true; }
    guardar();
    const TXT = {
      fondo: modo === 'ta' ? ['¡Contrarreloj completado!', ''] : ['¡Has llegado al fondo!', 'El ascensor viejo te sube a la superficie.'],
      meta: ['¡Deep ha llegado al fondo de esta mina!', 'Busca minas más profundas.'],
      cajon: ['El cajón no se abre', 'Te faltaba: ' + (S.faltaba || []).join(', ') + '.'],
      crush: ['Te aplastó un derrumbe', 'El techo sin apoyo crujió y se vino abajo.'],
      drown: ['Te quedaste sin aire', 'Estuviste demasiado tiempo bajo el agua.'],
      buried: ['Sepultado por la arena', 'La arena te cubrió la cabeza.'],
      lamp: ['La lámpara se apagó', 'A oscuras no hay forma de seguir.'],
    }[causa] || ['Fin de la partida', ''];
    $('fnEyebrow').textContent = MO.nombre + (S.vidasMax > 1 && modo === 'sinfin' ? ' · 3 vidas' : '') + (gana ? '' : ' · fin de la partida');
    $('fnTitulo').textContent = TXT[0]; $('fnTexto').textContent = TXT[1]; $('fnTexto').hidden = !TXT[1];
    let h = '';
    if(modo === 'ta'){
      h += `<div class="tiempoGrande">${gana ? mmss(S.tiempo) : '—'}</div>`;
      S.parciales.forEach((p, i) => h += `<div class="rc"><span>Fase ${i + 1} · ${LF[i].nombre}</span><b>${mmss(p)}</b></div>`);
      h += `<div class="rc"><span>Mejor tiempo</span><b>${prog.records.ta ? mmss(prog.records.ta) : '—'}</b></div>`;
    } else {
      if(S.recorrido) h += `<div class="rc"><span>Tiempo ${mmss(S.tiempo)} <small>(referencia ${mmss(S.recorrido.ref)})</small></span><b>+${numero(S.recorrido.bonT)}</b></div>
        <div class="rc"><span>Minerales<div class="list">${chipsSobra(S.recorrido.bag)}</div></span><b>+${numero(S.recorrido.bonM)}</b></div>`;
      else if(modo === 'mrdeep') h += `<div class="rc"><span>Has bajado</span><b>${S.metrosHechos} m</b></div>`;
      else if(gana && bonus){
        S.fasesPts.forEach((p, i) => h += `<div class="rc cer" style="animation-delay:${0.25 + i*0.35}s"><span>Fase ${i + 1} · ${LF[i].nombre}</span><b>+${numero(p)}</b></div>`);
        const d0 = 0.25 + S.fasesPts.length*0.35;
        h += `<div class="rc cer" style="animation-delay:${d0}s"><span>Lámpara ${bonus.pct}%</span><b>+${numero(bonus.lamp)}</b></div>
          <div class="rc cer" style="animation-delay:${d0 + 0.35}s"><span>Herramientas: ${bonus.props} puntales, ${bonus.ladders} escaleras</span><b>+${numero(bonus.herr)}</b></div>`;
      }
      else h += `<div class="rc"><span>Fases superadas</span><b>${S.fase}${MO.sinFin ? '' : ' de ' + NF}</b></div>`;
      h += `<div class="rc total${gana && bonus ? ' cer grande' : ''}" style="animation-delay:${gana && bonus ? 0.25 + (S.fasesPts.length + 2)*0.35 : 0}s"><span>Puntos</span><b>${numero(S.puntos)}</b></div>
        <div class="rc"><span>Récord</span><b>${numero(prog.records[rk] || 0)}</b></div>`;
    }
    $('fnFilas').innerHTML = h;
    $('fnRecord').hidden = !rec;
    $('fnMenu').hidden = !hayMenu(); $('arcMenuBtn').hidden = !hayMenu();
    $('fnNuevo').hidden = !Object.keys(prog.nuevos).length;
    $('arcFin').hidden = false; fondo(null);
    Mi.sonar(gana ? 'abrir' : 'muerte');
  }
  // ---------- menú: la boca de la mina con el letrero y las losetas de los modos ----------
  function menu(){
    cerrarTodo(); Mi.pausa(true); fondo(null); $('arcJaula').hidden = true;
    if(S) S.fin = true;
    $('mnLista').innerHTML = ORDEN.map(m => {
      const MO = MODOS[m], ok = abierto(m);
      if(!ok) return `<button class="loseta cerrada" disabled aria-label="Modo bloqueado"><span class="interroga">?</span><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></button>`;
      let r = '';
      if(m === 'ta') r = `<span class="rlbl">MEJOR TIEMPO</span><span class="rnum">${prog.records.ta ? mmss(prog.records.ta) : '—'}</span>`;
      else if(m === 'sinfin'){ const a = prog.records.sinfin1, b = prog.records.sinfin3; r = `<span class="rlbl">RÉCORD 1 VIDA · 3 VIDAS</span><span class="rnum">${a ? numero(a) : '—'} · ${b ? numero(b) : '—'}</span>`; }
      else r = `<span class="rlbl">RÉCORD</span><span class="rnum">${prog.records[m] ? numero(prog.records[m]) : '—'}</span>`;
      return `<button class="loseta" data-m="${m}"><span class="lnom">${MO.nombre}</span><span class="lrec">${r}</span>${prog.completos[m] ? '<span class="tick" aria-label="Completado"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>' : ''}${prog.nuevos[m] ? '<span class="nuevoTag">¡NUEVO!</span>' : ''}</button>`;
    }).join('');
    $('mnLista').querySelectorAll('button[data-m]').forEach(b => b.onclick = () => {
      const m = b.dataset.m; if(prog.nuevos[m]){ delete prog.nuevos[m]; guardar(); marcarEstrella(); }
      if(m === 'sinfin'){ $('arcElige').hidden = false; return; }
      empezar(m); });
    marcarEstrella();
    $('mnTuto').textContent = 'Ver las tarjetas otra vez'; $('mnBorrar').textContent = 'Borrar todos los datos'; borrarArmado = false;
    $('arcMenu').hidden = false;
  }
  function lista(){
    const vecinoVisto = ASP.some(a => a.tipo === 'vecino' && prog.aspectos[a.id]);
    const grupos = [['MODOS', DESB.filter(d => d.tipo === 'modo')]];
    if(vecinoVisto){ grupos.push(['ASPECTOS', DESB.filter(d => d.tipo === 'aspecto')], ['VECINOS', DESB.filter(d => d.tipo === 'vecino')]); }
    else grupos.push(['ASPECTOS', DESB.filter(d => d.tipo !== 'modo')]);
    const total = DESB.length, hechos = DESB.filter(d => tiene(d.id)).length;
    $('lsCuenta').textContent = hechos + ' de ' + total;
    $('lsCuerpo').innerHTML = grupos.map(([t, xs]) => `<div class="lsGrupo">${t}</div>` + xs.map(d => tiene(d.id)
      ? `<div class="lsFila${prog.nuevos[d.id] ? ' nuevo' : ''}">${d.asp ? `<img src="${Mi.retratoAspecto(d.asp, 1)}" alt="">` : '<span class="lsIco">★</span>'}<span><b>${d.nombre}</b><small>${d.como}</small></span>${prog.nuevos[d.id] ? '<span class="nuevoTag">¡NUEVO!</span>' : ''}</div>`
      : `<div class="lsFila cerrada" aria-label="Bloqueado">· · · · · · · ·</div>`).join('')).join('');
    $('arcLista').hidden = false;
    // visto: se quitan las marcas de nuevo (las losetas de los modos las conservan hasta que entras)
    for(const d of DESB) if(d.tipo !== 'modo') delete prog.nuevos[d.id];
    guardar(); marcarEstrella();
  }
  $('fnOtra').onclick = () => empezar(S ? S.modo : 'arcade', S ? S.vidasMax : 1);
  $('fnMenu').onclick = menu;
  $('arcMenuBtn').onclick = () => { if(hayMenu()) menu(); };
  $('mnEstrella').onclick = lista;
  $('lsCerrar').onclick = () => { $('arcLista').hidden = true; menu(); };
  $('elUna').onclick = () => empezar('sinfin', 1);
  $('elTres').onclick = () => empezar('sinfin', 3);
  $('elNo').onclick = () => { $('arcElige').hidden = true; };

  // al abrir la página: sin menú hasta que haya algo desbloqueado
  $('arcMenuBtn').hidden = !hayMenu();
  setTimeout(menu, 0);
  // ---------- pausa ----------
  $('arcPausaBtn').onclick = () => { if(tutoAbierta || !S || S.fin) return; Mi.pausa(true); $('arcPausa').hidden = false; Mi.sonar('clic'); };
  $('psSeguir').onclick = () => { $('arcPausa').hidden = true; if(S && !S.fin) Mi.pausa(false); };
  $('psMenu').onclick = () => { $('arcPausa').hidden = true; menu(); };
  // menú principal: ver las tarjetas otra vez y borrar todos los datos (pulsando dos veces)
  $('mnTuto').onclick = () => { prog.tuto = {}; guardar(); $('mnTuto').textContent = '✔ Las tarjetas volverán a salir'; Mi.sonar('clic'); };
  let borrarArmado = false;
  $('mnBorrar').onclick = () => {
    if(!borrarArmado){ borrarArmado = true; $('mnBorrar').textContent = 'Pulsa otra vez para borrarlo todo'; return; }
    borrarArmado = false; prog = nuevoProg(); guardar(); Mi.sonar('clic'); location.reload(); };
  $('tuBtn').onclick = () => { if(!$('tuBtn').disabled) cerrarTuto(); };
  // dedos que están tocando la pantalla ahora mismo (para no cerrar una tarjeta con el toque que ya estaba en los mandos)
  const dedos = new Set();
  document.addEventListener('pointerdown', e => dedos.add(e.pointerId), true);
  for(const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, e => dedos.delete(e.pointerId), true);
  return { empezar, menu, lista, get estado(){ return S; }, get progreso(){ return prog; },
    _desbloquearTodo(){ DESB.forEach(d => desbloquear(d.id)); },
    _borrar(){ prog = nuevoProg(); guardar(); } };
})();

// En el móvil, al primer toque se pone a pantalla completa (fuera la barra del navegador). En iPhone no se puede.
// 0.302b: con el dedo, el navegador solo lo deja al LEVANTARLO (touchend / pointerup), no al apretar.
// 0.302i: si sales de la pantalla completa, el siguiente toque vuelve a ponerla.
(() => { const d = document.documentElement;
  const ir = () => { if(document.fullscreenElement || !d.requestFullscreen || !matchMedia('(hover:none)').matches) return;
    d.requestFullscreen({navigationUI: 'hide'}).catch(() => {}); };
  addEventListener('touchend', ir, {passive: true}); addEventListener('pointerup', ir); })();
