// =====================================================================
//  MINA: la excavación. Sirve para todos los pozos (DATOS.pozos): el Pozo viejo y el pozo de pruebas
// =====================================================================
window.Mina = (()=>{
const DATA = window.SPRITES, D = window.DATOS, POZOS = D.pozos;
// pozo actual: su configuración (P1) y qué contenido tiene
let PK = 'viejo', P1 = POZOS.viejo;
const ON = k => !P1.contenido || P1.contenido[k] !== false;
const T = 24, COLS = 15, SURF = 3, ROOM_H = 4;
// ---------- tipos ----------
// BEDROCK = roca madre (límite del mundo: no la rompe nada) · PLANK = tablón (puntal puesto como puente) · CSAND = arena arcillosa (con agua, barro)
const AIR=0, DIRT=1, STONE=2, HARD=3, CLAY=4, COAL=5, COPPER=6, QUARTZ=7, SAND=8, WATER=9, GAS=10, ROCK=11, BEAM=12, PROP=13, LADDER=14, RUBBLE=15, DOOR=16, MUD=17, PASS=18, BEDROCK=19, PLANK=20, CSAND=21, IRON=22, TIN=23, ICE=24;
const M = D.materiales;
const mat = (key, extra) => Object.assign({hp:M[key].golpes, val:M[key].valor, n:M[key].nombre, dot:M[key].color, key}, extra);
const INFO = {
  [AIR]:{}, [DIRT]:mat('tierra', {tile:'tierra'}), [STONE]:mat('piedra', {tile:'piedra'}), [HARD]:mat('rocaDura', {tile:'roca_dura'}), [CLAY]:mat('arcilla', {tile:'arcilla'}),
  [COAL]:mat('carbon', {tile:'piedra', veta:'carbon'}), [COPPER]:mat('cobre', {tile:'piedra', veta:'cobre'}),
  [QUARTZ]:mat('cuarzo', {tile:'piedra', veta:'cuarzo'}), [SAND]:mat('arena', {tile:'arena'}), [WATER]:{}, [GAS]:{}, [ROCK]:{hp:999, tile:'maciza'},
  [BEAM]:{hp:1}, [PROP]:{}, [LADDER]:{}, [RUBBLE]:mat('escombro', {tile:'escombro'}), [DOOR]:{hp:999, tile:'maciza'}, [MUD]:{}, [PASS]:{hp:999, tile:'maciza'},
  [BEDROCK]:{hp:9999, tile:'maciza', madre:true}, [PLANK]:{}, [CSAND]:mat('arenaArcillosa', {tile:'arena'}),
  [IRON]:mat('hierro', {tile:'piedra', veta:'hierro'}), [TIN]:mat('estano', {tile:'piedra', veta:'estano'}),
  [ICE]:{hp:2, n:'Hielo', tile:'piedra', hielo:true},
};
const KEY2T = {}; for(const [tt, I] of Object.entries(INFO)) if(I.val) KEY2T[I.key] = +tt;
const isSolid = t => !(t===AIR || t===WATER || t===GAS || t===PROP || t===LADDER || t===MUD || t===PLANK);
const isStruct = t => t===DIRT||t===STONE||t===HARD||t===CLAY||t===COAL||t===COPPER||t===QUARTZ||t===IRON||t===TIN||t===ICE||t===BEAM||t===ROCK||t===DOOR||t===PASS||t===BEDROCK;
const isAnchor = t => t===HARD||t===BEAM||t===ROCK||t===DOOR||t===PASS||t===BEDROCK;
const isLoose = t => t===SAND||t===RUBBLE||t===CSAND;
const isSand = t => t===SAND||t===CSAND;
// casillas que pueden tener agua además de lo que son (la escalera, el puntal o el tablón siguen ahí y el agua pasa)
const holdsW = t => t===LADDER||t===PROP||t===PLANK;
const isOpen = t => t===AIR || t===GAS;
// ---------- tiros ----------
// El pozo está hecho de tiros: el principal (con salas seguras, llega al fondo) y ramales (callejones con premio).
// Solo existe uno a la vez; se pasa de uno a otro por un pasadizo con fundido a negro.
let RAMALES = [];
let TRAMOS = [], ROOM_ROW = [], TC = null, PLACED = [];
function tiroCfg(id){
  if(id === 'principal'){
    let tr;
    if(P1.salasCada){   // pozo sin fondo: tras los tramos fijos, tramos iguales sin fin (cada uno acaba en una sala segura)
      tr = P1.tramos.map(s => ({n:s.nombre, len:s.largo}));
      const N = P1.nombresTramos || ['Galería'];
      for(let i=0;i<400;i++){ const k = tr.length, tm = temaDe(k);
        tr.push({n: tm ? tm.nombre : N[Math.min(i, N.length-1)], len: Math.min(P1.salasMax || 999, P1.salasCada + i*(P1.salasCrece || 0))}); }
      tr.push({n: N[N.length-1], len: Infinity});
    } else tr = P1.tramos.map((s, i, a) => ({n:s.nombre, len: i === a.length-1 && !P1.conFondo ? Infinity : s.largo}));
    const rr = []; let r = SURF; for(let i=0;i<tr.length-1;i++){ r += tr[i].len; rr.push(r); r += ROOM_H; }
    // con fondo: el último tramo acaba en roca madre
    const fondo = P1.conFondo ? r + tr[tr.length-1].len : Infinity;
    return {id, principal:true, nombre:P1.nombre, tramos:tr, rooms:rr, base:0, fondo};
  }
  const ra = RAMALES.find(x => x.id === id) || RAMALES[0];
  return {id, principal:false, nombre:ra.nombre, ramal:ra, tramos:[{n:ra.nombre, len:Infinity}], rooms:[], base:ra.fila,
          fondo: SURF + ra.largo, salida: ra.lado === 'izquierda' ? COLS-1 : 0};
}
// tramos temáticos (pozo de pruebas): desde «temasDesde» se van turnando los temas
function temaDe(seg){ if(!P1.temas || seg < (P1.temasDesde ?? 3)) return null; return P1.temas[(seg - (P1.temasDesde ?? 3)) % P1.temas.length]; }
function setTiro(id){ TC = tiroCfg(id); TRAMOS = TC.tramos; ROOM_ROW = TC.rooms; PLACED = placePieces(); deshielo.clear(); }
const hashStr = s => { let h = 7; for(const ch of String(s)) h = (h*31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
function layout(r){
  if(r < SURF) return TC.principal ? {surface:true} : {seg:0, d:0, techo:true};
  let d = r - SURF;
  for(let i=0;i<TRAMOS.length;i++){
    if(d < TRAMOS[i].len) return {seg:i, d};
    d -= TRAMOS[i].len;
    if(i < TRAMOS.length-1){ if(d < ROOM_H) return {seg:i, room:i, part:d}; d -= ROOM_H; }
  }
  return {seg:TRAMOS.length-1, d:999, bajoFondo:true};   // por debajo del fondo (roca madre)
}
let SECRET = null, DT = {};
function setPozo(key){
  PK = POZOS[key] ? key : 'viejo'; P1 = POZOS[PK];
  RAMALES = ON('ramales') ? (P1.ramales || []) : [];
  DT = P1.desdeTramo || {};
  WV = P1.version ? WORLD_VER + '.' + P1.version : WORLD_VER;
  const S = P1.salaSellada; SECRET = ON('salaSellada') && S ? {r: SURF + S.fila, c0: S.columna, w: S.ancho, h: S.alto} : null;
}
const LA = D.lampara, JU = D.jugador, ES = D.estructura, PE = D.peligros, CA = D.camara, TB = D.temblor, VU = D.vuelta;
const AG = D.agua || {nivelMinimo:0.25, diferenciaMinima:0.02};
const SA = D.salas, AI = D.aire || {segundos:10, conPulmones:20, recupera:4}, BA = D.barro;
const CARD = Object.fromEntries((D.cartas||[]).map(k => [k.id, k]));
const SND = (n, v) => window.Sonido && window.Sonido.tocar(n, v);
// volumen según la distancia al topo (en casillas)
const near = (r, c) => p ? Math.max(0, 1 - Math.hypot(r - p.r, (c - p.c)*0.6)/14) : 0;

// ---------- ajustes ----------
// Ajustes de prueba: parten de datos.js y se pueden tocar desde el menú de ajustes (se guardan en el navegador)
const HM = D.herramientas.minimoPorBajada || {puntales:0, escaleras:0};
const BASE = {drain:LA.consumo, corn:ES.cornisa ?? 2, crack:ES.tiempoCrujido, thrH:ES.escombroSiCaeDesde, thrS:ES.escombroSiCaenJuntos,
  frag:'1', anim:'todo', cap: (D.mochila && D.mochila.capacidad) || 20, escala:'1', resp:1, respP:90, rubMax:ES.maxEscombroPorGolpe, caida: (D.caida && D.caida.activado === false) ? '0' : '1', caidaDesde:(D.caida && D.caida.desde) ?? 4, caidaDanio:(D.caida && D.caida.lampara) ?? 20, caidaModo:(D.caida && D.caida.modo) || 'crece', caidaCrece:(D.caida && D.caida.crece) ?? 5, minP:HM.puntales, minL:HM.escaleras, llevP:(D.herramientas.llevarPorBajada||{}).puntales ?? 12, llevL:(D.herramientas.llevarPorBajada||{}).escaleras ?? 8, recoger: D.herramientas.recogerPuntales ? '1' : '0', oilEvery:9, oilMin:(D.aceite && D.aceite.desdeLargo) || 20, oilGain:LA.aceite,
  dark:'1', zoom: CA.zoomExplorar >= 2 ? 'siempre' : 'salas'};
let cfg = {...BASE};
const CFG_VER = 2;   // sube cuando cambian valores por defecto importantes: los ajustes guardados de antes se olvidan de esos valores
try{ const s = JSON.parse(localStorage.getItem('deep-cfg')||'null'); if(s){ if(s._v !== CFG_VER){ delete s.minP; delete s.minL; delete s.cap; s._v = CFG_VER; } cfg = {...BASE, ...s}; } }catch(e){}
cfg._v = CFG_VER;
const spanReach = () => cfg.corn;  // cornisa: casillas a cada lado que un apoyo sostiene (en puente, el doble)

// ---------- ruido ----------
function h2(x,y,s){ let n = Math.imul(x,374761393) + Math.imul(y,668265263) + Math.imul(s,982451653); n = Math.imul(n^(n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967295; }
function vn(x,y,s){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=h2(xi,yi,s), b=h2(xi+1,yi,s), c=h2(xi,yi+1,s), d=h2(xi+1,yi+1,s); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }

// ---------- almacenamiento ----------
function load(k, d){ try{ const v = JSON.parse(localStorage.getItem(k)||'null'); return v ?? d; }catch(e){ return d; } }
function save(k, v){ try{ if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
const Pa = window.Partida;

// ---------- mundo ----------
let W = null;   // el tiro actual: {id, seed, rows, items, bag, ...}
let MINA = null;   // la mina entera: {ver, seed, actual, tiros:{id: W}}
const WORLD_VER = 11;   // sube cuando cambia cómo se genera el pozo (fuerza una mina nueva en todos)
let WV = WORLD_VER;     // la de este pozo: con «version» en sus datos, solo se empieza de nuevo ese pozo
function newTiroWorld(id, seed){ return {id, ver:WV, seed, rows:[], items:[], bag:null, chestOpen:false, rewarded:[], runs:0, record:0, doors:[], lastRun:0, cargaOk:[], ascUsado:false, escalas:[]}; }
function newMine(){ const seed = (Math.random()*1e9)|0; return {ver:WV, seed, actual:'principal', tiros:{principal: newTiroWorld('principal', seed)}, stats:{ext:{}, per:{}}}; }
// contador de materiales del pozo: extraído (llegó al almacén) y perdido (escombro, mochila llena, soltado, explosiones, derrumbes)
function stat(kind, key, n){ if(!MINA || !key || !n) return; const S = MINA.stats || (MINA.stats = {ext:{}, per:{}}); S[kind][key] = (S[kind][key]||0) + n; }
function statsText(){
  if(!MINA) return '';
  const disp = {};
  for(const id in MINA.tiros) for(const R of MINA.tiros[id].rows) for(let c=0;c<COLS;c++){ const I = INFO[R.t[c]]; if(I && I.val) disp[I.key] = (disp[I.key]||0) + 1; }
  const S = MINA.stats || {ext:{}, per:{}}, keys = ['arcilla','carbon','cobre','cuarzo','hierro','estano'].filter(k => k !== 'hierro' && k !== 'estano' || (P1.vetas && P1.vetas[k]));
  return P1.nombre + ' (lo generado hasta ahora):\n' + keys.map(k => M[k].nombre + ': ' + (disp[k]||0) + ' en el pozo · ' + (S.ext[k]||0) + ' extraído · ' + (S.per[k]||0) + ' perdido').join('\n');
}
function newWorld(){ return newTiroWorld('principal', (Math.random()*1e9)|0); }
function packWorld(W){
  return {id:W.id, lastRun:W.lastRun, seed:W.seed, rows:W.rows.map(R => String.fromCharCode(...Array.from(R.t, v => 65+v))), nat:W.rows.map(R => String.fromCharCode(...Array.from(R.nat, v => 48+v))), lvx:W.rows.reduce((o, R, i) => { if(R.lv.some(v => v > 0)) o[i] = Array.from(R.lv, v => +v.toFixed(4)); return o; }, {}),
    items:W.items.filter(i=>i.alive || i.k === 'herr'), bag:W.bag, rewarded:W.rewarded, runs:W.runs, herr:true, ver:W.ver, record:W.record, doors:W.doors, cargaOk:W.cargaOk||[], ascUsado:!!W.ascUsado, escalas:W.escalas||[], fijos:W.fijos||[], compuertas:W.compuertas||[]};
}
function unpackWorld(o){
  if(o.ver !== WV) return null;   // pozo de una versión anterior: se empieza uno nuevo
  const w = {id:o.id||'principal', lastRun:o.lastRun||0, ver:WV, seed:o.seed, rows:[], items:o.items||[], bag:o.bag||null, rewarded:o.rewarded||[], runs:o.runs||0, record:o.record||0, doors:o.doors||[], cargaOk:o.cargaOk||[], ascUsado:!!o.ascUsado, escalas:o.escalas||[], fijos:o.fijos||[], compuertas:o.compuertas||[]};
  o.rows.forEach((s, i) => { const R = newRow(), n = o.nat && o.nat[i];
    const lvS = o.lv && o.lv[i], lvX = o.lvx && o.lvx[i];
    for(let c=0;c<COLS;c++){ R.t[c] = s.charCodeAt(c)-65; R.hp[c] = INFO[R.t[c]].hp||0; R.nat[c] = n ? n.charCodeAt(c)-48 : (isSolid(R.t[c]) ? 0 : 1);
      // nivel del agua exacto (sin redondeos: el agua no crece al guardar y cargar)
      if(lvX){ if(R.t[c] === WATER || holdsW(R.t[c])) R.lv[c] = lvX[c] || 0; if(R.t[c] === WATER && !R.lv[c]) R.t[c] = AIR; }
      else if(R.t[c] === WATER) R.lv[c] = lvS ? Math.max(0.05, (lvS.charCodeAt(c)-48)/40) : 1;
      else if(holdsW(R.t[c]) && lvS) R.lv[c] = (lvS.charCodeAt(c)-48)/40; }
    w.rows.push(R); });
  if(!o.nat) natFromSeed(w);
  if(!o.herr){ const keep = W; W = w; for(let r=0;r<w.rows.length;r++) addKit(r, false); W = keep; }
  return w;
}
// partidas guardadas antes de existir «nat»: se regenera el pozo original con la misma semilla para saber qué huecos eran naturales
function natFromSeed(w){
  const keep = W, keepOil = lastOil;
  W = {seed:w.seed, rows:[], items:[], bag:null}; lastOil = SURF;
  try{ ensure(w.rows.length); w.rows.forEach((R, i) => { for(let c=0;c<COLS;c++) R.nat[c] = W.rows[i].nat[c]; }); }
  finally{ W = keep; lastOil = keepOil; }
}
// ---------- piezas hechas a mano (js/piezas.js) ----------
const PZ_TILE = {'_':AIR, t:DIRT, p:STONE, d:HARD, m:ROCK, x:BEDROCK, g:CSAND, a:SAND, '~':WATER, e:RUBBLE, r:CLAY, c:COAL, u:COPPER, q:QUARTZ, i:IRON, s:TIN, z:ICE, P:DOOR, '*':GAS, '&':MUD};
function tramoRows(i){ let r = SURF; for(let k=0;k<i;k++){ r += TRAMOS[k].len + (k < ROOM_ROW.length ? ROOM_H : 0); } return [r, r + (TRAMOS[i] ? Math.min(TRAMOS[i].len, 60) : 0)]; }
function placePieces(){
  const out = [], seed = W ? W.seed : 0;
  if(!ON('piezas')) return out;
  let lista = window.piezasActivas ? window.piezasActivas() : (window.PIEZAS || []);
  if(prueba) lista = lista.filter(pz => pz.id !== prueba.pieza.id).concat([Object.assign({}, prueba.pieza, {pozo: PK})]);
  for(const pz of lista){
    { const pp = pz.pozo || 'pruebas'; if(Array.isArray(pp) ? !pp.includes(PK) : pp !== PK) continue; }
    const tiro = pz.tiro || 'principal';
    if(!(tiro === TC.id || (tiro === 'ramales' && !TC.principal))) continue;
    const h = pz.filas.length, C = pz.colocar || {}, hid = hashStr(pz.id);
    let r0 = null;
    if(C.fila !== undefined) r0 = SURF + C.fila;
    else if(C.sala !== undefined && ROOM_ROW[C.sala] !== undefined) r0 = C.donde === 'encima' ? ROOM_ROW[C.sala] - h : ROOM_ROW[C.sala] + ROOM_H;
    else if(C.fondo && isFinite(TC.fondo)) r0 = TC.fondo - h;
    else if(C.tramo !== undefined && h2(hid, 1, seed + 81) < (C.prob ?? 1)){ const [a, b] = tramoRows(C.tramo); if(b - a > h) r0 = a + Math.floor(h2(hid, 2, seed + 82)*(b - a - h)); }
    if(r0 === null) continue;
    const mir = pz.reflejar && h2(hid, 3, seed + 83) < 0.5;
    const rows = pz.filas.map(l => { l = (l + '.'.repeat(COLS)).slice(0, COLS); return mir ? [...l].reverse().join('') : l; });
    // textos de carteles y frases de Deep: clave «fila,columna» de la pieza (dada la vuelta si se refleja)
    const textos = {}; for(const [k, v] of Object.entries(pz.textos || {})){ const [f, c] = k.split(',').map(Number); textos[f + ',' + (mir ? COLS-1-c : c)] = v; }
    out.push({id:pz.id, r0, rows, textos, nota: pz.nota});
  }
  return out;
}
function pieceAt(r, c){ for(const P of PLACED){ const k = r - P.r0; if(k >= 0 && k < P.rows.length && P.rows[k][c] !== '.') return P.rows[k][c]; } return null; }
const pieceRow = r => PLACED.some(P => r >= P.r0 - 1 && r < P.r0 + P.rows.length + 1);
// notas de la cuadrilla: la siguiente que aún no tengas (ni en la colección, ni en la mochila, ni puesta en algún pozo)
// coleccionables únicos (de la cuadrilla): solo salen si no los tienes ya ni están puestos en otro sitio del pozo
function unicoLibre(id){
  if(Pa.coleccion[id] || (bag && bag['o:' + id])) return false;
  if(MINA && Object.values(MINA.tiros).some(w => (w.bag && w.bag.items && w.bag.items['o:' + id]) || w.items.some(i => i.k === 'obj' && i.id === id && i.alive))) return false;
  return !(W && W.items.some(i => i.k === 'obj' && i.id === id && i.alive));
}
function notaSiguiente(){
  for(const id of ['nota_1', 'nota_2', 'nota_3']){
    if(Pa.coleccion[id] || (bag && bag['o:' + id])) continue;
    if(MINA && Object.values(MINA.tiros).some(w => w.items.some(i => i.k === 'obj' && i.id === id && i.alive))) continue;
    if(W && W.items.some(i => i.k === 'obj' && i.id === id && i.alive)) continue;
    return id;
  }
  return null;
}
function applyPieces(r, Tt){
  for(const P of PLACED){
    const k = r - P.r0; if(k < 0 || k >= P.rows.length) continue;
    const line = P.rows[k];
    for(let c=0;c<COLS;c++){
      const ch = line[c]; if(ch === '.') continue;
      W.items = W.items.filter(it => !(it.r === r && it.c === c && it.k !== 'moth'));
      if(PZ_TILE[ch] !== undefined){ Tt[c] = PZ_TILE[ch]; continue; }
      // herramientas de la cuadrilla: escaleras, puntales y tablones bien clavados (no se pueden recoger)
      if(ch === 'L' || ch === 'I' || ch === '='){ Tt[c] = ch === 'L' ? LADDER : ch === 'I' ? PROP : PLANK; marcarFijo(r, c); continue; }
      // compuerta: roca maciza que se abre cuando gira la noria
      if(ch === 'G'){ Tt[c] = ROCK; if(!W.compuertas) W.compuertas = []; if(!W.compuertas.includes(r*16 + c)) W.compuertas.push(r*16 + c); continue; }
      Tt[c] = AIR;
      if(ch === 'o') W.items.push({k:'oil', r, c, alive:true});
      else if(ch === 'k') W.items.push({k:'llave', r, c, alive:true});
      else if(ch === 'h' || ch === 'H') W.items.push({k:'herr', tipo: ch === 'H' ? 'puntal' : 'escalera', r, c, alive:true});
      else if(ch === 'B') W.items.push({k:'cofrePieza', r, c, alive:true, abierto:false});
      else if(ch === 'f') W.items.push({k:'obj', id:florDe(r, c), r, c, alive:true});
      else if(ch === 'M') W.items.push({k:'lift', r, c, alive:true});
      else if(ch === 'A') W.items.push({k:'ascensor', r, c, alive:true});
      else if(ch === 'Z'){ if(!Pa.bandera('ascensor_pozo1_roto')) W.items.push({k:'obj', id:'pieza_ascensor', r, c, alive:true}); }   // la pieza y el pico salen una sola vez
      else if(ch === 'K'){ if(!Pa.bandera('pico_encontrado') && !Pa.coleccion.pico_padre && !(bag && bag['o:pico_padre'])) W.items.push({k:'obj', id:'pico_padre', r, c, alive:true}); }
      else if(ch === 'V') W.items.push({k:'vent', r, c, alive:true});
      else if(ch === 'N'){ const id = P.nota ? (unicoLibre(P.nota) ? P.nota : null) : notaSiguiente(); if(id) W.items.push({k:'obj', id, r, c, alive:true}); }
      else if(ch === 'Q'){ if(unicoLibre('casco_cuadrilla')) W.items.push({k:'obj', id:'casco_cuadrilla', r, c, alive:true}); }
      else if(ch === 'W') W.items.push({k:'noria', r, c, alive:true, activa:false});
      else if(ch === 'b') W.items.push({k:'brasa', r, c, alive:true, apagada:false});
      else if(ch === 'X') W.items.push({k:'portal', r, c, alive:true});
      else if(ch === 'j') W.items.push({k:'obj', id:'hongo_azul', r, c, alive:true});
      else if(ch === 'R'){ if(unicoLibre('lampara_vieja')) W.items.push({k:'obj', id:'lampara_vieja', r, c, alive:true}); }   // sitio fijo y una sola vez
      else if(ch === 'F'){ if(unicoLibre('foto_cuadrilla')) W.items.push({k:'obj', id:'foto_cuadrilla', r, c, alive:true}); }
      else if(ch === 'y'){ Tt[c] = WATER; W.items.push({k:'obj', id:'nenufar', r, c, alive:true, agua:true}); }   // nenúfar flotando en el agua
      else if(ch === 'w') W.items.push({k:'moth', x:c+0.5, y:r+0.5, alive:true});
      // cartel (banner con texto y, si quieres, un gif) o frase de Deep: salen al pasar por esa casilla
      else if(ch === 'T' || ch === 'D'){ const tx = P.textos && P.textos[k + ',' + c] || {}; W.items.push(Object.assign({k:'texto', tipo: ch === 'T' ? 'cartel' : 'deep', r, c, alive:true}, tx)); }
    }
  }
}
// casillas fijas (herramientas de la cuadrilla): no se recogen
function marcarFijo(r, c){ if(!W.fijos) W.fijos = []; const k = r*16 + c; if(!W.fijos.includes(k)) W.fijos.push(k); }
const esFijo = (r, c) => !!(W.fijos && W.fijos.includes(r*16 + c));
function newRow(){ return {t:new Uint8Array(COLS), hp:new Uint16Array(COLS), sh:new Float32Array(COLS), mv:new Uint32Array(COLS), seen:new Uint8Array(COLS), nat:new Uint8Array(COLS), lv:new Float32Array(COLS), ox:new Float32Array(COLS), oy:new Float32Array(COLS)}; }
let lastOil = SURF;
function oilRowsOf(sg, len){
  const AC = D.aceite || {desdeLargo:20, minimo:1, maximo:2};
  if(len < cfg.oilMin) return [];
  const S = W.seed, n = AC.minimo + Math.floor(h2(sg, 41, S+17)*(AC.maximo - AC.minimo + 1)), out = [];
  for(let i=0;i<n;i++) out.push(2 + Math.floor(h2(sg, 43+i, S+18)*Math.max(1, len - 3)));
  return out;
}
function genRow(r){
  const R = newRow(), Tt = R.t, S = W.seed;
  const L = layout(r);
  if(L.surface){ R.nat.fill(1); return R; }
  // ramal: techo y fondo de roca maciza
  if((!TC.principal && r < SURF) || r >= TC.fondo){ Tt.fill(BEDROCK); for(let c=0;c<COLS;c++) R.hp[c] = INFO[BEDROCK].hp; return R; }
  if(L.part !== undefined){
    R.nat.fill(1);
    if(L.part === ROOM_H-2){ W.items.push({k:'cofreSala', room:L.room, r, c:SA.columnaCofre, alive:true}); if(hasLift(L.room)) W.items.push({k:'carga', room:L.room, r, c:COL_CARGA, alive:true});
      if(esCajon(L.room)) W.items.push({k:'cajon', room:L.room, r, c:SA.columnaRuleta, alive:true, final: !!(ARC && ARC.finalEn === L.room)}); }
    if(L.part === 0 || L.part === ROOM_H-1) Tt.fill(BEAM);
    if(L.part === ROOM_H-1 && esCajon(L.room)) Tt.fill(ROCK);   // arcade: el suelo de la sala del cajón no se abre hasta pagarlo
    for(let c=0;c<COLS;c++) R.hp[c] = INFO[Tt[c]].hp||0;
    return R;
  }
  const d = r - SURF, sg = L.seg, TM = (TC.principal && temaDe(sg)) || {};
  for(let c=0;c<COLS;c++){
    let v = DIRT;
    if(vn(c/5, r/5, S+1) < 0.15 + Math.min(0.55, d*0.008)) v = STONE;
    const esc = P1.escasez || 0;
    if(d > 3 && vn(c/5, r/2.2, S+2) > (TM.arena ?? P1.arenaUmbral ?? 0.78)) v = ON('barro') && sg >= (DT.barro ?? 0) && vn(c/6, r/6, S+15) < (TM.arcillosa ?? P1.arenaArcillosa ?? 0) ? CSAND : SAND;
    const MN = TM.min;   // arcade: cada fase dice qué minerales salen y cuántos (umbral: más bajo = más)
    if(MN){
      if(MN.arcilla !== undefined && vn(c/2.6, r/2.6, S+3) > MN.arcilla) v = CLAY;
      if(MN.carbon !== undefined && !isSand(v) && vn(c/2.2, r/2.2, S+4) > MN.carbon) v = COAL;
      if(MN.cobre !== undefined && !isSand(v) && vn(c/2, r/2, S+5) > MN.cobre) v = COPPER;
      if(MN.cuarzo !== undefined && v === STONE && h2(c, r, S+12) < MN.cuarzo) v = QUARTZ;
    } else {
    if(vn(c/2.6, r/2.6, S+3) > 0.73 + esc + Math.min(sg, 6)*0.03) v = CLAY;
    const vieja = P1.escasezVieja || 0;   // en las minas nuevas, los minerales antiguos salen menos
    if(sg >= DT.carbon && !isSand(v) && vn(c/2.2, r/2.2, S+4) > 0.74 + esc + vieja) v = COAL;
    if(sg >= DT.cobre && !isSand(v) && vn(c/2, r/2, S+5) > 0.75 + esc + vieja) v = COPPER;
    // hielo (mina 4): placas que van a más según bajas
    const nTr = TRAMOS.length - 1;
    if(P1.hielo && sg >= (P1.hielo.desde || 0) && !isSand(v) && v !== CLAY){ const Hh = P1.hielo, f = nTr > 0 ? Math.min(1, sg/nTr) : 1, e = Hh.escala || 3.2;
      if(vn(c/e, r/(e*0.8), S+40) > Hh.umbral + ((Hh.umbralFinal ?? Hh.umbral) - Hh.umbral)*f) v = ICE; }
    // el mineral propio de la mina (hierro en la 3, estaño en la 4…): datos en «vetas» del pozo
    if(P1.vetas) for(const k in P1.vetas){ const V = P1.vetas[k], tt = KEY2T[k]; if(tt === undefined || sg < (V.desde || 0) || isSand(v)) continue;
      if(v === ICE){ if(V.hielo !== undefined && vn(c/2, r/2, S + 60 + hashStr(k) % 50) > V.hielo) v = tt; continue; }   // dentro del hielo
      // va a más según bajas: «umbral» en su primer tramo y «umbralFinal» en el último (más bajo = más mineral)
      const nT = TRAMOS.length - 1, de = V.desde || 0, f = nT > de ? Math.min(1, (sg - de)/(nT - de)) : 1;
      const u = V.umbral + ((V.umbralFinal ?? V.umbral) - V.umbral)*f;
      const e = V.escala || 2.2; if(vn(c/e, r/e, S + 30 + hashStr(k) % 50) > u) v = tt; }
    if(sg >= DT.cuarzo && v === STONE && h2(c, r, S+12) < 0.008) v = QUARTZ;
    }
    if(d > 3 && vn(c/3, r/3, S+6) > 0.84) v = HARD;
    if(sg >= DT.cuevas && d > 6 && L.d > 1 && vn(c/4, r/3, S+7) > (TM.cuevas ?? P1.cuevasUmbral ?? 0.7)){
      v = AIR;
      // norma: no hay agua en la última sección (tras la última sala segura), salvo que el pozo diga lo contrario
      const ultima = TC.principal && sg === TRAMOS.length-1 && !P1.aguaUltimaSeccion;
      if(ON('agua') && !ultima && sg >= DT.agua && vn(c/(P1.aguaEscala || 5), r/(P1.aguaEscala || 5), S+8) > (TM.agua ?? P1.aguaUmbral ?? 0.58)) v = WATER;
      else if(ON('grisu') && sg >= DT.gas && vn(c/4, r/4, S+9) > (TM.gas ?? 0.6)) v = GAS;
      else if(ON('polillas') && sg >= DT.polillas && h2(c, r, S+13) < (TM.polillas ?? 0.025)) W.items.push({k:'moth', x:c+0.5, y:r+0.5, alive:true});
      else if(P1.murcielagos && sg >= (P1.murcielagos.desde || 0) && W.rows[r-1] && isSolid(W.rows[r-1].t[c]) && W.rows[r-1].t[c] !== ICE
        && h2(c, r, S+19) < ((P1.murcielagos.tramos || {})[sg] ?? P1.murcielagos.prob)) W.items.push({k:'moth', bat:true, dormido:true, x:c+0.5, y:r+0.35, hx:c+0.5, hy:r+0.35, alive:true});
    }
    if(r === SURF) v = DIRT;
    Tt[c] = v;
  }
  // aceite: en tramos de largo fijo, 1 o 2 bidones al azar si el tramo es largo (en los cortos, ninguno);
  // en los tramos sin fin (ramales), uno cada tantas filas
  const lenT = TRAMOS[sg] ? TRAMOS[sg].len : Infinity;
  if(isFinite(lenT)){
    if(oilRowsOf(sg, lenT).includes(L.d)){ const c = Math.floor(h2(r, 7, S+14)*COLS); Tt[c] = AIR; W.items.push({k:'oil', r, c, alive:true}); }
  } else if(L.d > 2 && r - lastOil >= (P1.aceiteFilas || cfg.oilEvery + Math.min(sg, 4)*2)){
    const c = Math.floor(h2(r, 7, S+14)*COLS); Tt[c] = AIR; W.items.push({k:'oil', r, c, alive:true}); lastOil = r;
  }
  // pasadizos: en el principal, la boca hacia cada ramal; en un ramal, la salida de vuelta junto a la llegada
  const mouths = TC.principal ? RAMALES.map(ra => SURF + ra.fila) : [SURF];
  if(TC.principal) for(const ra of RAMALES) if(r === SURF + ra.fila){ const e = ra.lado === 'izquierda' ? 0 : COLS-1, d = e === 0 ? 1 : -1; Tt[e] = PASS; Tt[e+d] = AIR; }
  if(!TC.principal && (r === SURF || r === SURF+1)){ const e = TC.salida, d = e === 0 ? 1 : -1; for(let i=0;i<3;i++) Tt[e + d*i] = r === SURF ? (i ? AIR : PASS) : BEDROCK; }
  // puertas en los laterales (con llave llevan a una sala de bonus)
  if(TC.principal && ON('puertas') && L.d > 1 && r - SURF >= PU.desdeFila && !pieceRow(r) && !mouths.some(m => Math.abs(m - r) < 2) && h2(r, 21, S+61) < 1/PU.cada){
    const c = h2(r, 22, S+62) < 0.5 ? 0 : COLS-1, c2 = c === 0 ? 1 : COLS-2;
    Tt[c] = DOOR; if(Tt[c2] === WATER || Tt[c2] === GAS) Tt[c2] = AIR;
  }
  if(TC.principal && SECRET && r >= SECRET.r && r < SECRET.r + SECRET.h){
    for(let c=SECRET.c0; c<SECRET.c0+SECRET.w; c++){
      const edge = r===SECRET.r || r===SECRET.r+SECRET.h-1 || c===SECRET.c0 || c===SECRET.c0+SECRET.w-1;
      Tt[c] = edge ? ROCK : AIR;
    }
    if(r === SECRET.r+SECRET.h-2) W.items.push({k:'chest', r, c:SECRET.c0+2, alive:true});
  }
  // franjas de roca maciza con un hueco a un lado (recorridos del arcade): cortan los derrumbes y el agua de arriba
  if(P1.franjas && d > 0 && d % P1.franjas.cada === 0){ const k = d / P1.franjas.cada, hu = P1.franjas.hueco || 2, izq = k % 2 === 1;
    for(let c=0;c<COLS;c++) Tt[c] = (izq ? c < hu : c >= COLS - hu) ? AIR : ROCK;
    W.items = W.items.filter(it => !(it.r === r && it.k === 'oil')); }
  applyPieces(r, Tt);   // lo hecho a mano manda sobre lo procedural
  for(let c=0;c<COLS;c++){ R.hp[c] = INFO[Tt[c]].hp||0; R.nat[c] = isSolid(Tt[c]) ? 0 : 1; R.lv[c] = Tt[c] === WATER ? 1 : 0; }
  return R;
}
// techos que no se sostendrían al generarse: se vuelven roca dura (arcos naturales)
function settleRow(rr){
  if(rr < SURF || layout(rr).part !== undefined) return;
  const A = W.rows[rr].t, B = W.rows[rr+1].t, base = new Uint8Array(COLS);
  for(let c=0;c<COLS;c++) base[c] = isStruct(A[c]) && (isAnchor(A[c]) || isSolid(B[c])) ? 1 : 0;
  for(let c=0;c<COLS;c++){
    if(!isStruct(A[c]) || base[c]) continue;
    if(!spanOK(A, base, c)){ A[c] = HARD; W.rows[rr].hp[c] = INFO[HARD].hp; base[c] = 1; }
  }
}
function spanOK(A, base, c){
  const k = spanReach();
  for(const dir of [-1,1]) for(let i=1;i<=k;i++){
    const cc = c+dir*i; if(cc<0 || cc>=COLS || !isStruct(A[cc])) break;
    if(base[cc]) return true;
  }
  return false;
}
function ensure(n){ while(W.rows.length <= n){ const r = W.rows.length; W.rows.push(genRow(r)); addKit(r, true); if(r-1 >= SURF) settleRow(r-1); } }
// herramientas sueltas por la mina (posición fija según la semilla)
const OBJ = D.objetos || {};
const FCOL = D.floresColor || {colores: []};
for(const fc of FCOL.colores) if(!OBJ['flor_' + fc.id]) OBJ['flor_' + fc.id] = {nombre: 'Flor de mina ' + fc.nombre, categoria: 'herbario', icono: '🌸', dibujo: 'flor', brilla: true, color: fc,
  texto: 'Una flor de mina de color ' + fc.nombre + '. ¡Nunca habías visto una! La señora Coneja se va a llevar una alegría.'};
// desde la mina 4, una flor de mina puede salir de color; los colores posibles se amplían con cada mina abierta
function florDe(r, c){
  if(ARC || !FCOL.colores.length) return 'flor_mina';
  let top = 0; for(const m of D.minas) if(typeof m.id === 'number' && (m.abierta || Pa.bandera('mina_' + m.id + '_abierta'))) top = Math.max(top, m.id);
  const pos = FCOL.colores.filter(fc => fc.desde <= top); if(!pos.length || h2(r, c, W.seed + 97) >= (FCOL.prob || 0.15)) return 'flor_mina';
  let tot = pos.reduce((a, fc) => a + fc.peso, 0), x = h2(c, r, W.seed + 98)*tot;
  for(const fc of pos){ x -= fc.peso; if(x <= 0) return 'flor_' + fc.id; }
  return 'flor_' + pos[pos.length - 1].id;
}
const LL = D.llaves || {cada:24, desdeFila:10}, PU = D.puertas || {cada:20, desdeFila:14}, SB = D.salaBonus || {premios:[]};
const RC = D.recogibles || {cada:9, desdeFila:6, probPuntal:0.45, cantidad:1, regenerar:true};
function addKit(r, fresh){
  W.herr = true;
  const L = layout(r); if(!L || L.surface || L.part !== undefined || L.bajoFondo || r >= TC.fondo - 1) return;
  if(fresh && ON('llaves') && r - SURF >= LL.desdeFila && h2(r, 31, W.seed + 71) < 1/LL.cada){
    const R = W.rows[r], c = 1 + Math.floor(h2(r, 32, W.seed + 72)*(COLS-2));
    if(R.t[c] !== WATER && R.t[c] !== GAS && R.t[c] !== ROCK && R.t[c] !== DOOR && R.t[c] !== PASS && !pieceAt(r, c)){ R.t[c] = AIR; R.hp[c] = 0; R.nat[c] = 1; W.items.push({k:'llave', r, c, alive:true}); }
  }
  // objetos sueltos (coleccionables de minería): no reaparecen
  if(fresh && ON('objetos')) for(const id in OBJ){ const SU = !TC.principal && P1.sueltosRamal ? P1.sueltosRamal : P1.sueltos; const o = SU ? SU[id] : OBJ[id].suelto; if(!o || r - SURF < o.desdeFila || h2(r, hashStr(id) % 997, W.seed + 91) >= 1/o.cada) continue;
    const R = W.rows[r], c = 1 + Math.floor(h2(r, hashStr(id) % 991, W.seed + 92)*(COLS-2));
    if(R.t[c] !== WATER && R.t[c] !== GAS && R.t[c] !== ROCK && R.t[c] !== DOOR && R.t[c] !== PASS && !pieceAt(r, c) && !W.items.some(i => i.r === r && i.c === c)){ R.t[c] = AIR; R.hp[c] = 0; R.nat[c] = 1; W.items.push({k:'obj', id: id === 'flor_mina' ? florDe(r, c) : id, r, c, alive:true}); } }
  // plantas de agua (nenúfares): en la superficie de una poza (agua con aire encima)
  if(fresh && ON('objetos') && P1.enAgua && TC.principal) for(const id in P1.enAgua){ const o = P1.enAgua[id]; if(r - SURF < o.desdeFila) continue;
    const R = W.rows[r], U = W.rows[r-1]; if(!U) continue;
    const cs = []; for(let c=0;c<COLS;c++) if(R.t[c] === WATER && (U.t[c] === AIR) && !pieceAt(r, c) && !W.items.some(i => i.r === r && i.c === c)) cs.push(c);
    if(!cs.length || h2(r, hashStr(id) % 997, W.seed + 93) >= 2.5/o.cada) continue;
    W.items.push({k:'obj', id, r, c: cs[Math.floor(h2(r, 5, W.seed + 94)*cs.length)], alive:true, agua:true}); }
  if(r - SURF < RC.desdeFila) return;
  if(h2(r, 3, W.seed + 51) > 1/RC.cada) return;
  if(W.items.some(i => i.k === 'herr' && i.r === r)) return;
  const c = Math.floor(h2(r, 9, W.seed + 52)*COLS);
  if(fresh){ const R = W.rows[r]; if(R.t[c] !== WATER && R.t[c] !== GAS && R.t[c] !== ROCK && R.t[c] !== DOOR && R.t[c] !== PASS && !pieceAt(r, c) && !W.items.some(i => i.r === r && i.c === c)){ R.t[c] = AIR; R.hp[c] = 0; R.nat[c] = 1; } else return; }
  W.items.push({k:'herr', tipo: h2(r, 11, W.seed + 53) < RC.probPuntal ? 'puntal' : 'escalera', r, c, alive:true});
}
// Las salas seguras se reconstruyen en cada bajada: techo y suelo de viga, dentro vacío
// partidas de antes: cofres en las salas que ya existían
// montacargas: una sala de cada tantas (según el pozo). Se arreglan una vez con mineral y mandan la carga arriba.
const COL_CARGA = 14;
const LLAMAS = SA.columnasLlama || [SA.columnaLlama ?? 2];   // antorchas de las salas (una a cada lado)   // al borde de la sala, como si bajara por un hueco paralelo a la mina
const hasLift = i => !!(TC && TC.principal && P1.montacargasCada) && (i + 1) % P1.montacargasCada === 0;
const esCajon = i => !!(ARC && ARC.cajonCada && TC && TC.principal) && (i + 1) % ARC.cajonCada === 0;
function ensureRoomItems(){
  for(let i=0;i<ROOM_ROW.length;i++){
    if(ROOM_ROW[i] + ROOM_H > W.rows.length) break;
    if(!W.items.some(it => it.k === 'cofreSala' && it.room === i)) W.items.push({k:'cofreSala', room:i, r:ROOM_ROW[i]+ROOM_H-2, c:SA.columnaCofre, alive:true});
    if(hasLift(i) && !W.items.some(it => it.k === 'carga' && it.room === i)) W.items.push({k:'carga', room:i, r:ROOM_ROW[i]+ROOM_H-2, c:COL_CARGA, alive:true});
  }
}
function restoreRooms(){
  for(let i=0;i<ROOM_ROW.length;i++){
    const r0 = ROOM_ROW[i]; if(r0 + ROOM_H > W.rows.length) break;
    for(let k=0;k<ROOM_H;k++){ const r = r0 + k; for(let c=0;c<COLS;c++){ const v = k === 0 || k === ROOM_H-1 ? BEAM : AIR; if(W.rows[r].t[c] !== v) setT(r, c, v); } }
    for(const it of W.items) if(it.alive && it.k === 'bag' && it.r >= r0 && it.r < r0 + ROOM_H) it.alive = false;
    if(W.bag && W.bag.r >= r0 && W.bag.r < r0 + ROOM_H){ W.bag.r = r0 + ROOM_H - 2; }   // si la mochila estaba en una sala, queda dentro, en el suelo
  }
}
function tAt(r,c){ if(c<0 || c>=COLS) return ROCK; if(r<0) return AIR; ensure(r+1); return W.rows[r].t[c]; }
function setT(r,c,v){ const R = W.rows[r]; R.t[c] = v; R.hp[c] = INFO[v].hp||0; R.sh[c] = 0; R.lv[c] = v === WATER ? 1 : 0; R.ox[c] = 0; R.oy[c] = 0; }

// ---------- estado de la bajada ----------
let platOpen = 0, p, lamp, bag, props, ladders, wick, dead, deadT, cashed, rocks, particles, floats, fillQ, digT, moveT, buried, crackMsgT, lockMsgT, flashT, maxDepth, lastRoomFloor, roomsSeen, segSeen, llaves = 0, submerged = false, cards = {}, air = 10, spun = new Set(), carpDone = 0, chestFx = null, ruletaOpen = false, prevRecord = 0, newGround = false, bonusOpen = false, transit = null, mainLRF = 0, shake = 0, shakeKick = 0, cracking = 0, looking = false, driftT = 0, started = false, simAcc = 0, stabAcc = 0, tick = 0, t = 0, wet = false, gasNear = false;
const input = {L:false, R:false, U:false, D:false};
// pulsaciones cortas: se guardan un momento para que un toque rápido no se pierda entre fotogramas
const tapped = {L:0, R:0, U:0, D:0};
const want = k => input[k] || tapped[k] > 0;
function press(k){ input[k] = true; tapped[k] = 0.3; avisoInput(); }

// Al volver del pueblo: lo que abriste por debajo de la primera sala se rellena de escombro y piedra dura.
// Queda el rastro (ya lo habías visto) pero no un tubo para tirarse en bomba.
function refillTunnels(){
  if(!VU || !VU.rellenar || (TC.principal && !ROOM_ROW.length)) return 0;
  const from = TC.principal ? ROOM_ROW[0] + ROOM_H : SURF, mix = VU.relleno, tot = (mix.escombro||0) + (mix.piedra||0) + (mix.rocaDura||0) || 1;
  // lo que hay a N casillas de un puntal o un tablón se respeta: tus galerías aseguradas perduran.
  // En las escaleras solo se respeta la casilla de encima de su extremo de arriba y la de debajo del de abajo
  // (sin laterales): alrededor de la escalera vuelve a haber roca y se lee como una galería.
  const N = cfg.resp|0, keep = new Set();
  for(let r=from; r<W.rows.length; r++){ const R = W.rows[r]; for(let c=0;c<COLS;c++){ const v = R.t[c];
    if(v === LADDER){
      keep.add(r*16 + c);
      if(r === 0 || W.rows[r-1].t[c] !== LADDER) keep.add((r-1)*16 + c);
      if(r + 1 >= W.rows.length || W.rows[r+1].t[c] !== LADDER) keep.add((r+1)*16 + c);
      continue;
    }
    if(v !== PROP && v !== PLANK) continue;
    for(let dr=-N; dr<=N; dr++) for(let dc=-N; dc<=N; dc++){ const cc = c+dc; if(cc >= 0 && cc < COLS) keep.add((r+dr)*16 + cc); } } }
  let n = 0;
  for(let r=from; r<W.rows.length; r++){
    if(layout(r).part !== undefined) continue;
    const R = W.rows[r];
    for(let c=0;c<COLS;c++){
      const v = R.t[c];
      if(R.nat[c] || !(v === AIR || v === LADDER || v === PROP || v === PLANK)) continue;
      // alrededor de escaleras y puntales se respeta, aunque no siempre: alguna piedra cae (las piezas en sí se quedan)
      if(keep.has(r*16 + c) && (v !== AIR || h2(c, r, W.seed + 131 + W.runs*5)*100 < cfg.respP)) continue;
      const h = h2(c, r, W.seed + 101 + W.runs*7) * tot;
      setT(r, c, h < (mix.escombro||0) ? RUBBLE : h < (mix.escombro||0) + (mix.piedra||0) ? STONE : HARD);
      n++;
    }
  }
  for(let r=W.rows.length-2; r>=from; r--) settleRow(r);
  // lo que estuviera en esos huecos queda enterrado (la mochila vuelve a salir al picar)
  for(const it of W.items) if(it.alive && it.k !== 'moth' && it.r >= from && isSolid(tAt(it.r, it.c))){ if(it.k === 'bag' || it.k === 'oil') it.alive = false; }
  return n;
}
let ventSnd = 0;
let startOpts = null, taken = {p:0, l:0, k:0}, kitLlevo = false, ungLlevo = {};
const UNG = (D.herboristeria && D.herboristeria.unguentos) || {};
// devuelve las herramientas al almacén: lo que había menos la tanda que te llevaste, más lo que traes
function devolverKit(p_, l_, k_){
  Pa.kit.puntales = Math.max(0, (Pa.kit.puntales||0) - taken.p) + (p_||0);
  Pa.kit.escaleras = Math.max(0, (Pa.kit.escaleras||0) - taken.l) + (l_||0);
  Pa.kit.llaves = Math.max(0, (Pa.kit.llaves||0) - taken.k) + (k_||0);
  taken = {p:0, l:0, k:0};
}
// noria ya movida y su cofre abierto: en la bajada siguiente su hueco sale tapiado con piedra (para no quedarse encerrado ahí)
function tapiarNorias(){
  for(const it of W.items){
    if(it.k !== 'noria' || !it.alive || !it.activa) continue;
    const cofre = W.items.find(i => i.k === 'cofrePieza' && Math.abs(i.r - it.r) <= 3 && Math.abs(i.c - it.c) <= 9);
    if(cofre && !cofre.abierto) continue;
    it.alive = false; ensure(it.r + 1);
    if(!isSolid(tAt(it.r, it.c))){ setT(it.r, it.c, STONE); W.rows[it.r].nat[it.c] = 0; }
  }
}
// un ungüento hace efecto: se gasta del almacén
function gastarUng(carta){ const id = ungLlevo[carta]; if(!id) return; delete ungLlevo[carta]; const U = Pa.kit.unguentos || (Pa.kit.unguentos = {}); U[id] = Math.max(0, (U[id]||0) - 1); Pa.guardar(); }
function startRun(){
  if(!MINA){ MINA = newMine(); }
  if(MINA.actual !== 'principal' || !TC || !TC.principal){ MINA.actual = 'principal'; W = MINA.tiros.principal; setTiro('principal'); }
  transit = null; escena = null; $('pad').style.visibility = '';
  if(!W.rewarded) W.rewarded = [];
  lastOil = SURF;
  ensure(SURF + 40);
  const refilled = W.runs > 0 ? refillTunnels() : 0;
  if(W.runs > 0) restoreRooms();
  if(W.runs > 0) tapiarNorias();
  if(W.runs > 0 && RC.regenerar) for(const it of W.items) if(it.k === 'herr' && !it.extra) it.alive = true;
  W.items = W.items.filter(it => !(it.extra && !it.alive));
  // que no quede ninguna pulsación de la bajada anterior
  for(const k in input){ input[k] = false; tapped[k] = 0; }
  document.querySelectorAll('#pad button.on').forEach(b => b.classList.remove('on'));
  W.runs = (W.runs||0) + 1;
  looking = false; $('verBtn').classList.remove('activo');
  shake = 0; shakeKick = 0; cracking = 0; driftT = 0;
  p = {c:7, r:SURF-2, x:7, y:SURF-2, face:1, anim:'reposo', animT:0, act:null, actT:0, falling:false, fallN:0, onPlat:true, stun:0};
  platOpen = 0;
  // herramientas: se guardan en el almacén y en cada bajada te llevas una tanda fija (si las tienes; si no, todas).
  // El resto se queda arriba, a salvo. (Si cierras el juego a mitad de bajada, no se pierde nada: se cuadra al volver o al morir.)
  taken = {p: Math.min(Pa.kit.puntales||0, cfg.llevP), l: Math.min(Pa.kit.escaleras||0, cfg.llevL), k: Pa.kit.llaves||0};
  lamp = 100; bag = {}; props = Math.max(taken.p, cfg.minP); ladders = Math.max(taken.l, cfg.minL); llaves = taken.k; wick = 1;
  kitLlevo = !!(Pa.pueblo.kitMc && !Pa.pueblo.kitMcMochila);
  if(!ARC){
    if(Pa.estad && P1.real) Pa.estad().bajadas++;
    // dormir en casa: en esta bajada cabe más en la mochila
    descansado = !!Pa.pueblo.descansado; if(descansado){ Pa.pueblo.descansado = false; }
    // el aspecto elegido en el armario de casa
    const asp = Pa.pueblo.aspecto; aspecto(asp && asp !== 'clasico' ? ((D.arcade && D.arcade.aspectos) || []).find(a => a.id === asp) : null);
    Pa.guardar();
  }
  ungLlevo = {}; for(const id of (Pa.ungElegidos ? Pa.ungElegidos() : [])) if(UNG[id]) ungLlevo[UNG[id].carta] = id;   // como mucho 2 (los huecos de la herboristería)
  prevRecord = W.record||0; newGround = false;
  cards = {}; for(const ca in ungLlevo) cards[ca] = 1;   // los ungüentos de la ardilla funcionan como cartas de un solo uso
  spun = new Set(); carpDone = 0; chestFx = null; air = airMax(); submerged = false; airWarn = false;
  ensureRoomItems(); tidyEscalas(); unroll = null;
  repartirDeposito();
  redSeguridad();
  dead = null; deadT = 0; cashed = false; rocks = []; particles = []; floats = []; fillQ = [];
  digT = 0; moveT = 0; buried = 0; crackMsgT = 0; lockMsgT = 0; flashT = 0; maxDepth = 0;
  lastRoomFloor = SURF - 1; roomsSeen = new Set(); segSeen = 0;
  cam = p.y - (VH/T)*0.35; zoom = ZCLOSE; camX = (p.x+0.5)*T; started = true;
  renderInv(); hud(true);
  if(mundoNuevo){ mundoNuevo = false; toast('Mina nueva', 'Versión '+D.version+': el pozo ha cambiado y empieza de cero'); }
  else if(bagWhere()){ const bw = bagWhere(); toast('Tu mochila te espera', bw.here ? 'Bajo el escombro, a '+(W.bag.r - SURF + 1)+' m' : 'Se quedó en el '+bw.nombre); }
  else if(refilled) toast('El pozo se ha asentado', 'Tus túneles de abajo se han llenado de escombro y piedra');
  else if(bajadaBloqueada()) decir('triste', 'El ascensor del fondo está estropeado… No puedo bajar así. Si tan solo pudiera arreglarlo.');
  else toast(P1.nombre, TRAMOS[0].n);
  misionInicio();
  // bajar en el ascensor del tejón (Pozo viejo, ascensor fino): empiezas en el fondo
  if(startOpts && startOpts.fondo && PK === 'uno' && ascState() === 'fino'){
    ensure(TC.fondo + 4); const as = W.items.find(i => i.k === 'ascensor');
    if(as){ p.onPlat = false; platOpen = 1; p.r = p.y = as.r; p.c = p.x = p.sx = as.c; lastRoomFloor = ROOM_ROW.length ? ROOM_ROW[ROOM_ROW.length-1] + ROOM_H - 1 : SURF - 1; maxDepth = as.r - SURF + 1; segSeen = TRAMOS.length - 1; roomsSeen = new Set(ROOM_ROW.map((_, i) => i));
      cam = p.y - (VH/T)*0.35; camX = (p.x+0.5)*T; toast('El ascensor te baja al fondo', 'Suave como la seda. Para volver, súbete otra vez'); }
  }
  startOpts = null;
}

// ---------- cartas ----------
const has = id => (cards[id]||0) > 0;
function useCard(id){ if(!has(id)) return false; cards[id]--; if(!cards[id]) delete cards[id]; if(!cards[id]) gastarUng(id); renderInv(); return true; }
const cv_ = (id, d) => (CARD[id] && CARD[id].valor !== undefined) ? CARD[id].valor : d;
function airMax(){ return has('pulmones') ? AI.conPulmones : AI.segundos; }

// ---------- simulación de materiales ----------
function playerCell(r,c){ return !dead && p && p.r === r && p.c === c; }
// casilla por la que está a punto de pasar (o pasando) una piedra que cae: lo suelto espera a que pase
function rockLane(rr, cc){ for(const k of rocks) if(k.c === cc && k.y > rr - 2.5 && k.y < rr + 1) return true; return false; }
function fluids(top, bot){
  tick++;
  for(let r=bot-1; r>=top; r--){
    const R = W.rows[r], dir = (tick + r) & 1 ? 1 : -1;
    for(let i=0;i<COLS;i++){
      const c = dir > 0 ? i : COLS-1-i, v = R.t[c];
      if(R.mv[c] === tick) continue;
      if(v === WATER || (holdsW(v) && R.lv[c] > 0.004)){ waterStep(r, c, dir); continue; }
      if(!isSand(v) && v !== RUBBLE && v !== MUD) continue;
      if(isSand(v) && cfg.anim !== 'no' && tick % (D.arena && D.arena.caeCadaTicks || 2)) continue;   // la arena cae más despacio para que se vea derramarse
      if(v === MUD){ mudStep(r, c, dir); continue; }
      const below = tAt(r+1, c);
      const can = (rr, cc) => { if(cc<0 || cc>=COLS) return false; const x = tAt(rr,cc); if(v !== WATER && playerCell(rr,cc)) return false; if(rockLane(rr, cc)) return false; return isOpen(x) || (v !== WATER && x === WATER); };
      if(can(r+1, c)){ swap(r,c,r+1,c); continue; }
      if(v === RUBBLE) continue;
      // arena: rampa de 45º (siempre el mismo orden, sin azar)
      const order = v === SAND ? [dir, -dir] : [dir, -dir];
      let moved = false;
      for(const dd of order){
        const side = tAt(r, c+dd);
        if(can(r+1, c+dd) && (isOpen(side) || side === WATER) && !rockLane(r, c+dd)){ swap(r,c,r+1,c+dd); moved = true; break; }
      }
      if(moved || v !== WATER) continue;
      for(const dd of order){ if(isOpen(tAt(r, c+dd)) && c+dd>=0 && c+dd<COLS){ swap(r,c,r,c+dd); break; } }
    }
  }
}
// Agua con volumen: cada casilla tiene un nivel (0 a 1). Cae, llena lo de abajo y se reparte a los lados
// igualando niveles; si no tiene adónde ir se queda quieta. Nunca desaparece: como mucho queda una lámina fina,
// que se vuelve a juntar si luego encuentra un hueco más hondo. También ocupa casillas con escalera, puntal o tablón.
const lvAt = (r, c) => { const v = tAt(r, c); return v === WATER || holdsW(v) ? W.rows[r].lv[c] : 0; };
const takesW = (r, c) => { if(c < 0 || c >= COLS) return false; const v = tAt(r, c); return isOpen(v) || v === WATER || holdsW(v); };
function addW(r, c, m){ const R = W.rows[r]; if(isOpen(R.t[c])){ setT(r, c, WATER); R.lv[c] = m; } else R.lv[c] = Math.min(1, R.lv[c] + m); R.mv[c] = tick; }
function setW(r, c, L){ const R = W.rows[r]; if(R.t[c] === WATER){ if(L < 0.004) setT(r, c, AIR); else R.lv[c] = L; } else R.lv[c] = Math.max(0, L < 0.004 ? 0 : L); }
function waterStep(r, c, dir){
  const R = W.rows[r], self = R.t[c];
  let L = R.lv[c];
  // en las salas seguras el agua se va perdiendo poco a poco (así no baja de un tramo al siguiente)
  { const Lr = layout(r); if(Lr && Lr.part !== undefined) L -= (AG.salasSecan ?? 0.3)/14; }
  if(L < 0.004){ setW(r, c, 0); return; }
  // agua que toca arena arcillosa: se empapa y se vuelve barro (se gasta agua). La arena normal no.
  for(const [rr, cc] of [[r+1, c], [r, c-dir], [r, c+dir]]){
    if(cc < 0 || cc >= COLS || tAt(rr, cc) !== CSAND) continue;
    setT(rr, cc, MUD); W.rows[rr].mv[cc] = tick; L -= BA.aguaQueGasta;
    if(Math.abs(rr - p.r) < 10) burst(rr+0.3, cc+0.5, '#8f563b', 3);
    if(L < 0.004){ setW(r, c, 0); return; }
    break;
  }
  // abajo: si está libre cae entera; si hay agua (o escalera, puntal...) sin llenar, la llena
  const b = tAt(r+1, c);
  if(isOpen(b) && self === WATER){ R.lv[c] = L; swap(r, c, r+1, c); return; }
  if(takesW(r+1, c)){
    const room = 1 - lvAt(r+1, c);
    if(room > 0.001){ const m = Math.min(room, L); addW(r+1, c, m); L -= m; if(L < 0.004){ setW(r, c, 0); return; } }
  }
  // borde con caída al lado: se va entera por ahí
  for(const dd of [dir, -dir]){
    const cc = c + dd; if(cc < 0 || cc >= COLS) continue;
    if(isOpen(tAt(r, cc)) && isOpen(tAt(r+1, cc))){
      if(self === WATER){ R.lv[c] = L; swap(r, c, r, cc); } else { addW(r, cc, L); setW(r, c, 0); }
      return;
    }
  }
  // a los lados: si hay hueco, el agua lo ocupa (a medias); si hay agua, se iguala el nivel
  for(const dd of [dir, -dir]){
    const cc = c + dd; if(!takesW(r, cc) || rockLane(r, cc)) continue;
    const n = lvAt(r, cc);
    if(n === 0 && isOpen(tAt(r, cc))){ if(L > AG.nivelMinimo){ const m = L/2; addW(r, cc, m); W.rows[r].ox[cc] = 0; W.rows[r].oy[cc] = 0; L -= m; } }
    else if(L - n > AG.diferenciaMinima){ const m = (L - n)/2; addW(r, cc, m); L -= m; }
  }
  setW(r, c, L);
}
// Barro: fluido espeso. Cae y se escurre despacio, sin rampas; deja de moverse cuando queda plano.
function mudStep(r, c, dir){
  if(tick % BA.caeCadaTicks) return;
  const b = tAt(r+1, c);
  if((isOpen(b) || b === WATER) && !playerCell(r+1, c) && !rockLane(r+1, c)){ swap(r, c, r+1, c); return; }
  if(tick % BA.escurreCadaTicks) return;
  for(const dd of [dir, -dir]){
    const cc = c + dd; if(cc < 0 || cc >= COLS) continue;
    const side = tAt(r, cc); if(!isOpen(side) || playerCell(r, cc)) continue;
    const sb = tAt(r+1, cc);
    if(isOpen(sb) || sb === WATER){ swap(r, c, r, cc); return; }      // borde: se va por ahí
    if(b === MUD){ swap(r, c, r, cc); return; }                       // montón: se aplana
  }
}
// La mochila perdida se comporta como un bloque suelto: si pierde apoyo cae, pero nunca se rompe en escombro.
function updateBag(){
  if(!W.bag) return;
  const B = W.bag;
  let it = W.items.find(i => i.alive && i.k === 'bag');
  if(!it){
    if(isSolid(tAt(B.r, B.c))) return;          // sigue enterrada
    it = {k:'bag', r:B.r, c:B.c, alive:true}; W.items.push(it);
  }
  if(isSolid(tAt(it.r, it.c))){ it.alive = false; B.r = it.r; B.c = it.c; return; }   // le ha caído algo encima: vuelve a quedar enterrada
  const below = tAt(it.r+1, it.c);
  if(!isSolid(below) && below !== PLANK && below !== PROP && !playerCell(it.r+1, it.c) && !rocks.some(k => k.c === it.c && Math.abs(k.y - it.r - 1) < 1)){
    it.r++; B.r = it.r; it.fall = (it.fall||0) + 1; it.dy = 1;
  } else if(it.fall){ if(it.fall >= 2) SND('aterriza', near(it.r, it.c)*0.8); it.fall = 0; }
}
// herramientas y llaves sueltas: si se quita lo que tienen debajo, caen hasta apoyarse
function dropItems(top, bot){
  for(const it of W.items){
    if(!it.alive || (it.k !== 'herr' && it.k !== 'llave' && it.k !== 'oil' && it.k !== 'obj') || it.r < top || it.r > bot) continue;
    if(isSolid(tAt(it.r, it.c))) continue;   // tapada: sale al picar
    const b = tAt(it.r+1, it.c);
    if(!isSolid(b) && b !== LADDER && b !== PLANK && b !== PROP && !playerCell(it.r+1, it.c) && !W.items.some(o => o !== it && o.alive && o.r === it.r+1 && o.c === it.c && o.k !== 'moth')){ it.r++; it.dy = 1; }
  }
}
function swap(r1,c1,r2,c2){
  const A = W.rows[r1], B = W.rows[r2];
  const tv = A.t[c1], th = A.hp[c1], tl = A.lv[c1]; A.t[c1] = B.t[c2]; A.hp[c1] = B.hp[c2]; A.lv[c1] = B.lv[c2]; B.t[c2] = tv; B.hp[c2] = th; B.lv[c2] = tl;
  A.sh[c1] = 0; B.sh[c2] = 0; B.mv[c2] = tick; A.mv[c1] = tick;
  // arena, escombro y barro se deslizan hasta su casilla nueva (se dibujan desde donde estaban)
  const v = B.t[c2];
  const animOn = cfg.anim === 'todo' ? (isLoose(v) || v === MUD) : cfg.anim === 'arena' ? (isSand(v) || v === MUD) : false;
  if(animOn){ B.ox[c2] = A.ox[c1] + (c1 - c2); B.oy[c2] = A.oy[c1] + (r1 - r2); B.ox[c2] = Math.max(-1.5, Math.min(1.5, B.ox[c2])); B.oy[c2] = Math.max(-1.5, Math.min(1.5, B.oy[c2])); }
  else { B.ox[c2] = 0; B.oy[c2] = 0; }
  A.ox[c1] = 0; A.oy[c1] = 0;
}
// el deslizamiento: el desplazamiento dibujado vuelve a cero a la velocidad de la simulación
function slideAnim(top, bot, dt){
  const ks = 14/(D.arena && D.arena.caeCadaTicks || 2)*dt, k0 = 14*dt;
  for(let r=top; r<=bot; r++){ const R = W.rows[r]; if(!R) continue;
    for(let c=0;c<COLS;c++){ const x = R.ox[c], y = R.oy[c]; if(!x && !y) continue; const k = isSand(R.t[c]) ? ks : k0; if(x){ R.ox[c] = Math.abs(x) <= k ? 0 : x - Math.sign(x)*k; } if(y){ R.oy[c] = Math.abs(y) <= k ? 0 : y - Math.sign(y)*k; } } }
}
function stability(top, bot){
  let below = null;
  for(let r=bot; r>=top; r--){
    const L = layout(r);
    if(L.part !== undefined || L.surface){ below = new Uint8Array(COLS).fill(1); continue; }
    const R = W.rows[r], A = R.t, base = new Uint8Array(COLS), sup = new Uint8Array(COLS);
    for(let c=0;c<COLS;c++){
      const a = A[c]; if(!isStruct(a)) continue;
      if(isAnchor(a) || r === bot){ base[c] = 1; continue; }
      const b = W.rows[r+1].t[c];
      base[c] = (isLoose(b) || b === PROP || isAnchor(b) || (isStruct(b) && below && below[c])) ? 1 : 0;
    }
    for(let c=0;c<COLS;c++){
      if(!isStruct(A[c])) continue;
      sup[c] = base[c] || spanOK(A, base, c) ? 1 : 0;
      if(isAnchor(A[c])) continue;
      if(sup[c]) R.sh[c] = 0;
      else if(R.sh[c] === 0){
        R.sh[c] = cfg.crack;
        if(crackMsgT <= 0 && Math.abs(r - p.r) < 9) SND('crac', near(r, c));
        if(crackMsgT <= 0 && Math.abs(r - p.r) < 9){ floats.push({x:c+0.5, y:r+0.2, txt:'¡Crac!', life:0.9, col:'#eec39a'}); crackMsgT = 1.2; }
      }
    }
    below = sup;
  }
}
// cuando acaba el crujido cae todo el bloque conectado a la vez
function updateCracks(top, bot, dt){
  const due = []; cracking = 0;
  for(let r=top; r<=bot; r++){ const R = W.rows[r]; for(let c=0;c<COLS;c++){ if(R.sh[c] > 0){ if(r <= p.r + 4) cracking++; R.sh[c] -= dt; if(R.sh[c] <= 0) due.push([r,c]); } } }
  if(!due.length) return;
  const set = new Set(due.map(([r,c])=>r*16+c)), done = new Set();
  for(const [r0,c0] of due){
    const k0 = r0*16+c0; if(done.has(k0)) continue;
    const grp = [], q = [[r0,c0]]; done.add(k0);
    while(q.length){ const [r,c] = q.pop(); grp.push([r,c]);
      for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){ const k = (r+dr)*16+(c+dc); if(set.has(k) && !done.has(k)){ done.add(k); q.push([r+dr,c+dc]); } } }
    // también caen los bloques de encima del grupo que estaban en crujido o sueltos
    for(const [r,c] of grp){
      const v = W.rows[r].t[c];
      rocks.push({c, y:r, y0:r, vy:0, t:v, grp:grp.length});
      setT(r, c, AIR);
      burst(r+0.5, c+0.5, '#8f563b', 3);
    }
  }
}
function updateRocks(dt){
  for(const k of rocks){
    k.vy = Math.min(16, k.vy + 34*dt);
    if(tAt(Math.floor(k.y)+1, k.c) === MUD || tAt(Math.floor(k.y), k.c) === MUD){ k.mud = true; k.vy = Math.min(k.vy, BA.rocaEnBarro); }
    k.y += k.vy*dt;
    // un tablón (puntal puesto como puente) no aguanta un derrumbe: se rompe al pasar la piedra
    { const rp = Math.floor(k.y + 0.9); if(tAt(rp, k.c) === PLANK){ setT(rp, k.c, AIR); burst(rp+0.2, k.c+0.5, '#d9a066', 8); SND('rompe', near(rp, k.c));
      if(Math.abs(rp - p.r) < 10) floats.push({x:k.c+0.5, y:rp, txt:'¡Tablón roto!', life:1, col:'#eec39a'}); } }
    const rr = Math.floor(k.y) + 1, b = tAt(rr, k.c);
    if(isSolid(b)){
      let r = rr - 1; while(r > 0 && isSolid(tAt(r, k.c))) r--;
      const fall = r - k.y0;
      // fragilidad del material: el cuarzo se rompe con menos caída, el carbón aguanta más
      const fr = cfg.frag === '1' ? ((INFO[k.t].key && M[INFO[k.t].key] && M[INFO[k.t].key].fragilidad) || 0) : 0;
      let broke = !k.mud && (fall >= Math.max(1, cfg.thrH + fr) || k.grp >= Math.max(1, cfg.thrS + fr));   // en el barro se hunde entero, sin romperse
      if(broke && INFO[k.t].val && has('recuperador') && Math.random() < cv_('recuperador', 0.5)) broke = false;
      if(broke && INFO[k.t].val) stat('per', INFO[k.t].key, 1);
      setT(r, k.c, broke ? RUBBLE : k.t); k.done = true;
      const nv = near(r, k.c); SND(broke ? 'escombro' : 'cae', nv); shakeKick = Math.max(shakeKick, nv*1.6);
      burst(r+0.9, k.c+0.5, broke ? '#847e87' : '#8f563b', broke ? 9 : 4);
      if(broke && Math.abs(r - p.r) < 10 && Math.random() < 0.35) floats.push({x:k.c+0.5, y:r+0.2, txt:'escombro', life:0.8, col:'#9badb7'});
      for(const it of W.items) if(it.alive && it.k === 'oil' && it.r === r && it.c === k.c) it.alive = false;
    }
    if(!dead && k.vy > 2 && !k.spared && Math.abs(k.c - p.x) < 0.95 && k.y + 0.95 > p.y + 0.15 && k.y < p.y + 0.9){
      if(k.c === p.c){
        if(useCard('casco')){ k.done = true; burst(p.r+0.2, p.c+0.5, '#9badb7', 12); SND('escombro'); p.stun = JU.aturdidoPorLosPelos; p.act = null;
          floats.push({x:p.c+0.5, y:p.r-0.3, txt:'¡El casco aguanta!', life:1.4, col:'#fbf236'}); }
        else die('crush');
      }
      else { // ya estabas saliendo de esa casilla: te salvas, pero caes al suelo aturdido
        k.spared = true; p.x = p.c; p.act = null; p.falling = false;
        if(!has('reflejos')){ p.stun = JU.aturdidoPorLosPelos; SND('tropiezo'); }
        floats.push({x:p.c+0.5, y:p.r-0.3, txt:'¡Por los pelos!', life:1.2, col:'#fbf236'});
        burst(p.r+0.8, p.c+0.5, '#eec39a', 8);
      }
    }
    for(const it of W.items) if(it.alive && it.k === 'moth' && Math.floor(it.x) === k.c && it.y > k.y && it.y < k.y+1){ it.alive = false; floats.push({x:it.x, y:it.y, txt:'¡Aplastada!', life:0.9, col:'#eec39a'}); }
  }
  rocks = rocks.filter(k => !k.done);
}

// ---------- jugador ----------
function weight(){ let w = 0; for(const k in bag) if(INFO[k]) w += bag[k]*INFO[k].val; return w; }
// la mochila no frena: se llena. Capacidad según ajustes (más con la carta Mochila de cuero)
let prisa = 0, luzTotal = 0, fuego = 0, subida = null, comboTag = null;   // arcade: hongo (más rápido), flor (sin oscuridad), racha de combo, subida en ascensor
function stepTime(){ return JU.tiempoPaso*(prisa > 0 ? 0.5 : 1); }
// mejoras del taller del tejón (para siempre)
function mejora(ef){ let v = ef === 'mochila' ? 1 : 0; if(ARC) return v; const MJ = (D.taller && D.taller.mejoras) || [], H = (Pa.pueblo && Pa.pueblo.mejoras) || {};
  for(const m of MJ) if(H[m.id] && m.efecto && m.efecto[ef] !== undefined) v = ef === 'mochila' ? v * m.efecto[ef] : v + m.efecto[ef]; return v; }
let descansado = false;   // has dormido en casa antes de esta bajada
function capacity(){ if(ARC) return 1e9; return Math.round(cfg.cap * mejora('mochila') * (descansado ? ((D.casaDeep && D.casaDeep.dormir.carga) || 1.25) : 1) * (has('mochila_cuero') ? cv_('mochila_cuero', 1.5) : 1)); }
const inMud = (r, c) => tAt(r, c) === MUD;
function canStand(r, c){ if(p.onPlat && r === SURF-2 && c === 7) return true; const below = tAt(r+1, c); return isSolid(below) || below === LADDER || below === PLANK || below === PROP || tAt(r, c) === LADDER; }
function passable(r, c){ const v = tAt(r, c); return !isSolid(v) && !rocks.some(k => k.c === c && Math.abs(k.y - r) < 1); }
function hit(r, c, dir){
  const R = W.rows[r], v = R.t[c];
  p.act = dir.y > 0 ? 'picar_abajo' : 'picar_lado'; p.actT = 0;
  // con el taladro del tejón, la roca maciza (azul) se rompe a golpes; las compuertas de la noria no
  if(v === ROCK && mejora('taladro') > 0 && !(W.compuertas || []).includes(r*16 + c)){
    if(R.hp[c] >= 999) R.hp[c] = (D.taladro && D.taladro.golpes) || 6;
    p.act = dir.y > 0 ? 'picar_abajo' : 'picar_lado'; p.actT = 0;
    R.hp[c]--; digT = JU.tiempoGolpe; lamp -= LA.costeGolpe; burst(r+0.5, c+0.5, '#5b6ee1', 4); SND(R.hp[c] > 0 ? 'clin' : 'rompe');
    if(R.hp[c] <= 0){ setT(r, c, AIR); W.rows[r].nat[c] = 1; burst(r+0.5, c+0.5, '#3f3f74', 10); }
    return;
  }
  if(INFO[v].hp >= 999){
    digT = 0.3; burst(r+0.5, c+0.5, INFO[v].madre ? '#696a6a' : '#cbdbfc', 4); SND('clin');
    if(lockMsgT <= 0){ floats.push({x:c+0.5, y:r, txt: INFO[v].madre ? 'Roca madre: no se puede romper' : 'Roca maciza: hace falta un taladro', life:1.4, col:'#cbdbfc'}); lockMsgT = 1.6; }
    return;
  }
  if(v === RUBBLE){ clearRubble(r, c); digT = JU.tiempoGolpe*(prisa > 0 ? 0.5 : 1); lamp -= LA.costeGolpe; SND('escombro'); if(ARC && ARC.golpe) ARC.golpe('escombro', false, r, c); return; }
  // un golpe menos (mínimo uno): carta del pico afilado y pico restaurado del tejón
  const menos = (has('pico_afilado') ? 1 : 0) + mejora('golpe'); if(menos && R.hp[c] === INFO[v].hp) R.hp[c] = Math.max(1, R.hp[c] - menos);
  R.hp[c]--; digT = JU.tiempoGolpe*(prisa > 0 ? 0.5 : 1); lamp -= LA.costeGolpe;
  burst(r+0.5, c+0.5, '#d9a066', 2);
  if(R.hp[c] > 0) SND('golpe');
  if(R.hp[c] <= 0){
    setT(r, c, AIR); SND('rompe');
    burst(r+0.5, c+0.5, v === RUBBLE ? '#847e87' : '#8f563b', 7);
    if(INFO[v].val){
      const n = has('codicia') ? 2 : 1; let got = 0;
      for(let i=0;i<n;i++){ if(weight() + INFO[v].val <= capacity()){ bag[v] = (bag[v]||0) + 1; got++; } else stat('per', INFO[v].key, 1); }
      if(got) renderInv(v);
      if(got < n){ SND('clin'); floats.push({x:c+0.5, y:r, txt:'Mochila llena: ' + INFO[v].n.toLowerCase() + ' perdido', life:1.4, col:'#d95763'}); }
    }
    if(ARC && ARC.golpe) ARC.golpe(INFO[v].key, !!INFO[v].val, r, c);
    if(ARC && ARC.grupo && INFO[v].val){
      const seen = new Set([r*16 + c]), q = [[r, c]], cel = [];
      while(q.length && cel.length < 60){ const [rr, cc] = q.pop();
        for(const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]){ const r2 = rr+dr, c2 = cc+dc, k = r2*16 + c2;
          if(c2 < 0 || c2 >= COLS || r2 < SURF || seen.has(k) || tAt(r2, c2) !== v) continue; seen.add(k); q.push([r2, c2]); cel.push([r2, c2]); } }
      cel.forEach(([r2, c2], i) => { setT(r2, c2, AIR); bag[v] = (bag[v]||0) + 1; burst(r2+0.5, c2+0.5, '#fbf236', 5); if(ARC.golpe) ARC.golpe(INFO[v].key, true, r2, c2); });
      if(cel.length){ renderInv(v); SND('rompe'); shakeKick = Math.max(shakeKick, Math.min(3, cel.length*0.3)); }
    }
  }
}
function clearRubble(r0, c0){
  const seen = new Set([r0*16+c0]), q = [[r0,c0]], cells = [];
  while(q.length && cells.length < cfg.rubMax){
    const [r,c] = q.pop(); cells.push([r,c]);
    for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){ const rr=r+dr, cc=c+dc, k=rr*16+cc; if(cc<0||cc>=COLS||rr<SURF||seen.has(k)||tAt(rr,cc)!==RUBBLE) continue; seen.add(k); q.push([rr,cc]); }
  }
  for(const [r,c] of cells){
    setT(r, c, AIR);
    if(Math.random() < 0.5) burst(r+0.5, c+0.5, '#847e87', 3);
  }
  if(cells.length > 3) floats.push({x:c0+0.5, y:r0, txt:'¡Fuera escombro! ('+cells.length+')', life:1, col:'#9badb7'});
}
function updatePlayer(dt){
  digT -= dt; moveT -= dt; p.actT += dt; driftT -= dt; prisa = Math.max(0, prisa - dt); luzTotal = Math.max(0, luzTotal - dt);
  for(const k in tapped) tapped[k] = Math.max(0, tapped[k] - dt);
  if(p.stun > 0){ p.stun -= dt; if(p.stun > 0){ moveT = Math.max(moveT, 0.01); } }
  // movimiento suave hacia la casilla destino
  const mudHere = inMud(p.r, p.c);
  const sp = (p.falling ? (mudHere ? BA.hundimiento : JU.velocidadCaida) : 1/(stepTime()*(mudHere ? BA.pasoMult : 1))) * dt;
  if(p.falling){
    const dx = p.c - p.x, dy = p.r - p.y, dd = Math.hypot(dx, dy);
    if(dd <= sp){ p.x = p.c; p.y = p.r; } else { p.x += dx/dd*sp; p.y += dy/dd*sp; }
  } else {
    p.x += Math.sign(p.c - p.x) * Math.min(Math.abs(p.c - p.x), sp);
    p.y += Math.sign(p.r - p.y) * Math.min(Math.abs(p.r - p.y), sp);
  }
  // posición dibujada: en el aire se suaviza para que la diagonal no vaya a saltitos
  p.sx = p.falling && p.sx !== undefined ? p.sx + (p.x - p.sx)*Math.min(1, dt*14) : p.x;
  const settled = p.x === p.c && p.y === p.r;
  if(settled){
    if(!canStand(p.r, p.c) && passable(p.r+1, p.c)){
      // en el aire se puede uno ir un poco hacia los lados
      const ax = JU.controlEnCaida > 0 && !looking && p.stun <= 0 ? (want('R')?1:0) - (want('L')?1:0) : 0;
      const side = p.falling && ax && driftT <= 0 && p.c+ax >= 0 && p.c+ax < COLS && passable(p.r, p.c+ax);
      if(side && passable(p.r+1, p.c+ax)){         // en diagonal: a la vez hacia el lado y hacia abajo
        p.c += ax; p.r++; p.face = ax; driftT = JU.controlEnCaida; tapped.L = tapped.R = 0; p.fallN = (p.fallN||0) + 1;
      } else if(side){                              // hay suelo al lado: se agarra al saliente
        p.c += ax; p.face = ax; driftT = JU.controlEnCaida; tapped.L = tapped.R = 0;
      } else { p.r++; p.falling = true; p.fallN = (p.fallN||0) + 1; }
      if(inMud(p.r, p.c) || lvAt(p.r, p.c) >= 0.5) p.fallN = 0;   // el barro y el agua (media casilla o más) amortiguan: dentro no hay caída larga
    }
    else {
      if(p.falling){
        p.falling = false;
        const n = p.fallN||0;
        if(n >= 2) SND('aterriza', Math.min(1, 0.4 + n*0.08));
        if(n >= JU.caidaLargaDesde){ shakeKick = Math.max(shakeKick, TB.alAterrizar); burst(p.r+0.95, p.c+0.5, '#8f563b', 8); }
        // daño por caída: quita lámpara (fijo, o más por cada casilla de más)
        if(cfg.caida === '1' && n >= cfg.caidaDesde){
          // caer sobre arena apenas hace daño
          const sobreArena = isSand(tAt(p.r+1, p.c)), k = sobreArena ? ((D.caida && D.caida.arena) ?? 0.25) : 1;
          const rod = has('rodillas') ? cv_('rodillas', 0.5) : 1; if(rod < 1 && ungLlevo.rodillas) gastarUng('rodillas');   // ungüento de rodillas de topo
          const dmg = Math.round(k*rod*(cfg.caidaDanio + (cfg.caidaModo === 'crece' ? (n - cfg.caidaDesde)*cfg.caidaCrece : 0)));
          lamp -= dmg; SND('tropiezo'); if(ARC && ARC.dano) ARC.dano('caida'); floats.push({x:p.c+0.5, y:p.r-0.2, txt:'¡Caída! -' + dmg + '% luz', life:1.3, col:'#d95763'});
        }
      }
      p.fallN = 0;
      if(p.onPlat && want('D') && bajadaBloqueada()){ tapped.D = 0; if(lockMsgT <= 0){ decir('triste', 'No puedo bajar… Sin el ascensor no tendría forma de volver a subir.'); lockMsgT = 4; SND('clin'); } }
      else if(p.onPlat && want('D')){ tapped.D = 0; p.onPlat = false; platOpen = 1; SND('trampilla'); floats.push({x:p.c+0.5, y:p.r-0.3, txt:'¡Allá voy!', life:0.9, col:'#fbf236'}); }
      else if(moveT <= 0 && p.slide && deslizar()){}
      else if(moveT <= 0 && digT <= 0 && p.stun <= 0 && !looking){
        const ax = (want('R')?1:0) - (want('L')?1:0);
        if(ax){ tapped.L = tapped.R = 0; }
        if(ax && p.onPlat && ARC && ARC.jaula && ARC.jaula(ax)){ input.L = input.R = false; moveT = 0.22; return; }
        if(ax && p.onPlat) p.onPlat = false;
        if(ax){
          p.face = ax;
          const tc = p.c + ax, v = tAt(p.r, tc);
          if(tc >= 0 && tc < COLS){
            if(passable(p.r, tc)){ p.c = tc; moveT = stepTime()*(inMud(p.r, tc) || mudHere ? BA.pasoMult : 1); SND('paso', 0.6); p.slide = tAt(p.r+1, tc) === ICE ? ax : 0; }
            else if(v === DOOR) tryDoor(p.r, tc);
            else if(v === PASS) enterPass(p.r, tc);
            else if(isSolid(v)) hit(p.r, tc, {x:ax, y:0});
          }
        } else if(want('D')){ tapped.D = 0;
          const v = tAt(p.r+1, p.c);
          if(v === LADDER || passable(p.r+1, p.c)){ p.r++; moveT = stepTime(); }
          else if(isSolid(v)) hit(p.r+1, p.c, {x:0, y:1});
        } else if(want('U')){ tapped.U = 0;
          const up = tAt(p.r-1, p.c), lift = W.items.find(i => i.alive && i.k === 'lift' && i.r === p.r && i.c === p.c);
          if(lift) useLift();
          else if(itemHere('ascensor')){ const st = ascState(); if(st === 'roto') toast('El ascensor ya no está', 'Se quedó arriba, roto y echando humo'); else if(st !== 'pieza' || bag['o:pieza_ascensor']) useElevator(); else toast('Un ascensor viejo', 'Está roto: le falta una pieza del mecanismo'); }
          else if(up === DOOR) tryDoor(p.r-1, p.c);          // puertas y pasadizos también se abren desde abajo
          else if(up === PASS) enterPass(p.r-1, p.c);
          else if(tAt(p.r, p.c) === LADDER && passable(p.r-1, p.c)){ p.r--; moveT = stepTime(); }
          else if(tAt(p.r, p.c) !== LADDER && floats.length < 6 && lockMsgT <= 0){ floats.push({x:p.c+0.5, y:p.r-0.2, txt:'Pon una escalera', life:1, col:'#d9a066'}); lockMsgT = 1.2; }
        }
      }
    }
  }
  // animación
  const moving = !settled && !p.falling;
  if(p.stun > 0) p.anim = 'reposo';
  else if(p.act && p.actT < 0.32) p.anim = p.act;
  else { p.act = null; p.anim = p.falling ? ((p.fallN||0) >= JU.caidaLargaDesde ? 'caida_larga' : 'caer') : moving ? 'andar' : 'reposo'; }
  // lámpara, agua y gas
  const wetLv = lvAt(p.r, p.c);
  // la lámpara solo se moja cuando el agua llega a media altura del topo (una lámina fina no la toca)
  const mojaDesde = AG.mojaLamparaDesde ?? 0.5;
  wet = wetLv >= mojaDesde || mudHere;
  const cera = has('cera_nenufar');   // ungüento de cera de nenúfar: la lámpara no se moja (el barro sí la ahoga)
  if(cera && wetLv >= mojaDesde && ungLlevo.cera_nenufar) gastarUng('cera_nenufar');
  const wetMult = Math.max(wetLv >= mojaDesde && !cera ? LA.multMojada : 1, mudHere ? BA.multLuz : 1);
  // aire: bajo la superficie (tu casilla llena y la de encima también) se gasta
  // bajo el agua en cuanto te cubre la cabeza; en el barro, cuando te cubre del todo
  const under = lvAt(p.r, p.c) >= (AG.ahogaDesde ?? 0.7) || (mudHere && (tAt(p.r-1, p.c) === MUD || lvAt(p.r-1, p.c) > 0.5));
  submerged = under;
  if(under && ungLlevo.pulmones) gastarUng('pulmones');   // el ungüento de pulmones de topo se gasta al meterte bajo el agua
  if(under && !airWarn){ airWarn = true; toast('¡Bajo el agua!', 'Tienes '+Math.round(airMax())+' s de aire: sal antes de que se acabe'); }
  if(under){ const before = Math.ceil(air); air -= dt; if(Math.ceil(air) !== before && air < 4) SND('clin'); if(air <= 0){ air = 0; die('drown'); } }
  else air = Math.min(airMax(), air + dt*AI.recupera);
  gasNear = false;
  const GA = PE.grisuAviso;
  for(let r=p.r-GA; r<=p.r+GA && !gasNear; r++) for(let c=p.c-GA; c<=p.c+GA; c++) if(tAt(r,c) === GAS){ gasNear = true; break; }
  if(gasNear && !roomsSeen.has('gas')){ roomsSeen.add('gas'); toast('La llama se vuelve azul', 'Hay una bolsa de gas cerca. Baja la mecha para pasar'); }
  if(wick && lamp > 0 && (tAt(p.r, p.c) === GAS || tAt(p.r-1, p.c) === GAS)) explode(tAt(p.r, p.c) === GAS ? p.r : p.r-1, p.c);
  const L = layout(p.r);
  const inRoom = L.part !== undefined && L.part > 0 && L.part < ROOM_H-1;
  const atFlame = inRoom && LLAMAS.some(cl => Math.abs(p.x - cl) <= SA.radioLlama);
  if(atFlame){ if(lamp < 100 && Math.random() < dt*20) burst(p.y+0.2, p.x+0.5, '#fbf236', 1); lamp = Math.min(100, lamp + LA.recargaSala*dt); }
  else if(!L.surface && !inRoom) lamp -= cfg.drain*dt*(wick ? 1 : LA.multMechaBaja)*wetMult*(has('mecha_cera') ? cv_('mecha_cera', 0.75) : 1)*(has('codicia') ? cv_('codicia', 1.25) : 1);
  // lámpara baja: un latido que se acelera según se apaga, y los bordes de la pantalla se oscurecen a su ritmo
  latActivo = !dead && !inRoom && !L.surface && lamp > 0 && lamp < (LA.latidoDesde ?? 25);
  if(latActivo){ latT -= dt; if(latT <= 0){ const de = LA.latidoDesde ?? 25; latT = lamp < 10 ? 0.5 : 0.6 + (lamp - 10)/(de - 10)*0.5; latPulso = 1; SND('latido', 0.9); } }
  else latT = 0;
  latPulso = Math.max(0, latPulso - dt*2.4);
  // brasas encendidas bajo los pies: queman la lámpara
  { const br = W.items.find(i => i.alive && i.k === 'brasa' && !i.apagada && i.r === p.r && i.c === p.c);
    if(br){ lamp -= dt*(D.brasas ? D.brasas.quema : 9); if(Math.random() < dt*12) burst(p.y + 0.8, p.x + 0.5, Math.random() < 0.5 ? '#df7126' : '#fbf236', 1);
      if(!roomsSeen.has('brasas')){ roomsSeen.add('brasas'); decir('asustado', '¡Quema! Estas brasas me están consumiendo la lámpara… Si pudiera apagarlas con agua…'); } } }
  // cerca del respiradero: la lámpara se aviva, la cámara tiembla un poco y se oye a la montaña soplar
  { const v = W.items.find(i => i.alive && i.k === 'vent' && Math.abs(i.r - p.r) < 8 && Math.abs(i.c - p.c) < 9);
    if(v){ const d = Math.hypot(v.r - p.r, (v.c - p.c)*0.8);
      if(d < 4){ lamp = Math.min(100, lamp + dt*8); shake = Math.max(shake, 0.7*(1 - d/4)); if(Math.random() < dt*4) burst(p.y + 0.3, p.x + 0.5, '#fbf236', 1); }
      ventSnd -= dt; if(ventSnd <= 0){ ventSnd = 2.6; SND('soplido', Math.max(0.15, 1 - d/9)); } } }
  // arena encima: te va cubriendo
  if(isSand(tAt(p.r-1, p.c)) && !inRoom){ buried += dt; } else buried = Math.max(0, buried - dt*1.5);
  if(buried > JU.sepultadoEn) die('buried');
  // objetos
  for(const it of W.items){
    if(!it.alive || it.k === 'moth') continue;
    if(it.r === p.r && it.c === p.c){
      if(it.k === 'llave'){ it.alive = false; llaves++; SND('aceite'); renderInv(); burst(it.r+0.5, it.c+0.5, '#fbf236', 12); floats.push({x:it.c+0.5, y:it.r, txt:'+1 llave', life:1.2, col:'#fbf236'}); }
      else if(it.k === 'herr'){ it.alive = false; SND('poner'); const n = RC.cantidad;
        if(it.tipo === 'puntal') props += n; else ladders += n; renderInv();
        burst(it.r+0.5, it.c+0.5, '#d9a066', 10); floats.push({x:it.c+0.5, y:it.r, txt:'+'+n+' '+(it.tipo === 'puntal' ? 'puntal' : 'escalera'), life:1.2, col:'#fbf236'}); }
      else if(it.k === 'vent'){ if(!it.avisado){ it.avisado = true; decir('sorprendido', '¡Qué calor sube por esta grieta! La lámpara se aviva…'); }
        // respiradero abierto: en el mapa, la zona de esta mina reverdece
        const mm = P1.real && D.minas.find(m => m.pozo === PK);
        if(mm && !Pa.bandera('respiradero_' + mm.id)){ Pa.ponerBandera('respiradero_' + mm.id); SND('abrir');
          const ai = D.casaDeep && D.casaDeep.armario.minas[mm.id], ad = ai && ((D.arcade && D.arcade.aspectos) || []).find(a => a.id === ai);
          if(ad) setTimeout(() => toast('¡Aspecto nuevo: ' + ad.nombre + '!', 'Está en el armario de tu casa'), 2500); } }
      else if(it.k === 'ascensor'){ if(!it.avisado){ it.avisado = true; const st = ascState();
        toast(st === 'roto' ? 'El hueco del ascensor' : 'El ascensor', st === 'roto' ? 'El ascensor se quedó arriba, roto' : st !== 'pieza' ? 'Arreglado por el tejón: pulsa el botón o arriba para subir' : bag['o:pieza_ascensor'] ? 'Tienes la pieza: pulsa el botón o arriba para ponerla' : 'Está roto: le falta una pieza del mecanismo'); } }
      else if(it.k === 'carga'){ verMontacargas(it); if(!it.avisado){ it.avisado = true; toast('Montacargas', W.cargaOk.includes(it.room) ? 'Manda la carga al almacén y sigue bajando' : kitPara(it) ? 'Está roto, pero llevas el kit del tejón para arreglarlo' : 'Está roto: pide ' + costTxt(it.room) + ' (o un kit del tejón)'); } }
      else if(it.k === 'lift'){ if(!it.avisado){ it.avisado = true; toast('Montacargas viejo', 'Pulsa arriba para subir al tiro principal'); } }
      else if(it.k === 'texto'){ if(!it.avisado){ it.avisado = true;
        if(it.tipo === 'deep'){ decir(it.cara || 'pensativo', it.texto || '…'); for(const k in input){ input[k] = false; tapped[k] = 0; } }   /* Deep se para a decirlo */ else cartel(it.titulo || '', it.texto || '', it.gif || ''); } }
      else if(it.k === 'portal'){ if(!it.avisado){ it.avisado = true; decir('pensativo', 'Una puerta de la cuadrilla… Está atrancada por dentro.'); } }
      else if(it.k === 'oil'){ const g = cfg.oilGain*(has('bidon_grande') ? cv_('bidon_grande', 2) : 1); it.alive = false; SND('aceite'); lamp = Math.min(100, lamp + g); burst(it.r+0.5, it.c+0.5, '#fbf236', 14); floats.push({x:it.c+0.5, y:it.r, txt:'+'+g+'% luz', life:1.2, col:'#fbf236'}); }
      else if(it.k === 'cofreSala' && !W.rewarded.includes(it.room)) openRoomChest(it);
      else if(it.k === 'cofrePieza' && !it.abierto) openPieceChest(it);
      else if(it.k === 'obj') pickObject(it);
      else if(it.k === 'bag'){ it.alive = false; SND('mochila');
        // objetos (no pesan) y minerales hasta llenar la mochila; lo que no cabe se queda en el pozo (depósito)
        const mins = {}; for(const k in W.bag.items){ if(String(k).startsWith('o:')) bag[k] = (bag[k]||0) + W.bag.items[k]; else mins[k] = W.bag.items[k]; }
        const sobra = meterEnMochila(mins);
        if(sobra) setTimeout(() => toast('No puedes llevarlo todo', 'Te quedas con lo más valioso; ' + sobra + ' de mineral se queda en el pozo'), 1600);
        const bp = W.bag.puntales||0, be = W.bag.escaleras||0; props += bp; ladders += be;
        if(W.bag.kitMc){ kitLlevo = true; Pa.pueblo.kitMcMochila = false; Pa.guardar(); }
        W.bag = null; renderInv(); toast('Mochila recuperada', 'Todo lo que perdiste vuelve contigo' + (bp || be ? ' (' + bp + ' puntales y ' + be + ' escaleras)' : '')); burst(it.r+0.5, it.c+0.5, '#fbf236', 20); }
    }
  }
  // avisos
  const depth = Math.max(0, TC.base + p.r - SURF + 1); if(depth > maxDepth){ maxDepth = depth; if(!ARC && Pa.estad && P1.real){ const E = Pa.estad(); if(depth > E.record) E.record = depth; } }
  if(TC.principal && p.r > (W.record||0)) W.record = p.r;
  if(inRoom && !roomsSeen.has(L.room) && ARC){ roomsSeen.add(L.room); SND('sala'); if(ARC.sala) ARC.sala(L.room); }
  if(inRoom && !roomsSeen.has(L.room)){
    roomsSeen.add(L.room); SND('sala');
    const bits = ['Recarga la lámpara en la llama'];
    if(!W.rewarded.includes(L.room)) bits.push('abre el cofre');
    if(hasWheel(L.room) && !spun.has(L.room)) bits.push('gira la ruleta');
    toast('Sala segura', bits.join(' · '));
  }
  // ruleta de cartas: se gira al ponerse delante (una vez por bajada)
  if(inRoom && settled && hasWheel(L.room) && !spun.has(L.room) && p.c === SA.columnaRuleta && p.r === ROOM_ROW[L.room] + ROOM_H - 2){ spun.add(L.room); openRuleta(); }
  if(has('carpintero')){ const step = cv_('carpintero', 10), n = Math.floor(maxDepth/step); if(n > carpDone){ ladders += n - carpDone; carpDone = n; renderInv(); floats.push({x:p.c+0.5, y:p.r-0.4, txt:'+1 escalera (Carpintero)', life:1.2, col:'#fbf236'}); } }
  if(L.part !== undefined) lastRoomFloor = Math.max(lastRoomFloor, ROOM_ROW[L.room] + ROOM_H - 1);
  if(L.part === undefined && !L.surface && L.seg > segSeen){ segSeen = L.seg; toast('Tramo '+(L.seg+1), TRAMOS[L.seg].n); }
  if(TC.principal && !newGround && prevRecord > ROOM_ROW[0] && p.r > prevRecord){ newGround = true; toast('Terreno nuevo', 'Has pasado de donde llegaste la última vez'); SND('sala'); floats.push({x:p.c+0.5, y:p.r-0.4, txt:'¡Terreno nuevo!', life:1.4, col:'#fbf236'}); }
}
function explode(r0, c0){
  const seen = new Set([r0*16+c0]), q = [[r0,c0]], cells = [];
  while(q.length && cells.length < 140){
    const [r,c] = q.pop(); cells.push([r,c]);
    for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){ const rr=r+dr, cc=c+dc, k=rr*16+cc; if(cc<0||cc>=COLS||seen.has(k)||tAt(rr,cc)!==GAS) continue; seen.add(k); q.push([rr,cc]); }
  }
  if(useCard('llama_fria')){   // carta: la bolsa de gas se disipa sin explotar
    for(const [r,c] of cells){ setT(r, c, AIR); if(Math.random() < 0.4) burst(r+0.5, c+0.5, '#99e550', 2); }
    floats.push({x:c0+0.5, y:r0-0.4, txt:'Llama fría: el gas se disipa', life:1.6, col:'#99e550'}); return;
  }
  for(const [r,c] of cells){
    setT(r,c,AIR);
    for(let dr=-1; dr<=1; dr++) for(let dc=-1; dc<=1; dc++){
      const rr=r+dr, cc=c+dc; if(cc<0||cc>=COLS||rr<SURF) continue;
      const v = tAt(rr,cc); if(isSolid(v) && !isAnchor(v)){ if(INFO[v].val) stat('per', INFO[v].key, 1); setT(rr,cc,AIR); burst(rr+0.5, cc+0.5, '#df7126', 3); }
    }
    if(Math.random() < 0.5) burst(r+0.5, c+0.5, '#fbf236', 3);
  }
  for(const it of W.items) if(it.k === 'moth' && cells.some(([r,c])=>Math.abs(it.y-r-0.5)<2 && Math.abs(it.x-c-0.5)<2)) it.alive = false;
  lamp -= PE.grisuLuz; flashT = 0.45; SND('explosion'); shakeKick = Math.max(shakeKick, 4);
  floats.push({x:c0+0.5, y:r0-0.4, txt:'¡Gas!', life:1.4, col:'#fbf236'}, {x:p.c+0.5, y:p.r+0.3, txt:'-'+PE.grisuLuz+'% luz', life:1.2, col:'#d95763'});
}
// Puntal (toque corto): en tu casilla sostiene el techo, aunque luego le quiten el suelo.
// Puntal (mantener pulsado): se pone tumbado como un tablón en el hueco que tienes delante a la altura de los pies (puente).
// Con «recoger puntales», pulsar Puntal encima de un puntal (o debajo de un tablón) lo recoge.
// Escaleras y puntales también se pueden poner dentro del agua: el agua de esa casilla sube a la de encima.
function placeTool(kind, mode){
  if(!started || dead || cashed) return;
  const v = tAt(p.r, p.c);
  if(mode !== 'puente' && mode !== 'lado' && (v === PROP || v === PLANK || v === LADDER) && esFijo(p.r, p.c)) return noTool('Es de la cuadrilla: está bien clavado');
  if(kind === 'prop' && mode === 'puente'){
    const fc = p.c + p.face;
    const gap = fc >= 0 && fc < COLS && !isSolid(tAt(p.r, fc)) && (isOpen(tAt(p.r+1, fc)) || tAt(p.r+1, fc) === WATER);
    if(!gap) return noTool('No hay hueco delante');
    if(props <= 0) return noTool('Sin puntales');
    if(!bridgeOK(p.r+1, fc)) return noTool('Demasiado largo: no aguantaría');
    putTile(p.r+1, fc, PLANK); props--; SND('poner'); renderInv();
    floats.push({x:fc+0.5, y:p.r+0.6, txt:'Puente', life:0.9, col:'#fbf236'}); return;
  }
  if(kind === 'prop' && (v === PROP || v === PLANK) && cfg.recoger === '1'){ takeTile(p.r, p.c); props++; SND('poner'); renderInv(); floats.push({x:p.c+0.5, y:p.r-0.2, txt: v === PLANK ? 'Tablón recogido' : 'Puntal recogido', life:0.9, col:'#fbf236'}); return; }
  if(kind === 'lad' && mode === 'lado') return ladderSide();
  if(kind === 'lad' && v === LADDER && cfg.escala === '1') return ladderTap();
  if(v !== AIR && v !== WATER){ floats.push({x:p.c+0.5, y:p.r-0.2, txt:'Aquí no cabe', life:0.9, col:'#d9a066'}); return; }
  if(kind === 'prop'){ if(props <= 0) return noTool('Sin puntales'); putTile(p.r, p.c, PROP); props--; }
  else { if(ladders <= 0) return noTool('Sin escaleras'); putTile(p.r, p.c, LADDER); ladders--; if(cfg.escala === '1'){ if(!W.escalas) W.escalas = []; W.escalas.push({r:p.r, c:p.c, len:1, abierta:false}); } }
  SND('poner');
  renderInv();
}
// ---------- escalas desplegables (0.207b) ----------
// 1.er toque: pones la escalera en tu casilla. Si hay suelo debajo, el 2.º toque la guarda.
// Si no hay suelo, el 2.º toque la despliega hacia abajo (como una escala que se desenrolla) hasta el siguiente
// obstáculo, con 4 casillas como mucho además de la primera; el 3.er toque la guarda entera (vuelve 1 escalera).
const ESC_MAX = 4;
let unroll = null;   // despliegue en marcha: {e, left, t}
function escalaAt(r, c){ return (W.escalas || []).find(e => e.c === c && r >= e.r && r < e.r + e.len); }
const unrollFree = (r, c) => { const v = tAt(r, c); return v === AIR || v === WATER || v === GAS; };
function ladderTap(){
  if(unroll) return;
  let e = escalaAt(p.r, p.c);
  if(!e){ e = {r:p.r, c:p.c, len:1, abierta:false}; W.escalas.push(e); }   // escaleras de antes: cuentan como una sola
  // la escalera está anclada arriba: solo se despliega o se recoge desde esa casilla (más adelante, un invento del tejón quitará esta limitación)
  if(p.r !== e.r && !Pa.bandera('escala_garfios')){ if(lockMsgT <= 0){ floats.push({x:p.c+0.5, y:p.r-0.2, txt:'Solo se recoge desde arriba, donde la anclaste', life:1.4, col:'#d9a066'}); lockMsgT = 1.4; } return; }
  if(!e.abierta && e.len === 1 && unrollFree(e.r + 1, e.c)){
    e.abierta = true; unroll = {e, left:ESC_MAX, t:0};
    floats.push({x:e.c+0.5, y:e.r+0.6, txt:'¡Escala!', life:0.9, col:'#fbf236'}); return;
  }
  // guardar la escala entera
  for(let k=0;k<e.len;k++){ const r = e.r + k; if(tAt(r, e.c) === LADDER) takeTile(r, e.c); }
  W.escalas = W.escalas.filter(x => x !== e);
  ladders++; SND('poner'); renderInv();
  floats.push({x:e.c+0.5, y:p.r-0.2, txt:'Escalera recogida', life:0.9, col:'#fbf236'});
}
// mantener pulsado Escalera: la pone en la casilla de al lado (hacia donde miras). Si debajo no hay suelo, se despliega sola
function ladderSide(){
  if(unroll) return;
  const fc = p.c + p.face;
  if(fc < 0 || fc >= COLS || !unrollFree(p.r, fc)) return noTool('No hay hueco al lado');
  if(ladders <= 0) return noTool('Sin escaleras');
  putTile(p.r, fc, LADDER); ladders--; SND('poner'); renderInv();
  if(cfg.escala === '1'){
    const e = {r:p.r, c:fc, len:1, abierta:false}; if(!W.escalas) W.escalas = []; W.escalas.push(e);
    if(unrollFree(p.r + 1, fc)){ e.abierta = true; unroll = {e, left:ESC_MAX, t:0.12}; floats.push({x:fc+0.5, y:p.r+0.6, txt:'¡Escala!', life:0.9, col:'#fbf236'}); }
  }
}
function updateUnroll(dt){
  if(!unroll) return;
  unroll.t -= dt; if(unroll.t > 0) return;
  const e = unroll.e, r = e.r + e.len;
  if(unroll.left <= 0 || !unrollFree(r, e.c) || tAt(e.r, e.c) !== LADDER){ unroll = null; return; }
  putTile(r, e.c, LADDER); e.len++; unroll.left--; unroll.t = 0.07;
  SND('escala', 0.8); burst(r + 0.2, e.c + 0.5, '#d9a066', 3);
}
// limpia escalas que ya no están (el derrumbe las tapó, se rellenaron...)
function tidyEscalas(){
  W.escalas = (W.escalas || []).filter(e => tAt(e.r, e.c) === LADDER);
  for(const e of W.escalas){ let n = 0; while(n < e.len && tAt(e.r + n, e.c) === LADDER) n++; e.len = Math.max(1, n); }
}
// pone una pieza en una casilla; si había agua, el agua sigue ahí (la escalera o el puntal quedan dentro)
function putTile(r, c, v){ const lv = lvAt(r, c); setT(r, c, v); W.rows[r].lv[c] = lv; }
// quita una pieza (recoger un puntal): si tenía agua, queda el agua
function takeTile(r, c){ const lv = lvAt(r, c); setT(r, c, AIR); if(lv > 0.004){ setT(r, c, WATER); W.rows[r].lv[c] = lv; } }
// Un puente sigue la misma regla que los techos: desde una roca aguanta en voladizo tantos tablones como la cornisa,
// y si llega de roca a roca, el doble. (r, c) es un tablón que ya está o que se va a poner.
function bridgeOK(r, c){
  // de roca a roca en la misma fila: aguanta el doble
  { let a = c - 1, b = c + 1;
    while(a >= 0 && tAt(r, a) === PLANK) a--;
    while(b < COLS && tAt(r, b) === PLANK) b++;
    if(isSolid(tAt(r, a)) && isSolid(tAt(r, b)) && b - a - 1 <= 2*cfg.corn) return true; }
  // si no, se cuentan los tablones desde el último agarre de roca, aunque se cambie de altura o se pase por escaleras
  // o puntales (así no se puede encadenar puente, escalera encima, otro puente… sin límite)
  const agarre = (rr, cc) => tAt(rr, cc) === PLANK && (isSolid(tAt(rr, cc-1)) || isSolid(tAt(rr, cc+1)) || isSolid(tAt(rr+1, cc)));
  const piso = (rr, cc) => { const v = tAt(rr, cc); return v === PLANK || v === LADDER || v === PROP; };
  const esTablon = (rr, cc) => rr === r && cc === c ? true : tAt(rr, cc) === PLANK;
  const ok0 = (rr, cc) => (rr === r && cc === c) ? (isSolid(tAt(r, c-1)) || isSolid(tAt(r, c+1)) || isSolid(tAt(r+1, c))) : agarre(rr, cc);
  const best = new Map(), q = [[r, c, 1]]; best.set(r*16 + c, 1);
  while(q.length){
    q.sort((x, y) => x[2] - y[2]); const [rr, cc, n] = q.shift();
    if(n > cfg.corn) continue;
    if(ok0(rr, cc)) return true;
    for(const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]){
      const r2 = rr + dr, c2 = cc + dc; if(c2 < 0 || c2 >= COLS || !piso(r2, c2)) continue;
      const n2 = n + (esTablon(r2, c2) ? 1 : 0), k = r2*16 + c2;
      if(best.has(k) && best.get(k) <= n2) continue; best.set(k, n2); q.push([r2, c2, n2]);
    }
  }
  return false;
}
function bridgeOK_old(r, c){
  let a = c - 1, b = c + 1;
  while(a >= 0 && tAt(r, a) === PLANK) a--;
  while(b < COLS && tAt(r, b) === PLANK) b++;
  for(let k=a+1; k<b; k++) if(isSolid(tAt(r+1, k))) return true;   // algún tablón apoyado en algo
  const la = isSolid(tAt(r, a)), lb = isSolid(tAt(r, b)), n = b - a - 1;
  if(la && lb) return n <= 2*cfg.corn;
  if(la || lb) return n <= cfg.corn;
  return false;
}
// tablones que se quedan sin sujeción (se picó la roca de al lado, por ejemplo): se caen y el puntal queda suelto
function checkPlanks(top, bot){
  for(let r=top; r<=bot; r++){ const R = W.rows[r]; if(!R) continue;
    for(let c=0;c<COLS;c++){
      if(R.t[c] !== PLANK || bridgeOK(r, c)) continue;
      setT(r, c, AIR); burst(r+0.2, c+0.5, '#d9a066', 6); SND('cae', near(r, c)*0.6);
      W.items.push({k:'herr', tipo:'puntal', r, c, alive:true, extra:true});
      if(Math.abs(r - p.r) < 10 && crackMsgT <= 0){ floats.push({x:c+0.5, y:r, txt:'Se cae el tablón', life:1, col:'#eec39a'}); crackMsgT = 0.6; }
    }
  }
}
function noTool(msg){ floats.push({x:p.c+0.5, y:p.r-0.2, txt:msg, life:1, col:'#d95763'}); }

// ---------- polillas ----------
function lightRadius(){ return (LA.radioMin + (LA.radioMax-LA.radioMin)*Math.max(0,lamp)/100) * (wick ? 1 : LA.multRadioMechaBaja); }
// las polillas ven tu luz desde más lejos cuanto más alumbras; con la mecha baja casi no te ven y van más despacio
function los(x0,y0,x1,y1,tr,tc){
  const dx = x1-x0, dy = y1-y0, n = Math.ceil(Math.hypot(dx,dy)*3);
  for(let i=1;i<n;i++){ const x = x0+dx*i/n, y = y0+dy*i/n, r = Math.floor(y), c = Math.floor(x); if(r===tr && c===tc) return true; if(isSolid(tAt(r,c))) return false; }
  return true;
}
// ---------- hielo (mina 4) ----------
// sobre el hielo resbalas: sigues una casilla más cada vez mientras haya hielo debajo y sitio delante
function deslizar(){
  const tc = p.c + p.slide;
  if(tAt(p.r+1, p.c) === ICE && tc >= 0 && tc < COLS && passable(p.r, tc)){ p.c = tc; p.face = p.slide; moveT = stepTime()*0.6; if(Math.random() < 0.5) burst(p.r+0.95, p.c+0.5, '#cbdbfc', 2); return true; }
  p.slide = 0; return false;
}
// la lámpara derrite el hielo de alrededor (deprisa con la mecha alta, casi nada con la baja) y deja una lámina de agua
const HI = D.hielo || {derriteAlta: 2.2, derriteBaja: 30, radio: 1.6, lamina: 0.3};
let deshielo = new Map();
function derretir(dt){
  if(lamp <= 0 || dead || !p) return;
  const vel = 1/(wick ? HI.derriteAlta : HI.derriteBaja), R = HI.radio, cx = p.x + 0.5, cy = p.y + 0.5;
  for(let r = Math.floor(cy - R) - 1; r <= Math.ceil(cy + R); r++) for(let c = Math.max(0, Math.floor(cx - R) - 1); c <= Math.min(COLS-1, Math.ceil(cx + R)); c++){
    if(tAt(r, c) !== ICE) continue;
    const d = Math.hypot(c + 0.5 - cx, r + 0.5 - cy); if(d > R + 0.4) continue;
    const k = r*16 + c, v = (deshielo.get(k) || 0) + dt*vel*(d < 1.2 ? 1 : 0.5);
    if(v < 1){ deshielo.set(k, v); if(Math.random() < dt*3) particles.push({x:c + Math.random(), y:r + 1, vx:0, vy:1.5, life:0.4, col:'#5fcde4'}); continue; }
    deshielo.delete(k); setT(r, c, WATER); const RR = W.rows[r]; RR.lv[c] = HI.lamina; RR.nat[c] = 1; SND('clin', 0.25);
  }
}
function updateMoths(dt){
  const px = p.x + 0.5, py = p.y + 0.3, R = lightRadius();
  for(const m of W.items){
    if(!m.alive || m.k !== 'moth' || Math.abs(m.y - py) > 24) continue;
    // metida en la roca (le cayó algo encima o se rellenó el hueco): muere
    if(isSolid(tAt(Math.floor(m.y), Math.floor(m.x)))){ m.alive = false; continue; }
    m.ph = (m.ph||0) + dt*22;
    if(m.bat){ murcielago(m, dt, px, py); continue; }
    const dx = px - m.x, dy = py - m.y, d = Math.hypot(dx,dy) || 1;
    const vel = PE.polillaVelocidad * (wick ? 1 : (PE.polillaMechaBaja ?? 0.5));
    let tvx, tvy;
    if(!dead && lamp > 0 && d < R*(PE.polillaVista ?? 1.1) && los(m.x,m.y,px,py,-1,-1)){ tvx = dx/d*vel; tvy = dy/d*vel; m.hunt = true; }
    else { m.ang = (m.ang||0) + (Math.random()-0.5)*dt*6; tvx = Math.cos(m.ang)*0.7; tvy = Math.sin(m.ang)*0.5; m.hunt = false; }
    m.vx = (m.vx||0) + (tvx - (m.vx||0))*Math.min(1, dt*3); m.vy = (m.vy||0) + (tvy - (m.vy||0))*Math.min(1, dt*3);
    // se mueven sin atravesar nada: miran el borde del cuerpo, no solo el centro
    const rad = 0.28, nx = m.x + m.vx*dt, ny = m.y + m.vy*dt;
    const freeAt = (x, y) => !isSolid(tAt(Math.floor(y - rad), Math.floor(x - rad))) && !isSolid(tAt(Math.floor(y - rad), Math.floor(x + rad))) && !isSolid(tAt(Math.floor(y + rad), Math.floor(x - rad))) && !isSolid(tAt(Math.floor(y + rad), Math.floor(x + rad)));
    if(!freeAt(nx, m.y)){ m.vx *= -0.6; m.ang = Math.PI - (m.ang||0); } else m.x = nx;
    if(!freeAt(m.x, ny)){ m.vy *= -0.6; m.ang = -(m.ang||0); } else m.y = ny;
    if(!dead && Math.abs(m.x - px) < 0.55 && Math.abs(m.y - (p.y+0.5)) < 0.6){
      m.alive = false; lamp -= PE.polillaLuz; if(ARC && ARC.dano) ARC.dano('polilla'); SND('polilla'); floats.push({x:px, y:p.y-0.1, txt:'-'+PE.polillaLuz+'% luz', life:1.2, col:'#d95763'}); burst(m.y, m.x, '#eec39a', 10);
    }
  }
}

const MU = D.murcielago || {luz: 15, despierta: 4.5, velocidad: 3, despierto: 9};
function murcielago(m, dt, px, py){
  const d = Math.hypot(px - m.x, py - m.y);
  if(m.dormido){
    // la luz fuerte los mantiene dormidos; con la mecha baja (o la lámpara apagada) se despiertan si pasas cerca
    if(!dead && (!wick || lamp <= 0) && d < MU.despierta && los(m.x, m.y, px, py, -1, -1)){ m.dormido = false; m.t = MU.despierto; m.ang = Math.random()*Math.PI*2; SND('polilla', 0.8); floats.push({x:m.x, y:m.y-0.4, txt:'¡Murciélago!', life:1, col:'#d77bba'}); }
    return;
  }
  m.t -= dt; m.golpe = Math.max(0, (m.golpe || 0) - dt);
  let tvx, tvy;
  if(m.t > 0){ m.ang = (m.ang||0) + (Math.random()-0.5)*dt*14; tvx = Math.cos(m.ang)*MU.velocidad; tvy = Math.sin(m.ang)*MU.velocidad*0.8; }   // vuelo loco
  else { const dx = m.hx - m.x, dy = m.hy - m.y, dd = Math.hypot(dx, dy);   // vuelve a su sitio y se cuelga
    if(dd < 0.15){ m.x = m.hx; m.y = m.hy; m.dormido = true; m.vx = m.vy = 0; return; }
    tvx = dx/dd*MU.velocidad*0.7; tvy = dy/dd*MU.velocidad*0.7; if(m.t < -6){ m.x = m.hx; m.y = m.hy; m.dormido = true; return; } }
  m.vx = (m.vx||0) + (tvx - (m.vx||0))*Math.min(1, dt*5); m.vy = (m.vy||0) + (tvy - (m.vy||0))*Math.min(1, dt*5);
  const rad = 0.28, nx = m.x + m.vx*dt, ny = m.y + m.vy*dt;
  const freeAt = (x, y) => !isSolid(tAt(Math.floor(y - rad), Math.floor(x - rad))) && !isSolid(tAt(Math.floor(y - rad), Math.floor(x + rad))) && !isSolid(tAt(Math.floor(y + rad), Math.floor(x - rad))) && !isSolid(tAt(Math.floor(y + rad), Math.floor(x + rad)));
  if(!freeAt(nx, m.y)){ m.vx *= -0.8; m.ang = Math.PI - (m.ang||0); } else m.x = nx;
  if(!freeAt(m.x, ny)){ m.vy *= -0.8; m.ang = -(m.ang||0); } else m.y = ny;
  if(!dead && !m.golpe && Math.abs(m.x - px) < 0.55 && Math.abs(m.y - (p.y+0.5)) < 0.6){
    m.golpe = 1.5; lamp -= MU.luz; if(ARC && ARC.dano) ARC.dano('polilla'); SND('polilla'); floats.push({x:px, y:p.y-0.1, txt:'-' + MU.luz + '% luz', life:1.2, col:'#d95763'}); burst(p.y+0.3, p.x+0.5, '#d77bba', 8);
  }
}
// ---------- mecanismos de las piezas (pozo del agua) ----------
// Noria: cuando le llega agua, gira y abre su compuerta (la roca maciza marcada con G).
// Brasas: queman la lámpara si pasas por encima, hasta que el agua las apaga.
let foco = null;   // la cámara mira un momento a otro sitio (la reja de la noria al abrirse)
function mecanismos(top, bot){
  for(const it of W.items){
    // al ver la noria seca por primera vez, Deep da la pista
    if(it.alive && it.k === 'noria' && !it.activa && !it.vista && Math.abs(it.r - p.r) <= 3 && Math.abs(it.c - p.c) <= 6){ it.vista = true;
      decir('pensativo', 'Una noria vieja, seca… y una cadena que va hasta esa reja. Si le llegara agua, ¿giraría?'); }
    if(!it.alive || it.r < top - 4 || it.r > bot + 4) continue;
    if(it.k === 'noria' && !it.activa && lvAt(it.r, it.c) >= 0.25){
      it.activa = true; SND('noria'); SND('trampilla'); shakeKick = Math.max(shakeKick, 2.5);
      const cs = (W.compuertas || []).map(k => [Math.floor(k/16), k % 16]);
      for(const [r, c] of cs) if(tAt(r, c) === ROCK){ setT(r, c, AIR); W.rows[r].nat[c] = 1; burst(r+0.5, c+0.5, '#847e87', 10); }
      W.compuertas = [];
      // la cámara se va un momento a la reja que se abre y vuelve a Deep
      if(cs.length){ const g = cs[0]; foco = {r: g[0], c: g[1], t: 2.4}; }
      decir('sorprendido', '¡La noria gira! La cadena tira de la reja… ¡se ha abierto!');
      persist();
    }
    if(it.k === 'brasa' && !it.apagada && lvAt(it.r, it.c) >= 0.15){
      it.apagada = true; SND('siseo', near(it.r, it.c)); for(let i=0;i<6;i++) particles.push({x:it.c + 0.2 + Math.random()*0.6, y:it.r + 0.6, vx:(Math.random()-0.5)*1.5, vy:-2 - Math.random()*2, life:0.9, col:'#cbdbfc'});
    }
  }
}

// ---------- muerte y cobro ----------
function die(cause){
  if(dead || cashed) return;
  if(ARC){   // arcade: sin mochila ni derrumbe del tramo; la página del arcade decide (fin de partida o reaparecer)
    dead = {cause, n:0, lost:{props:0, ladders:0}}; deadT = 0; SND('muerte'); shakeKick = Math.max(shakeKick, 3);
    burst(p.y+0.5, p.x+0.5, cause === 'crush' ? '#eec39a' : '#fbf236', 24);
    if(ARC.muerte) ARC.muerte(cause); return;
  }
  if(Pa.estad) Pa.estad().muertes++;
  if(useCard('segunda')){   // carta: vuelves a la última sala segura con la mochila
    const r = lastRoomFloor >= ROOM_ROW[0] + ROOM_H - 1 ? lastRoomFloor - 1 : SURF - 2, c = r === SURF - 2 ? 7 : LLAMAS[0];
    p.r = r; p.y = r; p.c = c; p.x = c; p.sx = c; p.falling = false; p.fallN = 0; p.stun = 0; p.onPlat = r === SURF - 2; if(p.onPlat) platOpen = 0;
    lamp = Math.max(lamp, 60); buried = 0; air = airMax(); flashT = 0.5; SND('mochila');
    toast('¡Segunda oportunidad!', 'Vuelves a la última sala segura con tu mochila'); return;
  }
  dead = cause; deadT = 0; SND('muerte'); shakeKick = Math.max(shakeKick, 3);
  burst(p.y+0.5, p.x+0.5, cause === 'crush' ? '#eec39a' : '#fbf236', 24);
  const lost = {props, ladders};
  let saved = null;
  if(has('bolsillo')){   // carta: lo que más vale de la mochila llega al almacén
    let best = null; for(const k in bag) if(INFO[k] && bag[k] > 0 && (!best || bag[k]*INFO[k].val > bag[best]*INFO[best].val)) best = k;
    if(best){ saved = {n: bag[best], name: INFO[best].n}; Pa.almacen[INFO[best].key] = (Pa.almacen[INFO[best].key]||0) + bag[best]; delete bag[best]; }
  }
  const n = Object.values(bag).reduce((a,b)=>a+b,0);
  const oldBagLost = Object.values(MINA.tiros).some(w => w.bag);
  for(const w of Object.values(MINA.tiros)){ if(w.bag){ for(const k in w.bag.items) if(INFO[k]) stat('per', INFO[k].key, w.bag.items[k]); if(w.bag.kitMc){ Pa.pueblo.kitMc = null; Pa.pueblo.kitMcMochila = false; } } w.bag = null; w.items = w.items.filter(it => it.k !== 'bag'); }
  // la mochila guarda también los puntales y escaleras que llevabas (y el kit del tejón): al recuperarla vuelven contigo
  const herrs = (props||0) + (ladders||0);
  W.bag = n || herrs || kitLlevo ? {r:p.r, c:p.c, items:{...bag}, puntales:props||0, escaleras:ladders||0, kitMc:kitLlevo} : null;
  if(kitLlevo){ Pa.pueblo.kitMcMochila = true; kitLlevo = false; }
  // el último tramo (desde la última sala segura) se llena de escombro sin vetas
  // el primer tramo (antes de la primera sala) nunca se rellena: lo que haces al principio se respeta
  const top = Math.max(lastRoomFloor + 1, TC.principal && ROOM_ROW.length ? ROOM_ROW[0] + ROOM_H : SURF), bot = p.r + 2;
  fillQ = [];
  for(let r=top; r<=bot; r++) for(let c=0;c<COLS;c++){ const v = tAt(r,c); if(v !== ROCK && v !== BEAM && v !== DOOR && v !== PASS && v !== BEDROCK){ fillQ.push([r,c]); if(INFO[v].val) stat('per', INFO[v].key, 1); } }
  fillQ.sort((a,b)=> a[0]-b[0] || Math.random()-0.5);
  for(const it of W.items) if(it.r >= top && it.r <= bot && (it.k === 'oil' || it.k === 'moth')) it.alive = false;
  // las herramientas que te llevaste se quedan en la mochila; las del almacén siguen arriba
  if(D.herramientas.alMorir === 'perder') devolverKit(0, 0, 0); else { devolverKit(props, ladders, llaves); lost.props = 0; lost.ladders = 0; }
  Pa.guardar();
  dead = {cause, n, lost, oldBagLost, saved};
}
function fillType(r, c){ return vn(c/2.2, r/1.6, W.seed + 31) > 1 - D.muerte.piedraEnRelleno ? STONE : RUBBLE; }
function finishCollapse(){
  for(const [r,c] of fillQ) setT(r, c, fillType(r, c));
  fillQ = [];
  persist();
}
// guarda lo que llevas: minerales al almacén y objetos a la colección (al volver al pueblo o con el montacargas)
function bankBag(soloMinerales){
  let n = 0;
  for(const k in bag){
    if(!bag[k]) continue;
    if(k.startsWith('o:')){ if(soloMinerales) continue;
      const o = OBJ[k.slice(2)];
      if(o && o.color){ Pa.guardarEnColeccion('flor_mina', bag[k]); const F = Pa.pueblo.flores || (Pa.pueblo.flores = {}); if(!F[o.color.id]) F[o.color.id] = 'nueva'; }
      else Pa.guardarEnColeccion(k.slice(2), bag[k]);
      delete bag[k]; continue; }
    if(!ARC && Pa.estad){ const E = Pa.estad(); E.minerales[INFO[k].key] = (E.minerales[INFO[k].key] || 0) + bag[k]; }
    Pa.almacen[INFO[k].key] = (Pa.almacen[INFO[k].key]||0) + bag[k]; Pa.marcarVisto(INFO[k].key); stat('ext', INFO[k].key, bag[k]); n += bag[k]; delete bag[k];
  }
  return n;
}
let endInfo = null;
function cashOut(info){
  if(dead || cashed) return;
  cashed = true; endInfo = info || null;
  endBag = {...bag};
  bankBag(false);
  devolverKit(props, ladders, llaves); Pa.guardar();
  persist();
  showEnd();
}
function persist(){
  if(prueba || ARC) return;   // probando una pieza del editor: nada se guarda
  const tiros = {}; for(const id in MINA.tiros) tiros[id] = packWorld(MINA.tiros[id]);
  save(P1.guardado, {ver:WV, seed:MINA.seed, tiros, stats:MINA.stats});
}

function burst(y,x,col,n){ for(let i=0;i<n;i++) particles.push({x:x-0.2+Math.random()*0.4, y:y-0.2+Math.random()*0.4, vx:(Math.random()-0.5)*5, vy:-Math.random()*4.5, life:0.5+Math.random()*0.4, col}); }

// ---------- dibujo ----------
const PAL = DATA.pal;
function sprite(rows, pal, swap){
  const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
  const x = c.getContext('2d'), im = x.createImageData(c.width, c.height);
  rows.forEach((r,y)=>{ for(let i=0;i<r.length;i++){ const ch = r[i]; if(ch === '.') continue; let h = (swap && swap[ch]) || pal[ch]; if(h[0] !== '#') h = '#'+h; const o = (y*c.width+i)*4;
    im.data[o]=parseInt(h.slice(1,3),16); im.data[o+1]=parseInt(h.slice(3,5),16); im.data[o+2]=parseInt(h.slice(5,7),16); im.data[o+3]=255; } });
  x.putImageData(im,0,0); return c;
}
const DBPAL = Object.fromEntries(Object.entries(PAL).map(([k,v])=>[k, v[0]==='#'?v:'#'+v]));
const TS = {}; for(const [k, vs] of Object.entries(DATA.tiles)) TS[k] = vs.map(v => sprite(v, DBPAL));
const VS = {}; for(const [k, vs] of Object.entries(DATA.vetas)) VS[k] = vs.map(v => sprite(v, DBPAL));
const GS = DATA.grietas.map(v => sprite(v, DBPAL));
const BS = {}; for(const [m, B] of Object.entries(DATA.bordes)) BS[m] = Object.fromEntries(Object.entries(B).map(([k,v])=>[k, sprite(v, DBPAL)]));
const PS = Object.fromEntries(Object.entries(DATA.piezas).map(([k,v])=>[k, sprite(v, DBPAL)]));
const WS = DATA.agua.map(v => sprite(v, DBPAL));
// topo: un juego de fotogramas por estado de lámpara
const TP = DATA.topo, HERO = {};
for(const [st, col] of Object.entries(TP.lampara)){
  HERO[st] = {}; for(const [a, frs] of Object.entries(TP.anims)) HERO[st][a] = frs.map(f => sprite(f, TP.pal, {d: col}));
}
const TROP = {}; for(const [st, col] of Object.entries(TP.lampara)) TROP[st] = TP.tropiezo.map(f => sprite(f, TP.pal, {d: col}));
// aspectos (Deep Arcade): colores cambiados y, a veces, un adorno (orejas, cola) que se pinta sobre cada fotograma
let HSET = HERO, TSET = TROP;
function adorno(rows, tipo){
  if(!tipo) return rows;
  const g = rows.map(r => r.split('')), H = g.length, Wd = g[0].length;
  let x0 = 99, x1 = -1, y0 = 99;
  g.forEach((r, y) => r.forEach((ch, x) => { if(ch === 'a' || ch === 'b'){ x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); } }));
  if(x1 < 0) return rows;
  const put = (y, x, ch) => { if(y >= 0 && y < H && x >= 0 && x < Wd && (g[y][x] === '.' || ch !== '0')) g[y][x] = ch; };
  if(tipo === 'conejo') for(const ex of [x0 + 2, x1 - 3]){
    for(let k=1;k<=6;k++){ put(y0 - k, ex - 1, '0'); put(y0 - k, ex + 2, '0'); put(y0 - k, ex, 'a'); put(y0 - k, ex + 1, k > 1 && k < 6 ? 'm' : 'a'); }
    put(y0 - 7, ex, '0'); put(y0 - 7, ex + 1, '0'); }
  if(tipo === 'ardilla'){
    for(const ex of [x0 + 1, x1 - 1]){ put(y0 - 1, ex, 'a'); put(y0 - 2, ex, 'c'); put(y0 - 1, ex - 1, '0'); put(y0 - 1, ex + 1, '0'); put(y0 - 2, ex - 1, '0'); put(y0 - 2, ex + 1, '0'); put(y0 - 3, ex, '0'); }
    const tx0 = Math.max(0, x0 - 4);
    for(let k=0;k<11;k++){ const y = y0 + 4 + k, w = k < 2 || k > 8 ? 2 : 3;
      for(let i=0;i<w;i++) put(y, tx0 + i, i === 0 || k % 3 === 0 ? 'a' : 'b');
      put(y, tx0 - 1, '0'); put(y, tx0 + w, '0'); }
    put(y0 + 3, tx0, '0'); put(y0 + 3, tx0 + 1, '0'); put(y0 + 15, tx0, '0'); put(y0 + 15, tx0 + 1, '0'); }
  return g.map(r => r.join(''));
}
function aspecto(def){
  if(!def || !def.pal){ HSET = HERO; TSET = TROP; return; }
  const H = {}, TR = {};
  for(const [st, col] of Object.entries(TP.lampara)){
    const sw = Object.assign({d: col}, def.pal);
    H[st] = {}; for(const [a, frs] of Object.entries(TP.anims)) H[st][a] = frs.map(f => sprite(adorno(f, def.adorno), TP.pal, sw));
    TR[st] = TP.tropiezo.map(f => sprite(adorno(f, def.adorno), TP.pal, sw));
  }
  HSET = H; TSET = TR;
}
// retrato de un aspecto (para el menú y los avisos): el topo quieto, ampliado
function retratoAspecto(def, esc){
  const f = adorno(TP.anims.reposo[0], def && def.adorno), sw = Object.assign({d: TP.lampara.alta}, (def && def.pal) || {});
  const c0 = sprite(f, TP.pal, sw), e = esc || 3, c = document.createElement('canvas'); c.width = 27*e; c.height = 28*e;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c0, 0, 0, 27, 28, 0, 0, 27*e, 28*e); return c.toDataURL();
}
const PACK = Object.fromEntries(Object.entries(TP.mochila).map(([k,v])=>[k, {x:v.x, y:v.y, c:sprite(v.px, TP.pal)}]));
const ANIM_FPS = {reposo:2, andar:9, picar_lado:12, picar_abajo:10, caer:2, caida_larga:10};

const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const lc = document.createElement('canvas'), lctx = lc.getContext('2d');
const stage = document.getElementById('stage');
let VW = COLS*T, VH = 400, scale = 1, cam = -2, zoom = CA.zoomCerca, ZCLOSE = CA.zoomCerca, camX = COLS*T/2;
// La mina se dibuja a pocos píxeles (pixel art: el navegador la amplía sin suavizar, se ve igual) y los textos
// en una capa aparte a resolución completa, para que sigan nítidos. Mucho más ligero en móviles.
const tx = document.createElement('canvas'), txCtx = tx.getContext('2d');
let tctx = txCtx;   // dónde se dibujan los textos: la capa aparte, o la propia mina si ya va a resolución completa
tx.id = 'cvTxt'; stage.insertBefore(tx, cv.nextSibling);
let PX = 1, TXS = 1;   // píxeles del lienzo por píxel del juego · escala de la capa de textos
function resize(){
  const r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  const n = Math.floor(r.width*dpr / VW);
  scale = n >= 1 ? n/dpr : r.width / VW;
  VH = Math.floor(r.height / scale);
  // mayor divisor de n que no pase de la calidad elegida: así la ampliación es siempre exacta
  // calidad 0 = resolución completa del dispositivo (movimiento más suave); 1-2 = menos píxeles (más ligero, a saltos)
  const qq = D.pantalla ? D.pantalla.calidad : 0, q = qq > 0 ? qq : n;
  PX = 1; if(n >= 1) for(let d=Math.min(n, q); d>=1; d--) if(n % d === 0){ PX = d; break; }
  const full = n < 1 || PX === n;
  cv.width = VW*PX; cv.height = VH*PX;
  cv.style.width = (VW*scale)+'px'; cv.style.height = (VH*scale)+'px';
  TXS = scale*dpr;
  if(full){ cv.width = Math.round(VW*TXS); cv.height = Math.round(VH*TXS); PX = TXS; }
  // a resolución completa no hace falta capa aparte: los textos van en la misma mina (como en la 0.2)
  tctx = full ? ctx : txCtx; tx.hidden = full;
  if(!full){ tx.width = Math.round(VW*TXS); tx.height = Math.round(VH*TXS); tx.style.width = cv.style.width; tx.style.height = cv.style.height; }
}
new ResizeObserver(resize).observe(stage);
const hsh = (a,b) => (h2(a,b,77)*1e6)|0;

// arena en movimiento: se dibuja en cuatro trozos que llegan a destiempo, con granos sueltos, para que se vea que se derrama
const SAND_LAG = [1.6, 1.0, 1.3, 0.7];
function drawSandSplit(v, r, c, X, Y, ox, oy){
  const vs = TS.arena, im = vs[hsh(r,c) % vs.length], hT = T/2;
  for(let q=0;q<4;q++){
    const sx = (q & 1) * hT, sy = (q >> 1) * hT, k = SAND_LAG[(q + r + c) & 3];
    const dx = Math.max(-1.5, Math.min(1.5, ox*k)), dy = Math.max(-1.5, Math.min(1.5, oy*k));
    ctx.drawImage(im, sx, sy, hT, hT, Math.round(X + sx + dx*T), Math.round(Y + sy + dy*T), hT, hT);
    if(v === CSAND){ ctx.fillStyle = 'rgba(172,50,50,0.28)'; ctx.fillRect(Math.round(X + sx + dx*T), Math.round(Y + sy + dy*T), hT, hT); }
  }
  ctx.fillStyle = v === CSAND ? '#a0503a' : '#d9a066';
  for(let i=0;i<10;i++){ const h = hsh(r*7+i, c*3+Math.floor(t*20)); ctx.fillRect(Math.round(X + (h % T) + ox*T*(0.3 + (i%4)*0.3)), Math.round(Y + ((h >> 5) % T) + oy*T*(0.3 + (i%3)*0.35)), 2, 2); }
}
// agua a su nivel, semitransparente (encima de lo que haya en la casilla: escalera, puntal, tablón)
function drawWater(r, c, X, Y, lv){
  const h = Math.max(2, Math.round(lv*T)), top = lvAt(r-1, c) < 0.004 || lv < 0.97;
  ctx.globalAlpha = 0.82;
  if(top) ctx.drawImage(WS[Math.floor(t*4 + c)%4], 0, 0, T, h, X, Y + T - h, T, h);
  else ctx.drawImage(TS.agua[0], X, Y);
  ctx.globalAlpha = 1;
}
// hielo: azul claro, con brillos y grietas; se ve agrietar mientras la lámpara lo derrite
function drawIce(r, c, X, Y){
  ctx.fillStyle = '#5fcde4'; ctx.fillRect(X, Y, T, T);
  ctx.fillStyle = '#9ee6f2'; ctx.fillRect(X+1, Y+1, T-2, T-2);
  ctx.fillStyle = '#cbdbfc'; const h = hsh(r, c); ctx.fillRect(X + 3 + (h % 6), Y + 3, 6, 2); ctx.fillRect(X + 3 + (h % 6), Y + 5, 2, 4); ctx.fillRect(X + 14 - (h % 5), Y + 15, 5, 2);
  if(tAt(r-1, c) !== ICE){ ctx.fillStyle = '#ffffff'; ctx.fillRect(X, Y, T, 2); }
  ctx.fillStyle = '#639bff'; ctx.fillRect(X + (h >> 4) % 18 + 2, Y + 9 + (h >> 8) % 8, 4, 1);
  const k = deshielo.get(r*16 + c);
  if(k){ ctx.fillStyle = `rgba(48,96,130,${0.25 + k*0.5})`; ctx.fillRect(X + 5, Y + 4, 1, Math.round(16*k)); ctx.fillRect(X + 12, Y + 2, 1, Math.round(12*k)); ctx.fillRect(X + 17, Y + 6, 1, Math.round(14*k));
    ctx.fillStyle = '#5fcde4'; ctx.fillRect(X + 8, Y + T - 2, 2, 2); }
}
function drawTile(v, r, c, X, Y){
  const R = W.rows[r];
  if(v === WATER){ drawWater(r, c, X, Y, R ? R.lv[c] : 1); return; }
  if(v === GAS){
    const k = gasNear ? 0.22 : 0.1;
    ctx.fillStyle = `rgba(153,229,80,${k})`; ctx.fillRect(X, Y, T, T);
    ctx.fillStyle = `rgba(153,229,80,${k*2})`;
    for(let i=0;i<3;i++){ const ph = t*0.9 + i*2.1 + (hsh(r,c)&31); ctx.fillRect(X + T*(0.5+Math.sin(ph)*0.35)|0, Y + T*(0.5+Math.cos(ph*1.3)*0.35)|0, 2, 2); }
    return;
  }
  if(v === MUD){
    const top = tAt(r-1, c) !== MUD;
    ctx.fillStyle = '#5a3a26'; ctx.fillRect(X, Y, T, T);
    ctx.fillStyle = '#45283c'; for(let i=0;i<5;i++){ const h = hsh(r*7+i, c); ctx.fillRect(X + (h % 20) + 1, Y + ((h >> 5) % 20) + 2, 3, 2); }
    ctx.fillStyle = '#8f563b'; for(let i=0;i<3;i++){ const h = hsh(c*5+i, r); ctx.fillRect(X + (h % 18) + 3, Y + ((h >> 6) % 16) + 5, 2, 1); }
    if(top){ ctx.fillStyle = '#8f563b'; ctx.fillRect(X, Y, T, 3); ctx.fillStyle = '#d9a066'; ctx.fillRect(X + (hsh(r,c)%14) + 2, Y+1, 5, 1);
      const ph = (t*0.7 + (hsh(c,r)%100)/37) % 3; if(ph < 0.5){ ctx.fillStyle = '#a0703f'; const bx = X + (hsh(c+3,r)%16) + 4; ctx.fillRect(bx, Y - Math.round(ph*4), 3, 2); } }
    return;
  }
  if(v === PROP){ const b = tAt(r+1, c); if(isSolid(b) || b === PROP || b === LADDER) ctx.drawImage(PS.puntal, X, Y); else drawFloatingProp(r, c, X, Y); drawMudBoards(r, c, X, Y); if(R && R.lv[c] > 0.004) drawWater(r, c, X, Y, R.lv[c]); return; }
  if(v === PLANK){ drawPlank(r, c, X, Y); if(R && R.lv[c] > 0.004) drawWater(r, c, X, Y, R.lv[c]); return; }
  if(v === BEDROCK){ drawBedrock(r, c, X, Y); return; }
  if(v === LADDER){ ctx.drawImage(PS.escalera, X, Y); if(R && R.lv[c] > 0.004) drawWater(r, c, X, Y, R.lv[c]); return; }
  if(v === BEAM){ ctx.drawImage(PS.viga, X, Y); return; }
  if(v === ICE){ drawIce(r, c, X, Y); return; }
  const I = INFO[v];
  let jx = 0; if(R && R.sh[c] > 0) jx = Math.round(Math.sin(t*60 + c*3)*1.5);
  const vs = TS[I.tile]; ctx.drawImage(vs[hsh(r,c) % vs.length], X + jx, Y);
  if(I.veta) ctx.drawImage(VS[I.veta][hsh(c,r) % VS[I.veta].length], X + jx, Y);
  if(v === CSAND){ ctx.fillStyle = 'rgba(172,50,50,0.28)'; ctx.fillRect(X + jx, Y, T, T); ctx.fillStyle = 'rgba(102,57,49,0.6)'; for(let i=0;i<4;i++){ const h = hsh(r*3+i, c); ctx.fillRect(X + jx + (h % 20) + 2, Y + ((h >> 5) % 20) + 2, 2, 2); } }
  if(v === DOOR){ drawDoor(r, c, X, Y); return; }
  if(v === PASS){ drawPass(r, c, X, Y); return; }
  // roca dura y maciza: relieve que sale de la pantalla (luz arriba-izquierda, sombra abajo-derecha) para que se lean como fijas
  if(v === HARD || v === ROCK){
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.fillRect(X+jx, Y, T, 2); ctx.fillRect(X+jx, Y, 2, T);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(X+jx+2, Y+2, T-4, 1); ctx.fillRect(X+jx+2, Y+2, 1, T-4);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(X+jx, Y+T-2, T, 2); ctx.fillRect(X+jx+T-2, Y, 2, T);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(X+jx+2, Y+T-3, T-4, 1); ctx.fillRect(X+jx+T-3, Y+2, 1, T-4);
  }
  const B = BS[I.tile] || BS.piedra, open = (rr,cc) => !isSolid(tAt(rr,cc));
  if(open(r-1,c)) ctx.drawImage(B.arriba, X+jx, Y); if(open(r+1,c)) ctx.drawImage(B.abajo, X+jx, Y);
  if(open(r,c-1)) ctx.drawImage(B.izquierda, X+jx, Y); if(open(r,c+1)) ctx.drawImage(B.derecha, X+jx, Y);
  if(R){
    const dmg = (I.hp||0) - R.hp[c];
    if(R.sh[c] > 0) ctx.drawImage(GS[2], X+jx, Y);
    else if(dmg > 0 && I.hp < 999) ctx.drawImage(GS[Math.min(2, Math.floor(dmg / Math.max(1, I.hp) * 3))], X, Y);
  }
}
// puntal que contiene barro: tablas en el lado del barro (entibación), para que se vea qué lo frena
function drawMudBoards(r, c, X, Y){
  for(const dc of [-1, 1]){
    if(tAt(r, c+dc) !== MUD) continue;
    const x0 = dc < 0 ? X : X + T - 6;
    ctx.fillStyle = '#000'; ctx.fillRect(x0, Y, 6, T);
    for(let i=0;i<4;i++){ ctx.fillStyle = i % 2 ? '#8f563b' : '#a0703f'; ctx.fillRect(x0 + 1, Y + 1 + i*6, 4, 5); ctx.fillStyle = '#663931'; ctx.fillRect(x0 + 1, Y + 5 + i*6, 4, 1); }
    ctx.fillStyle = '#000'; ctx.fillRect(dc < 0 ? X + 6 : X + T - 12, Y + 6, 6, 2); ctx.fillRect(dc < 0 ? X + 6 : X + T - 12, Y + T - 8, 6, 2);
    ctx.fillStyle = '#8f563b'; ctx.fillRect(dc < 0 ? X + 6 : X + T - 12, Y + 6, 5, 1); ctx.fillRect(dc < 0 ? X + 6 : X + T - 12, Y + T - 8, 5, 1);
  }
}
// barra de madera en diagonal (en píxeles, para que quede nítida)
function strut(x0, y0, x1, y1){
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  ctx.fillStyle = '#000'; for(let i=0;i<=n;i++){ const x = Math.round(x0 + (x1 - x0)*i/n), y = Math.round(y0 + (y1 - y0)*i/n); ctx.fillRect(x - 1, y - 1, 4, 4); }
  ctx.fillStyle = '#8f563b'; for(let i=0;i<=n;i++){ const x = Math.round(x0 + (x1 - x0)*i/n), y = Math.round(y0 + (y1 - y0)*i/n); ctx.fillRect(x, y, 2, 2); }
  ctx.fillStyle = '#d9a066'; for(let i=1;i<n;i+=3){ const x = Math.round(x0 + (x1 - x0)*i/n), y = Math.round(y0 + (y1 - y0)*i/n); ctx.fillRect(x, y, 1, 1); }
}
// puntal sin suelo: más corto, sujeto a la pared del fondo (y con una barra en diagonal hasta la roca de al lado, si la hay)
function drawFloatingProp(r, c, X, Y){
  const H = 15;
  ctx.drawImage(PS.puntal, 0, 0, T, H, X, Y, T, H);
  let side = false;
  for(const dc of [-1, 1]){ if(!isSolid(tAt(r, c+dc))) continue; side = true; strut(dc < 0 ? X + 1 : X + T - 3, Y + T - 5, X + 11 + (dc < 0 ? -1 : 2), Y + 8); }
  if(!side){   // anclaje a la pared del fondo: una placa con dos clavos
    ctx.fillStyle = '#000'; ctx.fillRect(X + 7, Y + H - 1, 10, 6); ctx.fillStyle = '#696a6a'; ctx.fillRect(X + 8, Y + H, 8, 4);
    ctx.fillStyle = '#cbdbfc'; ctx.fillRect(X + 9, Y + H + 1, 1, 1); ctx.fillRect(X + 14, Y + H + 1, 1, 1);
  }
}
// tablón: un puntal tumbado arriba de la casilla; se anda por encima y se pasa por debajo.
// Donde toca roca a un lado, una barra en diagonal lo sujeta desde la pared.
function drawPlank(r, c, X, Y){
  for(const dc of [-1, 1]){ if(!isSolid(tAt(r, c+dc))) continue; strut(dc < 0 ? X + 1 : X + T - 3, Y + T - 4, dc < 0 ? X + 12 : X + T - 14, Y + 4); }
  ctx.fillStyle = '#000'; ctx.fillRect(X, Y - 1, T, 7);
  ctx.fillStyle = '#d9a066'; ctx.fillRect(X, Y, T, 4); ctx.fillStyle = '#8f563b'; ctx.fillRect(X, Y + 4, T, 1);
  ctx.fillStyle = '#8f563b'; for(let i=0;i<3;i++) ctx.fillRect(X + 3 + i*8 + (hsh(r, c+i) % 3), Y + 1, 3, 1);
  ctx.fillStyle = '#663931'; ctx.fillRect(X + 2, Y + 2, 1, 1); ctx.fillRect(X + T - 3, Y + 2, 1, 1);
}
// roca madre: el límite del mundo. Casi negra, con vetas apagadas: se lee como «aquí no hay nada»
function drawBedrock(r, c, X, Y){
  // piedra con un velo gris violáceo: se lee como roca vieja y muerta, no como un agujero negro
  const vs = TS.piedra; ctx.drawImage(vs[hsh(r,c) % vs.length], X, Y);
  ctx.fillStyle = 'rgba(52,40,66,0.62)'; ctx.fillRect(X, Y, T, T);
  ctx.fillStyle = 'rgba(155,140,175,0.14)'; for(let i=0;i<3;i++){ const h = hsh(r*5+i, c*3); ctx.fillRect(X + (h % 18), Y + ((h >> 5) % 20), 5 + (h >> 11) % 4, 1); }
  const open = (rr, cc) => !isSolid(tAt(rr, cc));
  ctx.fillStyle = 'rgba(203,219,252,0.18)'; if(open(r-1, c)) ctx.fillRect(X, Y, T, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; if(open(r+1, c)) ctx.fillRect(X, Y+T-2, T, 2); if(open(r, c-1)) ctx.fillRect(X, Y, 2, T); if(open(r, c+1)) ctx.fillRect(X+T-2, Y, 2, T);
}
// montacargas de sala: plataforma colgada de dos cuerdas (rota: torcida)
function drawCargo(it, X, Y){
  const ok = W.cargaOk.includes(it.room), up = it.sube ? Math.round(it.sube*T) : 0;
  ctx.fillStyle = '#9badb7'; ctx.fillRect(X + 4, Y - T, 1, T + 14 - up); ctx.fillRect(X + T - 5, Y - T, 1, (ok ? 14 : 10) - up + T);
  ctx.fillStyle = '#000'; ctx.fillRect(X + 1, Y + 12 - up, T - 2, 6);
  if(ok){ ctx.fillStyle = '#d9a066'; ctx.fillRect(X + 2, Y + 13 - up, T - 4, 3); ctx.fillStyle = '#8f563b'; ctx.fillRect(X + 2, Y + 16 - up, T - 4, 1); ctx.fillStyle = '#fbf236'; if(Math.floor(t*2) % 3 === 0) ctx.fillRect(X + T - 6, Y + 10 - up, 2, 2); }
  else { ctx.save(); ctx.translate(X + T/2, Y + 15); ctx.rotate(0.22); ctx.fillStyle = '#000'; ctx.fillRect(-T/2 + 1, -3, T - 2, 6); ctx.fillStyle = '#8f563b'; ctx.fillRect(-T/2 + 2, -2, T - 4, 3); ctx.restore(); }
  ctx.fillStyle = '#000'; ctx.fillRect(X + 9, Y + T - 5, 7, 5); ctx.fillStyle = '#847e87'; ctx.fillRect(X + 10, Y + T - 4, 5, 3);
}
// ascensor del fondo: jaula grande de hierro; roto, sin pieza. Después de usarlo, solo queda el hueco
function drawElevator(it, X, Y){
  ctx.fillStyle = '#9badb7'; ctx.fillRect(X + 6, Y - 4*T, 1, 4*T); ctx.fillRect(X + T - 7, Y - 4*T, 1, 4*T);
  const st = ascState();
  if(st === 'roto'){ ctx.fillStyle = '#000'; ctx.fillRect(X + 2, Y + T - 4, T - 4, 4); return; }
  ctx.fillStyle = '#000'; ctx.fillRect(X, Y - 8, T, T + 8);
  ctx.fillStyle = '#595652'; ctx.fillRect(X + 1, Y - 7, T - 2, 3); ctx.fillRect(X + 1, Y + T - 4, T - 2, 3); ctx.fillRect(X + 1, Y - 7, 2, T + 6); ctx.fillRect(X + T - 3, Y - 7, 2, T + 6);
  ctx.fillStyle = '#847e87'; for(let i=0;i<3;i++) ctx.fillRect(X + 6 + i*5, Y - 4, 1, T);
  ctx.fillStyle = st === 'pieza' ? '#ac3232' : st === 'fino' ? '#6abe30' : '#df7126'; ctx.fillRect(X + T - 8, Y + 2, 4, 4);   // la pieza: falta (rojo), apañado (naranja), fino (verde)
  if(transit && transit.ascensor){ ctx.fillStyle = 'rgba(155,173,183,0.5)'; ctx.fillRect(X - 4, Y - 14, T + 8, 8); }
}
// respiradero: grieta en el suelo por la que sube aire caliente desde lo más hondo (el corazón de la montaña).
// Tiene luz propia (naranja), ondas de calor, chispas que suben hasta perderse y un resplandor que late.
function drawVent(it, X, Y){
  const late = 0.75 + 0.25*Math.sin(t*1.7);
  // resplandor que sale de la grieta
  const gr = ctx.createRadialGradient(X + T/2, Y + T, 2, X + T/2, Y + T, T*3.2);
  gr.addColorStop(0, `rgba(251,160,60,${0.55*late})`); gr.addColorStop(0.5, `rgba(223,113,38,${0.22*late})`); gr.addColorStop(1, 'rgba(223,113,38,0)');
  ctx.fillStyle = gr; ctx.fillRect(X - T*3, Y - T*2.5, T*7, T*3.6);
  // la grieta, al rojo
  ctx.fillStyle = '#000'; ctx.fillRect(X + 2, Y + T - 4, T - 4, 4);
  ctx.fillStyle = '#ac3232'; ctx.fillRect(X + 4, Y + T - 3, T - 8, 2);
  ctx.fillStyle = Math.sin(t*6) > 0 ? '#fbf236' : '#df7126'; ctx.fillRect(X + 7, Y + T - 3, T - 14, 1);
  // ondas de calor: franjas que tiemblan y suben
  for(let i=0;i<6;i++){ const ph = (t*0.5 + i/6) % 1, yy = Y + T - 6 - ph*T*3.2;
    ctx.fillStyle = `rgba(255,214,150,${0.16*(1-ph)})`;
    for(let k=0;k<5;k++) ctx.fillRect(Math.round(X + 1 + k*5 + Math.sin(t*5 + i + k)*2.5), Math.round(yy + Math.sin(t*7 + k)*1.5), 3, 1); }
  // chispas que suben hasta perderse
  for(let i=0;i<9;i++){ const ph = (t*0.42 + i*0.111) % 1;
    ctx.fillStyle = ph < 0.4 ? `rgba(251,242,54,${1-ph})` : `rgba(223,113,38,${1-ph})`;
    ctx.fillRect(Math.round(X + 5 + (i*5) % 15 + Math.sin(t*2.3 + i*1.7)*4*ph), Math.round(Y + T - 4 - ph*T*5), ph < 0.5 ? 2 : 1, ph < 0.5 ? 2 : 1); }
}
// noria vieja: rueda de madera con cangilones. Quieta y seca hasta que le llega agua; entonces gira
function drawNoria(it, X, Y){
  const cx = X + T/2, cy = Y + T/2 + 1, a = it.activa ? t*2.2 : 0.3;
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, 11.5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#8f563b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 9.5, 0, Math.PI*2); ctx.stroke();
  ctx.strokeStyle = '#663931'; ctx.lineWidth = 1.5;
  for(let i=0;i<6;i++){ const b = a + i*Math.PI/3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(b)*10, cy + Math.sin(b)*10); ctx.stroke();
    ctx.fillStyle = '#d9a066'; ctx.fillRect(Math.round(cx + Math.cos(b)*10) - 2, Math.round(cy + Math.sin(b)*10) - 2, 4, 4); }
  ctx.fillStyle = '#595652'; ctx.fillRect(cx - 2, cy - 2, 4, 4);
  if(it.activa && Math.random() < 0.3){ particles.push({x:it.c + 0.5 + (Math.random()-0.5)*0.8, y:it.r + 0.2, vx:(Math.random()-0.5)*2, vy:-1.5, life:0.5, col:'#5fcde4'}); }
}
// brasas: ascuas en el suelo que laten; apagadas, solo ceniza
function drawBrasa(it, X, Y){
  if(it.apagada){ ctx.fillStyle = '#323c39'; ctx.fillRect(X + 2, Y + T - 4, T - 4, 4); ctx.fillStyle = '#595652'; for(let i=0;i<4;i++) ctx.fillRect(X + 3 + i*5, Y + T - 5 + (i%2), 3, 2); return; }
  const late = 0.6 + 0.4*Math.sin(t*5 + it.c);
  ctx.fillStyle = '#45283c'; ctx.fillRect(X + 1, Y + T - 5, T - 2, 5);
  for(let i=0;i<5;i++){ ctx.fillStyle = (i + Math.floor(t*4)) % 3 ? '#df7126' : '#fbf236'; ctx.globalAlpha = late; ctx.fillRect(X + 2 + i*4, Y + T - 4 + (i%2), 3, 2); }
  ctx.globalAlpha = 1;
  for(let i=0;i<2;i++){ const ph = (t*0.9 + i*0.5 + it.c*0.13) % 1; ctx.fillStyle = `rgba(251,242,54,${1-ph})`; ctx.fillRect(Math.round(X + 6 + i*9 + Math.sin(t*3+i)*2), Math.round(Y + T - 6 - ph*T*0.9), 1, 1); }
}
// puerta de la cuadrilla (al otro lado del abismo): marco de madera, tablones y un farol apagado
function drawPortal(it, X, Y){
  ctx.fillStyle = '#000'; ctx.fillRect(X + 2, Y - T + 2, T - 4, 2*T - 2);
  ctx.fillStyle = '#663931'; ctx.fillRect(X + 3, Y - T + 3, T - 6, 2*T - 4);
  ctx.fillStyle = '#8f563b'; for(let i=0;i<4;i++) ctx.fillRect(X + 5 + i*4, Y - T + 5, 2, 2*T - 8);
  ctx.fillStyle = '#d9a066'; ctx.fillRect(X + 2, Y - T + 2, T - 4, 2); ctx.fillRect(X + 2, Y + 6, T - 4, 2);
  ctx.fillStyle = '#847e87'; ctx.fillRect(X + T - 8, Y + 1, 3, 3);
}
// montacargas viejo: jaula de madera colgada de una cuerda que sube hacia la oscuridad
function drawLift(it, X, Y){
  ctx.fillStyle = '#9badb7'; ctx.fillRect(X + 11, Y - 3*T, 2, 3*T + 4);
  ctx.fillStyle = '#000'; ctx.fillRect(X + 2, Y + 3, T - 4, T - 3);
  ctx.fillStyle = '#8f563b'; ctx.fillRect(X + 3, Y + 4, T - 6, 3); ctx.fillRect(X + 3, Y + T - 4, T - 6, 3);
  ctx.fillRect(X + 3, Y + 4, 2, T - 5); ctx.fillRect(X + T - 5, Y + 4, 2, T - 5);
  ctx.fillStyle = '#663931'; for(let i=0;i<3;i++) ctx.fillRect(X + 7 + i*4, Y + 7, 1, T - 11);
  ctx.fillStyle = '#d9a066'; ctx.fillRect(X + 10, Y + 1, 4, 3);
  const bob = Math.round(Math.sin(t*4)*1.5); ctx.fillStyle = '#fbf236'; ctx.beginPath(); ctx.moveTo(X + 12, Y - 9 + bob); ctx.lineTo(X + 7, Y - 3 + bob); ctx.lineTo(X + 17, Y - 3 + bob); ctx.fill();
}
function drawSurface(ys){
  ctx.fillStyle = '#222034'; ctx.fillRect(0, ys - VH*2, VW, VH*2);
  const g = ctx.createLinearGradient(0, ys - SURF*T, 0, ys); g.addColorStop(0, '#222034'); g.addColorStop(1, '#45283c');
  ctx.fillStyle = g; ctx.fillRect(0, ys - SURF*T, VW, SURF*T);
  ctx.fillStyle = '#cbdbfc'; for(let i=0;i<24;i++){ const hs = hsh(i,3); ctx.fillRect((hs%1000)/1000*VW|0, ys - 2*T - (((hs>>10)%1000)/1000*VH|0), 1, 1); }
  ctx.fillStyle = '#0f0b09';
  for(const [hx,hw,hh] of [[0.2,2.2,1.4],[2.8,1.6,2],[10.5,2.3,1.6],[13,1.8,2.3]]){
    ctx.fillRect(hx*T|0, ys-hh*T|0, hw*T|0, hh*T|0);
    ctx.beginPath(); ctx.moveTo(hx*T-4, ys-hh*T); ctx.lineTo((hx+hw/2)*T, ys-(hh+0.8)*T); ctx.lineTo((hx+hw)*T+4, ys-hh*T); ctx.fill();
  }
  ctx.fillStyle = '#fbf236'; ctx.fillRect(1.1*T|0, ys-0.9*T|0, 5, 5); ctx.fillRect(11.4*T|0, ys-1.1*T|0, 5, 5);
  // ascensor viejo del Pozo viejo, junto al castillete: roto (echando humo) hasta que el tejón lo arregle
  if(PK === 'uno' && ascState() !== 'pieza'){
    const st = ascState(), ax = Math.round(9.9*T), ay = ys - T - 6;
    ctx.fillStyle = '#000'; ctx.fillRect(ax - 1, ay - 8, T + 2, T + 8); ctx.fillStyle = '#595652'; ctx.fillRect(ax, ay - 7, T, 3); ctx.fillRect(ax, ay + T - 4, T, 3); ctx.fillRect(ax, ay - 7, 2, T + 6); ctx.fillRect(ax + T - 2, ay - 7, 2, T + 6);
    ctx.fillStyle = '#847e87'; for(let i=0;i<3;i++) ctx.fillRect(ax + 5 + i*5, ay - 4, 1, T);
    ctx.fillStyle = st === 'roto' ? '#ac3232' : st === 'fino' ? '#6abe30' : '#df7126'; ctx.fillRect(ax + T - 7, ay + 2, 4, 4);
    if(st === 'roto') for(let i=0;i<5;i++){ const ph = (t*0.5 + i*0.2) % 1; ctx.fillStyle = `rgba(155,173,183,${0.6*(1-ph)})`; ctx.fillRect(Math.round(ax + 8 + Math.sin(t*2 + i)*4), Math.round(ay - 10 - ph*30), 4, 4); }
  }
  // castillete del pozo con la jaula de bajada
  const top = ys - 3*T + 4, L0 = 5.6*T, L1 = 9.4*T;
  ctx.fillStyle = '#000'; ctx.fillRect(L0-3, top, 7, 3*T); ctx.fillRect(L1-4, top, 7, 3*T); ctx.fillRect(L0-3, top-3, L1-L0+7, 7);
  ctx.fillStyle = '#8f563b'; ctx.fillRect(L0-2, top, 5, 3*T); ctx.fillRect(L1-3, top, 5, 3*T); ctx.fillRect(L0-2, top-2, L1-L0+5, 5);
  ctx.fillStyle = '#663931'; ctx.fillRect(L0+1, top+3, 2, 3*T-3); ctx.fillRect(L1, top+3, 2, 3*T-3);
  ctx.strokeStyle = '#663931'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L0+2, top+4); ctx.lineTo(L1-1, ys-4); ctx.moveTo(L1-1, top+4); ctx.lineTo(L0+2, ys-4); ctx.stroke();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(7.5*T, top+1, 6, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#847e87'; ctx.beginPath(); ctx.arc(7.5*T, top+1, 4, 0, Math.PI*2); ctx.fill();
  const py = ys - T;   // suelo de la jaula: encima de la fila de superficie
  ctx.fillStyle = '#9badb7'; ctx.fillRect(7*T+3, top+4, 1, py - top - 4); ctx.fillRect(8*T-4, top+4, 1, py - top - 4);
  if(platOpen < 1 || (p && p.onPlat)){
    ctx.fillStyle = '#000'; ctx.fillRect(7*T, py-1, T, 6); ctx.fillStyle = '#d9a066'; ctx.fillRect(7*T+1, py, T-2, 3); ctx.fillStyle = '#8f563b'; ctx.fillRect(7*T+1, py+3, T-2, 1);
  } else {  // trampilla abierta
    ctx.fillStyle = '#000'; ctx.fillRect(7*T, py-1, 3, T*0.7); ctx.fillRect(8*T-3, py-1, 3, T*0.7);
    ctx.fillStyle = '#d9a066'; ctx.fillRect(7*T+1, py, 1, T*0.7-2); ctx.fillRect(8*T-2, py, 1, T*0.7-2);
  }
}
// boca de pasadizo: hueco oscuro con marco de madera y una flecha hacia fuera
function drawPass(r, c, X, Y){
  const left = c === 0;
  ctx.fillStyle = '#000'; ctx.fillRect(X, Y, T, T);
  ctx.fillStyle = '#0a0608'; ctx.fillRect(X+4, Y+5, T-8, T-5);
  ctx.fillStyle = '#663931'; ctx.fillRect(X+1, Y+2, 4, T-2); ctx.fillRect(X+T-5, Y+2, 4, T-2); ctx.fillRect(X+1, Y+1, T-2, 4);
  ctx.fillStyle = '#8f563b'; ctx.fillRect(X+2, Y+3, 2, T-3); ctx.fillRect(X+T-4, Y+3, 2, T-3); ctx.fillRect(X+2, Y+2, T-4, 2);
  const bob = Math.round(Math.sin(t*4)*1.5), ax = X + T/2 + (left ? -1 : 1)*bob, ay = Y + 14;
  ctx.fillStyle = '#fbf236'; ctx.beginPath();
  if(left){ ctx.moveTo(ax+3, ay-4); ctx.lineTo(ax+3, ay+4); ctx.lineTo(ax-3, ay); } else { ctx.moveTo(ax-3, ay-4); ctx.lineTo(ax-3, ay+4); ctx.lineTo(ax+3, ay); }
  ctx.fill();
}
function drawDoor(r, c, X, Y){
  const opened = W.doors.includes(r*16+c), left = c === 0;
  ctx.fillStyle = '#000'; ctx.fillRect(X, Y, T, T);
  ctx.fillStyle = '#5b6ee1'; ctx.fillRect(X+1, Y+1, T-2, T-1);   // marco de piedra azulada
  ctx.fillStyle = '#3f3f74'; ctx.fillRect(X+3, Y+3, T-6, T-3);
  if(opened){ ctx.fillStyle = '#0a0806'; ctx.fillRect(X+5, Y+5, T-10, T-5); ctx.fillStyle = '#8f563b'; ctx.fillRect(left ? X+5 : X+T-8, Y+5, 3, T-5); return; }
  ctx.fillStyle = '#8f563b'; ctx.fillRect(X+5, Y+5, T-10, T-5);
  ctx.fillStyle = '#663931'; for(let i=0;i<3;i++) ctx.fillRect(X+5, Y+9+i*5, T-10, 1);
  // candado
  const kx = left ? X+T-11 : X+7; ctx.fillStyle = '#000'; ctx.fillRect(kx-1, Y+11, 7, 7); ctx.fillStyle = '#fbf236'; ctx.fillRect(kx, Y+12, 5, 5); ctx.fillStyle = '#000'; ctx.fillRect(kx+2, Y+13, 1, 2);
  ctx.strokeStyle = '#fbf236'; ctx.lineWidth = 1; ctx.strokeRect(kx+0.5, Y+8.5, 4, 4);
}
// objetos: flor de mina (brilla) o reliquia de minería (caja con destello)
// arcade: el combo encima de Deep (multiplicador, puntos en juego, barra del tiempo para cobrar y los minerales del enlace)
const COMBO_COL = {arcilla: '#d9a066', carbon: '#3f3f74', cobre: '#df7126', cuarzo: '#cbdbfc'};
function drawComboTag(g, x, y){
  const C = comboTag, txt = C.max ? '¡MAX!' : '×' + C.mult;
  g.save(); g.textAlign = 'center';
  const pul = C.max ? 1 + 0.06*Math.sin(t*12) : 1;
  g.font = `${Math.round(24*pul)}px "Lilita One", "Arial Black", sans-serif`;
  g.lineWidth = 5; g.strokeStyle = '#000'; g.strokeText(txt, x, y - 18);
  g.fillStyle = C.max ? '#ff7bd5' : C.puro ? '#fbf236' : '#99e550'; g.fillText(txt, x, y - 18);
  g.font = '800 13px "Sofia Sans Condensed", "Arial Narrow", sans-serif';
  const pot = '+' + C.pot + (C.puro ? ' · puro' : '');
  g.lineWidth = 3; g.strokeText(pot, x, y - 4); g.fillStyle = '#fff'; g.fillText(pot, x, y - 4);
  // barra para cobrar (ancho fijo) y los cuatro puntitos del enlace
  g.fillStyle = '#000'; g.fillRect(x - 22, y, 44, 5); g.fillStyle = '#fbf236'; g.fillRect(x - 21, y + 1, Math.round(42*C.t), 3);
  C.tipos.forEach((k, i) => { const cx = x - 15 + i*10; g.fillStyle = '#000'; g.fillRect(cx - 3, y + 7, 7, 7); g.fillStyle = k ? COMBO_COL[k] : '#45283c'; g.fillRect(cx - 2, y + 8, 5, 5); });
  g.restore();
}
function drawObject(it, X, Y){
  const o = OBJ[it.id] || {}, bob = Math.round(Math.sin(t*3 + it.c)*1);
  if(o.dibujo === 'hongo'){
    const g = 0.35 + 0.25*Math.sin(t*2.5 + it.r); ctx.fillStyle = `rgba(95,205,228,${g*0.45})`; ctx.fillRect(X+4, Y+6, T-8, T-7);
    ctx.fillStyle = '#000'; ctx.fillRect(X+10, Y+13, 5, 10); ctx.fillRect(X+4, Y+7+bob, 17, 8);
    ctx.fillStyle = '#cbdbfc'; ctx.fillRect(X+11, Y+14, 3, 9);
    ctx.fillStyle = '#5fcde4'; ctx.fillRect(X+5, Y+8+bob, 15, 6); ctx.fillStyle = '#639bff'; ctx.fillRect(X+5, Y+12+bob, 15, 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(X+8, Y+9+bob, 2, 2); ctx.fillRect(X+15, Y+10+bob, 2, 1);
    return;
  }
  if(o.dibujo === 'nota'){
    ctx.fillStyle = '#000'; ctx.fillRect(X+5, Y+9+bob, 15, 13);
    ctx.fillStyle = '#eec39a'; ctx.fillRect(X+6, Y+10+bob, 13, 11); ctx.fillStyle = '#d9a066'; ctx.fillRect(X+6, Y+19+bob, 13, 2);
    ctx.fillStyle = '#8f563b'; for(let i=0;i<3;i++) ctx.fillRect(X+8, Y+12+i*3+bob, 9 - (i === 2 ? 4 : 0), 1);
    if(Math.floor(t*2 + it.c) % 3 === 0){ ctx.fillStyle = '#fff'; ctx.fillRect(X+18, Y+7+bob, 2, 2); }
    return;
  }
  if(o.dibujo === 'pico'){
    const g = 0.3 + 0.2*Math.sin(t*3 + it.r); ctx.fillStyle = `rgba(251,242,54,${g*0.4})`; ctx.fillRect(X+3, Y+6, T-6, T-7);
    ctx.fillStyle = '#000'; ctx.fillRect(X+10, Y+8+bob, 4, 15); ctx.fillRect(X+3, Y+6+bob, 18, 5);
    ctx.fillStyle = '#8f563b'; ctx.fillRect(X+11, Y+10+bob, 2, 12); ctx.fillStyle = '#9badb7'; ctx.fillRect(X+4, Y+7+bob, 16, 3); ctx.fillStyle = '#fbf236'; ctx.fillRect(X+11, Y+15+bob, 2, 2);
    return;
  }
  if(o.dibujo === 'pieza'){
    const cx = X + 12, cy = Y + 15 + bob; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#847e87'; for(let i=0;i<8;i++){ const a = i*Math.PI/4 + t*0.5; ctx.fillRect(Math.round(cx + Math.cos(a)*7) - 1, Math.round(cy + Math.sin(a)*7) - 1, 3, 3); }
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#000'; ctx.fillRect(cx-1, cy-1, 3, 3);
    if(Math.floor(t*2 + it.c) % 3 === 0){ ctx.fillStyle = '#fff'; ctx.fillRect(X+18, Y+7+bob, 2, 2); }
    return;
  }
  if(o.dibujo === 'nenufar'){
    // flota en la superficie del agua de su casilla (si se ha vaciado, se queda en el suelo)
    const R = W.rows[it.r], lv = R ? Math.min(1, R.lv[it.c]) : 0, sy = Y + Math.round((1 - (lv > 0.05 ? lv : 0))*T) - 5 + Math.round(Math.sin(t*1.6 + it.c)*0.6);
    const g = 0.3 + 0.2*Math.sin(t*2.2 + it.r); ctx.fillStyle = `rgba(203,219,252,${g*0.5})`; ctx.fillRect(X+3, sy-6, T-6, 9);
    ctx.fillStyle = '#000'; ctx.fillRect(X+2, sy, 20, 5); ctx.fillRect(X+4, sy-1, 16, 7);
    ctx.fillStyle = '#4b692f'; ctx.fillRect(X+3, sy+1, 18, 3); ctx.fillStyle = '#6abe30'; ctx.fillRect(X+5, sy, 14, 2);
    ctx.fillStyle = '#000'; ctx.fillRect(X+12, sy, 2, 2);   // la muesca de la hoja
    ctx.fillStyle = '#000'; ctx.fillRect(X+8, sy-6, 8, 7);
    ctx.fillStyle = '#eec39a'; ctx.fillRect(X+9, sy-4, 6, 4); ctx.fillStyle = '#fff'; ctx.fillRect(X+10, sy-5, 2, 3); ctx.fillRect(X+13, sy-5, 1, 2);
    ctx.fillStyle = '#d77bba'; ctx.fillRect(X+11, sy-2, 2, 1);
    return;
  }
  if(o.dibujo === 'campanilla'){
    const g = 0.3 + 0.2*Math.sin(t*2.6 + it.r); ctx.fillStyle = `rgba(203,219,252,${g*0.5})`; ctx.fillRect(X+5, Y+5, T-10, T-8);
    ctx.fillStyle = '#4b692f'; ctx.fillRect(X+11, Y+10, 2, 13); ctx.fillRect(X+12, Y+9, 4, 2); ctx.fillRect(X+8, Y+19, 3, 2);
    const cx = X + 15, cy = Y + 11 + bob;
    ctx.fillStyle = '#000'; ctx.fillRect(cx-3, cy-1, 7, 8);
    ctx.fillStyle = '#fff'; ctx.fillRect(cx-2, cy, 5, 5); ctx.fillStyle = '#cbdbfc'; ctx.fillRect(cx-2, cy+4, 5, 1); ctx.fillStyle = '#99e550'; ctx.fillRect(cx, cy+5, 1, 1);
    return;
  }
  if(o.dibujo === 'flor'){
    const g = 0.35 + 0.25*Math.sin(t*3 + it.r);
    const FC = o.color;   // flor de color (desde la mina 4)
    ctx.fillStyle = FC ? FC.color : `rgba(255,170,220,${g*0.5})`; if(FC) ctx.globalAlpha = g*0.5; ctx.fillRect(X+5, Y+5, T-10, T-8); ctx.globalAlpha = 1;
    ctx.fillStyle = '#4b692f'; ctx.fillRect(X+11, Y+12, 2, 11); ctx.fillRect(X+8, Y+17, 3, 2); ctx.fillRect(X+13, Y+15, 3, 2);
    const cx = X + 12, cy = Y + 9 + bob;
    ctx.fillStyle = '#000'; ctx.fillRect(cx-5, cy-4, 10, 9);
    ctx.fillStyle = FC ? FC.color : '#ffb3e0'; ctx.fillRect(cx-4, cy-1, 8, 3); ctx.fillRect(cx-1, cy-4, 3, 9);
    ctx.fillStyle = '#fff'; ctx.fillRect(cx-3, cy-3, 2, 2); ctx.fillRect(cx+1, cy+1, 2, 2);
    ctx.fillStyle = '#fbf236'; ctx.fillRect(cx-1, cy-1, 2, 2);
  } else {
    ctx.fillStyle = '#000'; ctx.fillRect(X+5, Y+11+bob, 14, 12);
    ctx.fillStyle = '#8f563b'; ctx.fillRect(X+6, Y+12+bob, 12, 10);
    ctx.fillStyle = '#d9a066'; ctx.fillRect(X+8, Y+14+bob, 8, 6);
    ctx.fillStyle = '#663931'; ctx.fillRect(X+10, Y+16+bob, 4, 2);
    if(Math.floor(t*2 + it.c) % 3 === 0){ ctx.fillStyle = '#fff'; ctx.fillRect(X+17, Y+9+bob, 2, 2); }
  }
}
const hasWheel = i => ON('cartas') && (i + 1) % (SA.ruletaCada||2) === 0;
function drawWheel(i){
  const X = SA.columnaRuleta*T, Y = Math.round((ROOM_ROW[i]+1-cam)*T), cx = X + T/2, cy = Y + 13, used = spun.has(i);
  ctx.fillStyle = '#000'; ctx.fillRect(cx-2, cy, 5, T+10); ctx.fillStyle = '#663931'; ctx.fillRect(cx-1, cy, 3, T+10);
  const cols = used ? ['#595652','#696a6a','#595652','#696a6a','#595652','#696a6a'] : ['#d95763','#fbf236','#639bff','#99e550','#df7126','#cbdbfc'];
  const rot = used ? 0 : t*0.8;
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx+0.5, cy, 11, 0, Math.PI*2); ctx.fill();
  for(let s=0;s<6;s++){ ctx.fillStyle = cols[s]; ctx.beginPath(); ctx.moveTo(cx+0.5, cy); ctx.arc(cx+0.5, cy, 9.5, rot + s*Math.PI/3, rot + (s+1)*Math.PI/3); ctx.fill(); }
  ctx.fillStyle = '#000'; ctx.fillRect(cx-1, cy-1, 3, 3);
  ctx.fillStyle = '#fbf236'; ctx.beginPath(); ctx.moveTo(cx-3, cy-14); ctx.lineTo(cx+4, cy-14); ctx.lineTo(cx+0.5, cy-9); ctx.fill();
  if(!used && Math.floor(t*2) % 2 === 0){ ctx.fillStyle = '#fff'; ctx.fillRect(cx+8, cy-10, 2, 2); }
}
// arcade: el cajón donde se depositan los minerales para abrir la compuerta (suelo de la sala)
function drawCajon(it, X, Y){
  const g = ctx, ab = !!it.pagado;
  if(it.final){   // la última sala: el ascensor viejo que te sube (se paga como un cajón)
    g.fillStyle = '#9badb7'; g.fillRect(X - 6, Y - 3*T, 1, 3*T + 4); g.fillRect(X + T + 5, Y - 3*T, 1, 3*T + 4);
    if(subida) return;
    g.fillStyle = '#000'; g.fillRect(X - 9, Y - 10, T + 18, T + 10);
    g.fillStyle = '#595652'; g.fillRect(X - 8, Y - 9, T + 16, 3); g.fillRect(X - 8, Y + T - 4, T + 16, 3); g.fillRect(X - 8, Y - 9, 2, T + 8); g.fillRect(X + T + 6, Y - 9, 2, T + 8);
    g.fillStyle = '#847e87'; for(let i=0;i<5;i++) g.fillRect(X - 3 + i*7, Y - 6, 1, T + 2);
    const k = 0.5 + 0.5*Math.sin(t*4); g.fillStyle = ab ? '#6abe30' : `rgba(251,242,54,${0.5 + 0.5*k})`; g.fillRect(X + T/2 - 2, Y - 16 - Math.round(k*2), 4, 4);
    return;
  }
  g.fillStyle = '#000'; g.fillRect(X - 3, Y + 7, T + 6, T - 7);
  g.fillStyle = '#663931'; g.fillRect(X - 2, Y + 8, T + 4, T - 9);
  g.fillStyle = '#8f563b'; for(let i=0;i<3;i++) g.fillRect(X - 2, Y + 9 + i*5, T + 4, 3);
  g.fillStyle = '#45283c'; g.fillRect(X + 2, Y + 8, 2, T - 9); g.fillRect(X + T - 4, Y + 8, 2, T - 9);
  if(ab){ g.fillStyle = '#000'; g.fillRect(X - 3, Y + 1, T + 6, 7); g.fillStyle = '#8f563b'; g.fillRect(X - 2, Y + 2, T + 4, 5); }
  else { g.fillStyle = '#000'; g.fillRect(X + T/2 - 5, Y + 7, 10, 3); g.fillStyle = '#fbf236'; g.fillRect(X + T/2 - 4, Y + 8, 8, 1);
    const k = 0.5 + 0.5*Math.sin(t*4); g.fillStyle = `rgba(251,242,54,${0.25 + 0.35*k})`; g.fillRect(X + T/2 - 1, Y - 2 - Math.round(k*2), 2, 5); }
}
function drawItem(it){
  const X = it.c*T, Y = Math.round((it.r - (it.dy||0) - cam)*T);
  if(it.k === 'oil') ctx.drawImage(PS.aceite, X, Y);
  else if(it.k === 'chest') ctx.drawImage(PS.cofre, X, Y);
  else if(it.k === 'bag') ctx.drawImage(PS.mochila_suelo, X, Y);
  else if(it.k === 'obj') drawObject(it, X, Y);
  else if(it.k === 'lift') drawLift(it, X, Y);
  else if(it.k === 'carga') drawCargo(it, X, Y);
  else if(it.k === 'ascensor') drawElevator(it, X, Y);
  else if(it.k === 'vent') drawVent(it, X, Y);
  else if(it.k === 'noria') drawNoria(it, X, Y);
  else if(it.k === 'brasa') drawBrasa(it, X, Y);
  else if(it.k === 'portal') drawPortal(it, X, Y);
  else if(it.k === 'cajon') drawCajon(it, X, Y);
  else if(it.k === 'cofreSala' || it.k === 'cofrePieza'){
    const opened = it.k === 'cofreSala' ? W.rewarded.includes(it.room) : it.abierto, fx = chestFx && chestFx.it === it ? chestFx.t : -1;
    if(fx >= 0 && fx < 2.2){   // rayos de luz al abrirlo
      ctx.save(); ctx.translate(X + T/2, Y + 8); const n = 10, k = Math.min(1, fx*3)*Math.min(1, (2.2 - fx)*2);
      for(let i=0;i<n;i++){ const a = i*Math.PI*2/n + fx*0.9; ctx.fillStyle = i%2 ? 'rgba(251,242,54,'+(0.4*k)+')' : 'rgba(255,255,255,'+(0.3*k)+')';
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a-0.09)*70, Math.sin(a-0.09)*70); ctx.lineTo(Math.cos(a+0.09)*70, Math.sin(a+0.09)*70); ctx.fill(); }
      ctx.restore();
    }
    if(!opened){ ctx.drawImage(PS.cofre, X, Y); if(Math.floor(t*2) % 3 === 0){ ctx.fillStyle = '#fff'; ctx.fillRect(X+18, Y+6, 2, 2); } }
    else {   // abierto: la tapa levantada y el interior vacío
      ctx.drawImage(PS.cofre, 0, 9, T, T-9, X, Y+9, T, T-9);
      ctx.fillStyle = '#000'; ctx.fillRect(X+3, Y+8, T-6, 3); ctx.fillStyle = fx >= 0 && fx < 2.2 ? '#fbf236' : '#2b1b14'; ctx.fillRect(X+4, Y+9, T-8, 2);
      ctx.drawImage(PS.cofre, 0, 0, T, 9, X, Y+1, T, 9);
    }
  }
  else if(it.k === 'llave'){
    const bob = Math.round(Math.sin(t*3 + it.c)*1.5), x = X + 6, y = Y + 12 + bob;
    ctx.fillStyle = 'rgba(251,242,54,0.2)'; ctx.fillRect(X+3, Y+6, T-6, T-7);
    ctx.fillStyle = '#000'; ctx.fillRect(x-1, y-4, 7, 7); ctx.fillRect(x+5, y-1, 9, 3); ctx.fillRect(x+10, y+1, 2, 3); ctx.fillRect(x+13, y+1, 2, 3);
    ctx.fillStyle = '#fbf236'; ctx.fillRect(x, y-3, 5, 5); ctx.fillRect(x+5, y, 9, 1); ctx.fillRect(x+10, y+1, 1, 2); ctx.fillRect(x+13, y+1, 1, 2);
    ctx.fillStyle = '#000'; ctx.fillRect(x+2, y-1, 1, 1);
  }
  else if(it.k === 'herr'){   // herramienta suelta: pequeña, apoyada en el suelo y con brillo
    const im = it.tipo === 'puntal' ? PS.puntal : PS.escalera, s = 16, bob = Math.round(Math.sin(t*3 + it.r)*1);
    ctx.fillStyle = 'rgba(251,242,54,0.18)'; ctx.fillRect(X+2, Y+6, T-4, T-6);
    ctx.drawImage(im, X + (T-s)/2, Y + T - s - 1 + bob, s, s);
    if(Math.floor(t*2 + it.c) % 3 === 0){ ctx.fillStyle = '#fff'; ctx.fillRect(X + 17, Y + 5 + bob, 2, 2); }
  }
}
function drawBat(m){
  const x = Math.round(m.x*T), y = Math.round((m.y-cam)*T);
  if(m.dormido){   // colgado boca abajo, con las alas plegadas
    ctx.fillStyle = '#000'; ctx.fillRect(x-4, y-9, 9, 13); ctx.fillStyle = '#45283c'; ctx.fillRect(x-3, y-8, 7, 11);
    ctx.fillStyle = '#76428a'; ctx.fillRect(x-3, y-8, 2, 9); ctx.fillRect(x+2, y-8, 2, 9); ctx.fillStyle = '#d95763'; ctx.fillRect(x-2, y+1, 1, 1); ctx.fillRect(x+1, y+1, 1, 1);
    ctx.fillStyle = '#000'; ctx.fillRect(x-1, y-11, 1, 2); ctx.fillRect(x+1, y-11, 1, 2); return;
  }
  const fl = Math.round(Math.sin(m.ph||0)*4);
  ctx.fillStyle = '#000'; ctx.fillRect(x-3, y-3, 7, 7);
  ctx.fillStyle = '#76428a'; ctx.fillRect(x-10, y-2 - fl, 8, 3); ctx.fillRect(x+3, y-2 - fl, 8, 3); ctx.fillStyle = '#45283c'; ctx.fillRect(x-8, y+1 - fl, 5, 2); ctx.fillRect(x+4, y+1 - fl, 5, 2);
  ctx.fillStyle = '#45283c'; ctx.fillRect(x-2, y-2, 5, 5); ctx.fillStyle = '#fbf236'; ctx.fillRect(x-1, y-1, 1, 1); ctx.fillRect(x+1, y-1, 1, 1);
  ctx.fillStyle = '#000'; ctx.fillRect(x-2, y-4, 1, 2); ctx.fillRect(x+2, y-4, 1, 2);
}
function drawMoth(m){
  if(m.bat) return drawBat(m);
  const x = Math.round(m.x*T), y = Math.round((m.y-cam)*T), fl = Math.round(Math.abs(Math.sin(m.ph||0))*5) + 1;
  ctx.fillStyle = '#000'; ctx.fillRect(x-1, y-3, 3, 7);
  ctx.fillStyle = m.hunt ? '#eec39a' : '#9badb7';
  ctx.fillRect(x-7, y-fl, 6, fl+2); ctx.fillRect(x+2, y-fl, 6, fl+2);
  ctx.fillStyle = '#663931'; ctx.fillRect(x, y-2, 1, 5);
}
function drawHero(){
  if(dead && (dead.cause === 'crush' || dead.cause === 'buried')) return;
  const st = lamp <= 0 ? 'apagada' : gasNear ? 'grisu' : wick ? 'alta' : 'baja';
  const frs = HSET[st][p.anim], f = frs[Math.floor((p.act ? p.actT : t) * ANIM_FPS[p.anim]) % frs.length];
  const feetX = Math.round((p.sx ?? p.x)*T) + 12, feetY = Math.round((p.y - cam)*T) + T;
  const flip = p.face < 0, x0 = flip ? feetX - 22 : feetX - 10, y0 = feetY - 26;
  const w = weight(), cp = Math.max(1, capacity()), pk = w === 0 ? null : w < cp*0.34 ? 'ligera' : w < cp*0.75 ? 'media' : 'llena';
  ctx.save();
  if(p.stun > 0){
    // de bruces hacia donde ibas: sprite propio, con estrellitas
    const tf = TSET[st], fr = tf[(JU.aturdidoPorLosPelos - p.stun) < 0.35 ? 0 : Math.floor(t*3) % tf.length];
    const ty = feetY - fr.height + 1;
    if(flip){ ctx.translate(feetX + 14, ty); ctx.scale(-1, 1); } else ctx.translate(feetX - 14, ty);
    ctx.drawImage(fr, 0, 0);
    ctx.restore();
    const hx = feetX + (flip ? -3 : 3);
    for(let i=0;i<3;i++){ const a = t*7 + i*2.1; ctx.fillStyle = i%2 ? '#fbf236' : '#ffffff';
      ctx.fillRect(Math.round(hx + Math.cos(a)*7), Math.round(feetY - 19 + Math.sin(a)*2.5), 2, 2); }
    return;
  }
  // subiendo en el ascensor del arcade: plataforma con sus cuerdas
  if(subida){ ctx.fillStyle = '#9badb7'; ctx.fillRect(feetX - 11, feetY - 60, 1, 60); ctx.fillRect(feetX + 10, feetY - 60, 1, 60);
    ctx.fillStyle = '#000'; ctx.fillRect(feetX - 14, feetY, 29, 6); ctx.fillStyle = '#d9a066'; ctx.fillRect(feetX - 13, feetY + 1, 27, 3); p.anim = 'reposo'; }
  // caída larga: se zarandea en el aire
  if(p.anim === 'caida_larga'){ ctx.translate(Math.round(Math.sin(t*14)), 0); }
  if(flip){ ctx.translate(x0 + 32, y0); ctx.scale(-1, 1); } else ctx.translate(x0, y0);
  if(pk) ctx.drawImage(PACK[pk].c, PACK[pk].x, PACK[pk].y);
  ctx.drawImage(f, 0, 0);
  ctx.restore();
  // metido en el barro: el barro le tapa el cuerpo (entero si también hay barro encima)
  if(tAt(p.r, p.c) === MUD){
    const deep = tAt(p.r-1, p.c) === MUD, cellTop = Math.round((p.r - cam)*T), hgt = deep ? T : Math.round(T*0.62);
    const y0m = cellTop + T - hgt, x0m = Math.round(p.x*T);
    ctx.fillStyle = 'rgba(90,58,38,0.88)'; ctx.fillRect(x0m - 2, y0m, T + 4, hgt);
    if(!deep){ ctx.fillStyle = '#8f563b'; ctx.fillRect(x0m - 2, y0m, T + 4, 2); ctx.fillStyle = '#d9a066'; ctx.fillRect(x0m + 4 + Math.round(Math.sin(t*3)*3), y0m, 6, 1); }
  }
  // aire: barra y burbujas mientras estás bajo la superficie o recuperándolo
  if(air < airMax() - 0.01){
    for(let i=0;i<3;i++){ const ph = (t*1.5 + i*0.33) % 1; ctx.fillStyle = 'rgba(203,219,252,'+(1-ph)+')'; ctx.fillRect(Math.round(feetX + Math.sin(t*4+i*2)*4), Math.round(feetY - 26 - ph*14), 2, 2); }
  }
  // arena cubriendo
  if(buried > 0){ const k = Math.min(1, buried/JU.sepultadoEn); ctx.fillStyle = '#d9a066'; ctx.fillRect(feetX-11, feetY - Math.round(22*k), 22, Math.round(22*k)); ctx.fillStyle = '#8a6f30'; for(let i=0;i<6;i++) ctx.fillRect(feetX-10 + (i*7)%20, feetY - Math.round(22*k) + (i*5)%Math.max(1,Math.round(22*k)), 1, 1); }
}

