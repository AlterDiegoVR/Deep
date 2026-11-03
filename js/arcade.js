// =====================================================================
//  DEEP ARCADE: la página arcade/index.html. Usa la misma mina (js/mina.js) con un pozo nuevo en cada partida,
//  sin mochila ni pueblo. Aquí van los puntos, el reloj, los combos, los cajones, los modos y los récords.
// =====================================================================
window.Arcade = (()=>{
  const D = window.DATOS, A = D.arcade, M = D.materiales, Mi = window.Mina;
  const $ = id => document.getElementById(id);
  const FASES = A.fases, NF = FASES.length, CADA = A.cajonCada || 4;

  // ---------- progreso guardado (solo el del arcade) ----------
  const GUARDA = 'deep-arcade';
  const cargar = () => { try{ return Object.assign({desbloq: {}, records: {}}, JSON.parse(localStorage.getItem(GUARDA) || '{}')); }catch(e){ return {desbloq: {}, records: {}}; } };
  const guardar = () => { try{ localStorage.setItem(GUARDA, JSON.stringify(prog)); }catch(e){} };
  let prog = cargar();

  // ---------- modos ----------
  const MODOS = {
    arcade: { nombre: 'Arcade',       texto: 'Cinco fases. Llena el cajón de cada fase para seguir bajando.', cajones: true },
    ta:     { nombre: 'Contrarreloj', texto: 'Las mismas cinco fases, sin cajones. Solo cuenta el tiempo (también en las salas).', cajones: false, bloqueo: 'Pasa la fase 1 del arcade' },
    vidas:  { nombre: 'Tres vidas',   texto: 'Como el arcade, pero al morir reapareces en la última sala segura. Tienes tres vidas.', cajones: true, bloqueo: 'Pasa la fase 1 del contrarreloj' },
    r100:   { nombre: '100 m',        texto: 'Recorrido sin salas seguras. Puntos por tiempo y por minerales.', metros: 100, bloqueo: 'Pasa la fase 2 del arcade' },
    r300:   { nombre: '300 m',        texto: 'Recorrido sin salas seguras. Puntos por tiempo y por minerales.', metros: 300, bloqueo: 'Pasa la fase 3 del arcade' },
    r500:   { nombre: '500 m',        texto: 'Recorrido sin salas seguras. Puntos por tiempo y por minerales.', metros: 500, bloqueo: 'Pasa la fase 4 del arcade' },
  };
  const ORDEN = ['arcade', 'ta', 'vidas', 'r100', 'r300', 'r500'];
  const abierto = m => m === 'arcade' || !!prog.desbloq[m];
  const hayMenu = () => ORDEN.some(m => m !== 'arcade' && prog.desbloq[m]);

  // ---------- pozos ----------
  const CONTENIDO = { cartas: false, puertas: false, llaves: false, ramales: false, salaSellada: false, barro: false, grisu: false, objetos: false, piezas: false };
  const DESDE = { carbon: 0, cobre: 0, cuarzo: 0, cuevas: 0, agua: 0, polillas: 0, gas: 99, barro: 99 };
  const tema = (f, i) => ({ nombre: FASES[f].nombre + ' · ' + (i + 1) + ' de ' + CADA, min: FASES[f].min, arena: FASES[f].arena, cuevas: FASES[f].cuevas, agua: FASES[f].agua, polillas: FASES[f].polillas });
  function pozoFases(){
    const tramos = [], temas = [];
    FASES.forEach((F, f) => { for(let i=0;i<CADA;i++){ const tm = tema(f, i); tramos.push({nombre: tm.nombre, largo: F.largo}); temas.push(tm); } });
    tramos.push({nombre: 'El fondo', largo: 4}); temas.push(Object.assign(tema(NF - 1, CADA - 1), {nombre: 'El fondo'}));
    return { nombre: 'Deep Arcade', guardado: 'deep-arcade-pozo', columnas: 15, tramos, conFondo: true, altoSala: 4, temas, temasDesde: 0,
      contenido: CONTENIDO, desdeTramo: DESDE };
  }
  function pozoRecorrido(m){
    const R = A.recorridos;
    return { nombre: m + ' m', guardado: 'deep-arcade-pozo', columnas: 15, tramos: [{nombre: 'Recorrido de ' + m + ' m', largo: 99999}], conFondo: false,
      altoSala: 4, temas: [Object.assign({nombre: 'Recorrido de ' + m + ' m'}, R.tema)], temasDesde: 0, franjas: R.franjas, aceiteFilas: R.aceiteFilas,
      contenido: CONTENIDO, desdeTramo: DESDE };
  }

  // ---------- partida ----------
  let S = null;
  const filasFase = f => CADA*(FASES[f].largo + 4);
  const refFase = f => Math.round(filasFase(f)*A.segundosPorFila);
  const mmss = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s/60) + ':' + String(s % 60).padStart(2, '0'); };
  const nombreMat = k => M[k] ? M[k].nombre : k;
  const pideTxt = p => Object.entries(p).map(([k, n]) => n + ' de ' + nombreMat(k).toLowerCase()).join(', ');
  function empezar(modo){
    const MO = MODOS[modo];
    S = {modo, puntos: 0, tiempo: 0, tFase: 0, fase: 0, combo: {n: 0, mult: 0, ultimo: null, pts: 0}, vidas: modo === 'vidas' ? (A.vidas || 3) : 1,
      fin: false, parciales: [], metros: MO.metros || 0};
    const key = 'arcade_' + modo;
    D.pozos[key] = MO.metros ? pozoRecorrido(MO.metros) : pozoFases();
    cerrarTodo();
    Mi.arcade({ pozo: key, puntales: A.puntales, escaleras: A.escaleras, cajonCada: MO.cajones ? CADA : 0,
      golpe, sala, muerte });
    if(MO.metros) Mi.avisar(MO.nombre, 'Llega a ' + MO.metros + ' m lo antes posible. Los minerales también dan puntos');
    else if(MO.cajones) Mi.avisar('Fase 1 · ' + FASES[0].nombre, 'El cajón del fondo de la fase pide ' + pideTxt(FASES[0].pide));
    else Mi.avisar('Contrarreloj', 'Cinco fases sin cajones. El reloj no para, ni en las salas');
    pintar(true);
  }
  // combo: picar mineral seguido sube el multiplicador (1 por mineral, 2 si es del mismo tipo); otra cosa lo corta
  function golpe(key, esMineral){
    if(!S || S.fin) return;
    const C = S.combo;
    if(esMineral){
      C.mult = C.n === 0 ? 1 : Math.min(A.combo.tope || 9, C.mult + (key === C.ultimo ? 2 : 1));
      C.n++; C.ultimo = key;
      const pts = (A.puntos[key] || 10)*C.mult; S.puntos += pts; C.pts += pts;
      Mi.flotar('+' + pts + (C.mult > 1 ? '  ×' + C.mult : ''), C.mult >= 5 ? '#ff7bd5' : C.mult >= 3 ? '#99e550' : '#fbf236');
      pintar(); if(C.mult > 1) pulso('arcCombo');
    } else if(C.n){
      if(C.n >= 2) Mi.flotar('Combo de ' + C.n + ': ' + C.pts, '#cbdbfc', 0.5);
      S.combo = {n: 0, mult: 0, ultimo: null, pts: 0}; pintar();
    }
  }
  function sala(i){
    if(!S || S.fin) return;
    if((i + 1) % CADA !== 0) return;
    const f = Math.floor(i / CADA), MO = MODOS[S.modo];
    if(!MO.cajones){   // contrarreloj: tiempo parcial de cada fase
      S.parciales.push(S.tFase); S.tFase = 0;
      if(S.modo === 'ta' && f === 0) desbloquear('vidas');
      if(f >= NF - 1) return victoria();
      Mi.avisar('Fase ' + (f + 2) + ' · ' + FASES[f + 1].nombre, 'Parcial: ' + mmss(S.parciales[f]));
      S.fase = f + 1; return;
    }
    const est = Mi.arcadeEstado(), bag = est ? est.bag : {}, pide = FASES[f].pide;
    const falta = Object.entries(pide).filter(([k, n]) => (bag[k] || 0) < n).map(([k, n]) => (n - (bag[k] || 0)) + ' de ' + nombreMat(k).toLowerCase());
    if(falta.length){ S.faltaba = falta; Mi.pausa(true); return finPartida('cajon'); }
    Mi.arcadeQuitar(pide);
    const sobra = Mi.arcadeEstado().bag; Mi.arcadeVaciar();
    const tf = S.tFase, ref = refFase(f), bonT = Math.max(0, Math.round((ref - tf)*A.porSegundo));
    const bonM = Object.entries(sobra).reduce((a, [k, n]) => a + n*(A.puntos[k] || 10), 0);
    const mult = f + 1, total = (bonT + bonM)*mult;
    S.puntos += total; S.tFase = 0; S.fase = f + 1; S.combo = {n: 0, mult: 0, ultimo: null, pts: 0};
    const nuevos = [];
    if(S.modo === 'arcade'){ const d = ['ta', 'r100', 'r300', 'r500'][f]; if(d && desbloquear(d)) nuevos.push(d); }
    Mi.arcadeAbrir(i); Mi.pausa(true);
    recuento({f, tf, ref, bonT, sobra, bonM, mult, total, nuevos});
  }
  function muerte(causa){
    if(!S || S.fin) return;
    S.combo = {n: 0, mult: 0, ultimo: null, pts: 0};
    if(S.modo === 'vidas' && S.vidas > 1){ S.vidas--; pintar(true);
      setTimeout(() => { if(!S || S.fin) return; Mi.arcadeReaparecer(); Mi.avisar('Te quedan ' + S.vidas + (S.vidas === 1 ? ' vida' : ' vidas'), 'Vuelves a la última sala segura'); }, 1400); return; }
    S.vidas = 0; setTimeout(() => finPartida(causa), 1500);
  }
  function desbloquear(m){ if(prog.desbloq[m]) return false; prog.desbloq[m] = true; guardar(); return true; }

  // ---------- reloj y marcador ----------
  let tUlt = performance.now();
  function bucle(now){
    const dt = Math.min(0.1, (now - tUlt)/1000); tUlt = now;
    if(S && !S.fin){
      const est = Mi.arcadeEstado();
      if(est && est.started && !est.dead && !est.superficie){
        if(S.modo === 'ta' || S.metros || !est.inRoom){ S.tiempo += dt; S.tFase += dt; }
        if(S.metros && est.profundidad >= S.metros) finRecorrido();
      }
      pintar();
    }
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);
  const ult = {};
  function pintar(forzar){
    if(!S) return;
    const est = Mi.arcadeEstado() || {bag: {}};
    const parado = !S.metros && S.modo !== 'ta' && est.inRoom;
    set('arcPuntos', S.puntos.toLocaleString('es-ES'), forzar);
    set('arcTiempo', (parado ? '⏸ ' : '') + mmss(S.modo === 'ta' || S.metros ? S.tiempo : S.tFase), forzar);
    $('arcTiempo').classList.toggle('parado', parado);
    set('arcCombo', S.combo.mult > 1 ? '×' + S.combo.mult : '', forzar); $('arcCombo').hidden = S.combo.mult <= 1;
    let obj = '';
    if(S.metros) obj = '🎯 ' + Math.min(est.profundidad || 0, S.metros) + ' / ' + S.metros + ' m';
    else if(MODOS[S.modo].cajones && S.fase < NF) obj = 'Cajón ' + (S.fase + 1) + ': ' + Object.entries(FASES[S.fase].pide).map(([k, n]) =>
      `<span class="${(est.bag[k] || 0) >= n ? 'ok' : ''}"><i style="background:${M[k].color}"></i>${nombreMat(k)} <b>${Math.min(est.bag[k] || 0, n)}/${n}</b></span>`).join('');
    else if(S.fase < NF) obj = 'Fase ' + (S.fase + 1) + ' · ' + FASES[S.fase].nombre;
    if(S.modo === 'vidas') obj += ` <span class="vidas">${'❤️'.repeat(Math.max(0, S.vidas))}</span>`;
    set('arcObjetivo', obj, forzar, true);
  }
  function set(id, v, forzar, html){ if(!forzar && ult[id] === v) return; ult[id] = v; if(html) $(id).innerHTML = v; else $(id).textContent = v; }
  function pulso(id){ const e = $(id); e.classList.remove('pulso'); void e.offsetWidth; e.classList.add('pulso'); }

  // ---------- pantallas ----------
  function cerrarTodo(){ ['arcRecuento', 'arcFin', 'arcMenu'].forEach(id => $(id).hidden = true); }
  function chipsSobra(o){ const ks = Object.keys(o).filter(k => o[k] > 0); return ks.length ? ks.map(k => `<span class="chip"><i style="background:${M[k].color}"></i>${nombreMat(k)} <b>${o[k]}</b></span>`).join('') : '<span class="chip muted">Nada</span>'; }
  function recuento(r){
    const F = FASES[r.f], ultima = r.f >= NF - 1;
    $('rcEyebrow').textContent = 'Fase ' + (r.f + 1) + ' superada';
    $('rcTitulo').textContent = F.nombre;
    $('rcFilas').innerHTML = `
      <div class="rc"><span>Tiempo ${mmss(r.tf)} <small>(referencia ${mmss(r.ref)})</small></span><b>+${r.bonT}</b></div>
      <div class="rc"><span>Te sobra<div class="list">${chipsSobra(r.sobra)}</div></span><b>+${r.bonM}</b></div>
      <div class="rc mult"><span>Fase ${r.f + 1}</span><b>×${r.mult}</b></div>
      <div class="rc total"><span>Esta fase</span><b>+${r.total.toLocaleString('es-ES')}</b></div>
      <div class="rc"><span>Puntos</span><b>${S.puntos.toLocaleString('es-ES')}</b></div>`;
    $('rcNuevo').innerHTML = r.nuevos.map(m => `🔓 ¡Nuevo modo: <b>${MODOS[m].nombre}</b>!`).join('<br>');
    $('rcNuevo').hidden = !r.nuevos.length;
    $('rcSig').textContent = ultima ? 'Pide el ascensor' : 'Fase ' + (r.f + 2) + ': ' + FASES[r.f + 1].nombre + '. El cajón pide ' + pideTxt(FASES[r.f + 1].pide) + '.';
    $('rcBtn').textContent = ultima ? 'Subir' : 'Seguir bajando';
    $('rcBtn').onclick = () => { $('arcRecuento').hidden = true; if(ultima) return victoria(); Mi.pausa(false);
      Mi.avisar('Fase ' + (r.f + 2) + ' · ' + FASES[r.f + 1].nombre, 'El cajón pide ' + pideTxt(FASES[r.f + 1].pide)); };
    $('arcRecuento').hidden = false; Mi.sonar('cofre');
  }
  function finRecorrido(){
    const est = Mi.arcadeEstado(), ref = Math.round(S.metros*A.segundosPorFila*0.8);
    const bonT = Math.max(0, Math.round((ref - S.tiempo)*A.porSegundo)), bonM = Object.entries(est.bag).reduce((a, [k, n]) => a + n*(A.puntos[k] || 10), 0);
    S.puntos += bonT + bonM; S.recorrido = {ref, bonT, bonM, bag: est.bag};
    Mi.pausa(true); finPartida('meta');
  }
  function victoria(){ Mi.pausa(true); finPartida('fondo'); }
  function finPartida(causa){
    if(!S || S.fin) return;
    S.fin = true; pintar(true);
    const modo = S.modo, MO = MODOS[modo], gana = causa === 'fondo' || causa === 'meta';
    // récords: puntos (arcade, tres vidas, recorridos) o tiempo (contrarreloj, solo si llegas)
    let rec = false;
    if(modo === 'ta'){ if(gana && (!prog.records.ta || S.tiempo < prog.records.ta)){ prog.records.ta = S.tiempo; rec = true; } }
    else if(!prog.records[modo] || S.puntos > prog.records[modo]){ if(S.puntos > 0){ prog.records[modo] = S.puntos; rec = true; } }
    guardar();
    const TXT = {
      fondo: ['¡Has llegado al fondo!', 'El ascensor viejo te sube a la superficie.'],
      meta: ['¡Recorrido completado!', 'Has llegado a los ' + S.metros + ' m.'],
      cajon: ['El cajón no se abre', 'Te faltaba: ' + (S.faltaba || []).join(', ') + '.'],
      crush: ['Te aplastó un derrumbe', 'El techo sin apoyo crujió y se vino abajo.'],
      drown: ['Te quedaste sin aire', 'Estuviste demasiado tiempo bajo el agua.'],
      buried: ['Sepultado por la arena', 'La arena te cubrió la cabeza.'],
      lamp: ['La lámpara se apagó', 'A oscuras no hay forma de seguir.'],
    }[causa] || ['Fin de la partida', ''];
    $('fnEyebrow').textContent = MO.nombre + (gana ? '' : ' · fin de la partida');
    $('fnTitulo').textContent = TXT[0]; $('fnTexto').textContent = TXT[1];
    let h = '';
    if(modo === 'ta'){ h += `<div class="rc total"><span>Tiempo</span><b>${gana ? mmss(S.tiempo) : '—'}</b></div>`;
      S.parciales.forEach((p, i) => h += `<div class="rc"><span>Fase ${i + 1} · ${FASES[i].nombre}</span><b>${mmss(p)}</b></div>`);
      h += `<div class="rc"><span>Mejor tiempo</span><b>${prog.records.ta ? mmss(prog.records.ta) : '—'}</b></div>`; }
    else {
      if(S.recorrido) h += `<div class="rc"><span>Tiempo ${mmss(S.tiempo)} <small>(referencia ${mmss(S.recorrido.ref)})</small></span><b>+${S.recorrido.bonT}</b></div>
        <div class="rc"><span>Minerales<div class="list">${chipsSobra(S.recorrido.bag)}</div></span><b>+${S.recorrido.bonM}</b></div>`;
      else h += `<div class="rc"><span>Fases superadas</span><b>${S.fase} de ${NF}</b></div>`;
      h += `<div class="rc total"><span>Puntos</span><b>${S.puntos.toLocaleString('es-ES')}</b></div>
        <div class="rc"><span>Récord</span><b>${(prog.records[modo] || 0).toLocaleString('es-ES')}</b></div>`;
    }
    $('fnFilas').innerHTML = h;
    $('fnRecord').hidden = !rec;
    $('fnMenu').hidden = !hayMenu(); $('arcMenuBtn').hidden = !hayMenu();
    $('fnNuevo').hidden = !hayMenu() || !!prog.vistoMenu;
    $('arcFin').hidden = false;
    Mi.sonar(gana ? 'abrir' : 'muerte');
  }
  function menu(){
    cerrarTodo(); prog.vistoMenu = true; guardar(); Mi.pausa(true);
    $('mnLista').innerHTML = ORDEN.map(m => { const MO = MODOS[m], ok = abierto(m), r = prog.records[m];
      const rt = r ? (m === 'ta' ? 'Récord ' + mmss(r) : 'Récord ' + r.toLocaleString('es-ES')) : '';
      return `<button class="modo${ok ? '' : ' cerrado'}" data-m="${m}" ${ok ? '' : 'disabled'}><b>${ok ? '' : '🔒 '}${MO.nombre}</b><span>${ok ? MO.texto : MO.bloqueo}</span>${rt ? `<i>${rt}</i>` : ''}</button>`; }).join('');
    $('mnLista').querySelectorAll('button[data-m]').forEach(b => b.onclick = () => empezar(b.dataset.m));
    $('arcMenu').hidden = false;
  }
  $('fnOtra').onclick = () => empezar(S ? S.modo : 'arcade');
  $('fnMenu').onclick = menu;
  $('arcMenuBtn').onclick = () => { if(hayMenu()) menu(); };

  // al abrir la página: sin menú hasta que haya algo desbloqueado
  $('arcMenuBtn').hidden = !hayMenu();
  if(hayMenu()) setTimeout(menu, 0); else setTimeout(() => empezar('arcade'), 0);
  return { empezar, menu, get estado(){ return S; }, get progreso(){ return prog; },
    _desbloquearTodo(){ ORDEN.forEach(m => prog.desbloq[m] = true); guardar(); } };
})();
