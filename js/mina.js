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
const AIR=0, DIRT=1, STONE=2, HARD=3, CLAY=4, COAL=5, COPPER=6, QUARTZ=7, SAND=8, WATER=9, GAS=10, ROCK=11, BEAM=12, PROP=13, LADDER=14, RUBBLE=15, DOOR=16, MUD=17, PASS=18, BEDROCK=19, PLANK=20, CSAND=21;
const M = D.materiales;
const mat = (key, extra) => Object.assign({hp:M[key].golpes, val:M[key].valor, n:M[key].nombre, dot:M[key].color, key}, extra);
const INFO = {
  [AIR]:{}, [DIRT]:mat('tierra', {tile:'tierra'}), [STONE]:mat('piedra', {tile:'piedra'}), [HARD]:mat('rocaDura', {tile:'roca_dura'}), [CLAY]:mat('arcilla', {tile:'arcilla'}),
  [COAL]:mat('carbon', {tile:'piedra', veta:'carbon'}), [COPPER]:mat('cobre', {tile:'piedra', veta:'cobre'}),
  [QUARTZ]:mat('cuarzo', {tile:'piedra', veta:'cuarzo'}), [SAND]:mat('arena', {tile:'arena'}), [WATER]:{}, [GAS]:{}, [ROCK]:{hp:999, tile:'maciza'},
  [BEAM]:{hp:1}, [PROP]:{}, [LADDER]:{}, [RUBBLE]:mat('escombro', {tile:'escombro'}), [DOOR]:{hp:999, tile:'maciza'}, [MUD]:{}, [PASS]:{hp:999, tile:'maciza'},
  [BEDROCK]:{hp:9999, tile:'maciza', madre:true}, [PLANK]:{}, [CSAND]:mat('arenaArcillosa', {tile:'arena'}),
};
const KEY2T = {}; for(const [tt, I] of Object.entries(INFO)) if(I.val) KEY2T[I.key] = +tt;
const isSolid = t => !(t===AIR || t===WATER || t===GAS || t===PROP || t===LADDER || t===MUD || t===PLANK);
const isStruct = t => t===DIRT||t===STONE||t===HARD||t===CLAY||t===COAL||t===COPPER||t===QUARTZ||t===BEAM||t===ROCK||t===DOOR||t===PASS||t===BEDROCK;
const isAnchor = t => t===HARD||t===BEAM||t===ROCK||t===DOOR||t===PASS||t===BEDROCK;
const isLoose = t => t===SAND||t===RUBBLE||t===CSAND;
const isSand = t => t===SAND||t===CSAND;
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
      for(let i=0;i<400;i++) tr.push({n: N[Math.min(i, N.length-1)], len: Math.min(P1.salasMax || 999, P1.salasCada + i*(P1.salasCrece || 0))});
      tr.push({n: N[N.length-1], len: Infinity});
    } else tr = P1.tramos.map((s, i, a) => ({n:s.nombre, len: i === a.length-1 ? Infinity : s.largo}));
    const rr = []; { let r = SURF; for(let i=0;i<tr.length-1;i++){ r += tr[i].len; rr.push(r); r += ROOM_H; } }
    return {id, principal:true, nombre:P1.nombre, tramos:tr, rooms:rr, base:0, fondo:Infinity};
  }
  const ra = RAMALES.find(x => x.id === id) || RAMALES[0];
  return {id, principal:false, nombre:ra.nombre, ramal:ra, tramos:[{n:ra.nombre, len:Infinity}], rooms:[], base:ra.fila,
          fondo: SURF + ra.largo, salida: ra.lado === 'izquierda' ? COLS-1 : 0};
}
function setTiro(id){ TC = tiroCfg(id); TRAMOS = TC.tramos; ROOM_ROW = TC.rooms; PLACED = placePieces(); }
const hashStr = s => { let h = 7; for(const ch of String(s)) h = (h*31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
function layout(r){
  if(r < SURF) return TC.principal ? {surface:true} : {seg:0, d:0, techo:true};
  let d = r - SURF;
  for(let i=0;i<TRAMOS.length;i++){
    if(d < TRAMOS[i].len) return {seg:i, d};
    d -= TRAMOS[i].len;
    if(i < TRAMOS.length-1){ if(d < ROOM_H) return {seg:i, room:i, part:d}; d -= ROOM_H; }
  }
}
let SECRET = null, DT = {};
function setPozo(key){
  PK = POZOS[key] ? key : 'viejo'; P1 = POZOS[PK];
  RAMALES = ON('ramales') ? (D.ramales || []) : [];
  DT = P1.desdeTramo || {};
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
  frag:'1', anim:'todo', minP:HM.puntales, minL:HM.escaleras, recoger: D.herramientas.recogerPuntales ? '1' : '0', oilEvery:9, oilGain:LA.aceite,
  dark:'1', zoom: CA.zoomExplorar >= 2 ? 'siempre' : 'salas'};
let cfg = {...BASE};
try{ const s = JSON.parse(localStorage.getItem('deep-cfg')||'null'); if(s) cfg = {...BASE, ...s}; }catch(e){}
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
const WORLD_VER = 5;   // sube cuando cambia cómo se genera el pozo (fuerza una mina nueva)
function newTiroWorld(id, seed){ return {id, ver:WORLD_VER, seed, rows:[], items:[], bag:null, chestOpen:false, rewarded:[], runs:0, record:0, doors:[], lastRun:0}; }
function newMine(){ const seed = (Math.random()*1e9)|0; return {ver:WORLD_VER, seed, actual:'principal', tiros:{principal: newTiroWorld('principal', seed)}}; }
function newWorld(){ return newTiroWorld('principal', (Math.random()*1e9)|0); }
function packWorld(W){
  return {id:W.id, lastRun:W.lastRun, seed:W.seed, rows:W.rows.map(R => String.fromCharCode(...Array.from(R.t, v => 65+v))), nat:W.rows.map(R => String.fromCharCode(...Array.from(R.nat, v => 48+v))), lv:W.rows.map(R => String.fromCharCode(...Array.from(R.lv, v => 48+Math.round(v*40)))),
    items:W.items.filter(i=>i.alive || i.k === 'herr'), bag:W.bag, rewarded:W.rewarded, runs:W.runs, herr:true, ver:W.ver, record:W.record, doors:W.doors};
}
function unpackWorld(o){
  if(o.ver !== WORLD_VER) return null;   // pozo de una versión anterior: se empieza uno nuevo
  const w = {id:o.id||'principal', lastRun:o.lastRun||0, ver:WORLD_VER, seed:o.seed, rows:[], items:o.items||[], bag:o.bag||null, rewarded:o.rewarded||[], runs:o.runs||0, record:o.record||0, doors:o.doors||[]};
  o.rows.forEach((s, i) => { const R = newRow(), n = o.nat && o.nat[i];
    const lvS = o.lv && o.lv[i];
    for(let c=0;c<COLS;c++){ R.t[c] = s.charCodeAt(c)-65; R.hp[c] = INFO[R.t[c]].hp||0; R.nat[c] = n ? n.charCodeAt(c)-48 : (isSolid(R.t[c]) ? 0 : 1);
      if(R.t[c] === WATER) R.lv[c] = lvS ? Math.max(0.05, (lvS.charCodeAt(c)-48)/40) : 1; }
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
const PZ_TILE = {'_':AIR, t:DIRT, p:STONE, d:HARD, m:ROCK, x:BEDROCK, g:CSAND, a:SAND, '~':WATER, e:RUBBLE, r:CLAY, c:COAL, u:COPPER, q:QUARTZ, P:DOOR};
function tramoRows(i){ let r = SURF; for(let k=0;k<i;k++){ r += TRAMOS[k].len + (k < ROOM_ROW.length ? ROOM_H : 0); } return [r, r + (TRAMOS[i] ? Math.min(TRAMOS[i].len, 60) : 0)]; }
function placePieces(){
  const out = [], seed = W ? W.seed : 0;
  if(!ON('piezas')) return out;
  for(const pz of (window.PIEZAS || [])){
    if((pz.pozo || 'pruebas') !== PK) continue;
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
    out.push({id:pz.id, r0, rows});
  }
  return out;
}
function pieceAt(r, c){ for(const P of PLACED){ const k = r - P.r0; if(k >= 0 && k < P.rows.length && P.rows[k][c] !== '.') return P.rows[k][c]; } return null; }
const pieceRow = r => PLACED.some(P => r >= P.r0 - 1 && r < P.r0 + P.rows.length + 1);
function applyPieces(r, Tt){
  for(const P of PLACED){
    const k = r - P.r0; if(k < 0 || k >= P.rows.length) continue;
    const line = P.rows[k];
    for(let c=0;c<COLS;c++){
      const ch = line[c]; if(ch === '.') continue;
      W.items = W.items.filter(it => !(it.r === r && it.c === c && it.k !== 'moth'));
      if(PZ_TILE[ch] !== undefined){ Tt[c] = PZ_TILE[ch]; continue; }
      Tt[c] = AIR;
      if(ch === 'o') W.items.push({k:'oil', r, c, alive:true});
      else if(ch === 'k') W.items.push({k:'llave', r, c, alive:true});
      else if(ch === 'h' || ch === 'H') W.items.push({k:'herr', tipo: ch === 'H' ? 'puntal' : 'escalera', r, c, alive:true});
      else if(ch === 'B') W.items.push({k:'cofrePieza', r, c, alive:true, abierto:false});
      else if(ch === 'f') W.items.push({k:'obj', id:'flor_mina', r, c, alive:true});
      else if(ch === 'M') W.items.push({k:'lift', r, c, alive:true});
    }
  }
}
function newRow(){ return {t:new Uint8Array(COLS), hp:new Uint16Array(COLS), sh:new Float32Array(COLS), mv:new Uint32Array(COLS), seen:new Uint8Array(COLS), nat:new Uint8Array(COLS), lv:new Float32Array(COLS), ox:new Float32Array(COLS), oy:new Float32Array(COLS)}; }
let lastOil = SURF;
function genRow(r){
  const R = newRow(), Tt = R.t, S = W.seed;
  const L = layout(r);
  if(L.surface){ R.nat.fill(1); return R; }
  // ramal: techo y fondo de roca maciza
  if(!TC.principal && (r < SURF || r >= TC.fondo)){ Tt.fill(BEDROCK); for(let c=0;c<COLS;c++) R.hp[c] = INFO[BEDROCK].hp; return R; }
  if(L.part !== undefined){
    R.nat.fill(1);
    if(L.part === ROOM_H-2) W.items.push({k:'cofreSala', room:L.room, r, c:SA.columnaCofre, alive:true});
    if(L.part === 0 || L.part === ROOM_H-1) Tt.fill(BEAM);
    for(let c=0;c<COLS;c++) R.hp[c] = INFO[Tt[c]].hp||0;
    return R;
  }
  const d = r - SURF, sg = L.seg;
  for(let c=0;c<COLS;c++){
    let v = DIRT;
    if(vn(c/5, r/5, S+1) < 0.15 + Math.min(0.55, d*0.008)) v = STONE;
    if(d > 3 && vn(c/5, r/2.2, S+2) > 0.78) v = P1.arenaArcillosa && ON('barro') && vn(c/6, r/6, S+15) < P1.arenaArcillosa ? CSAND : SAND;
    if(vn(c/2.6, r/2.6, S+3) > 0.73 + Math.min(sg, 6)*0.03) v = CLAY;
    if(sg >= DT.carbon && !isSand(v) && vn(c/2.2, r/2.2, S+4) > 0.74) v = COAL;
    if(sg >= DT.cobre && !isSand(v) && vn(c/2, r/2, S+5) > 0.75) v = COPPER;
    if(sg >= DT.cuarzo && v === STONE && h2(c, r, S+12) < 0.008) v = QUARTZ;
    if(d > 3 && vn(c/3, r/3, S+6) > 0.84) v = HARD;
    if(sg >= DT.cuevas && d > 6 && L.d > 1 && vn(c/4, r/3, S+7) > 0.7){
      v = AIR;
      if(ON('agua') && sg >= DT.agua && vn(c/5, r/5, S+8) > 0.58) v = WATER;
      else if(ON('grisu') && sg >= DT.gas && vn(c/4, r/4, S+9) > 0.6) v = GAS;
      else if(ON('polillas') && sg >= DT.polillas && h2(c, r, S+13) < 0.025) W.items.push({k:'moth', x:c+0.5, y:r+0.5, alive:true});
    }
    if(r === SURF) v = DIRT;
    Tt[c] = v;
  }
  if(L.d > 2 && r - lastOil >= cfg.oilEvery + Math.min(sg, 4)*2){
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
const LL = D.llaves || {cada:24, desdeFila:10}, PU = D.puertas || {cada:20, desdeFila:14}, SB = D.salaBonus || {premios:[]};
const RC = D.recogibles || {cada:9, desdeFila:6, probPuntal:0.45, cantidad:1, regenerar:true};
function addKit(r, fresh){
  W.herr = true;
  const L = layout(r); if(!L || L.surface || L.part !== undefined) return;
  if(fresh && ON('llaves') && r - SURF >= LL.desdeFila && h2(r, 31, W.seed + 71) < 1/LL.cada){
    const R = W.rows[r], c = 1 + Math.floor(h2(r, 32, W.seed + 72)*(COLS-2));
    if(R.t[c] !== WATER && R.t[c] !== GAS && R.t[c] !== ROCK && R.t[c] !== DOOR && R.t[c] !== PASS && !pieceAt(r, c)){ R.t[c] = AIR; R.hp[c] = 0; R.nat[c] = 1; W.items.push({k:'llave', r, c, alive:true}); }
  }
  // objetos sueltos (coleccionables de minería): no reaparecen
  if(fresh && ON('objetos')) for(const id in OBJ){ const o = OBJ[id].suelto; if(!o || r - SURF < o.desdeFila || h2(r, hashStr(id) % 997, W.seed + 91) >= 1/o.cada) continue;
    const R = W.rows[r], c = 1 + Math.floor(h2(r, hashStr(id) % 991, W.seed + 92)*(COLS-2));
    if(R.t[c] !== WATER && R.t[c] !== GAS && R.t[c] !== ROCK && R.t[c] !== DOOR && R.t[c] !== PASS && !pieceAt(r, c) && !W.items.some(i => i.r === r && i.c === c)){ R.t[c] = AIR; R.hp[c] = 0; R.nat[c] = 1; W.items.push({k:'obj', id, r, c, alive:true}); } }
  if(r - SURF < RC.desdeFila) return;
  if(h2(r, 3, W.seed + 51) > 1/RC.cada) return;
  if(W.items.some(i => i.k === 'herr' && i.r === r)) return;
  const c = Math.floor(h2(r, 9, W.seed + 52)*COLS);
  if(fresh){ const R = W.rows[r]; if(R.t[c] !== WATER && R.t[c] !== GAS && R.t[c] !== ROCK && R.t[c] !== DOOR && R.t[c] !== PASS && !pieceAt(r, c) && !W.items.some(i => i.r === r && i.c === c)){ R.t[c] = AIR; R.hp[c] = 0; R.nat[c] = 1; } else return; }
  W.items.push({k:'herr', tipo: h2(r, 11, W.seed + 53) < RC.probPuntal ? 'puntal' : 'escalera', r, c, alive:true});
}
// Las salas seguras se reconstruyen en cada bajada: techo y suelo de viga, dentro vacío
// partidas de antes: cofres en las salas que ya existían
function ensureRoomItems(){
  for(let i=0;i<ROOM_ROW.length;i++){
    if(ROOM_ROW[i] + ROOM_H > W.rows.length) break;
    if(!W.items.some(it => it.k === 'cofreSala' && it.room === i)) W.items.push({k:'cofreSala', room:i, r:ROOM_ROW[i]+ROOM_H-2, c:SA.columnaCofre, alive:true});
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
function press(k){ input[k] = true; tapped[k] = 0.3; }

// Al volver del pueblo: lo que abriste por debajo de la primera sala se rellena de escombro y piedra dura.
// Queda el rastro (ya lo habías visto) pero no un tubo para tirarse en bomba.
function refillTunnels(){
  if(!VU || !VU.rellenar || (TC.principal && !ROOM_ROW.length)) return 0;
  const from = TC.principal ? ROOM_ROW[0] + ROOM_H : SURF, mix = VU.relleno, tot = (mix.escombro||0) + (mix.piedra||0) + (mix.rocaDura||0) || 1;
  let n = 0;
  for(let r=from; r<W.rows.length; r++){
    if(layout(r).part !== undefined) continue;
    const R = W.rows[r];
    for(let c=0;c<COLS;c++){
      const v = R.t[c];
      if(R.nat[c] || !(v === AIR || v === LADDER || v === PROP)) continue;
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
function startRun(){
  if(!MINA){ MINA = newMine(); }
  if(MINA.actual !== 'principal' || !TC || !TC.principal){ MINA.actual = 'principal'; W = MINA.tiros.principal; setTiro('principal'); }
  transit = null;
  if(!W.rewarded) W.rewarded = [];
  lastOil = SURF;
  ensure(SURF + 40);
  const refilled = W.runs > 0 ? refillTunnels() : 0;
  if(W.runs > 0) restoreRooms();
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
  lamp = 100; bag = {}; props = Math.max(Pa.kit.puntales||0, cfg.minP); ladders = Math.max(Pa.kit.escaleras||0, cfg.minL); llaves = Pa.kit.llaves||0; wick = 1;
  prevRecord = W.record||0; newGround = false;
  cards = {}; spun = new Set(); carpDone = 0; chestFx = null; air = airMax(); submerged = false; airWarn = false;
  ensureRoomItems();
  dead = null; deadT = 0; cashed = false; rocks = []; particles = []; floats = []; fillQ = [];
  digT = 0; moveT = 0; buried = 0; crackMsgT = 0; lockMsgT = 0; flashT = 0; maxDepth = 0;
  lastRoomFloor = SURF - 1; roomsSeen = new Set(); segSeen = 0;
  cam = p.y - (VH/T)*0.35; zoom = ZCLOSE; camX = (p.x+0.5)*T; started = true;
  renderInv(); hud(true);
  if(mundoNuevo){ mundoNuevo = false; toast('Mina nueva', 'Versión '+D.version+': el pozo ha cambiado y empieza de cero'); }
  else if(bagWhere()){ const bw = bagWhere(); toast('Tu mochila te espera', bw.here ? 'Bajo el escombro, a '+(W.bag.r - SURF + 1)+' m' : 'Se quedó en el '+bw.nombre); }
  else if(refilled) toast('El pozo se ha asentado', 'Tus túneles de abajo se han llenado de escombro y piedra');
  else toast(P1.nombre, TRAMOS[0].n);
}

// ---------- cartas ----------
const has = id => (cards[id]||0) > 0;
function useCard(id){ if(!has(id)) return false; cards[id]--; if(!cards[id]) delete cards[id]; renderInv(); return true; }
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
      if((!isSand(v) && v !== WATER && v !== RUBBLE && v !== MUD) || R.mv[c] === tick) continue;
      if(v === WATER){ waterStep(r, c, dir); continue; }
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
// igualando niveles; si no tiene adónde ir se queda quieta. Dos casillas en un hueco de cuatro quedan a media altura.
function waterStep(r, c, dir){
  const R = W.rows[r];
  let L = R.lv[c];
  if(L < 0.02){ setT(r, c, AIR); return; }
  // agua que toca arena arcillosa: se empapa y se vuelve barro (se gasta agua). La arena normal no.
  for(const [rr, cc] of [[r+1, c], [r, c-dir], [r, c+dir]]){
    if(cc < 0 || cc >= COLS || tAt(rr, cc) !== CSAND) continue;
    setT(rr, cc, MUD); W.rows[rr].mv[cc] = tick; L -= BA.aguaQueGasta;
    if(Math.abs(rr - p.r) < 10) burst(rr+0.3, cc+0.5, '#8f563b', 3);
    if(L < 0.02){ setT(r, c, AIR); return; }
    R.lv[c] = L; break;
  }
  // abajo: si está libre cae entera; si hay agua sin llenar, la llena
  const b = tAt(r+1, c);
  if(isOpen(b)){ swap(r, c, r+1, c); return; }
  if(b === WATER){
    const B = W.rows[r+1], room = 1 - B.lv[c];
    if(room > 0.001){ const m = Math.min(room, L); B.lv[c] += m; L -= m; if(L < 0.02){ if(L > 0) B.lv[c] = Math.min(1, B.lv[c] + L); setT(r, c, AIR); return; } }
  }
  // borde con caída al lado: se va entera por ahí
  for(const dd of [dir, -dir]){
    const cc = c + dd; if(cc < 0 || cc >= COLS) continue;
    if(isOpen(tAt(r, cc)) && isOpen(tAt(r+1, cc))){ R.lv[c] = L; swap(r, c, r, cc); return; }
  }
  // a los lados: si hay hueco libre, el agua siempre lo ocupa (se reparte a medias); si hay agua, se iguala el nivel
  for(const dd of [dir, -dir]){
    const cc = c + dd; if(cc < 0 || cc >= COLS) continue;
    const x = R.t[cc];
    if(isOpen(x) && !rockLane(r, cc)){
      if(L > AG.nivelMinimo){ const m = L/2; R.t[cc] = WATER; R.hp[cc] = 0; R.sh[cc] = 0; R.lv[cc] = m; R.mv[cc] = tick; R.ox[cc] = 0; R.oy[cc] = 0; L -= m; }
    } else if(x === WATER){
      const n = R.lv[cc];
      if(L - n > AG.diferenciaMinima){ const m = (L - n)/2; R.lv[cc] = n + m; R.mv[cc] = tick; L -= m; }
    }
  }
  // capa fina sin agua encima: se va secando poco a poco (así los charcos acaban desapareciendo)
  if(L < (AG.secaPorDebajo ?? 0.22) && tAt(r-1, c) !== WATER) L -= (AG.secado ?? 0.06)/14;
  if(L < 0.02){ setT(r, c, AIR); return; }
  R.lv[c] = L;
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
  if(!isSolid(below) && below !== PLANK && !playerCell(it.r+1, it.c) && !rocks.some(k => k.c === it.c && Math.abs(k.y - it.r - 1) < 1)){
    it.r++; B.r = it.r; it.fall = (it.fall||0) + 1; it.dy = 1;
  } else if(it.fall){ if(it.fall >= 2) SND('aterriza', near(it.r, it.c)*0.8); it.fall = 0; }
}
// herramientas y llaves sueltas: si se quita lo que tienen debajo, caen hasta apoyarse
function dropItems(top, bot){
  for(const it of W.items){
    if(!it.alive || (it.k !== 'herr' && it.k !== 'llave' && it.k !== 'oil' && it.k !== 'obj') || it.r < top || it.r > bot) continue;
    if(isSolid(tAt(it.r, it.c))) continue;   // tapada: sale al picar
    const b = tAt(it.r+1, it.c);
    if(!isSolid(b) && b !== LADDER && b !== PLANK && !playerCell(it.r+1, it.c) && !W.items.some(o => o !== it && o.alive && o.r === it.r+1 && o.c === it.c && o.k !== 'moth')){ it.r++; it.dy = 1; }
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
  const k = 14*dt;
  for(let r=top; r<=bot; r++){ const R = W.rows[r]; if(!R) continue;
    for(let c=0;c<COLS;c++){ const x = R.ox[c], y = R.oy[c]; if(x){ R.ox[c] = Math.abs(x) <= k ? 0 : x - Math.sign(x)*k; } if(y){ R.oy[c] = Math.abs(y) <= k ? 0 : y - Math.sign(y)*k; } } }
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
function stepTime(){ return JU.tiempoPaso * (1 + weight()*(has('mochila_cuero') ? cv_('mochila_cuero', 0.5) : 1)/JU.pesoQueFrena); }
const inMud = (r, c) => tAt(r, c) === MUD;
function canStand(r, c){ if(p.onPlat && r === SURF-2 && c === 7) return true; const below = tAt(r+1, c); return isSolid(below) || below === LADDER || below === PLANK || tAt(r, c) === LADDER; }
function passable(r, c){ const v = tAt(r, c); return !isSolid(v) && !rocks.some(k => k.c === c && Math.abs(k.y - r) < 1); }
function hit(r, c, dir){
  const R = W.rows[r], v = R.t[c];
  p.act = dir.y > 0 ? 'picar_abajo' : 'picar_lado'; p.actT = 0;
  if(INFO[v].hp >= 999){
    digT = 0.3; burst(r+0.5, c+0.5, INFO[v].madre ? '#696a6a' : '#cbdbfc', 4); SND('clin');
    if(lockMsgT <= 0){ floats.push({x:c+0.5, y:r, txt: INFO[v].madre ? 'Roca madre: no se puede romper' : 'Roca maciza: hace falta un taladro', life:1.4, col:'#cbdbfc'}); lockMsgT = 1.6; }
    return;
  }
  if(v === RUBBLE){ clearRubble(r, c); digT = JU.tiempoGolpe; lamp -= LA.costeGolpe; SND('escombro'); return; }
  if(has('pico_afilado') && R.hp[c] === INFO[v].hp && INFO[v].hp > 1) R.hp[c]--;   // carta: un golpe menos
  R.hp[c]--; digT = JU.tiempoGolpe; lamp -= LA.costeGolpe;
  burst(r+0.5, c+0.5, '#d9a066', 2);
  if(R.hp[c] > 0) SND('golpe');
  if(R.hp[c] <= 0){
    setT(r, c, AIR); SND('rompe');
    burst(r+0.5, c+0.5, v === RUBBLE ? '#847e87' : '#8f563b', 7);
    if(INFO[v].val){ bag[v] = (bag[v]||0) + (has('codicia') ? 2 : 1); renderInv(v); }
  }
}
function clearRubble(r0, c0){
  const seen = new Set([r0*16+c0]), q = [[r0,c0]], cells = [];
  while(q.length && cells.length < ES.maxEscombroPorGolpe){
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
  digT -= dt; moveT -= dt; p.actT += dt; driftT -= dt;
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
      if(inMud(p.r, p.c)) p.fallN = 0;   // el barro amortigua: nada de caída larga
    }
    else {
      if(p.falling){
        p.falling = false;
        const n = p.fallN||0;
        if(n >= 2) SND('aterriza', Math.min(1, 0.4 + n*0.08));
        if(n >= JU.caidaLargaDesde){ shakeKick = Math.max(shakeKick, TB.alAterrizar); burst(p.r+0.95, p.c+0.5, '#8f563b', 8); }
      }
      p.fallN = 0;
      if(p.onPlat && want('D')){ tapped.D = 0; p.onPlat = false; platOpen = 1; SND('trampilla'); floats.push({x:p.c+0.5, y:p.r-0.3, txt:'¡Allá voy!', life:0.9, col:'#fbf236'}); }
      else if(moveT <= 0 && digT <= 0 && p.stun <= 0 && !looking){
        const ax = (want('R')?1:0) - (want('L')?1:0);
        if(ax){ tapped.L = tapped.R = 0; }
        if(ax && p.onPlat) p.onPlat = false;
        if(ax){
          p.face = ax;
          const tc = p.c + ax, v = tAt(p.r, tc);
          if(tc >= 0 && tc < COLS){
            if(passable(p.r, tc)){ p.c = tc; moveT = stepTime()*(inMud(p.r, tc) || mudHere ? BA.pasoMult : 1); SND('paso', 0.6); }
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
  // lámpara, agua y grisú
  const wetLv = tAt(p.r, p.c) === WATER ? W.rows[p.r].lv[p.c] : 0;
  wet = wetLv > 0.3 || mudHere;
  const wetMult = Math.max(1 + (LA.multMojada - 1)*wetLv, mudHere ? BA.multLuz : 1);
  // aire: bajo la superficie (tu casilla llena y la de encima también) se gasta
  // bajo el agua en cuanto te cubre la cabeza; en el barro, cuando te cubre del todo
  const under = (tAt(p.r, p.c) === WATER && W.rows[p.r].lv[p.c] >= (AG.ahogaDesde ?? 0.7)) || (mudHere && (tAt(p.r-1, p.c) === MUD || tAt(p.r-1, p.c) === WATER));
  submerged = under;
  if(under && !airWarn){ airWarn = true; toast('¡Bajo el agua!', 'Tienes '+Math.round(airMax())+' s de aire: sal antes de que se acabe'); }
  if(under){ const before = Math.ceil(air); air -= dt; if(Math.ceil(air) !== before && air < 4) SND('clin'); if(air <= 0){ air = 0; die('drown'); } }
  else air = Math.min(airMax(), air + dt*AI.recupera);
  gasNear = false;
  const GA = PE.grisuAviso;
  for(let r=p.r-GA; r<=p.r+GA && !gasNear; r++) for(let c=p.c-GA; c<=p.c+GA; c++) if(tAt(r,c) === GAS){ gasNear = true; break; }
  if(gasNear && !roomsSeen.has('gas')){ roomsSeen.add('gas'); toast('La llama se vuelve azul', 'Hay grisú cerca. Baja la mecha para pasar'); }
  if(wick && lamp > 0 && (tAt(p.r, p.c) === GAS || tAt(p.r-1, p.c) === GAS)) explode(tAt(p.r, p.c) === GAS ? p.r : p.r-1, p.c);
  const L = layout(p.r);
  const inRoom = L.part !== undefined && L.part > 0 && L.part < ROOM_H-1;
  const atFlame = inRoom && Math.abs(p.x - SA.columnaLlama) <= SA.radioLlama;
  if(atFlame){ if(lamp < 100 && Math.random() < dt*20) burst(p.y+0.2, p.x+0.5, '#fbf236', 1); lamp = Math.min(100, lamp + LA.recargaSala*dt); }
  else if(!L.surface && !inRoom) lamp -= cfg.drain*dt*(wick ? 1 : LA.multMechaBaja)*wetMult*(has('mecha_cera') ? cv_('mecha_cera', 0.75) : 1)*(has('codicia') ? cv_('codicia', 1.25) : 1);
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
      else if(it.k === 'lift'){ if(!it.avisado){ it.avisado = true; toast('Montacargas viejo', 'Pulsa arriba para subir al tiro principal'); } }
      else if(it.k === 'oil'){ const g = cfg.oilGain*(has('bidon_grande') ? cv_('bidon_grande', 2) : 1); it.alive = false; SND('aceite'); lamp = Math.min(100, lamp + g); burst(it.r+0.5, it.c+0.5, '#fbf236', 14); floats.push({x:it.c+0.5, y:it.r, txt:'+'+g+'% luz', life:1.2, col:'#fbf236'}); }
      else if(it.k === 'cofreSala' && !W.rewarded.includes(it.room)) openRoomChest(it);
      else if(it.k === 'cofrePieza' && !it.abierto) openPieceChest(it);
      else if(it.k === 'obj') pickObject(it);
      else if(it.k === 'bag'){ it.alive = false; SND('mochila'); for(const k in W.bag.items) bag[k] = (bag[k]||0) + W.bag.items[k]; W.bag = null; renderInv(); toast('Mochila recuperada', 'Todo lo que perdiste vuelve contigo'); burst(it.r+0.5, it.c+0.5, '#fbf236', 20); }
    }
  }
  // avisos
  const depth = Math.max(0, TC.base + p.r - SURF + 1); if(depth > maxDepth) maxDepth = depth;
  if(TC.principal && p.r > (W.record||0)) W.record = p.r;
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
  if(useCard('llama_fria')){   // carta: la bolsa de grisú se disipa sin explotar
    for(const [r,c] of cells){ setT(r, c, AIR); if(Math.random() < 0.4) burst(r+0.5, c+0.5, '#99e550', 2); }
    floats.push({x:c0+0.5, y:r0-0.4, txt:'Llama fría: el grisú se disipa', life:1.6, col:'#99e550'}); return;
  }
  for(const [r,c] of cells){
    setT(r,c,AIR);
    for(let dr=-1; dr<=1; dr++) for(let dc=-1; dc<=1; dc++){
      const rr=r+dr, cc=c+dc; if(cc<0||cc>=COLS||rr<SURF) continue;
      const v = tAt(rr,cc); if(isSolid(v) && !isAnchor(v)){ setT(rr,cc,AIR); burst(rr+0.5, cc+0.5, '#df7126', 3); }
    }
    if(Math.random() < 0.5) burst(r+0.5, c+0.5, '#fbf236', 3);
  }
  for(const it of W.items) if(it.k === 'moth' && cells.some(([r,c])=>Math.abs(it.y-r-0.5)<2 && Math.abs(it.x-c-0.5)<2)) it.alive = false;
  lamp -= PE.grisuLuz; flashT = 0.45; SND('explosion'); shakeKick = Math.max(shakeKick, 4);
  floats.push({x:c0+0.5, y:r0-0.4, txt:'¡Grisú!', life:1.4, col:'#fbf236'}, {x:p.c+0.5, y:p.r+0.3, txt:'-'+PE.grisuLuz+'% luz', life:1.2, col:'#d95763'});
}
// Puntal (toque corto): en tu casilla sostiene el techo, aunque luego le quiten el suelo.
// Puntal (mantener pulsado): se pone tumbado como un tablón en el hueco que tienes delante a la altura de los pies (puente).
// Con «recoger puntales», pulsar Puntal encima de un puntal (o debajo de un tablón) lo recoge.
// Escaleras y puntales también se pueden poner dentro del agua: el agua de esa casilla sube a la de encima.
function placeTool(kind, mode){
  if(!started || dead || cashed) return;
  const v = tAt(p.r, p.c);
  if(kind === 'prop' && mode === 'puente'){
    const fc = p.c + p.face;
    const gap = fc >= 0 && fc < COLS && !isSolid(tAt(p.r, fc)) && (isOpen(tAt(p.r+1, fc)) || tAt(p.r+1, fc) === WATER);
    if(!gap) return noTool('No hay hueco delante');
    if(props <= 0) return noTool('Sin puntales');
    if(!bridgeOK(p.r+1, fc)) return noTool('Demasiado largo: no aguantaría');
    putTile(p.r+1, fc, PLANK); props--; SND('poner'); renderInv();
    floats.push({x:fc+0.5, y:p.r+0.6, txt:'Puente', life:0.9, col:'#fbf236'}); return;
  }
  if(kind === 'prop' && (v === PROP || v === PLANK) && cfg.recoger === '1'){ setT(p.r, p.c, AIR); props++; SND('poner'); renderInv(); floats.push({x:p.c+0.5, y:p.r-0.2, txt: v === PLANK ? 'Tablón recogido' : 'Puntal recogido', life:0.9, col:'#fbf236'}); return; }
  if(v !== AIR && v !== WATER){ floats.push({x:p.c+0.5, y:p.r-0.2, txt:'Aquí no cabe', life:0.9, col:'#d9a066'}); return; }
  if(kind === 'prop'){ if(props <= 0) return noTool('Sin puntales'); putTile(p.r, p.c, PROP); props--; }
  else { if(ladders <= 0) return noTool('Sin escaleras'); putTile(p.r, p.c, LADDER); ladders--; }
  SND('poner');
  renderInv();
}
// pone una pieza en una casilla; si había agua, la desplaza a la casilla de encima
function putTile(r, c, v){
  if(tAt(r, c) === WATER){
    const lv = W.rows[r].lv[c], up = tAt(r-1, c);
    if(isOpen(up)){ setT(r-1, c, WATER); W.rows[r-1].lv[c] = lv; }
    else if(up === WATER){ W.rows[r-1].lv[c] = Math.min(1, W.rows[r-1].lv[c] + lv); }
  }
  setT(r, c, v);
}
// Un puente sigue la misma regla que los techos: desde una roca aguanta en voladizo tantos tablones como la cornisa,
// y si llega de roca a roca, el doble. (r, c) es un tablón que ya está o que se va a poner.
function bridgeOK(r, c){
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
function updateMoths(dt){
  const px = p.x + 0.5, py = p.y + 0.3, R = lightRadius();
  for(const m of W.items){
    if(!m.alive || m.k !== 'moth' || Math.abs(m.y - py) > 24) continue;
    // metida en la roca (le cayó algo encima o se rellenó el hueco): muere
    if(isSolid(tAt(Math.floor(m.y), Math.floor(m.x)))){ m.alive = false; continue; }
    m.ph = (m.ph||0) + dt*22;
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
      m.alive = false; lamp -= PE.polillaLuz; SND('polilla'); floats.push({x:px, y:p.y-0.1, txt:'-'+PE.polillaLuz+'% luz', life:1.2, col:'#d95763'}); burst(m.y, m.x, '#eec39a', 10);
    }
  }
}

// ---------- muerte y cobro ----------
function die(cause){
  if(dead || cashed) return;
  if(useCard('segunda')){   // carta: vuelves a la última sala segura con la mochila
    const r = lastRoomFloor >= ROOM_ROW[0] + ROOM_H - 1 ? lastRoomFloor - 1 : SURF - 2, c = r === SURF - 2 ? 7 : SA.columnaLlama;
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
  for(const w of Object.values(MINA.tiros)){ w.bag = null; w.items = w.items.filter(it => it.k !== 'bag'); }
  W.bag = n ? {r:p.r, c:p.c, items:{...bag}} : null;
  // el último tramo (desde la última sala segura) se llena de escombro sin vetas
  const top = lastRoomFloor + 1, bot = p.r + 2;
  fillQ = [];
  for(let r=top; r<=bot; r++) for(let c=0;c<COLS;c++){ const v = tAt(r,c); if(v !== ROCK && v !== BEAM && v !== DOOR && v !== PASS) fillQ.push([r,c]); }
  fillQ.sort((a,b)=> a[0]-b[0] || Math.random()-0.5);
  for(const it of W.items) if(it.r >= top && it.r <= bot && (it.k === 'oil' || it.k === 'moth')) it.alive = false;
  if(D.herramientas.alMorir === 'perder'){ Pa.kit = {puntales:0, escaleras:0, llaves:0}; } else { Pa.kit = {puntales:props, escaleras:ladders, llaves:llaves}; lost.props = 0; lost.ladders = 0; }
  Pa.guardar();
  dead = {cause, n, lost, oldBagLost, saved};
}
function fillType(r, c){ return vn(c/2.2, r/1.6, W.seed + 31) > 1 - D.muerte.piedraEnRelleno ? STONE : RUBBLE; }
function finishCollapse(){
  for(const [r,c] of fillQ) setT(r, c, fillType(r, c));
  fillQ = [];
  persist();
}
function cashOut(){
  if(dead || cashed) return;
  cashed = true;
  for(const k in bag){
    if(k.startsWith('o:')){ Pa.guardarEnColeccion(k.slice(2), bag[k]); continue; }
    Pa.almacen[INFO[k].key] = (Pa.almacen[INFO[k].key]||0) + bag[k]; Pa.marcarVisto(INFO[k].key);
  }
  Pa.kit = {puntales:props, escaleras:ladders, llaves:llaves}; Pa.guardar();
  persist();
  showEnd();
}
function persist(){
  const tiros = {}; for(const id in MINA.tiros) tiros[id] = packWorld(MINA.tiros[id]);
  save(P1.guardado, {ver:WORLD_VER, seed:MINA.seed, tiros});
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

function drawTile(v, r, c, X, Y){
  const R = W.rows[r];
  if(v === WATER){
    const lv = R ? R.lv[c] : 1, h = Math.max(2, Math.round(lv*T)), top = tAt(r-1,c) !== WATER || lv < 0.97;
    ctx.globalAlpha = 0.82;
    if(top) ctx.drawImage(WS[Math.floor(t*4 + c)%4], 0, 0, T, h, X, Y + T - h, T, h);
    else ctx.drawImage(TS.agua[0], X, Y);
    ctx.globalAlpha = 1; return;
  }
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
  if(v === PROP){ const b = tAt(r+1, c); if(isSolid(b) || b === PROP || b === LADDER) ctx.drawImage(PS.puntal, X, Y); else drawFloatingProp(r, c, X, Y); return; }
  if(v === PLANK){ drawPlank(r, c, X, Y); return; }
  if(v === BEDROCK){ drawBedrock(r, c, X, Y); return; }
  if(v === LADDER){ ctx.drawImage(PS.escalera, X, Y); return; }
  if(v === BEAM){ ctx.drawImage(PS.viga, X, Y); return; }
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
function drawObject(it, X, Y){
  const o = OBJ[it.id] || {}, bob = Math.round(Math.sin(t*3 + it.c)*1);
  if(o.dibujo === 'flor'){
    const g = 0.35 + 0.25*Math.sin(t*3 + it.r);
    ctx.fillStyle = `rgba(255,170,220,${g*0.5})`; ctx.fillRect(X+5, Y+5, T-10, T-8);
    ctx.fillStyle = '#4b692f'; ctx.fillRect(X+11, Y+12, 2, 11); ctx.fillRect(X+8, Y+17, 3, 2); ctx.fillRect(X+13, Y+15, 3, 2);
    const cx = X + 12, cy = Y + 9 + bob;
    ctx.fillStyle = '#000'; ctx.fillRect(cx-5, cy-4, 10, 9);
    ctx.fillStyle = '#ffb3e0'; ctx.fillRect(cx-4, cy-1, 8, 3); ctx.fillRect(cx-1, cy-4, 3, 9);
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
function drawItem(it){
  const X = it.c*T, Y = Math.round((it.r - (it.dy||0) - cam)*T);
  if(it.k === 'oil') ctx.drawImage(PS.aceite, X, Y);
  else if(it.k === 'chest') ctx.drawImage(PS.cofre, X, Y);
  else if(it.k === 'bag') ctx.drawImage(PS.mochila_suelo, X, Y);
  else if(it.k === 'obj') drawObject(it, X, Y);
  else if(it.k === 'lift') drawLift(it, X, Y);
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
function drawMoth(m){
  const x = Math.round(m.x*T), y = Math.round((m.y-cam)*T), fl = Math.round(Math.abs(Math.sin(m.ph||0))*5) + 1;
  ctx.fillStyle = '#000'; ctx.fillRect(x-1, y-3, 3, 7);
  ctx.fillStyle = m.hunt ? '#eec39a' : '#9badb7';
  ctx.fillRect(x-7, y-fl, 6, fl+2); ctx.fillRect(x+2, y-fl, 6, fl+2);
  ctx.fillStyle = '#663931'; ctx.fillRect(x, y-2, 1, 5);
}
function drawHero(){
  if(dead && (dead.cause === 'crush' || dead.cause === 'buried')) return;
  const st = lamp <= 0 ? 'apagada' : gasNear ? 'grisu' : wick ? 'alta' : 'baja';
  const frs = HERO[st][p.anim], f = frs[Math.floor((p.act ? p.actT : t) * ANIM_FPS[p.anim]) % frs.length];
  const feetX = Math.round((p.sx ?? p.x)*T) + 12, feetY = Math.round((p.y - cam)*T) + T;
  const flip = p.face < 0, x0 = flip ? feetX - 22 : feetX - 10, y0 = feetY - 26;
  const w = weight(), pk = w === 0 ? null : w < 6 ? 'ligera' : w < 16 ? 'media' : 'llena';
  ctx.save();
  if(p.stun > 0){
    // de bruces hacia donde ibas: sprite propio, con estrellitas
    const tf = TROP[st], fr = tf[(JU.aturdidoPorLosPelos - p.stun) < 0.35 ? 0 : Math.floor(t*3) % tf.length];
    const ty = feetY - fr.height + 1;
    if(flip){ ctx.translate(feetX + 14, ty); ctx.scale(-1, 1); } else ctx.translate(feetX - 14, ty);
    ctx.drawImage(fr, 0, 0);
    ctx.restore();
    const hx = feetX + (flip ? -3 : 3);
    for(let i=0;i<3;i++){ const a = t*7 + i*2.1; ctx.fillStyle = i%2 ? '#fbf236' : '#ffffff';
      ctx.fillRect(Math.round(hx + Math.cos(a)*7), Math.round(feetY - 19 + Math.sin(a)*2.5), 2, 2); }
    return;
  }
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
  const pyw = (p.y + 0.4 - cam)*T;
  const half = VW/(2*zoom);
  const fx = zoom <= 1 ? VW/2 : Math.max(half, Math.min(VW - half, VW/2 + (camX - VW/2)*k));
  const fy = VH*0.35 + (pyw - VH*0.35)*k;
  const sh = shake + shakeKick, sx = sh ? Math.round((Math.random()*2-1)*sh) : 0, sy = sh ? Math.round((Math.random()*2-1)*sh) : 0;
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
      if(v !== AIR){ const R = W.rows[r]; drawTile(v, r, c, X + Math.round(R.ox[c]*T), Y + Math.round(R.oy[c]*T)); }
    }
  }
  // antorchas de las salas
  for(const i of rooms){
    if(hasWheel(i)) drawWheel(i);
    const Y = Math.round((ROOM_ROW[i]+1-cam)*T), X = SA.columnaLlama*T + 10;
    ctx.fillStyle = '#663931'; ctx.fillRect(X, Y+10, 3, 14);
    const fl = Math.round(Math.sin(t*14)); ctx.fillStyle = '#df7126'; ctx.fillRect(X-2, Y+2+fl, 7, 9); ctx.fillStyle = '#fbf236'; ctx.fillRect(X, Y+5+fl, 3, 5);
  }
  for(const it of W.items) if(it.alive && it.k !== 'moth' && it.r >= r0 && it.r <= r1 && !isSolid(tAt(it.r, it.c))) drawItem(it);
  for(const k of rocks){ ctx.drawImage((TS[INFO[k.t].tile]||TS.piedra)[0], k.c*T, Math.round((k.y-cam)*T)); if(INFO[k.t].veta) ctx.drawImage(VS[INFO[k.t].veta][0], k.c*T, Math.round((k.y-cam)*T)); }
  for(const m of W.items) if(m.alive && m.k === 'moth' && m.y > r0 && m.y < r1+1) drawMoth(m);
  drawHero();
  for(const q of particles){ ctx.globalAlpha = Math.min(1, q.life*2); ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x*T), Math.round((q.y-cam)*T), 2, 2); }
  ctx.globalAlpha = 1;

  // luz con sombras y memoria de lo explorado
  if(cfg.dark === '1'){
    const nR = r1 - r0 + 1;
    if(lbuf.length !== nR*COLS){ lbuf = new Float32Array(nR*COLS); lc.width = COLS; lc.height = nR; limg = lctx.createImageData(COLS, nR); }
    lbuf.fill(0);
    const fade = dead ? Math.max(0, 1 - deadT*1.5) : 1, flick = 1 + (Math.random()-0.5)*(lamp < 20 ? 0.14 : 0.04);
    addLight(r0, r1, p.x+0.5, p.y+0.25, lightRadius()*flick*fade, wick ? 1 : (LA.luzMechaBaja ?? 1), true, true);
    for(const i of rooms) addLight(r0, r1, COLS/2, ROOM_ROW[i]+1.5, 8.6, 1, true, true);
    for(const it of W.items) if(it.alive && (it.k === 'oil' || it.k === 'chest' || it.k === 'bag' || it.k === 'herr' || it.k === 'llave' || it.k === 'cofreSala' || it.k === 'cofrePieza' || it.k === 'obj' || it.k === 'lift') && it.r >= r0-2 && it.r <= r1+2) { const B = it.k === 'oil' ? (LA.brilloAceite || {radio:1.6, intensidad:0.6}) : (LA.brilloObjetos || {radio:2.4, intensidad:0.6}); addLight(r0, r1, it.c+0.5, it.r+0.6, B.radio, B.intensidad, false, false); }
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
  ctx.restore();
  // textos flotantes en la capa nítida (misma posición que tendrían en el mundo)
  const g = tctx;
  g.textAlign = 'center'; g.font = '800 13px "Sofia Sans Condensed", "Arial Narrow", sans-serif';
  for(const f of floats){ g.globalAlpha = Math.min(1, f.life*1.6);
    const x = VW/2 + sx + (f.x*T - fx)*zoom, y = VH*0.35 + sy + ((f.y-cam)*T - fy)*zoom;
    g.fillStyle = '#000'; g.fillText(f.txt, x+1, y+1); g.fillStyle = f.col; g.fillText(f.txt, x, y); }
  g.globalAlpha = 1;
  drawAirOverlay();
  drawTransit();
  drawBagMarker(fx, fy);
  if(has('zahori')) drawOilMarker(fx, fy);
  if(looking){ g.textAlign = 'center'; g.font = '900 14px Nunito, sans-serif'; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(VW/2-70, 8, 140, 22); g.fillStyle = '#fbf236'; g.fillText('Mirando · pulsa Ver', VW/2, 24); }
  if(flashT > 0){ ctx.fillStyle = `rgba(251,242,54,${flashT})`; ctx.fillRect(0,0,VW,VH); }
}
// Aire: viñeta azul en la mina y un marcador grande arriba mientras estás bajo la superficie
let airWarn = false, airTick = 0;
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
  const pool = (D.cartas||[]).filter(k => !(k.unica && has(k.id))), out = [];
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
  const C = SA.ruleta, all = D.cartas || [], slots = [...document.querySelectorAll('#ruCartas .carta')];
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
  if(!transit.swapped && transit.t >= 0.45){ transit.swapped = true; doSwap(transit.to); }
  if(transit.t >= 1.05) transit = null;
}
function drawTransit(){
  if(!transit) return;
  const tt = transit.t, a = tt < 0.45 ? tt/0.45 : Math.max(0, 1 - (tt - 0.6)/0.45);
  ctx.fillStyle = `rgba(0,0,0,${Math.min(1, a)})`; ctx.fillRect(0, 0, VW, VH);
  if(a > 0.6){ const g = tctx; g.globalAlpha = Math.min(1, (a - 0.6)/0.3); g.textAlign = 'center'; g.font = '900 15px Nunito, sans-serif';
    g.fillStyle = '#cbdbfc'; g.fillText(transit.label || 'Pasadizo', VW/2, VH*0.42); g.font = '800 12px Nunito, sans-serif'; g.fillStyle = '#9badb7'; g.fillText('hacia el ' + transit.to.nombre, VW/2, VH*0.42 + 18); g.globalAlpha = 1; }
}
function pickObject(it){
  it.alive = false;
  const key = 'o:' + it.id, o = OBJ[it.id] || {nombre: it.id, icono:'?', texto:''};
  bag[key] = (bag[key]||0) + 1; SND('carta'); renderInv();
  const nuevo = !Pa.coleccion[it.id] && !Object.keys(bag).some(k => k === key && bag[k] > 1);
  burst(it.r+0.5, it.c+0.5, o.brilla ? '#ffb3e0' : '#fbf236', 14);
  floats.push({x:it.c+0.5, y:it.r, txt:o.icono + ' ' + o.nombre, life:1.4, col:'#ffb3e0'});
  toast(nuevo ? '¡Nuevo hallazgo!' : o.nombre, nuevo ? o.nombre + ' · ' + o.texto : 'A la mochila: llega a tu colección cuando subas');
}
function givePrize(pr){
  if(pr.escaleras) ladders += pr.escaleras;
  if(pr.puntales) props += pr.puntales;
  if(pr.luz) lamp = Math.min(100, Math.max(lamp, pr.luz));
  if(pr.material) for(const [m, n] of Object.entries(pr.material)){ const tt = KEY2T[m]; if(tt !== undefined) bag[tt] = (bag[tt]||0) + n; }
  renderInv();
}
function openPieceChest(it){
  it.abierto = true; chestFx = {it, t:0}; SND('cofre'); shakeKick = Math.max(shakeKick, 1.5);
  const L = SB.premios || [], pr = L.length ? L[Math.floor(Math.random()*L.length)] : {texto:'Nada… solo polvo'};
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
  const L = SB.premios || []; BN.premio = L.length ? L[Math.floor(Math.random()*L.length)] : null;
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
  h += keys.length ? keys.map(k => chip(k, bag[k], +k === +bump)).join('') : '<span class="chip muted">Mochila vacía</span>';
  h += `<span class="chip">Peso <b>${weight()}</b></span>`;
  if(llaves) h += `<span class="chip warn">Llaves <b>${llaves}</b></span>`;
  for(const id in cards){ const k = CARD[id]; if(k) h += `<span class="chip cartaChip" title="${k.texto}">${k.icono} ${k.nombre}${cards[id] > 1 ? ' <b>×'+cards[id]+'</b>' : ''}</span>`; }
  $('inv').innerHTML = h;
  $('nProp').textContent = props ?? 0; $('nLad').textContent = ladders ?? 0;
}
const last = {};
function hud(force){
  if(!p) return;
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
  const show = !!((safe || (L.surface && maxDepth > 2)) && !dead && !cashed && started);
  if($('cashBtn').hidden === show) $('cashBtn').hidden = !show;
}
function toast(title, sub){ $('toastHost').innerHTML = `<div class="toast"><b>${title}</b><span>${sub}</span></div>`; }
function showEnd(){
  const list = Object.keys(bag).filter(k => bag[k] > 0).map(k => chip(k, bag[k])).join('');
  if(cashed){
    $('ovEyebrow').textContent = 'De vuelta en el pueblo';
    $('ovTitle').textContent = 'Has subido a cobrar';
    $('ovText').textContent = list ? 'Llegaste a '+maxDepth+' m y guardas en el almacén:' : 'Llegaste a '+maxDepth+' m. No traías nada.';
    $('ovList').innerHTML = list;
    $('ovNote').textContent = 'El pozo se queda tal cual lo has dejado: tus túneles, tus puntales y sin lo que ya has sacado.';
  } else {
    const M = {crush:['Te aplastó un derrumbe','El techo sin apoyo crujió y se vino abajo.'], drown:['Te quedaste sin aire','Estuviste demasiado tiempo bajo el agua o el barro.'], buried:['Sepultado por la arena','La arena te cubrió la cabeza y no saliste a tiempo.'], lamp:['La lámpara se apagó','A oscuras no hay forma de seguir.']}[dead.cause];
    $('ovEyebrow').textContent = 'Fin de la bajada · '+maxDepth+' m';
    $('ovTitle').textContent = M[0];
    $('ovText').textContent = M[1];
    $('ovList').innerHTML = dead.n ? list : '';
    let note = 'El último tramo se ha llenado de escombro y piedra suelta.';
    if(dead.n) note += ' Tu mochila ha quedado enterrada dentro, a '+maxDepth+' m: pica el escombro para recuperarla.';
    if(dead.oldBagLost && dead.n) note += ' La mochila que ya habías perdido antes se ha perdido para siempre.';
    if(dead.saved) note += ' Bolsillo secreto: '+dead.saved.n+' de '+dead.saved.name+' llegan al almacén.';
    if(dead.lost.props || dead.lost.ladders) note += ' Pierdes las herramientas que llevabas ('+dead.lost.props+' puntales y '+dead.lost.ladders+' escaleras).';
    $('ovNote').textContent = note;
  }
  $('over').hidden = false;
}
function toVillage(){ Pa.pasarDia(); started = false; $('over').hidden = true; window.Pantallas.mostrar('plaza'); }

// ---------- bucle ----------
let lastT = performance.now();
function frame(now){
  const dt = Math.max(0, Math.min(0.05, (now - lastT)/1000)); lastT = now; t += dt;
  if(started && transit) updateTransit(dt);
  if(started && !cashed && p && !transit){
    const top = Math.max(SURF, p.r - 22), bot = p.r + 22;
    ensure(bot + 30);
    simAcc += dt; stabAcc += dt; crackMsgT -= dt; lockMsgT -= dt; flashT = Math.max(0, flashT - dt);
    while(simAcc > 1/14){ simAcc -= 1/14; fluids(top, bot); updateBag(); dropItems(top, bot); }
    if(stabAcc > 0.1){ stabAcc = 0; stability(top, bot); checkPlanks(top, bot); }
    updateCracks(top, bot, dt);
    slideAnim(top, bot, dt);
    updateRocks(dt);
    if(!dead){
      updatePlayer(dt);
      updateMoths(dt);
      if(lamp <= 0){ lamp = 0; die('lamp'); }
    } else {
      deadT += dt;
      // el derrumbe va llenando el tramo
      const n = Math.ceil(fillQ.length * Math.min(1, dt*3)) + 3;
      for(const [r,c] of fillQ.splice(0, n)){ setT(r, c, fillType(r, c)); if(Math.random() < 0.3) burst(r+0.5, c+0.5, '#847e87', 2); }
      if(deadT > 1.6 && $('over').hidden){ finishCollapse(); showEnd(); }
    }
    for(const it of W.items) if(it.dy) it.dy = Math.max(0, it.dy - dt*14);
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
    const Lz = layout(p.r), closeUp = !dead && (Lz.surface || (Lz.part !== undefined && Lz.part > 0 && Lz.part < ROOM_H-1));
    const zBase = cfg.zoom === 'siempre' ? Math.max(1, CA.zoomExplorar) : 1;
    camX += ((p.x + 0.5)*T - camX)*Math.min(1, dt*CA.seguirLateral);
    const zT = looking ? CA.zoomVer : closeUp ? ZCLOSE : zBase;
    zoom += (zT - zoom)*Math.min(1, dt*(zT > zoom ? CA.velocidadAcercar : CA.velocidadAlejar));
    if(looking) zoom += (zT - zoom)*Math.min(1, dt*4);   // al mirar, rápido
    if(Math.abs(zoom - zT) < 0.004) zoom = zT;
    const target = p.y - (VH/T)*0.35;
    cam += (Math.max(-2, target) - cam)*Math.min(1, dt*6);
  }
  else if(window.Sonido) window.Sonido.retumbo(0);
  if(activa && W && p){ render(); hud(); }
  requestAnimationFrame(frame);
}

// ---------- controles ----------
const KEYS = {ArrowLeft:'L', a:'L', A:'L', ArrowRight:'R', d:'R', D:'R', ArrowDown:'D', s:'D', S:'D', ArrowUp:'U', w:'U', W:'U'};
addEventListener('keydown', e => {
  if(KEYS[e.key]){ e.preventDefault(); if(looking){ if(!e.repeat) toggleLook(); return; } if(!e.repeat) press(KEYS[e.key]); else input[KEYS[e.key]] = true; }
  else if(!e.repeat && (e.key === 'v' || e.key === 'V' || e.key === 'z' || e.key === 'Z')) toggleLook();
  else if(!e.repeat && (e.key === 'o' || e.key === 'O' || ((e.key === 'p' || e.key === 'P') && e.shiftKey))) placeTool('prop', 'puente');
  else if(!e.repeat && (e.key === 'p' || e.key === 'P')) placeTool('prop');
  else if(!e.repeat && (e.key === 'e' || e.key === 'E')) placeTool('lad');
  else if(!e.repeat && (e.key === 'm' || e.key === 'M')) wick = wick ? 0 : 1;
});
function toggleLook(){
  if(!started || dead || cashed || bonusOpen || ruletaOpen) return;
  looking = !looking;
  if(looking) $('toastHost').innerHTML = '';
  for(const kk in input){ input[kk] = false; tapped[kk] = 0; }
  $('verBtn').classList.toggle('activo', looking);
}
addEventListener('keyup', e => { if(KEYS[e.key]) input[KEYS[e.key]] = false; });
document.querySelectorAll('#pad button').forEach(b => {
  const k = b.dataset.k;
  const down = e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('on');
    if(k === 'ver') toggleLook();
    else if(looking && (k in input)) toggleLook();            // al tocar una flecha se deja de mirar (sin moverse)
    else if(k === 'prop'){ b._held = false; clearTimeout(b._hold); b._down = true; b._hold = setTimeout(() => { if(b._down){ b._held = true; placeTool('prop', 'puente'); } }, 350); }
    else if(k === 'lad') placeTool('lad'); else if(k === 'wick') wick = wick ? 0 : 1; else press(k); };
  // Puntal: toque corto = puntal normal; mantener pulsado = puente
  const up = () => { b.classList.remove('on'); if(k in input) input[k] = false; if(k === 'ver') b.classList.toggle('activo', looking);
    if(k === 'prop' && b._down){ b._down = false; clearTimeout(b._hold); if(!b._held) placeTool('prop'); } };
  b.addEventListener('pointerdown', down);
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev => b.addEventListener(ev, up));
  b.addEventListener('contextmenu', e => e.preventDefault());
});
$('cashBtn').addEventListener('click', cashOut);
$('bnBtn').addEventListener('click', bonusBtn);
$('ruBtn').addEventListener('click', spinRuleta);
document.querySelectorAll('#ruCartas .carta').forEach((el, i) => el.addEventListener('click', () => chooseCard(i)));
bnCv.addEventListener('click', () => { if(BN.st === 'cerrado') bonusBtn(); });
$('ovBtn').addEventListener('click', toVillage);
$('helpBtn').addEventListener('click', () => { $('help').hidden = false; });
$('helpClose').addEventListener('click', () => { $('help').hidden = true; });
// ajustes
const SL = ['drain','corn','crack','thrH','thrS','minP','minL','oilEvery','oilGain'], SS = ['dark','zoom','recoger','frag','anim'];
function syncTune(){ SL.forEach(k => { $('s_'+k).value = cfg[k]; $('o_'+k).textContent = cfg[k]; }); SS.forEach(k => { $('s_'+k).value = cfg[k]; }); $('s_sound').value = window.Sonido && !window.Sonido.activado ? '0' : '1'; }
SL.forEach(k => $('s_'+k).addEventListener('input', e => { cfg[k] = +e.target.value; $('o_'+k).textContent = cfg[k]; save('deep-cfg', cfg); }));
SS.forEach(k => $('s_'+k).addEventListener('change', e => { cfg[k] = e.target.value; save('deep-cfg', cfg); }));
$('s_sound').addEventListener('change', e => { window.Sonido && window.Sonido.activar(e.target.value === '1'); });
let wasStarted = false;
$('tuneBtn').addEventListener('click', () => { syncTune(); wasStarted = started; started = false; $('tuning').hidden = false; });
$('tuneClose').addEventListener('click', () => { $('tuning').hidden = true; started = wasStarted; lastT = performance.now(); });
$('tuneReset').addEventListener('click', () => { cfg = {...BASE}; save('deep-cfg', null); syncTune(); });

// ---------- arranque ----------
let activa = false;
function cargarMundo(key){
  setPozo(key);
  const saved = load(P1.guardado, null);
  MINA = null;
  if(saved && saved.ver === WORLD_VER && saved.tiros){
    try{ MINA = {ver:WORLD_VER, seed:saved.seed, actual:'principal', tiros:{}}; for(const id in saved.tiros){ const w = unpackWorld(saved.tiros[id]); if(w) MINA.tiros[id] = w; } if(!MINA.tiros.principal) MINA = null; }catch(e){ MINA = null; }
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
  entrar(key){ if(key && key !== PK) cargarMundo(key); activa = true; resize(); startRun(); },
  salir(){ activa = false; started = false; },
  borrar(){ for(const k in POZOS) save(POZOS[k].guardado, null); cargarMundo(PK); },
  get pozo(){ return PK; },
  _dbg(){ return {p, W, get MINA(){ return MINA; }, get TC(){ return TC; }, get PLACED(){ return PLACED; }, get transit(){ return transit; }, get bag(){ return bag; }, rocks, setT, tAt, consts:{AIR, RUBBLE, STONE, HARD, DIRT, SURF, get ROOM_ROW(){ return ROOM_ROW; }, ROOM_H, PROP, PLANK, BEDROCK, CSAND, SAND, WATER, MUD, ROCK, DOOR, PASS}, get cfg(){ return cfg; }, placeTool, get llaves(){ return llaves; }, set llaves(v){ llaves = v; }, get wick(){ return wick; }, set wick(v){ wick = v; }, get looking(){ return looking; }, get zoom(){ return zoom; }, get shake(){ return shake + shakeKick; }, get props(){ return props; }, get ladders(){ return ladders; }, get cards(){ return cards; }, set cards(v){ cards = v; }, get air(){ return air; }, get lamp(){ return lamp; }, set lamp(v){ lamp = v; }, get dead(){ return dead; }, die}; },
};
})();