let lbuf = new Float32Array(0), limg = null;
function addLight(r0, r1, sx, sy, R, inten, shadow, mark){
  const a0 = Math.max(r0, Math.floor(sy-R)), a1 = Math.min(r1, Math.ceil(sy+R)), c0 = Math.max(0, Math.floor(sx-R)), c1 = Math.min(COLS-1, Math.ceil(sx+R));
  for(let r=a0;r<=a1;r++) for(let c=c0;c<=c1;c++){
    const d = Math.hypot(c+0.5-sx, r+0.5-sy); if(d > R) continue;
    if(shadow && !los(sx,sy,c+0.5,r+0.5,r,c)) continue;
    const v = inten*Math.min(1, 1.25*(1-(d/R)*(d/R)));
    const i = (r-r0)*COLS + c; if(v > lbuf[i]) lbuf[i] = v;
    if(mark && v > 0.12 && r >= 0) W.rows[r].seen[c] = 1;
  }
}
function render(){
  ctx.setTransform(PX, 0, 0, PX, 0, 0);
  if(tctx !== ctx){ tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, tx.width, tx.height); tctx.setTransform(TXS, 0, 0, TXS, 0, 0); }
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,VW,VH);
  // zoom: se acerca al topo y lo centra; con zoom 1 la vista es la normal
  const k = Math.max(0, Math.min(1, zoom - 1));
  const pyw = ((foco ? foco.r : p.y) + 0.4 - cam)*T;
  const half = VW/(2*zoom);
  const fx = zoom <= 1 ? VW/2 : Math.max(half, Math.min(VW - half, VW/2 + (camX - VW/2)*k));
  const fy = VH*0.35 + (pyw - VH*0.35)*k;
  const sh = shake + shakeKick, sx = (sh ? Math.round((Math.random()*2-1)*sh) : 0) , sy = (sh ? Math.round((Math.random()*2-1)*sh) : 0);   // el «on fire» ya no mueve la pantalla (mareaba)
  ctx.save();
  ctx.translate(VW/2 + sx, VH*0.35 + sy); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy);
  // filas que caben en pantalla con este zoom
  const wy0 = fy - VH*0.35/zoom, wy1 = fy + VH*0.65/zoom;
  const r0 = Math.floor(cam + wy0/T)-1, r1 = Math.ceil(cam + wy1/T)+1;
  if(zoom < 1){ ctx.fillStyle = '#17111a'; ctx.fillRect(-VW, wy0 - T, VW*3, wy1 - wy0 + 2*T); }
  ensure(r1+2);
  ctx.fillStyle = '#000'; ctx.fillRect(0, wy0 - T*2, VW, wy1 - wy0 + T*4);
  const ys = Math.round((SURF - cam)*T);
  if(ys > 0 && TC.principal) drawSurface(ys);
  const rTop = TC.principal ? SURF : 0;   // en un ramal, encima hay techo de roca (no superficie)
  const rooms = new Set();
  for(let r=Math.max(rTop, r0); r<=r1; r++){
    const L = layout(r), Y = Math.round((r-cam)*T);
    if(L.part !== undefined) rooms.add(L.room);
    for(let c=0;c<COLS;c++){
      const v = W.rows[r].t[c], X = c*T;
      if(!isSolid(v) || v === BEAM) ctx.drawImage(TS.fondo[hsh(r,c)%2], X, Y);
      if(L.part !== undefined && L.part > 0 && L.part < ROOM_H-1 && !isSolid(v)){ ctx.fillStyle = 'rgba(143,86,59,0.35)'; ctx.fillRect(X, Y, T, T); }
      if(v !== AIR){ const R = W.rows[r]; if(isSand(v) && (R.ox[c] || R.oy[c])) drawSandSplit(v, r, c, X, Y, R.ox[c], R.oy[c]); else drawTile(v, r, c, X + Math.round(R.ox[c]*T), Y + Math.round(R.oy[c]*T)); }
    }
  }
  // arcade: la roca se tiñe con el color de cada fase
  if(ARC && ARC.tinte){ ctx.save(); ctx.globalCompositeOperation = 'multiply';
    for(let r=Math.max(SURF, r0); r<=r1; r++){ const col = ARC.tinte(r, layout(r).seg); if(col){ ctx.fillStyle = col; ctx.fillRect(-VW, Math.round((r-cam)*T), VW*3, T); } }
    ctx.restore(); }
  // antorchas de las salas
  for(const i of rooms){
    if(hasWheel(i)) drawWheel(i);
    for(const cl of LLAMAS){ const Y = Math.round((ROOM_ROW[i]+1-cam)*T), X = cl*T + 10;
      ctx.fillStyle = '#663931'; ctx.fillRect(X, Y+10, 3, 14);
      const fl = Math.round(Math.sin(t*14 + cl)); ctx.fillStyle = '#df7126'; ctx.fillRect(X-2, Y+2+fl, 7, 9); ctx.fillStyle = '#fbf236'; ctx.fillRect(X, Y+5+fl, 3, 5); }
  }
  for(const it of W.items) if(it.alive && it.k !== 'moth' && it.r >= r0 && it.r <= r1 && !isSolid(tAt(it.r, it.c))) drawItem(it);
  // rejas de la noria (compuertas cerradas) y la cadena que va de la rueda a la reja
  for(const k of (W.compuertas || [])){ const r = Math.floor(k/16), c = k % 16; if(r < r0 || r > r1) continue;
    const X = c*T, Y = Math.round((r-cam)*T); ctx.fillStyle = '#17111a'; ctx.fillRect(X, Y, T, T);
    ctx.fillStyle = '#595652'; for(let i=0;i<4;i++) ctx.fillRect(X + 2 + i*6, Y, 3, T); ctx.fillStyle = '#847e87'; for(let i=0;i<4;i++) ctx.fillRect(X + 2 + i*6, Y, 1, T);
    ctx.fillStyle = '#323c39'; ctx.fillRect(X, Y + 3, T, 2); ctx.fillRect(X, Y + T - 5, T, 2); }
  for(const it of W.items) if(it.alive && it.k === 'noria' && !it.activa && it.r >= r0 - 2 && it.r <= r1 + 2 && (W.compuertas || []).length){
    let best = null; for(const k of W.compuertas){ const r = Math.floor(k/16), c = k % 16, d = Math.abs(r - it.r) + Math.abs(c - it.c); if(!best || d < best.d) best = {r, c, d}; }
    const x0 = it.c*T + T/2, y0 = (it.r - cam)*T + T/2, x1 = best.c*T + (best.c > it.c ? 0 : T), y1 = (best.r - cam)*T + T/2;
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)/4);
    for(let i=0;i<=n;i++){ const tt = i/n, sag = Math.sin(tt*Math.PI)*6, xx = Math.round(x0 + (x1 - x0)*tt), yy = Math.round(y0 + (y1 - y0)*tt + sag);
      ctx.fillStyle = '#000'; ctx.fillRect(xx - 1, yy - 1, 4, 4); ctx.fillStyle = i % 2 ? '#847e87' : '#9badb7'; ctx.fillRect(xx, yy, 2, 2); } }
  for(const k of rocks){ ctx.drawImage((TS[INFO[k.t].tile]||TS.piedra)[0], k.c*T, Math.round((k.y-cam)*T)); if(INFO[k.t].veta) ctx.drawImage(VS[INFO[k.t].veta][0], k.c*T, Math.round((k.y-cam)*T)); }
  for(const m of W.items) if(m.alive && m.k === 'moth' && m.y > r0 && m.y < r1+1) drawMoth(m);
  drawHero();
  for(const q of particles){ ctx.globalAlpha = Math.min(1, q.life*2); ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x*T), Math.round((q.y-cam)*T), 2, 2); }
  ctx.globalAlpha = 1;

  // luz con sombras y memoria de lo explorado
  if(cfg.dark === '1' && !(luzTotal > 0)){
    const nR = r1 - r0 + 1;
    if(lbuf.length !== nR*COLS){ lbuf = new Float32Array(nR*COLS); lc.width = COLS; lc.height = nR; limg = lctx.createImageData(COLS, nR); }
    lbuf.fill(0);
    const fade = dead ? Math.max(0, 1 - deadT*1.5) : 1, flick = 1 + (Math.random()-0.5)*(lamp < 20 ? 0.14 : 0.04);
    addLight(r0, r1, p.x+0.5, p.y+0.25, lightRadius()*flick*fade, wick ? 1 : (LA.luzMechaBaja ?? 1), true, true);
    for(const i of rooms) addLight(r0, r1, COLS/2, ROOM_ROW[i]+1.5, 8.6, 1, true, true);
    // luces propias: el respiradero (ilumina la sala aunque lleves la mecha baja) y las brasas encendidas
    for(const it of W.items) if(it.alive && it.r >= r0-6 && it.r <= r1+6){
      if(it.k === 'vent') addLight(r0, r1, it.c+0.5, it.r+0.8, 6.5 + Math.sin(t*1.7)*0.5, 0.95, true, true);
      else if(it.k === 'brasa' && !it.apagada) addLight(r0, r1, it.c+0.5, it.r+0.8, 2.2, 0.7, false, true);
    }
    for(const it of W.items) if(it.alive && (it.k === 'oil' || it.k === 'chest' || it.k === 'bag' || it.k === 'herr' || it.k === 'llave' || it.k === 'cofreSala' || it.k === 'cofrePieza' || it.k === 'obj' || it.k === 'lift' || it.k === 'carga' || it.k === 'ascensor' || it.k === 'vent' || it.k === 'noria' || it.k === 'portal') && it.r >= r0-2 && it.r <= r1+2) { const B = it.k === 'oil' ? (LA.brilloAceite || {radio:1.6, intensidad:0.6}) : (LA.brilloObjetos || {radio:2.4, intensidad:0.6}); addLight(r0, r1, it.c+0.5, it.r+0.6, B.radio, B.intensidad, false, false); }
    for(let r=Math.max(rTop,r0); r<=r1; r++) for(let c=0;c<COLS;c++){
      if(!isSolid(W.rows[r].t[c])) continue;
      const i = (r-r0)*COLS + c; let m = lbuf[i];
      for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){ const rr=r+dr, cc=c+dc; if(rr<r0||rr>r1||cc<0||cc>=COLS||isSolid(tAt(rr,cc))) continue; m = Math.max(m, lbuf[(rr-r0)*COLS+cc]*0.8); }
      lbuf[i] = m; if(m > 0.12) W.rows[r].seen[c] = 1;
    }
    const D = limg.data;
    for(let r=r0; r<=r1; r++) for(let c=0;c<COLS;c++){
      const i = (r-r0)*COLS + c; let a = 1 - lbuf[i];
      if(r < SURF && TC.principal) a = Math.min(a, 0.3); else if(W.rows[r] && W.rows[r].seen[c]) a = Math.min(a, 0.7);
      D[i*4] = 5; D[i*4+1] = 3; D[i*4+2] = 8; D[i*4+3] = Math.max(0, Math.min(255, a*255));
    }
    lctx.putImageData(limg, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lc, 0, (r0 - cam)*T, VW, nR*T);
    ctx.imageSmoothingEnabled = false;
  }
  // resplandor del respiradero, por encima de la oscuridad: que se note desde lejos
  for(const it of W.items) if(it.alive && it.k === 'vent' && it.r >= r0 - 4 && it.r <= r1 + 4){
    const X = it.c*T + T/2, Y = Math.round((it.r - cam)*T) + T, late = 0.7 + 0.3*Math.sin(t*1.7);
    const gr = ctx.createRadialGradient(X, Y, 2, X, Y, T*4.5);
    gr.addColorStop(0, `rgba(255,170,70,${0.5*late})`); gr.addColorStop(0.45, `rgba(223,113,38,${0.2*late})`); gr.addColorStop(1, 'rgba(223,113,38,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(X - T*4.5, Y - T*4.5, T*9, T*4.6); ctx.restore();
  }
  ctx.restore();
  // textos flotantes en la capa nítida (misma posición que tendrían en el mundo)
  const g = tctx;
  g.textAlign = 'center'; g.font = '800 13px "Sofia Sans Condensed", "Arial Narrow", sans-serif';
  for(const f of floats){ g.globalAlpha = Math.min(1, f.life*1.6);
    const x = VW/2 + sx + (f.x*T - fx)*zoom, y = VH*0.35 + sy + ((f.y-cam)*T - fy)*zoom;
    g.fillStyle = '#000'; g.fillText(f.txt, x+1, y+1); g.fillStyle = f.col; g.fillText(f.txt, x, y); }
  g.globalAlpha = 1;
  if(comboTag && ARC && p) drawComboTag(g, VW/2 + sx + (p.x*T + T/2 - fx)*zoom, VH*0.35 + sy + ((p.y - cam)*T - fy)*zoom - 14);
  drawAirOverlay();
  drawTransit();
  if(!escena){ drawBagMarker(fx, fy); if(has('zahori')) drawOilMarker(fx, fy); }
  if(looking){ g.textAlign = 'center'; g.font = '900 14px Nunito, sans-serif'; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(VW/2-70, 8, 140, 22); g.fillStyle = '#fbf236'; g.fillText('Mirando · pulsa Ver', VW/2, 24); }
  if(fuego > 0){ const a = Math.min(0.55, 0.18 + 0.3*fuego) * (0.85 + 0.15*Math.sin(t*9));
    const gr = g.createRadialGradient(VW/2, VH*0.45, Math.min(VW, VH)*0.32, VW/2, VH*0.45, Math.hypot(VW, VH)*0.55);
    gr.addColorStop(0, 'rgba(255,160,40,0)'); gr.addColorStop(0.7, `rgba(255,120,30,${a*0.5})`); gr.addColorStop(1, `rgba(255,60,20,${a})`); g.fillStyle = gr; g.fillRect(0, 0, VW, VH); }
  if(latActivo){ const de = LA.latidoDesde ?? 25, k = Math.max(0, (de - lamp)/de), a = 0.2 + 0.25*k + 0.3*latPulso;
    const gr = g.createRadialGradient(VW/2, VH*0.45, Math.min(VW, VH)*0.28, VW/2, VH*0.45, Math.hypot(VW, VH)*0.55);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(12,0,4,${Math.min(0.85, a)})`); g.fillStyle = gr; g.fillRect(0, 0, VW, VH); }
  if(flashT > 0){ ctx.fillStyle = `rgba(251,242,54,${flashT})`; ctx.fillRect(0,0,VW,VH); }
}
// Aire: viñeta azul en la mina y un marcador grande arriba mientras estás bajo la superficie
let airWarn = false, airTick = 0, latT = 0, latPulso = 0, latActivo = false;
function drawAirOverlay(){
  const mx = airMax(); if(air >= mx - 0.01 || dead) return;
  const k = air/mx, under = submerged, low = k < 0.35, blink = low && Math.floor(t*4) % 2 === 0;
  if(under){
    const gr = ctx.createRadialGradient(VW/2, VH*0.4, VH*0.15, VW/2, VH*0.4, VH*0.75);
    gr.addColorStop(0, 'rgba(48,96,130,0)'); gr.addColorStop(1, `rgba(48,96,130,${0.35 + (1-k)*0.35 + (blink ? 0.12 : 0)})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
  }
  const g = tctx, w = 190, x0 = VW/2 - w/2, y0 = 54;
  g.fillStyle = 'rgba(20,24,40,.82)'; g.beginPath(); g.roundRect ? g.roundRect(x0, y0, w, 40, 12) : g.rect(x0, y0, w, 40); g.fill();
  g.strokeStyle = low ? '#d95763' : '#639bff'; g.lineWidth = 2; g.stroke();
  g.textAlign = 'left'; g.font = '900 13px Nunito, sans-serif'; g.fillStyle = low ? '#ff9aa2' : '#cbdbfc';
  g.fillText(under ? (low ? '¡SAL A RESPIRAR!' : 'BAJO EL AGUA · AIRE') : 'RECUPERANDO AIRE', x0 + 12, y0 + 16);
  g.textAlign = 'right'; g.fillText(Math.ceil(air) + ' s', x0 + w - 12, y0 + 16);
  const n = 10, filled = Math.ceil(k*n - 0.001);
  for(let i=0;i<n;i++){ const cx = x0 + 18 + i*17, cy = y0 + 28;
    g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI*2);
    g.fillStyle = i < filled ? (low ? (blink ? '#ffffff' : '#d95763') : '#8fd3ff') : 'rgba(255,255,255,.12)'; g.fill();
    if(i < filled){ g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(cx-3, cy-3, 2, 2); } }
}

// Indicador de la mochila perdida: encima de ella si se ve, o en el borde con los metros si no
function bagDist(){ return W.bag ? W.bag.r - p.r : 0; }
function drawBagMarker(fx, fy){
  const ctx = tctx;
  if(!W.bag || dead || cashed) return;
  const it = W.items.find(i => i.alive && i.k === 'bag');
  const br = it ? it.r - (it.dy||0) : W.bag.r, bc = W.bag.c;
  let x = VW/2 + ((bc+0.5)*T - fx)*zoom, y = VH*0.35 + ((br - cam)*T - fy)*zoom;
  const top = 44, bot = VH*0.62;
  const d = bagDist(), off = y < top || y > bot;
  const bob = Math.round(Math.sin(t*5)*2);
  ctx.textAlign = 'center'; ctx.font = '900 12px Nunito, sans-serif';
  if(off){
    x = Math.max(VW*0.22, Math.min(VW*0.78, x)); y = y < top ? top : bot;
    const down = d > 0, ay = y + (down ? bob : -bob);
    ctx.fillStyle = 'rgba(69,40,60,.9)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x-34, ay-11, 68, 22, 11) : ctx.rect(x-34, ay-11, 68, 22); ctx.fill();
    ctx.fillStyle = '#fbf236'; ctx.beginPath();
    if(down){ ctx.moveTo(x-26, ay-4); ctx.lineTo(x-18, ay-4); ctx.lineTo(x-22, ay+3); } else { ctx.moveTo(x-26, ay+3); ctx.lineTo(x-18, ay+3); ctx.lineTo(x-22, ay-4); }
    ctx.fill();
    ctx.fillText('🎒 '+Math.abs(d)+' m', x+5, ay+4);
  } else {
    const ay = y - 10 + bob;
    ctx.fillStyle = '#fbf236'; ctx.beginPath(); ctx.moveTo(x-5, ay-6); ctx.lineTo(x+5, ay-6); ctx.lineTo(x, ay); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillText(Math.abs(d)+' m', x+1, ay-9); ctx.fillStyle = '#fbf236'; ctx.fillText(Math.abs(d)+' m', x, ay-10);
  }
}

function drawOilMarker(fx, fy){
  const ctx = tctx;
  if(dead || cashed) return;
  let best = null, bd = 1e9;
  for(const it of W.items) if(it.alive && it.k === 'oil'){ const d = Math.hypot(it.r - p.r, (it.c - p.c)*0.7); if(d < bd && Math.abs(it.r - p.r) < 60){ bd = d; best = it; } }
  if(!best) return;
  let x = VW/2 + ((best.c+0.5)*T - fx)*zoom, y = VH*0.35 + ((best.r + 0.5 - cam)*T - fy)*zoom;
  const top = 70, bot = VH*0.55, off = y < top || y > bot || x < 10 || x > VW-10;
  if(!off) return;
  x = Math.max(VW*0.25, Math.min(VW*0.75, x)); y = Math.max(top, Math.min(bot, y));
  const d = best.r - p.r;
  ctx.textAlign = 'center'; ctx.font = '900 11px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(48,96,130,.9)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x-30, y-10, 60, 20, 10) : ctx.rect(x-30, y-10, 60, 20); ctx.fill();
  ctx.fillStyle = '#fbf236'; ctx.fillText((d > 0 ? '↓ ' : d < 0 ? '↑ ' : '↔ ') + '🛢️ ' + Math.abs(d) + ' m', x, y+4);
}

// ---------- cofres de las salas seguras ----------
function openRoomChest(it){
  if(ARC && ARC.cofre) ARC.cofre();
  W.rewarded.push(it.room); chestFx = {it, t:0}; SND('cofre'); shakeKick = Math.max(shakeKick, 1.5);
  const C = SA.cofre, got = [];
  const give = g => { if(g.escaleras) ladders += g.escaleras; if(g.puntales) props += g.puntales; if(g.llaves) llaves += g.llaves; };
  give(C.base); got.push('+'+C.base.escaleras+' escaleras', '+'+C.base.puntales+' puntales');
  for(const e of C.extras || []) if((!e.llaves || ON('llaves')) && Math.random() < e.prob){ give(e); got.push(e.texto); }
  renderInv(); burst(it.r+0.4, it.c+0.5, '#fbf236', 26);
  toast('¡Cofre de suministros!', got.join(' · '));
  got.forEach((g, i) => floats.push({x:it.c+0.5, y:it.r - 0.3 - i*0.45, txt:g, life:1.6 + i*0.2, col:'#fbf236'}));
  persist();
}

// ---------- ruleta de cartas ----------
let ruTimers = [], ruPicks = [], wasStartedR = false;
function cardFace(k, extra){ return `<i>${k.icono}</i><b>${k.nombre}</b><span>${k.texto}</span>${extra||''}`; }
function pickCards(n){
  const pool = (D.cartas||[]).filter(k => (k.peso ?? 1) > 0 && !(k.unica && has(k.id))), out = [];   // peso 0: ya no sale (ahora es un ungüento)
  while(out.length < n && pool.length){
    const tot = pool.reduce((a, k) => a + (k.peso ?? 1), 0); let r = Math.random()*tot, i = 0;
    for(; i<pool.length; i++){ r -= (pool[i].peso ?? 1); if(r <= 0) break; }
    out.push(pool.splice(Math.min(i, pool.length-1), 1)[0]);
  }
  return out;
}
function openRuleta(){
  ruletaOpen = true; wasStartedR = started; started = false;
  for(const k in input){ input[k] = false; tapped[k] = 0; }
  ruTimers.forEach(clearTimeout); ruTimers = []; ruPicks = [];
  $('ruTitle').textContent = 'Ruleta de cartas'; $('ruText').textContent = 'Gira la ruleta y quédate con una de las tres cartas. Te duran hasta que vuelvas al principio del pozo.';
  const slots = [...document.querySelectorAll('#ruCartas .carta')];
  slots.forEach(el => { el.className = 'carta dorso'; el.innerHTML = '<i>⛏</i><b>Carta</b>'; });
  $('ruBtn').hidden = false; $('ruBtn').disabled = false; $('ruBtn').textContent = 'Girar';
  $('ruleta').hidden = false;
}
function spinRuleta(){
  const C = SA.ruleta, all = (D.cartas || []).filter(k => (k.peso ?? 1) > 0), slots = [...document.querySelectorAll('#ruCartas .carta')];
  ruPicks = pickCards(3);
  $('ruBtn').disabled = true; $('ruText').textContent = 'Girando…';
  let stopped = 0;
  slots.forEach((el, s) => {
    if(!ruPicks[s]){ el.className = 'carta vacia'; el.innerHTML = '<b>—</b>'; stopped++; return; }
    const steps = C.pasos + s*C.escalonado; let acc = 0, prev = null;
    for(let i=0;i<steps;i++){
      acc += C.msInicial + Math.pow(i/steps, C.curva)*(C.msFinal - C.msInicial);
      let k; do { k = all[Math.floor(Math.random()*all.length)]; } while(all.length > 2 && (k === prev || k === ruPicks[s])); prev = k;
      ruTimers.push(setTimeout(() => { el.className = 'carta gira'; el.innerHTML = cardFace(k); window.Sonido && window.Sonido.tic(i/steps); }, acc));
    }
    ruTimers.push(setTimeout(() => {
      el.className = 'carta lista'; el.innerHTML = cardFace(ruPicks[s]); SND('carta');
      if(++stopped === slots.length){ $('ruText').textContent = 'Elige una carta.'; $('ruBtn').hidden = true; }
    }, acc + 260));
  });
}
function chooseCard(s){
  const k = ruPicks[s]; if(!k || !$('ruBtn').hidden) return;
  cards[k.id] = (cards[k.id]||0) + 1; ruPicks = [];
  if(k.id === 'carpintero') carpDone = Math.floor(maxDepth/cv_('carpintero', 10));   // cuenta desde ahora
  document.querySelectorAll('#ruCartas .carta').forEach((el, i) => el.classList.add(i === s ? 'elegida' : 'descartada'));
  SND('cofre'); $('ruText').textContent = k.nombre + ': ' + k.texto; renderInv();
  ruTimers.push(setTimeout(() => { $('ruleta').hidden = true; ruletaOpen = false; started = wasStartedR; lastT = performance.now(); }, 1300));
}

// ---------- mochila, pasadizos, objetos ----------
function bagWhere(){
  if(W && W.bag) return {here:true};
  for(const id in MINA.tiros) if(MINA.tiros[id].bag) return {here:false, id, nombre: tiroCfg(id).nombre};
  return null;
}
function enterPass(r, c){
  moveT = stepTime();
  let to;
  if(TC.principal){ const ra = RAMALES.find(x => SURF + x.fila === r); if(!ra) return;
    const e = ra.lado === 'izquierda' ? COLS-1 : 0; to = {tiro: ra.id, r: SURF, c: e === 0 ? 1 : COLS-2, nombre: ra.nombre}; }
  else { const ra = TC.ramal; to = {tiro:'principal', r: SURF + ra.fila, c: ra.lado === 'izquierda' ? 1 : COLS-2, nombre: 'tiro principal'}; }
  for(const k in input){ input[k] = false; tapped[k] = 0; }
  transit = {t:0, to, swapped:false, label:'Pasadizo'}; SND('trampilla');
}
// montacargas del fondo de un ramal: te sube a la boca del pasadizo en el tiro principal
function useLift(){
  if(TC.principal) return;
  const ra = TC.ramal; moveT = stepTime();
  for(const k in input){ input[k] = false; tapped[k] = 0; }
  transit = {t:0, to:{tiro:'principal', r: SURF + ra.fila, c: ra.lado === 'izquierda' ? 1 : COLS-2, nombre:'tiro principal'}, swapped:false, label:'Montacargas'};
  SND('trampilla');
}
function doSwap(to){
  if(TC.principal) mainLRF = lastRoomFloor;
  MINA.actual = to.tiro;
  if(!MINA.tiros[to.tiro]) MINA.tiros[to.tiro] = newTiroWorld(to.tiro, (MINA.seed + hashStr(to.tiro)*7919) | 0);
  W = MINA.tiros[to.tiro]; setTiro(to.tiro); lastOil = SURF;
  ensure(to.r + 40);
  const runNow = MINA.tiros.principal.runs;
  if(!TC.principal){ if(W.lastRun && W.lastRun < runNow) refillTunnels(); W.lastRun = runNow; }
  if(isSolid(tAt(to.r, to.c))) setT(to.r, to.c, AIR);
  p.r = to.r; p.c = to.c; p.x = p.sx = to.c; p.y = to.r; p.falling = false; p.fallN = 0; p.act = null; p.face = to.c < COLS/2 ? 1 : -1;
  rocks = []; particles = []; chestFx = null; buried = 0;
  lastRoomFloor = TC.principal ? mainLRF : SURF - 1;
  cam = p.y - (VH/T)*0.35; camX = (p.x + 0.5)*T;
  for(const k in input){ input[k] = false; tapped[k] = 0; }
  toast(TC.principal ? 'Tiro principal' : TC.nombre, TC.principal ? 'De vuelta al pozo' : 'Un ramal sin salida… ¿qué habrá al fondo?');
  renderInv(); hud(true);
}
function updateTransit(dt){
  transit.t += dt;
  if(transit.ascensor){ if(escena) updateEscena(dt); else transit = null; shakeKick = Math.max(0, shakeKick - dt*7); return; }
  if(!transit.swapped && transit.t >= 0.45){ transit.swapped = true; doSwap(transit.to); }
  if(transit.t >= 1.05) transit = null;
}
function drawTransit(){
  if(!transit) return;
  if(transit.ascensor){ drawEscena(); return; }
  const tt = transit.t, a = transit.ascensor ? Math.min(1, Math.max(0, (tt - 0.8)/1.2)) : tt < 0.45 ? tt/0.45 : Math.max(0, 1 - (tt - 0.6)/0.45);
  ctx.fillStyle = `rgba(0,0,0,${Math.min(1, a)})`; ctx.fillRect(0, 0, VW, VH);
  if(a > 0.6){ const g = tctx; g.globalAlpha = Math.min(1, (a - 0.6)/0.3); g.textAlign = 'center'; g.font = '900 15px Nunito, sans-serif';
    g.fillStyle = '#cbdbfc'; g.fillText(transit.label || 'Pasadizo', VW/2, VH*0.42); g.font = '800 12px Nunito, sans-serif'; g.fillStyle = '#9badb7'; g.fillText(transit.to ? 'hacia el ' + transit.to.nombre : 'chirría, tiembla y sube a trompicones…', VW/2, VH*0.42 + 18); g.globalAlpha = 1; }
}
function pickObject(it){
  it.alive = false;
  if(ARC){   // arcade: no van a la mochila; dan un efecto corto
    const EF = (D.arcade && D.arcade.efectos) || {};
    burst(it.r+0.5, it.c+0.5, it.id === 'hongo_azul' ? '#5fcde4' : '#ffb3e0', 18); SND('carta');
    if(it.id === 'hongo_azul'){ prisa = EF.hongo ?? 10; floats.push({x:it.c+0.5, y:it.r, txt:'¡Hongo! Más rápido', life:1.4, col:'#5fcde4'}); }
    else { luzTotal = EF.flor ?? 10; floats.push({x:it.c+0.5, y:it.r, txt:'¡Flor de mina! Luz', life:1.4, col:'#ffb3e0'}); }
    if(ARC.objeto) ARC.objeto(it.id); return;
  }
  if(it.id === 'pico_padre') Pa.ponerBandera('pico_encontrado');
  const key = 'o:' + it.id, o = OBJ[it.id] || {nombre: it.id, icono:'?', texto:''};
  bag[key] = (bag[key]||0) + 1; SND('carta'); renderInv();
  const nuevo = !Pa.coleccion[it.id] && !Object.keys(bag).some(k => k === key && bag[k] > 1);
  burst(it.r+0.5, it.c+0.5, o.brilla ? '#ffb3e0' : '#fbf236', 14);
  floats.push({x:it.c+0.5, y:it.r, txt:o.icono + ' ' + o.nombre, life:1.4, col:'#ffb3e0'});
  // las notas y lo que encuentras por primera vez se leen con calma en una tarjeta (el juego se para)
  if(nuevo || o.dibujo === 'nota') tarjeta(o, nuevo ? '¡Nuevo hallazgo!' : 'Lo has encontrado', 'A la mochila: llega a tu colección cuando subas.');
  else toast(o.nombre, 'A la mochila: llega a tu colección cuando subas');
}
function givePrize(pr){
  if(pr.escaleras) ladders += pr.escaleras;
  if(pr.puntales) props += pr.puntales;
  if(pr.luz) lamp = Math.min(100, Math.max(lamp, pr.luz));
  if(pr.objeto){ const k = 'o:' + pr.objeto; bag[k] = (bag[k]||0) + (pr.cantidadObjeto || 1); }
  if(pr.material){ const mins = {}; for(const [m, n] of Object.entries(pr.material)){ const tt = KEY2T[m]; if(tt !== undefined) mins[tt] = n; }
    const sobra = meterEnMochila(mins); if(sobra) setTimeout(() => toast('La mochila está llena', sobra + ' de mineral se queda en el pozo para la próxima bajada'), 1800); }
  renderInv();
}
function openPieceChest(it){
  it.abierto = true; chestFx = {it, t:0}; SND('cofre'); shakeKick = Math.max(shakeKick, 1.5);
  const L = P1.cofreEspecial || SB.premios || [], pr = L.length ? L[Math.floor(Math.random()*L.length)] : {texto:'Nada… solo polvo'};
  givePrize(pr); burst(it.r+0.4, it.c+0.5, '#fbf236', 26);
  toast('¡Cofre escondido!', pr.texto); floats.push({x:it.c+0.5, y:it.r-0.3, txt:pr.texto, life:1.8, col:'#fbf236'});
  persist();
}

// ---------- puertas y salas de bonus ----------
function tryDoor(r, c){
  moveT = stepTime();
  const id = r*16 + c;
  if(W.doors.includes(id)){ if(lockMsgT <= 0){ floats.push({x:c+0.5, y:r-0.2, txt:'Ya está vacía', life:1, col:'#cbdbfc'}); lockMsgT = 1.2; } return; }
  if(llaves <= 0){ if(lockMsgT <= 0){ floats.push({x:c+0.5, y:r-0.2, txt:'Hace falta una llave', life:1.2, col:'#fbf236'}); lockMsgT = 1.4; SND('clin'); } return; }
  llaves--; W.doors.push(id); renderInv(); SND('trampilla');
  openBonus();
}
// La sala de bonus es una salita aparte: se pausa el pozo, se abre el cofre y se vuelve al mismo sitio
const BN = {st:'cerrado', t:0, premio:null, raf:0};
const bnCv = document.getElementById('bnCv'), bnX = bnCv.getContext('2d');
function openBonus(){
  bonusOpen = true; wasStartedB = started; started = false;
  for(const k in input){ input[k] = false; tapped[k] = 0; }
  const L = P1.cofreEspecial || SB.premios || []; BN.premio = L.length ? L[Math.floor(Math.random()*L.length)] : null;
  BN.st = 'cerrado'; BN.t = 0;
  $('bnTitle').textContent = 'Una sala escondida'; $('bnText').textContent = 'Al fondo hay un cofre cubierto de polvo.'; $('bnBtn').textContent = 'Abrir el cofre';
  $('bonus').hidden = false;
  cancelAnimationFrame(BN.raf); let last = performance.now();
  const loop = now => { const dt = Math.min(0.05, (now-last)/1000); last = now; BN.t += dt; drawBonus(); if(!$('bonus').hidden) BN.raf = requestAnimationFrame(loop); };
  BN.raf = requestAnimationFrame(loop);
}
let wasStartedB = false;
function bonusBtn(){
  if(BN.st === 'cerrado'){
    BN.st = 'abierto'; BN.t = 0; SND('cofre');
    const pr = BN.premio || {texto:'Nada… solo polvo'};
    givePrize(pr);
    $('bnTitle').textContent = '¡Tesoro!'; $('bnText').textContent = pr.texto; $('bnBtn').textContent = 'Volver al pozo';
  } else {
    $('bonus').hidden = true; bonusOpen = false; started = wasStartedB; lastT = performance.now();
  }
}
function drawBonus(){
  const x = bnX, w = bnCv.width, h = bnCv.height, fy = h - 30;
  x.imageSmoothingEnabled = false;
  for(let yy=0; yy<h; yy+=T) for(let xx=0; xx<w; xx+=T) x.drawImage(TS.fondo[((xx/T)+(yy/T))%2], xx, yy);
  x.fillStyle = 'rgba(91,110,225,0.12)'; x.fillRect(0, 0, w, h);
  for(let xx=0; xx<w; xx+=T){ x.drawImage(TS.maciza[0], xx, 0); x.drawImage(PS.viga, xx, fy + 6); }
  for(let yy=0; yy<h; yy+=T){ x.drawImage(TS.maciza[0], 0, yy); x.drawImage(TS.maciza[0], w - T, yy); }
  const cx = w/2 + 20, cy = fy + 6 - T;
  // antorchas
  for(const tx of [36, w - 40]){ x.fillStyle = '#663931'; x.fillRect(tx, 34, 3, 14); const fl = Math.round(Math.sin(BN.t*14 + tx)); x.fillStyle = '#df7126'; x.fillRect(tx-2, 26+fl, 7, 9); x.fillStyle = '#fbf236'; x.fillRect(tx, 29+fl, 3, 5); }
  if(BN.st === 'abierto'){   // rayos de luz que giran desde el cofre
    x.save(); x.translate(cx + T/2, cy + 6); const n = 10, k = Math.min(1, BN.t*2);
    for(let i=0;i<n;i++){ x.rotate(Math.PI*2/n); x.fillStyle = i%2 ? 'rgba(251,242,54,'+(0.35*k)+')' : 'rgba(255,255,255,'+(0.25*k)+')';
      x.beginPath(); x.moveTo(0,0); const a = BN.t*0.8; x.lineTo(Math.cos(a)*140, Math.sin(a)*140 - 8); x.lineTo(Math.cos(a)*140, Math.sin(a)*140 + 8); x.fill(); }
    x.restore();
    for(let i=0;i<6;i++){ const ph = BN.t*2 + i; x.fillStyle = i%2 ? '#fbf236' : '#fff'; x.fillRect(Math.round(cx + T/2 + Math.cos(ph*1.7)*18), Math.round(cy - 6 - ((BN.t*30 + i*9) % 40)), 2, 2); }
  }
  x.drawImage(PS.cofre, cx, cy - (BN.st === 'abierto' ? Math.max(0, 4 - BN.t*8) : 0));
  const hero = HERO.alta.reposo[Math.floor(BN.t*2) % HERO.alta.reposo.length];
  x.drawImage(hero, cx - 52, fy + 6 - 26);
}

// ---------- montacargas, ascensor y soltar material ----------
function itemHere(k){ return W.items.find(i => i.alive && i.k === k && i.r === p.r && i.c === p.c); }
function actionHere(){
  if(!p) return null;
  const L = layout(p.r);
  if(ARC) return null;
  if(prueba && !itemHere('carga') && !itemHere('ascensor')) return {txt:'Volver al editor', fn: salirPrueba};
  if(L.surface && maxDepth > 2 && TC.principal) return {txt:'Volver al pueblo', fn: () => cashOut()};
  const mc = itemHere('carga');
  if(mc){
    if(!W.cargaOk.includes(mc.room) && kitPara(mc)) return {txt:'Arreglar con el kit del tejón', fn: () => fixLift(mc, true)};
    if(!W.cargaOk.includes(mc.room)) return {txt:'Arreglar el montacargas (' + costTxt(mc.room) + ')', fn: () => fixLift(mc)};
    return {txt:'Mandar la carga arriba', fn: () => sendCargo(mc)};
  }
  const as = itemHere('ascensor'), st = as ? ascState() : null;
  if(as && st === 'pieza' && bag['o:pieza_ascensor']) return {txt:'Poner la pieza y subir', fn: useElevator};
  if(as && (st === 'apanado' || st === 'fino')) return {txt:'Subir en el ascensor', fn: useElevator};
  if(L.surface && bajadaBloqueada()) return {txt:'Volver al pueblo', fn: () => cashOut({titulo:'No se puede bajar', texto:'El ascensor del fondo está estropeado: sin él no hay forma de volver a subir.'})};
  return null;
}
// coste del montacargas: los minerales del tramo de justo encima de su sala (los dos que más valen de los que salen ahí).
// Cada montacargas pide un poco más que el anterior.
const MC = D.montacargas || {cantidades:[3, 4], crece:1, kit:1.5};
function liftCost(room){
  // nunca arcilla (es la moneda de la tienda) ni cuarzo (muy escaso)
  const lista = ['cobre', 'carbon'].filter(k => DT[k] !== undefined && room >= DT[k]);
  let antes = 0; for(let i=0;i<room;i++) if(hasLift(i)) antes++;
  const extra = antes*(MC.crece||0), out = {};
  if(lista.length === 1) out[lista[0]] = (MC.soloCarbon ?? 5) + extra;
  else lista.forEach((k, i) => out[k] = (MC.cantidades[i] ?? MC.cantidades[MC.cantidades.length-1]) + extra);
  if(!lista.length) out.carbon = (MC.soloCarbon ?? 5) + extra;
  return out;
}
const costTxtOf = cost => Object.entries(cost).map(([m, n]) => n + ' ' + M[m].nombre.toLowerCase()).join(', ');
const costTxt = room => costTxtOf(liftCost(room));
const mcKey = room => PK + ':' + room;
// el kit del tejón que llevas, ¿es para este montacargas?
const kitPara = mc => kitLlevo && Pa.pueblo.kitMc && Pa.pueblo.kitMc.key === mcKey(mc.room);
// montacargas rotos que ya has visto: el tejón puede fabricar un kit para ellos
function verMontacargas(mc){
  if(!P1.real || W.cargaOk.includes(mc.room)) return;
  const V = Pa.pueblo.mcVistos || (Pa.pueblo.mcVistos = {}), k = mcKey(mc.room);
  const coste = liftCost(mc.room);
  if(!V[k] || JSON.stringify(V[k].coste) !== JSON.stringify(coste)){ V[k] = {key:k, pozo:PK, pozoNombre:P1.nombre, sala:mc.room + 1, coste}; Pa.guardar(); }
}
function fixLift(mc, conKit){
  if(conKit){
    Pa.pueblo.kitMc = null; Pa.pueblo.kitMcMochila = false; kitLlevo = false;
  } else {
    const cost = liftCost(mc.room), falta = Object.entries(cost).filter(([m, n]) => (bag[KEY2T[m]]||0) < n);
    if(falta.length){ toast('Montacargas roto', 'Para arreglarlo hace falta ' + costTxtOf(cost) + '. Te falta ' + falta.map(([m, n]) => (n - (bag[KEY2T[m]]||0)) + ' ' + M[m].nombre.toLowerCase()).join(', ') + '. El tejón también puede hacerte un kit para este montacargas.'); SND('clin'); return; }
    for(const [m, n] of Object.entries(cost)){ const k = KEY2T[m]; bag[k] -= n; if(!bag[k]) delete bag[k]; }
  }
  W.cargaOk.push(mc.room); SND('trampilla'); shakeKick = Math.max(shakeKick, 1.2); burst(mc.r+0.4, mc.c+0.5, '#d9a066', 18);
  if(Pa.pueblo.mcVistos) delete Pa.pueblo.mcVistos[mcKey(mc.room)];
  Pa.guardar();
  toast(conKit ? '¡Arreglado con el kit del tejón!' : '¡Montacargas arreglado!', 'Desde aquí puedes mandar la carga al almacén y seguir bajando'); renderInv(); persist();
}
function sendCargo(mc){
  const n = bankBag(true);
  if(!n){ toast('Montacargas', 'No llevas mineral para mandar'); return; }
  Pa.guardar(); persist(); SND('aceite'); renderInv(); burst(mc.r+0.2, mc.c+0.5, '#fbf236', 16);
  mc.t0 = t;
  toast('La carga sube al pueblo', n + ' de mineral al almacén. Tu mochila queda vacía');
  floats.push({x:mc.c+0.5, y:mc.r-0.4, txt:'+' + n + ' al almacén', life:1.6, col:'#fbf236'});
}
// el ascensor del fondo (Pozo viejo): estado según la historia
//   pieza: nunca se ha usado, le falta la pieza · roto: subió y se estropeó arriba · apanado: el tejón lo apañó (solo sube) · fino: sube y baja
function ascState(){ if(PK !== 'uno') return 'apanado';   // en los demás pozos el ascensor del fondo funciona (solo sube)
  if(!Pa.bandera('ascensor_pozo1_roto')) return 'pieza'; if(Pa.bandera('ascensor_pozo1_fino')) return 'fino'; if(Pa.bandera('ascensor_pozo1_apanado')) return 'apanado'; return 'roto'; }
// con el ascensor roto no se puede bajar al Pozo viejo (no habría forma de volver)
const bajadaBloqueada = () => PK === 'uno' && ascState() === 'roto';
function useElevator(){
  const st = ascState();
  let dejado = 0;
  if(st === 'pieza'){
    delete bag['o:pieza_ascensor']; W.ascUsado = true; Pa.ponerBandera('ascensor_pozo1_roto');
    // la primera vez el ascensor no aguanta peso: solo sube un poco de carga (lo que más vale); el resto se queda abajo
    const lim = (D.ascensor && D.ascensor.primeraCarga) ?? 5;
    const ks = Object.keys(bag).filter(k => INFO[k] && bag[k] > 0).sort((a, b) => INFO[b].val - INFO[a].val);
    let w = 0;
    for(const k of ks){ const keep = Math.max(0, Math.min(bag[k], Math.floor((lim - w)/INFO[k].val))); const fuera = bag[k] - keep;
      if(fuera){ dejado += fuera; depositar(INFO[k].key, fuera); } bag[k] = keep; w += keep*INFO[k].val; if(!bag[k]) delete bag[k]; }
  }
  else if(st === 'roto') return;
  renderInv();
  // el resumen final, corto: lo importante lo cuentan la escena y Deep
  ascTexto = st === 'pieza' ? {titulo:'El Pozo viejo se ha derrumbado', derrumbe:true, texto:(dejado ? 'Dejaste casi toda la carga abajo. ' : '') + 'El ascensor se quedó roto en la boca del pozo.'}
    : {titulo:'De vuelta en el ascensor', texto: st === 'fino' ? 'Suave como la seda.' : 'Chirriando, pero aguanta.'};
  for(const k in input){ input[k] = false; tapped[k] = 0; }
  // escena: la jaula sube por el pozo (a trompicones la primera vez), llega arriba y, la primera vez, el pozo se derrumba
  escena = {tipo:st, t:0, fase:'sube', ft:0, off:0, v:0, humo:[], polvo:[], chispas:[], dejado,
    dur: st === 'pieza' ? 4.6 : st === 'apanado' ? 3.2 : 2.4, paradas: st === 'pieza' ? [0.8, 1.9, 3.0, 3.7] : st === 'apanado' ? [1.3] : []};
  if(dejado) decir('asustado', 'No creo que esto aguante tanto peso… Tendré que dejar casi todo aquí abajo.');
  transit = {t:0, to:null, swapped:true, ascensor:true}; SND('trampilla'); shakeKick = 3;
}
// ---------- escena del ascensor ----------
let escena = null;
function escenaEspera(cara, texto){ escena.espera = t + minAviso(texto); cerrarAviso(); decir(cara, texto); }
function escenaInput(){
  if(!escena || !escena.espera || t < escena.espera) return;
  escena.espera = 0; cerrarAviso(); escena.ft = 0;
  escena.fase = escena.fase === 'sale' ? 'derrumbe' : 'fin';
  if(escena.fase === 'derrumbe'){ SND('explosion'); SND('cae'); shakeKick = 6; }
}
function updateEscena(dt){
  const E = escena; E.t += dt; E.ft += dt;
  $('pad').style.visibility = 'hidden';
  for(const q of E.humo){ q.y -= dt*(8 + q.v); q.x += Math.sin(E.t*2 + q.v)*dt*6; q.life -= dt*0.45; q.r += dt*5; }
  E.humo = E.humo.filter(q => q.life > 0);
  for(const q of E.polvo){ q.x += q.vx*dt; q.y += q.vy*dt; q.vy -= dt*4; q.life -= dt*0.35; q.r += dt*9; }
  E.polvo = E.polvo.filter(q => q.life > 0);
  for(const q of E.chispas){ q.x += q.vx*dt; q.y += q.vy*dt; q.vy += 160*dt; q.life -= dt*2; }
  E.chispas = E.chispas.filter(q => q.life > 0);
  if(E.fase === 'sube'){
    // la jaula sube; en cada parada se frena de golpe, chirría y saltan chispas
    const parada = E.paradas.some(pt => E.ft >= pt && E.ft < pt + 0.32);
    const vt = parada ? 0 : E.tipo === 'fino' ? 190 : 150 + Math.sin(E.ft*9)*30;
    if(parada && !E.enParada){ E.enParada = true; shakeKick = 4; SND('chirrido'); for(let i=0;i<14;i++) E.chispas.push({x:VW/2 + (Math.random() < 0.5 ? -24 : 24), y:VH*0.52, vx:(Math.random()-0.5)*120, vy:-Math.random()*90, life:1}); }
    if(!parada) E.enParada = false;
    E.v += (vt - E.v)*Math.min(1, dt*(parada ? 30 : 4)); E.off += E.v*dt;
    if(E.tipo !== 'fino' && Math.random() < dt*6) SND('chirrido', 0.35);
    if(E.ft >= E.dur){ E.fase = 'llega'; E.ft = 0; }
  } else if(E.fase === 'llega'){
    // aparece la boca del pozo y la jaula se para arriba
    E.v *= Math.max(0, 1 - dt*3); E.off += E.v*dt;
    if(E.ft > 1.1 && !E.parada){ E.parada = true; SND('trampilla'); shakeKick = E.tipo === 'fino' ? 1 : 3;
      if(E.tipo !== 'fino') for(let i=0;i<(E.tipo === 'pieza' ? 26 : 8);i++) E.humo.push({x:VW/2 + (Math.random()-0.5)*36, y:VH*0.5 - 20, r:4 + Math.random()*5, v:Math.random()*8, life:1}); }
    if(E.tipo === 'pieza' && E.parada && Math.random() < dt*10) E.humo.push({x:VW/2 + (Math.random()-0.5)*30, y:VH*0.5 - 24, r:3 + Math.random()*4, v:Math.random()*8, life:1});
    if(E.ft > 1.8){ if(E.tipo === 'pieza'){ E.fase = 'sale'; E.ft = 0; escenaEspera('cansado', '¡Cof, cof! …Por poco. Este trasto casi no lo cuenta.'); } else { E.fase = 'fin'; E.ft = 0; } }
  } else if(E.fase === 'sale'){
    if(Math.random() < dt*6) E.humo.push({x:VW/2 + (Math.random()-0.5)*30, y:VH*0.5 - 24, r:3 + Math.random()*4, v:Math.random()*8, life:1});
  } else if(E.fase === 'derrumbe'){
    // estruendo: tiembla todo y sale una nube de polvo por la boca del pozo
    shake = Math.max(0, 5 - E.ft*2);
    if(E.ft < 1.6 && Math.random() < dt*30) E.polvo.push({x:VW/2 + (Math.random()-0.5)*40, y:VH*0.5 + 10, vx:(Math.random()-0.5)*90, vy:-20 - Math.random()*40, r:5 + Math.random()*6, life:1});
    if(E.ft > 0.5 && E.ft < 0.6) SND('escombro');
    if(E.ft > 2.2 && !E.dicho){ E.dicho = true; escenaEspera('asustado', 'El pozo… ¡se ha venido abajo! Y el ascensor está hecho polvo. Necesito a alguien que sepa arreglarlo.'); }
  } else if(E.fase === 'fin' && E.ft > 0.3){
    escena = null; transit = null; $('pad').style.visibility = ''; cerrarAviso(); cashOut(ascTexto); if(ascTexto && ascTexto.derrumbe) sellarPozo();
  }
}
// dibujo de la escena (por encima de la mina)
function drawEscena(){
  const E = escena; if(!E) return;
  const g = ctx, cx = Math.round(VW/2), cy = Math.round(VH*0.5);
  const sh = shake + shakeKick, ox = sh ? Math.round((Math.random()*2-1)*sh) : 0, oy = sh ? Math.round((Math.random()*2-1)*sh) : 0;
  // la escena se ve de cerca (ampliada alrededor del centro)
  const ZE = 2;
  g.save(); g.translate(cx + ox, cy + oy); g.scale(ZE, ZE); g.translate(-cx, -cy);
  // pared del pozo: roca que baja mientras la jaula sube
  g.fillStyle = '#17111a'; g.fillRect(-10, -10, VW + 20, VH + 20);
  const ts = TS.piedra, off = Math.floor(E.off) % T;
  // al llegar, la boca del pozo baja desde arriba: por encima, el cielo
  const ground = E.fase === 'sube' ? -9999 : Math.round(cy - 34 - Math.max(0, 1.1 - E.ft)*VH*0.6*(E.fase === 'llega' ? 1 : 0));
  for(let y = -T + off; y < VH + T; y += T) for(let x = 0; x < VW; x += T){
    if(Math.abs(x + T/2 - cx) < 40) continue;   // el hueco del pozo
    if(y < ground) continue;
    g.drawImage(ts[(hsh(Math.floor((y - E.off)/T), x/T)) % ts.length], x, y);
  }
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(cx - 40, Math.max(0, ground), 80, VH);
  if(ground > -9999){
    const sg = g.createLinearGradient(0, 0, 0, ground); sg.addColorStop(0, '#222034'); sg.addColorStop(1, '#45283c');
    g.fillStyle = sg; g.fillRect(0, -10, VW, ground + 10);
    g.fillStyle = '#cbdbfc'; for(let i=0;i<20;i++){ const hs = hsh(i, 9); g.fillRect((hs % 1000)/1000*VW|0, ((hs >> 10) % 1000)/1000*Math.max(1, ground)|0, 1, 1); }
    g.fillStyle = '#4b692f'; g.fillRect(0, ground, cx - 40, 4); g.fillRect(cx + 40, ground, VW, 4);
    // castillete de madera
    g.fillStyle = '#663931'; g.fillRect(cx - 44, ground - 70, 5, 70); g.fillRect(cx + 39, ground - 70, 5, 70); g.fillRect(cx - 48, ground - 74, 96, 6);
    g.fillStyle = '#8f563b'; g.fillRect(cx - 43, ground - 69, 2, 68); g.fillRect(cx - 47, ground - 73, 94, 2);
    g.fillStyle = '#595652'; g.beginPath(); g.arc(cx, ground - 78, 9, 0, Math.PI*2); g.fill(); g.fillStyle = '#9badb7'; g.fillRect(cx - 1, ground - 87, 2, 18);
  }
  // cables y jaula (con Deep dentro)
  const jy = E.fase === 'sube' ? cy - 26 + Math.round(Math.sin(E.t*30)*(E.tipo === 'fino' ? 0 : 1)) : cy - 26;
  g.fillStyle = '#9badb7'; g.fillRect(cx - 9, Math.min(ground > -9999 ? ground - 78 : -10, jy), 1, Math.max(0, jy - (ground > -9999 ? ground - 78 : -10))); g.fillRect(cx + 8, Math.min(ground > -9999 ? ground - 78 : -10, jy), 1, Math.max(0, jy - (ground > -9999 ? ground - 78 : -10)));
  const salido = E.fase === 'sale' || E.fase === 'derrumbe' || E.fase === 'fin';
  const heroF = salido ? HERO.alta.reposo[Math.floor(E.t*2) % HERO.alta.reposo.length] : HERO.alta.reposo[0];
  const hx = salido ? cx + 44 + Math.min(1, E.ft*1.5)*10 : cx - 16;
  g.fillStyle = '#000'; g.fillRect(cx - 20, jy - 4, 40, 40);
  g.fillStyle = '#595652'; g.fillRect(cx - 19, jy - 3, 38, 3); g.fillRect(cx - 19, jy + 32, 38, 3); g.fillRect(cx - 19, jy - 3, 3, 38); g.fillRect(cx + 16, jy - 3, 3, 38);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx - 16, jy, 32, 32);
  if(!salido){ g.drawImage(heroF, hx, jy + 4); }
  g.fillStyle = '#847e87'; for(let i=0;i<4;i++) g.fillRect(cx - 12 + i*8, jy, 1, 32);
  if(salido){ g.save(); g.translate(hx + 32, jy + 5); g.scale(-1, 1); g.drawImage(heroF, 0, 0); g.restore(); }
  // humo, polvo y chispas
  for(const q of E.humo){ g.fillStyle = `rgba(155,173,183,${Math.max(0, q.life)*0.55})`; g.beginPath(); g.arc(q.x, q.y, q.r, 0, Math.PI*2); g.fill(); }
  for(const q of E.polvo){ g.fillStyle = `rgba(217,160,102,${Math.max(0, q.life)*0.6})`; g.beginPath(); g.arc(q.x, q.y, q.r, 0, Math.PI*2); g.fill(); }
  for(const q of E.chispas){ g.fillStyle = q.life > 0.5 ? '#fbf236' : '#df7126'; g.fillRect(Math.round(q.x), Math.round(q.y), 2, 2); }
  g.restore();
  // al acabar, fundido a negro
  if(E.fase === 'fin'){ g.fillStyle = `rgba(0,0,0,${Math.min(1, E.ft*3)})`; g.fillRect(0, 0, VW, VH); }
}
let wasStartedD = false, ascTexto = null;
// ---------- modo prueba (editor de niveles) ----------
// Se baja a una mina nueva con la pieza que estás editando, empezando justo encima. No se guarda nada:
// al salir, la partida (almacén, colección, historia…) vuelve a estar como antes y el pozo de verdad sigue igual.
let prueba = null, recargar = false;
// Deep Arcade (arcade/index.html): otra página con su propio bucle de puntos; la mina avisa con estos ganchos.
// ARC = {pozo, puntales, escaleras, cajonCada, golpe(key, esMineral, r, c), sala(i), muerte(causa)}
let ARC = null;
function iniciarPrueba(key, pz){
  prueba = {pieza: pz, copia: JSON.stringify({almacen:Pa.almacen, kit:Pa.kit, coleccion:Pa.coleccion, visto:Pa.visto, pueblo:Pa.pueblo})};
  setPozo(key); MINA = newMine(); W = MINA.tiros.principal; setTiro('principal'); recargar = true;
  startOpts = null; activa = true; resize(); startRun();
  props = 30; ladders = 20; llaves = 3; renderInv();
  // si la pieza va en un ramal, se pasa a ese ramal
  const tiro = pz.tiro || 'principal';
  if(tiro !== 'principal'){ const ra = RAMALES.find(x => x.id === tiro) || RAMALES[0]; if(ra) doSwap({tiro: ra.id, r: SURF, c: ra.lado === 'izquierda' ? COLS-2 : 1, nombre: ra.nombre}); }
  // empezar justo encima de la pieza
  const P = PLACED.find(x => x.id === pz.id);
  if(P){ let r = Math.max(TC.principal ? SURF + 1 : SURF, P.r0 - 2); const c = 4; ensure(r + 40);   // (no en la columna de la ruleta)
    // si encima hay una sala segura, se empieza dentro de ella (sin romper su suelo ni su techo)
    const Lr = layout(r); if(Lr.part !== undefined) r = ROOM_ROW[Lr.room] + ROOM_H - 2;
    for(const rr of [r, r+1]) if(rr < P.r0 && layout(rr).part === undefined && isSolid(tAt(rr, c))) setT(rr, c, AIR);
    p.onPlat = false; platOpen = 1; p.r = p.y = r; p.c = p.x = p.sx = c; p.falling = false;
    cam = p.y - (VH/T)*0.35; camX = (p.x+0.5)*T; }
  colaAvisos = []; aviso = null; $('toastHost').innerHTML = '';
  toast('Probando: ' + pz.id, P ? 'Empiezas justo encima de la pieza. «Volver al editor» para salir' : 'La pieza no ha salido en este pozo: revisa dónde se coloca');
  hud(true);
}
function salirPrueba(){
  if(!prueba) return;
  const c = JSON.parse(prueba.copia); for(const k in c) Pa[k] = c[k]; Pa.guardar();
  prueba = null; started = false; transit = null; escena = null; $('over').hidden = true; $('pad').style.visibility = '';
  window.Pantallas.mostrar('editor');
}
// genera un trozo de un pozo con las reglas del juego (sin piezas) y lo devuelve en el formato de las piezas
const T2CH = {[AIR]:'_', [DIRT]:'t', [STONE]:'p', [HARD]:'d', [ROCK]:'m', [BEDROCK]:'x', [CSAND]:'g', [SAND]:'a', [WATER]:'~', [RUBBLE]:'e', [CLAY]:'r', [COAL]:'c',
  [COPPER]:'u', [QUARTZ]:'q', [IRON]:'i', [TIN]:'s', [ICE]:'z', [DOOR]:'P', [GAS]:'*', [MUD]:'&', [PASS]:'.', [BEAM]:'.', [LADDER]:'L', [PROP]:'I', [PLANK]:'='};
const OBJ2CH = {flor_mina:'f', hongo_azul:'j', nenufar:'y', lampara_vieja:'R', foto_cuadrilla:'F', nota_1:'N', nota_2:'N', nota_3:'N', casco_cuadrilla:'Q', pico_padre:'K', pieza_ascensor:'Z'};
function item2ch(it){
  return it.k === 'oil' ? 'o' : it.k === 'llave' ? 'k' : it.k === 'herr' ? (it.tipo === 'puntal' ? 'H' : 'h') : it.k === 'obj' ? (OBJ2CH[it.id] || 'f') :
    it.k === 'chest' || it.k === 'cofrePieza' ? 'B' : it.k === 'vent' ? 'V' : it.k === 'lift' ? 'M' : it.k === 'ascensor' ? 'A' : it.k === 'noria' ? 'W' : it.k === 'brasa' ? 'b' : it.k === 'portal' ? 'X' : null;
}
function generarSector(key, tiro, desde, hasta, semilla){
  const keep = {PK, P1, RAMALES, DT, SECRET, W, MINA, TC, TRAMOS, ROOM_ROW, PLACED, lastOil};
  try{
    setPozo(key); W = newTiroWorld(tiro, semilla || ((Math.random()*1e9)|0)); setTiro(tiro); PLACED = []; lastOil = SURF;
    const r1 = SURF + hasta; ensure(Math.min(r1 + 2, isFinite(TC.fondo) ? TC.fondo + 2 : r1 + 2));
    const filas = [], salas = [];
    for(let r = SURF + desde; r <= r1; r++){
      if(!W.rows[r]){ filas.push('x'.repeat(COLS)); continue; }
      const L = layout(r); if(L.part !== undefined){ filas.push('.'.repeat(COLS)); salas.push(r - SURF); continue; }
      let line = '';
      for(let c=0;c<COLS;c++){
        const it = W.items.find(i => i.alive && (i.k === 'moth' ? Math.floor(i.y) === r && Math.floor(i.x) === c : i.r === r && i.c === c));
        const ch = it ? (it.k === 'moth' ? 'w' : item2ch(it)) : null;
        line += ch || T2CH[W.rows[r].t[c]] || 'p';
      }
      filas.push(line);
    }
    return {filas, salas, semilla: W.seed};
  } finally { ({PK, P1, RAMALES, DT, SECRET, W, MINA, TC, TRAMOS, ROOM_ROW, PLACED, lastOil} = keep); }
}
// tramos de un pozo (para el editor): nombre, primera y última fila de cada tramo y de cada sala
function tramosDe(key){
  const keep = {PK, P1, RAMALES, DT, SECRET};
  try{
    setPozo(key); const tc = tiroCfg('principal'), out = []; let r = 0;
    tc.tramos.forEach((t, i) => { if(!isFinite(t.len) && i > 12) return; const len = isFinite(t.len) ? t.len : 40; out.push({n: t.n, desde: r, hasta: r + len - 1}); r += len; if(i < tc.rooms.length) r += ROOM_H; });
    return {tramos: out.slice(0, 14), ramales: RAMALES.map(ra => ({id: ra.id, nombre: ra.nombre, largo: ra.largo, fila: ra.fila})), fondo: isFinite(tc.fondo) ? tc.fondo - SURF : null};
  } finally { ({PK, P1, RAMALES, DT, SECRET} = keep); }
}
// ---------- depósito del pozo ----------
// Lo que no cabe al recuperar la mochila, lo que sueltas en las salas y la carga que se deja en la primera subida
// no se pierde: se guarda en el depósito del pozo y, en la siguiente bajada, se reparte por él como vetas nuevas.
function depositar(key, n){ if(!MINA || !n) return; const D2 = MINA.deposito || (MINA.deposito = {}); D2[key] = (D2[key]||0) + n; }
function ponerVetas(mapa){
  let puestos = 0;
  if(isFinite(TC.fondo)) ensure(TC.fondo + 1); else ensure(Math.max(W.rows.length, SURF + 80));
  const desde = ROOM_ROW.length ? ROOM_ROW[0] + ROOM_H : SURF + 3, hasta = Math.min(W.rows.length - 2, isFinite(TC.fondo) ? TC.fondo - 4 : W.rows.length - 2);
  for(const [k, n] of Object.entries(mapa)){
    const tt = KEY2T[k]; if(tt === undefined) continue;
    for(let i=0, intentos=0; i<n && intentos < 4000; intentos++){
      const r = desde + Math.floor(Math.random()*(hasta - desde)), c = Math.floor(Math.random()*COLS);
      if(layout(r).part !== undefined) continue;
      const v = W.rows[r].t[c];
      if(v === DIRT || v === STONE){ setT(r, c, tt); i++; puestos++; }
    }
  }
  return puestos;
}
function repartirDeposito(){
  if(!MINA || !MINA.deposito || !Object.keys(MINA.deposito).length || !TC.principal) return 0;
  const n = ponerVetas(MINA.deposito); MINA.deposito = {}; persist(); return n;
}
// mete minerales en la mochila hasta su capacidad (lo más valioso primero); lo que no cabe va al depósito del pozo
function meterEnMochila(items){
  const ks = Object.keys(items).filter(k => INFO[k] && items[k] > 0).sort((a, b) => INFO[b].val - INFO[a].val);
  let fuera = 0;
  for(const k of ks){
    let n = items[k];
    while(n > 0 && weight() + INFO[k].val <= capacity()){ bag[k] = (bag[k]||0) + 1; n--; }
    if(n > 0){ depositar(INFO[k].key, n); fuera += n; }
  }
  return fuera;
}
// derrumbe que vuelve a sellar el pozo: se genera entero de nuevo (con mineral nuevo); el contador sigue
function sellarPozo(){
  const st = MINA.stats, dep = MINA.deposito; MINA = newMine(); MINA.stats = st; MINA.deposito = dep || {};
  W = MINA.tiros.principal; setTiro('principal'); persist();
}
// ---------- red de seguridad de materiales ----------
// Si lo que queda en los pozos reales abiertos más lo del almacén no llega para el siguiente objetivo de la historia,
// al empezar la bajada se meten vetas del mineral que falta en este pozo (en roca ya abierta por el generador, no en tus galerías).
// Con más minas abiertas hay más mineral en juego, así que salta cada vez menos.
const T2KEY = {[CLAY]:'arcilla', [COAL]:'carbon', [COPPER]:'cobre', [QUARTZ]:'cuarzo', [IRON]:'hierro', [TIN]:'estano'};
function siguienteObjetivo(){ const o = Pa.objetivo(); return o ? o.coste : null; }
// ---------- recordatorio de misión ----------
// Al empezar la bajada se recuerda lo que hace falta para el siguiente objetivo (lo del almacén más lo que llevas encima)
// y, cuando juntas un material, sale un aviso. Cuando lo tienes todo, otro.
let mision = null;
const misionCuenta = k => (Pa.almacen[k]||0) + (bag[KEY2T[k]]||0);
const misionTxt = o => Object.entries(o.coste).map(([k, n]) => M[k].nombre + ' ' + Math.min(misionCuenta(k), n) + '/' + n).join(' · ');
function misionInicio(){
  mision = null; if(ARC) return;
  const o = Pa.objetivo(); if(!o) return;
  mision = {o, hecho: new Set(Object.entries(o.coste).filter(([k, n]) => misionCuenta(k) >= n).map(([k]) => k))};
  mision.todo = mision.hecho.size === Object.keys(o.coste).length;
  toast('Objetivo: ' + o.corto, misionTxt(o) + (mision.todo ? ' · ¡Ya lo tienes todo!' : ''));
}
function misionTick(){
  if(!mision || mision.todo || !bag) return;
  const o = mision.o;
  for(const [k, n] of Object.entries(o.coste)) if(!mision.hecho.has(k) && misionCuenta(k) >= n){
    mision.hecho.add(k);
    if(mision.hecho.size === Object.keys(o.coste).length){ mision.todo = true; SND('sala'); toast('¡Lo tienes todo!', 'Ya puedes ' + o.nombre + '. Sube al pueblo con la carga'); }
    else toast('¡' + M[k].nombre + ' suficiente!', 'Para ' + o.corto + ': ' + misionTxt(o));
  }
}
function contarPozo(rows){ const n = {}; for(const R of rows) for(let c=0;c<COLS;c++){ const k = T2KEY[R.t ? R.t[c] : R.charCodeAt(c) - 65]; if(k) n[k] = (n[k]||0) + 1; } return n; }
function redSeguridad(){
  if(!P1.real) return 0;
  const obj = siguienteObjetivo(); if(!obj) return 0;
  if(isFinite(TC.fondo)) ensure(TC.fondo + 1);
  const disp = contarPozo(W.rows);
  // el resto de pozos reales abiertos (los de prueba no cuentan)
  for(const m of D.minas){
    const key = m.pozo; if(!key || key === PK || !POZOS[key] || !POZOS[key].real) continue;
    if(!(m.abierta || Pa.bandera('mina_' + m.id + '_abierta'))) continue;
    const sv = load(POZOS[key].guardado, null); if(!sv || !sv.tiros) continue;
    for(const id in sv.tiros){ const c = contarPozo(sv.tiros[id].rows || []); for(const k in c) disp[k] = (disp[k]||0) + c[k]; }
  }
  let puestos = 0;
  for(const [k, n] of Object.entries(obj)){
    const falta = n - (Pa.almacen[k]||0) - (disp[k]||0);
    if(falta <= 0) continue;
    if(M[k] && M[k].mina && !(P1.vetas && P1.vetas[k])) continue;   // el mineral propio de una mina solo se repone en las minas donde sale
    const quiero = Math.ceil(falta*1.5), tt = KEY2T[k];
    const desde = ROOM_ROW.length ? ROOM_ROW[0] + ROOM_H : SURF + 3, hasta = Math.min(W.rows.length - 2, isFinite(TC.fondo) ? TC.fondo - 4 : W.rows.length - 2);
    for(let i=0, intentos=0; i<quiero && intentos < 4000; intentos++){
      const r = desde + Math.floor(Math.random()*(hasta - desde)), c = Math.floor(Math.random()*COLS);
      if(layout(r).part !== undefined) continue;
      const v = W.rows[r].t[c];
      if(v === DIRT || v === STONE){ setT(r, c, tt); i++; puestos++; }
    }
  }
  return puestos;
}
function openDrop(){
  if(!$('dropSheet').hidden) return;
  wasStartedD = started; started = false;
  for(const k in input){ input[k] = false; tapped[k] = 0; }
  renderDrop(); $('dropSheet').hidden = false;
}
function renderDrop(){
  const ks = Object.keys(bag).filter(k => !k.startsWith('o:') && bag[k] > 0);
  $('dropCap').textContent = 'Carga ' + weight() + ' de ' + capacity() + '. Lo que sueltes se pierde.';
  $('dropList').innerHTML = ks.length ? ks.map(k => `<div class="dropRow"><span class="chip"><i style="background:${INFO[k].dot}"></i>${INFO[k].n} <b>${bag[k]}</b></span><button class="btn ghost mini" data-k="${k}" data-n="1">Soltar 1</button><button class="btn ghost mini" data-k="${k}" data-n="all">Todo</button></div>`).join('') : '<p class="note">No llevas mineral.</p>';
  $('dropList').querySelectorAll('button').forEach(b => b.onclick = () => { const k = b.dataset.k, n = b.dataset.n === 'all' ? bag[k] : 1; bag[k] -= n; depositar(INFO[k].key, n); if(bag[k] <= 0) delete bag[k]; SND('poner'); renderInv(); renderDrop(); });
}

// ---------- interfaz ----------
const $ = id => document.getElementById(id);
function chip(k, n, bump){
  if(String(k).startsWith('o:')){ const o = OBJ[k.slice(2)] || {nombre:k, icono:'?'}; return `<span class="chip cartaChip${bump?' bump':''}">${o.icono} ${o.nombre} <b>${n}</b></span>`; }
  return `<span class="chip${bump?' bump':''}"><i style="background:${INFO[k].dot}"></i>${INFO[k].n} <b>${n}</b></span>`;
}
function renderInv(bump){
  const keys = Object.keys(bag).filter(k => bag[k] > 0);
  // la mochila perdida va la primera (es lo más importante y así no queda cortada al final de la barra)
  const bw = W && MINA ? bagWhere() : null;
  let h = '';
  if(bw && bw.here) h += `<span class="chip warn" id="bagChip">🎒 Mochila <b id="bagDist"></b></span>`;
  else if(bw) h += `<span class="chip warn">🎒 Mochila en el <b>${bw.nombre}</b></span>`;
  h += keys.length ? keys.map(k => chip(k, bag[k], +k === +bump)).join('') : (ARC ? '<span class="chip muted">Sin minerales</span>' : '<span class="chip muted">Mochila vacía</span>');
  if(!ARC){ const w = weight(), cp = Math.max(1, capacity()), f = Math.min(1, w/cp), col = f < 0.5 ? '#6abe30' : f < 0.85 ? '#df7126' : '#d95763';
    h += `<span class="chip carga" title="${w} de ${cp}">Carga <i class="cbar"><u style="width:${Math.round(f*100)}%;background:${col}"></u></i></span>`; }
  if(llaves) h += `<span class="chip warn">Llaves <b>${llaves}</b></span>`;
  if(kitLlevo && Pa.pueblo.kitMc) h += `<span class="chip cartaChip" title="Kit de reparación del tejón">🧰 Kit: ${Pa.pueblo.kitMc.pozoNombre}, sala ${Pa.pueblo.kitMc.sala}</span>`;
  for(const id in cards){ const k = CARD[id]; if(k) h += `<span class="chip cartaChip" title="${k.texto}">${k.icono} ${k.nombre}${cards[id] > 1 ? ' <b>×'+cards[id]+'</b>' : ''}</span>`; }
  $('inv').innerHTML = h;
  $('nProp').textContent = props ?? 0; $('nLad').textContent = ladders ?? 0;
}
const last = {};
function hud(force){
  if(!p) return;
  if(started && !dead && !cashed) misionTick();
  const pct = Math.max(0, Math.ceil(lamp)), L = layout(p.r), safe = L.part !== undefined && L.part > 0 && L.part < ROOM_H-1;
  const cls = safe ? 'safe' : wet ? 'wet' : pct < 25 ? 'low' : '';
  if(force || pct !== last.pct || cls !== last.cls){ last.pct = pct; last.cls = cls; $('lampPct').textContent = pct+'%'; $('lampFill').style.width = pct+'%'; $('lampFill').className = cls; }
  const depth = Math.max(0, TC.base + p.r - SURF + 1); if(force || depth !== last.depth){ last.depth = depth; $('depth').textContent = depth; }
  const nuevo = TC.principal && prevRecord > ROOM_ROW[0] && p.r > prevRecord; if(force || nuevo !== last.nuevo){ last.nuevo = nuevo; $('depth').classList.toggle('nuevo', nuevo); }
  if(W.bag && $('bagDist')){ const d = bagDist(), txt = d === 0 ? 'aquí' : Math.abs(d)+' m '+(d > 0 ? '↓' : '↑');
    if(force || txt !== last.bag || !$('bagDist').textContent){ last.bag = txt; $('bagDist').textContent = txt; } }
  else if(!W.bag && $('bagChip')) renderInv();
  let seg, next;
  const pn = P1.nombre;
  if(!TC.principal){ seg = pn+' · '+TC.nombre; next = 'Sin salida'; }
  else if(L.surface){ seg = pn+' · Superficie'; next = 'Sala a '+(ROOM_ROW[0]-p.r)+' m'; }
  else if(L.part !== undefined){ seg = pn+' · Sala segura '+(L.room+1); next = safe ? 'A salvo' : 'Sala segura'; }
  else { seg = pn+' · '+TRAMOS[L.seg].n; next = L.seg < ROOM_ROW.length ? 'Sala a '+(ROOM_ROW[L.seg]-p.r)+' m' : 'Sin más salas'; }
  if(force || seg !== last.seg){ last.seg = seg; $('seg').textContent = seg; }
  if(force || next !== last.next){ last.next = next; $('next').textContent = next; }
  const wl = wick ? 'Alta' : 'Baja'; if(force || wl !== last.wl){ last.wl = wl; $('wickLbl').textContent = wl; $('wickBtn').classList.toggle('low', !wick); }
  // botón de acción: volver al pueblo (en la superficie), montacargas o ascensor (encima de ellos)
  const act = !dead && !cashed && started && !transit ? actionHere() : null;
  if(!act){ if(!$('cashBtn').hidden) $('cashBtn').hidden = true; }
  else { if($('cashBtn').hidden) $('cashBtn').hidden = false; if($('cashBtn').textContent !== act.txt) $('cashBtn').textContent = act.txt; }
  const canDrop = !ARC && !!(safe && !dead && !cashed && started && Object.keys(bag).some(k => !k.startsWith('o:') && bag[k] > 0));
  if($('dropBtn').hidden === canDrop) $('dropBtn').hidden = !canDrop;
}
// ---------- avisos ----------
// Cada aviso se queda como mínimo un rato (según lo largo que sea) y, cumplido ese tiempo, no se va solo:
// se quita cuando vuelves a mover a Deep o pulsas algo. Si llega otro mientras tanto, espera su turno.
let aviso = null, colaAvisos = [];
const minAviso = txt => Math.min(6, Math.max(2.2, 1 + txt.length*0.045));
function pintarAviso(a){
  const host = $('toastHost');
  if(a.cara){ const src = (window.RETRATOS && window.RETRATOS.deep && (window.RETRATOS.deep[a.cara] || window.RETRATOS.deep.contento)) || '';
    host.innerHTML = `<div class="toast habla"><img src="${src}" alt=""><div><b>Deep</b><span>${a.sub}</span></div></div>`; }
  else if(a.gif) host.innerHTML = `<div class="toast cartel">${a.title ? `<b>${a.title}</b>` : ''}<img src="${a.gif}" alt=""><span>${a.sub}</span></div>`;
  else host.innerHTML = `<div class="toast"><b>${a.title}</b><span>${a.sub}</span></div>`;
  aviso = {t0:t, min:minAviso((a.title||'') + a.sub), listo:false};
}
function toast(title, sub){ const a = {title, sub}; if(aviso && !aviso.listo && colaAvisos.length < 4) colaAvisos.push(a); else { colaAvisos = []; pintarAviso(a); } }
// Deep habla dentro de la mina: con su cara, en una esquina (se quita igual que los avisos)
// cartel de tutorial: título, texto y, si lo tiene, un gif que enseña la acción
function cartel(title, sub, gif){ const a = {title, sub, gif}; if(aviso && !aviso.listo && colaAvisos.length < 4) colaAvisos.push(a); else { colaAvisos = []; pintarAviso(a); } }
function decir(cara, texto){ const a = {cara, sub:texto}; if(aviso && !aviso.listo && colaAvisos.length < 4) colaAvisos.push(a); else { colaAvisos = []; pintarAviso(a); } }
function avisoTick(){
  if(!aviso || aviso.listo || t - aviso.t0 < aviso.min) return;
  if(colaAvisos.length){ pintarAviso(colaAvisos.shift()); return; }
  aviso.listo = true; const el = $('toastHost').firstElementChild; if(el) el.classList.add('listo');
}
function cerrarAviso(){
  const el = $('toastHost').firstElementChild; aviso = null; colaAvisos = [];
  if(el){ el.classList.add('fuera'); setTimeout(() => { if(el.parentNode && el.classList.contains('fuera')) el.remove(); }, 320); }
}
// cualquier pulsación: quita el aviso si ya ha pasado su tiempo mínimo
function avisoInput(){ if(aviso && aviso.listo) cerrarAviso(); }
// tarjeta de hallazgo: notas y coleccionables nuevos. Pausa el juego hasta que toques «Seguir»
let tarjetaAntes = false;
function tarjeta(o, eyebrow, nota){
  if(!$('tarjeta').hidden) return;
  tarjetaAntes = started; started = false;
  for(const k in input){ input[k] = false; tapped[k] = 0; }
  $('tjIcono').textContent = o.icono || '✨'; $('tjEyebrow').textContent = eyebrow; $('tjTitulo').textContent = o.nombre; $('tjTexto').textContent = o.texto || '';
  $('tjNota').textContent = nota || ''; $('tarjeta').hidden = false;
}
$('tjBtn').addEventListener('click', () => { $('tarjeta').hidden = true; started = tarjetaAntes; lastT = performance.now(); });
let endBag = {};
function showEnd(){
  const src = cashed ? endBag : bag;
  const list = Object.keys(src).filter(k => src[k] > 0).map(k => chip(k, src[k])).join('');
  if(cashed){
    $('ovEyebrow').textContent = 'De vuelta en el pueblo';
    $('ovTitle').textContent = endInfo ? endInfo.titulo : 'Has vuelto al pueblo';
    $('ovText').textContent = (endInfo ? endInfo.texto + ' ' : '') + (list ? 'Llegaste a '+maxDepth+' m y guardas:' : 'Llegaste a '+maxDepth+' m. No traías nada.');
    $('ovList').innerHTML = list;
    $('ovNote').textContent = 'Al volver a bajar, tus túneles se rellenan, salvo alrededor de tus escaleras y puntales.';
  } else {
    const M = {crush:['Te aplastó un derrumbe','El techo sin apoyo crujió y se vino abajo.'], drown:['Te quedaste sin aire','Estuviste demasiado tiempo bajo el agua o el barro.'], buried:['Sepultado por la arena','La arena te cubrió la cabeza y no saliste a tiempo.'], lamp:['La lámpara se apagó','A oscuras no hay forma de seguir.']}[dead.cause];
    $('ovEyebrow').textContent = 'Fin de la bajada · '+maxDepth+' m';
    $('ovTitle').textContent = M[0];
    $('ovText').textContent = M[1];
    $('ovList').innerHTML = dead.n ? list : '';
    let note = 'El último tramo se ha llenado de escombro y piedra suelta.';
    if(dead.n || dead.lost.props || dead.lost.ladders) note += ' Tu mochila ha quedado enterrada dentro, a '+maxDepth+' m: pica el escombro para recuperarla.';
    if(dead.oldBagLost && (dead.n || dead.lost.props || dead.lost.ladders)) note += ' La mochila que ya habías perdido antes se ha perdido para siempre.';
    if(dead.saved) note += ' Bolsillo secreto: '+dead.saved.n+' de '+dead.saved.name+' llegan al almacén.';
    if(dead.lost.props || dead.lost.ladders) note += ' Tus '+dead.lost.props+' puntales y '+dead.lost.ladders+' escaleras se quedan en la mochila' + (dead.n ? '' : ', enterrada donde caíste') + ': recupérala y vuelven contigo.';
    $('ovNote').textContent = note;
  }
  $('over').hidden = false;
}
function toVillage(){ if(prueba){ salirPrueba(); return; } Pa.pasarDia(); started = false; $('over').hidden = true; window.Pantallas.mostrar('plaza'); }

// ---------- bucle ----------
let lastT = performance.now();
function frame(now){
  const dt = Math.max(0, Math.min(0.05, (now - lastT)/1000)); lastT = now; t += dt;
  if(started && transit) updateTransit(dt);
  avisoTick();
  if(aviso && aviso.listo && (input.L || input.R || input.U || input.D)) cerrarAviso();
  if(started && !cashed && p && !transit){
    const top = Math.max(SURF, p.r - 22), bot = p.r + 22;
    ensure(bot + 30);
    simAcc += dt; stabAcc += dt; crackMsgT -= dt; lockMsgT -= dt; flashT = Math.max(0, flashT - dt);
    while(simAcc > 1/14){ simAcc -= 1/14; fluids(top, bot); updateBag(); dropItems(top, bot); }
    if(stabAcc > 0.1){ stabAcc = 0; stability(top, bot); checkPlanks(top, bot); mecanismos(top, bot); }
    updateCracks(top, bot, dt);
    updateUnroll(dt);
    slideAnim(top, bot, dt);
    updateRocks(dt);
    if(subida){   // arcade: Deep sube en el ascensor del fondo
      subida.t += dt; p.y -= dt*(1.5 + subida.t*5); p.sx = p.x;
      if(subida.t > 2.4 && !subida.hecho){ subida.hecho = true; if(subida.cb) subida.cb(); }
    }
    if(!dead && !subida){
      if(foco){ for(const k in input) input[k] = false; }
      updatePlayer(dt);
      updateMoths(dt);
      if(P1.hielo) derretir(dt);
      if(lamp <= 0){ lamp = 0; die('lamp'); }
    } else {
      deadT += dt;
      // el derrumbe va llenando el tramo
      const n = Math.ceil(fillQ.length * Math.min(1, dt*3)) + 3;
      for(const [r,c] of fillQ.splice(0, n)){ setT(r, c, fillType(r, c)); if(Math.random() < 0.3) burst(r+0.5, c+0.5, '#847e87', 2); }
      if(deadT > 1.6 && $('over').hidden && !ARC){ finishCollapse(); showEnd(); }
    }
    for(const it of W.items){ if(it.dy) it.dy = Math.max(0, it.dy - dt*14);
      if(it.t0 !== undefined){ const e = t - it.t0; it.sube = e < 2.4 ? 1 - Math.abs(e - 1.2)/1.2 : 0; if(e >= 2.4){ delete it.t0; it.sube = 0; } } }   // el montacargas sube y vuelve
    if(chestFx){ chestFx.t += dt; if(chestFx.t > 2.4) chestFx = null; }
    for(const q of particles){ q.x += q.vx*dt; q.y += q.vy*dt; q.vy += 18*dt; q.life -= dt; }
    particles = particles.filter(q => q.life > 0);
    for(const f of floats){ f.y -= dt*1.1; f.life -= dt; }
    floats = floats.filter(f => f.life > 0);
    // temblor: mientras haya cosas cayendo o crujiendo por encima de ti
    const falling = rocks.filter(k => k.y < p.y + 6).length;
    const shT = (falling + cracking*0.5) ? Math.min(TB.maximo, 0.6 + (falling + cracking*0.5)*TB.porBloque) : 0;
    shake += (shT - shake)*Math.min(1, dt*8);
    shakeKick = Math.max(0, shakeKick - dt*7);
    if(window.Sonido) window.Sonido.retumbo(Math.min(1, (falling + cracking*0.4)/6));
    const Lz = layout(p.r), closeUp = !dead && ((Lz.surface && !bajadaBloqueada()) || (Lz.part !== undefined && Lz.part > 0 && Lz.part < ROOM_H-1));
    const zBase = cfg.zoom === 'siempre' ? Math.max(1, CA.zoomExplorar) : 1;
    if(!foco) camX += ((p.x + 0.5)*T - camX)*Math.min(1, dt*CA.seguirLateral);
    const zT = (looking ? CA.zoomVer : closeUp ? ZCLOSE : zBase) ;
    zoom += (zT - zoom)*Math.min(1, dt*(zT > zoom ? CA.velocidadAcercar : CA.velocidadAlejar));
    if(looking) zoom += (zT - zoom)*Math.min(1, dt*4);   // al mirar, rápido
    if(Math.abs(zoom - zT) < 0.004) zoom = zT;
    if(foco){ foco.t -= dt; if(foco.t <= 0) foco = null; }
    const target = (foco ? foco.r : p.y) - (VH/T)*0.35;
    if(foco) camX += ((foco.c + 0.5)*T - camX)*Math.min(1, dt*4);
    cam += (Math.max(-2, target) - cam)*Math.min(1, dt*(foco ? 3 : 6));
  }
  else if(window.Sonido) window.Sonido.retumbo(0);
  if(activa && W && p){ render(); hud(); }
  requestAnimationFrame(frame);
}

// ---------- controles ----------
const KEYS = {ArrowLeft:'L', a:'L', A:'L', ArrowRight:'R', d:'R', D:'R', ArrowDown:'D', s:'D', S:'D', ArrowUp:'U', w:'U', W:'U'};
addEventListener('keydown', e => {
  if(activa) avisoInput();
  if(KEYS[e.key]){ e.preventDefault(); if(looking){ if(!e.repeat) toggleLook(); return; } if(!e.repeat) press(KEYS[e.key]); else input[KEYS[e.key]] = true; }
  else if(!e.repeat && (e.key === 'v' || e.key === 'V' || e.key === 'z' || e.key === 'Z')) toggleLook();
  else if(!e.repeat && (e.key === 'o' || e.key === 'O' || ((e.key === 'p' || e.key === 'P') && e.shiftKey))) placeTool('prop', 'puente');
  else if(!e.repeat && (e.key === 'e' || e.key === 'E') && e.shiftKey) placeTool('lad', 'lado');
  // mantener P = puente; mantener E = escalera al lado (igual que en el móvil)
  else if(!e.repeat && (e.key === 'p' || e.key === 'P')) keyHoldStart('p', () => placeTool('prop'), () => placeTool('prop', 'puente'));
  else if(!e.repeat && (e.key === 'e' || e.key === 'E')) keyHoldStart('e', () => placeTool('lad'), () => placeTool('lad', 'lado'));
  else if(!e.repeat && (e.key === 'm' || e.key === 'M')) wick = wick ? 0 : 1;
});
function toggleLook(){
  if(!started || dead || cashed || bonusOpen || ruletaOpen) return;
  looking = !looking;
  if(looking){ $('toastHost').innerHTML = ''; aviso = null; colaAvisos = []; }
  for(const kk in input){ input[kk] = false; tapped[kk] = 0; }
  $('verBtn').classList.toggle('activo', looking);
}
const keyHold = {};
function keyHoldStart(k, corto, largo){ const h = keyHold[k] = {held:false, corto}; h.tm = setTimeout(() => { h.held = true; largo(); }, 350); }
addEventListener('keyup', e => {
  if(KEYS[e.key]) input[KEYS[e.key]] = false;
  const k = e.key.toLowerCase(), h = keyHold[k];
  if(h){ clearTimeout(h.tm); if(!h.held) h.corto(); delete keyHold[k]; }
});
document.querySelectorAll('#pad button').forEach(b => {
  const k = b.dataset.k;
  const down = e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('on'); avisoInput();
    if(k === 'ver') toggleLook();
    else if(looking && (k in input)) toggleLook();            // al tocar una flecha se deja de mirar (sin moverse)
    else if(k === 'prop'){ b._held = false; clearTimeout(b._hold); b._down = true; b._hold = setTimeout(() => { if(b._down){ b._held = true; placeTool('prop', 'puente'); } }, 350); }
    else if(k === 'lad'){ b._held = false; clearTimeout(b._hold); b._down = true; b._hold = setTimeout(() => { if(b._down){ b._held = true; placeTool('lad', 'lado'); } }, 350); }
    else if(k === 'wick') wick = wick ? 0 : 1; else press(k); };
  // Puntal: toque corto = puntal normal; mantener pulsado = puente
  const up = () => { b.classList.remove('on'); if(k in input) input[k] = false; if(k === 'ver') b.classList.toggle('activo', looking);
    if(k === 'prop' && b._down){ b._down = false; clearTimeout(b._hold); if(!b._held) placeTool('prop'); }
    if(k === 'lad' && b._down){ b._down = false; clearTimeout(b._hold); if(!b._held) placeTool('lad'); } };
  b.addEventListener('pointerdown', down);
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev => b.addEventListener(ev, up));
  b.addEventListener('contextmenu', e => e.preventDefault());
});
$('cashBtn').addEventListener('click', () => { const a = actionHere(); if(a) a.fn(); });
$('stage').addEventListener('pointerdown', () => { avisoInput(); escenaInput(); });
addEventListener('keydown', e => { if(activa && !e.repeat) escenaInput(); });
$('dropBtn').addEventListener('click', openDrop);
$('dropClose').addEventListener('click', () => { $('dropSheet').hidden = true; started = wasStartedD; lastT = performance.now(); });
$('bnBtn').addEventListener('click', bonusBtn);
$('ruBtn').addEventListener('click', spinRuleta);
document.querySelectorAll('#ruCartas .carta').forEach((el, i) => el.addEventListener('click', () => chooseCard(i)));
bnCv.addEventListener('click', () => { if(BN.st === 'cerrado') bonusBtn(); });
$('ovBtn').addEventListener('click', toVillage);
$('helpBtn').addEventListener('click', () => { $('help').hidden = false; });
$('helpClose').addEventListener('click', () => { $('help').hidden = true; });
// ajustes
const SL = ['drain','corn','crack','thrH','thrS','minP','minL','llevP','llevL','oilEvery','oilMin','oilGain','cap','resp','respP','rubMax','caidaDesde','caidaDanio','caidaCrece'], SS = ['dark','zoom','recoger','frag','anim','caida','caidaModo','escala'];
function syncTune(){ const st = $('statsTxt'); if(st) st.textContent = statsText(); SL.forEach(k => { $('s_'+k).value = cfg[k]; $('o_'+k).textContent = cfg[k]; }); SS.forEach(k => { $('s_'+k).value = cfg[k]; }); $('s_sound').value = window.Sonido && !window.Sonido.activado ? '0' : '1'; }
SL.forEach(k => $('s_'+k).addEventListener('input', e => { cfg[k] = +e.target.value; $('o_'+k).textContent = cfg[k]; save('deep-cfg', cfg); }));
SS.forEach(k => $('s_'+k).addEventListener('change', e => { cfg[k] = e.target.value; save('deep-cfg', cfg); }));
$('s_sound').addEventListener('change', e => { window.Sonido && window.Sonido.activar(e.target.value === '1'); });
let wasStarted = false;
// (si ya está abierto, no se vuelve a guardar el estado: un doble toque dejaba el juego en pausa al pulsar Seguir)
$('tuneBtn').addEventListener('click', () => { if(!$('tuning').hidden) return; syncTune(); wasStarted = started; started = false; $('tuning').hidden = false; });
$('tuneClose').addEventListener('click', () => { $('tuning').hidden = true; started = wasStarted; lastT = performance.now(); });
$('tuneReset').addEventListener('click', () => { cfg = {...BASE}; save('deep-cfg', null); syncTune(); });

// ---------- arranque ----------
let activa = false;
function cargarMundo(key){
  setPozo(key);
  const saved = load(P1.guardado, null);
  MINA = null;
  if(saved && saved.ver === WV && saved.tiros){
    try{ MINA = {ver:WV, seed:saved.seed, actual:'principal', tiros:{}, stats:saved.stats || {ext:{}, per:{}}}; for(const id in saved.tiros){ const w = unpackWorld(saved.tiros[id]); if(w) MINA.tiros[id] = w; } if(!MINA.tiros.principal) MINA = null; }catch(e){ MINA = null; }
  }
  if(!MINA){ MINA = newMine(); if(saved) mundoNuevo = true; }
  W = MINA.tiros.principal; setTiro('principal');
}
let mundoNuevo = false;
cargarMundo('viejo');
p = {c:7, r:SURF-2, x:7, y:SURF-2, face:1, anim:'reposo', animT:0, act:null, actT:0, onPlat:true, stun:0};
lamp = 100; bag = {}; props = 0; ladders = 0; wick = 1; rocks = []; particles = []; floats = []; fillQ = []; buried = 0;
requestAnimationFrame(frame);
return {
  // entrar en la mina con el pozo que toque ('viejo' o 'pruebas')
  entrar(key, opts){
    if(opts && opts.prueba){ iniciarPrueba(key, opts.prueba); return; }
    if(recargar || (key && key !== PK)){ recargar = false; cargarMundo(key || PK); }
    startOpts = opts || null; activa = true; resize(); startRun(); },
  // ---- Deep Arcade ----
  arcade(o){
    ARC = o; prueba = null; setPozo(o.pozo); MINA = newMine(); W = MINA.tiros.principal; setTiro('principal'); recargar = true;
    startOpts = null; activa = true; $('over').hidden = true; resize(); startRun();
    subida = null; fuego = 0; prisa = 0; luzTotal = 0; comboTag = null;
    taken = {p:0, l:0, k:0}; props = o.puntales ?? 10; ladders = o.escaleras ?? 8; llaves = 0; cards = {}; ungLlevo = {}; kitLlevo = false;
    colaAvisos = []; aviso = null; $('toastHost').innerHTML = ''; renderInv(); hud(true);
  },
  arcadeEstado(){
    if(!p || !TC) return null;
    const L = layout(p.r), mins = {};
    for(const k in bag){ if(!String(k).startsWith('o:') && INFO[k] && INFO[k].val && bag[k] > 0) mins[INFO[k].key] = bag[k]; }
    return {inRoom: L.part !== undefined && L.part > 0 && L.part < ROOM_H-1, sala: L.room, superficie: !!L.surface, dead: !!dead, started,
      profundidad: Math.max(0, p.r - SURF + 1), maxima: maxDepth, bag: mins, lamp, salas: ROOM_ROW.length,
      seg: L.seg, wick: !!wick, bajoAgua: !!submerged, props, ladders, enJaula: !!p.onPlat, prisa, luzTotal};
  },
  arcadeQuitar(pedido){ for(const [k, n] of Object.entries(pedido)){ const tt = KEY2T[k]; if(tt === undefined) continue; bag[tt] = Math.max(0, (bag[tt]||0) - n); if(!bag[tt]) delete bag[tt]; } renderInv(); },
  arcadeVaciar(){ for(const k in bag) if(!String(k).startsWith('o:')) delete bag[k]; renderInv(); },
  arcadeAbrir(room){
    const r = ROOM_ROW[room] + ROOM_H - 1; for(let c=0;c<COLS;c++) setT(r, c, BEAM);
    const cj = W.items.find(i => i.k === 'cajon' && i.room === room); if(cj) cj.pagado = true;
    burst(r, 7.5, '#fbf236', 20); SND('abrir'); shakeKick = Math.max(shakeKick, 2);
  },
  arcadeReaparecer(){
    const r = lastRoomFloor >= (ROOM_ROW.length ? ROOM_ROW[0] + ROOM_H - 1 : 1e9) ? lastRoomFloor - 1 : SURF - 2, c = r === SURF - 2 ? 7 : LLAMAS[0] + 1;
    dead = null; deadT = 0; p.r = r; p.y = r; p.c = c; p.x = c; p.sx = c; p.falling = false; p.fallN = 0; p.stun = 0; p.act = null;
    p.onPlat = r === SURF - 2; if(p.onPlat) platOpen = 0;
    lamp = 100; buried = 0; air = airMax(); flashT = 0.5; wick = 1; started = true; lastT = performance.now();
    for(const k in input){ input[k] = false; tapped[k] = 0; }
  },
  aspecto, retratoAspecto,
  // almacén del pueblo: cuántos puntales y escaleras te llevas en cada bajada
  llevar(k, v){ if(k === 'p') cfg.llevP = v; else cfg.llevL = v; save('deep-cfg', cfg); },
  get llevo(){ return {p: cfg.llevP, l: cfg.llevL}; },
  get capacidadBase(){ return Math.round(cfg.cap * mejora('mochila')); },
  filaSala(i){ return ROOM_ROW[i] !== undefined ? ROOM_ROW[i] - SURF + 1 : null; },
  fuego(k){ fuego = Math.max(0, Math.min(1, k || 0)); },
  combo(o){ comboTag = o || null; },
  arcadeDar(o){ props += o.puntales || 0; ladders += o.escaleras || 0; renderInv(); },
  arcadeSubir(cb){ subida = {t: 0, cb}; started = true; for(const k in input){ input[k] = false; tapped[k] = 0; } SND('chirrido'); },
  pausa(v){ if(v){ started = false; for(const k in input){ input[k] = false; tapped[k] = 0; } } else { started = true; lastT = performance.now(); } },
  flotar(txt, col, dy){ if(p) floats.push({x:p.x+0.5, y:p.y - 0.4 - (dy||0), txt, life:1.3, col: col || '#fbf236'}); },
  avisar(titulo, texto){ toast(titulo, texto); },
  sonar(n, v){ SND(n, v); },
  // editor de niveles
  generar: generarSector, tramos: tramosDe, get probando(){ return !!prueba; },
  salir(){ activa = false; started = false; },
  borrar(){ for(const k in POZOS) save(POZOS[k].guardado, null); cargarMundo(PK); },
  get pozo(){ return PK; },
  _dbg(){ return {p, W, get MINA(){ return MINA; }, get TC(){ return TC; }, get PLACED(){ return PLACED; }, get transit(){ return transit; }, get bag(){ return bag; }, rocks, setT, tAt, consts:{AIR, RUBBLE, STONE, HARD, DIRT, SURF, get ROOM_ROW(){ return ROOM_ROW; }, ROOM_H, PROP, PLANK, BEDROCK, CSAND, SAND, WATER, MUD, ROCK, DOOR, PASS}, get cfg(){ return cfg; }, placeTool, persist, get llaves(){ return llaves; }, set llaves(v){ llaves = v; }, get wick(){ return wick; }, set wick(v){ wick = v; }, get looking(){ return looking; }, get zoom(){ return zoom; }, get shake(){ return shake + shakeKick; }, get props(){ return props; }, get ladders(){ return ladders; }, get cards(){ return cards; }, set cards(v){ cards = v; }, get air(){ return air; }, get lamp(){ return lamp; }, set lamp(v){ lamp = v; }, get dead(){ return dead; }, die, get escena(){ return escena; }, get aviso(){ return aviso; }, get mision(){ return mision; }, get kitLlevo(){ return kitLlevo; }, liftCost, get taken(){ return taken; }, refillTunnels, cashOut, get ungLlevo(){ return ungLlevo; }, layout, doSwap, capacity}; },
};
})();
