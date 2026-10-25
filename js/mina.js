// =====================================================================
//  MINA: la excavación (pozo 1)
// =====================================================================
window.Mina = (()=>{
const DATA = window.SPRITES, D = window.DATOS, P1 = D.pozo1;
const T = 24, COLS = P1.columnas, SURF = 3, ROOM_H = P1.altoSala;
// ---------- tipos ----------
const AIR=0, DIRT=1, STONE=2, HARD=3, CLAY=4, COAL=5, COPPER=6, QUARTZ=7, SAND=8, WATER=9, GAS=10, ROCK=11, BEAM=12, PROP=13, LADDER=14, RUBBLE=15;
const M = D.materiales;
const mat = (key, extra) => Object.assign({hp:M[key].golpes, val:M[key].valor, n:M[key].nombre, dot:M[key].color, key}, extra);
const INFO = {
  [AIR]:{}, [DIRT]:mat('tierra', {tile:'tierra'}), [STONE]:mat('piedra', {tile:'piedra'}), [HARD]:mat('rocaDura', {tile:'roca_dura'}), [CLAY]:mat('arcilla', {tile:'arcilla'}),
  [COAL]:mat('carbon', {tile:'piedra', veta:'carbon'}), [COPPER]:mat('cobre', {tile:'piedra', veta:'cobre'}),
  [QUARTZ]:mat('cuarzo', {tile:'piedra', veta:'cuarzo'}), [SAND]:mat('arena', {tile:'arena'}), [WATER]:{}, [GAS]:{}, [ROCK]:{hp:999, tile:'maciza'},
  [BEAM]:{hp:1}, [PROP]:{}, [LADDER]:{}, [RUBBLE]:mat('escombro', {tile:'escombro'}),
};
const KEY2T = {}; for(const [tt, I] of Object.entries(INFO)) if(I.val) KEY2T[I.key] = +tt;
const isSolid = t => !(t===AIR || t===WATER || t===GAS || t===PROP || t===LADDER);
const isStruct = t => t===DIRT||t===STONE||t===HARD||t===CLAY||t===COAL||t===COPPER||t===QUARTZ||t===BEAM||t===ROCK;
const isAnchor = t => t===HARD||t===BEAM||t===ROCK;
const isLoose = t => t===SAND||t===RUBBLE;
const isOpen = t => t===AIR || t===GAS;
const TRAMOS = P1.tramos.map((s, i, a) => ({n:s.nombre, len: i === a.length-1 ? Infinity : s.largo}));
const ROOM_ROW = []; { let r = SURF; for(let i=0;i<TRAMOS.length-1;i++){ r += TRAMOS[i].len; ROOM_ROW.push(r); r += ROOM_H; } }
function layout(r){
  if(r < SURF) return {surface:true};
  let d = r - SURF;
  for(let i=0;i<TRAMOS.length;i++){
    if(d < TRAMOS[i].len) return {seg:i, d};
    d -= TRAMOS[i].len;
    if(i < TRAMOS.length-1){ if(d < ROOM_H) return {seg:i, room:i, part:d}; d -= ROOM_H; }
  }
}
const SECRET = {r: SURF + P1.salaSellada.fila, c0: P1.salaSellada.columna, w: P1.salaSellada.ancho, h: P1.salaSellada.alto};
const DT = P1.desdeTramo, LA = D.lampara, JU = D.jugador, ES = D.estructura, PE = D.peligros, CA = D.camara, TB = D.temblor, VU = D.vuelta;
const AG = D.agua || {nivelMinimo:0.25, diferenciaMinima:0.02};
const SND = (n, v) => window.Sonido && window.Sonido.tocar(n, v);
// volumen según la distancia al topo (en casillas)
const near = (r, c) => p ? Math.max(0, 1 - Math.hypot(r - p.r, (c - p.c)*0.6)/14) : 0;

// ---------- ajustes ----------
// Ajustes de prueba: parten de datos.js y se pueden tocar desde el menú de ajustes (se guardan en el navegador)
const BASE = {drain:LA.consumo, span:ES.anchoMaxTecho, crack:ES.tiempoCrujido, thrH:ES.escombroSiCaeDesde, thrS:ES.escombroSiCaenJuntos, dark:'1', zoom: CA.zoomExplorar >= 2 ? 'siempre' : 'salas'};
let cfg = {...BASE};
try{ const s = JSON.parse(localStorage.getItem('pozoviejo-cfg')||'null'); if(s) cfg = {...BASE, ...s}; }catch(e){}
const spanReach = () => Math.floor(cfg.span/2);  // casillas a cada lado que un apoyo sostiene

// ---------- ruido ----------
function h2(x,y,s){ let n = Math.imul(x,374761393) + Math.imul(y,668265263) + Math.imul(s,982451653); n = Math.imul(n^(n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967295; }
function vn(x,y,s){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=h2(xi,yi,s), b=h2(xi+1,yi,s), c=h2(xi,yi+1,s), d=h2(xi+1,yi+1,s); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }

// ---------- almacenamiento ----------
function load(k, d){ try{ const v = JSON.parse(localStorage.getItem(k)||'null'); return v ?? d; }catch(e){ return d; } }
function save(k, v){ try{ if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
const Pa = window.Partida;

// ---------- mundo ----------
let W = null; // {seed, rows:[{t,hp,sh}], items:[], bag:null}
function newWorld(){ return {seed:(Math.random()*1e9)|0, rows:[], items:[], bag:null, chestOpen:false, rewarded:[], runs:0}; }
function packWorld(){
  return {seed:W.seed, rows:W.rows.map(R => String.fromCharCode(...Array.from(R.t, v => 65+v))), nat:W.rows.map(R => String.fromCharCode(...Array.from(R.nat, v => 48+v))), lv:W.rows.map(R => String.fromCharCode(...Array.from(R.lv, v => 48+Math.round(v*40)))),
    items:W.items.filter(i=>i.alive || i.k === 'herr'), bag:W.bag, rewarded:W.rewarded, runs:W.runs, herr:true};
}
function unpackWorld(o){
  const w = {seed:o.seed, rows:[], items:o.items||[], bag:o.bag||null, rewarded:o.rewarded||[], runs:o.runs||(o.nat ? 0 : 1)};
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
function newRow(){ return {t:new Uint8Array(COLS), hp:new Uint16Array(COLS), sh:new Float32Array(COLS), mv:new Uint32Array(COLS), seen:new Uint8Array(COLS), nat:new Uint8Array(COLS), lv:new Float32Array(COLS)}; }
let lastOil = SURF;
function genRow(r){
  const R = newRow(), Tt = R.t, S = W.seed;
  const L = layout(r);
  if(L.surface){ R.nat.fill(1); return R; }
  if(L.part !== undefined){
    R.nat.fill(1);
    if(L.part === 0 || L.part === ROOM_H-1) Tt.fill(BEAM);
    for(let c=0;c<COLS;c++) R.hp[c] = INFO[Tt[c]].hp||0;
    return R;
  }
  const d = r - SURF, sg = L.seg;
  for(let c=0;c<COLS;c++){
    let v = DIRT;
    if(vn(c/5, r/5, S+1) < 0.15 + Math.min(0.55, d*0.008)) v = STONE;
    if(d > 3 && vn(c/5, r/2.2, S+2) > 0.78) v = SAND;
    if(vn(c/2.6, r/2.6, S+3) > 0.73 + sg*0.03) v = CLAY;
    if(sg >= DT.carbon && v !== SAND && vn(c/2.2, r/2.2, S+4) > 0.74) v = COAL;
    if(sg >= DT.cobre && v !== SAND && vn(c/2, r/2, S+5) > 0.75) v = COPPER;
    if(sg >= DT.cuarzo && v === STONE && h2(c, r, S+12) < 0.008) v = QUARTZ;
    if(d > 3 && vn(c/3, r/3, S+6) > 0.84) v = HARD;
    if(sg >= DT.cuevas && d > 6 && L.d > 1 && vn(c/4, r/3, S+7) > 0.7){
      v = AIR;
      if(sg >= DT.agua && vn(c/5, r/5, S+8) > 0.58) v = WATER;
      else if(sg >= DT.gas && vn(c/4, r/4, S+9) > 0.6) v = GAS;
      else if(sg >= DT.polillas && h2(c, r, S+13) < 0.025) W.items.push({k:'moth', x:c+0.5, y:r+0.5, alive:true});
    }
    if(r === SURF) v = DIRT;
    Tt[c] = v;
  }
  if(L.d > 2 && r - lastOil >= P1.aceiteCada + sg*2){
    const c = Math.floor(h2(r, 7, S+14)*COLS); Tt[c] = AIR; W.items.push({k:'oil', r, c, alive:true}); lastOil = r;
  }
  if(r >= SECRET.r && r < SECRET.r + SECRET.h){
    for(let c=SECRET.c0; c<SECRET.c0+SECRET.w; c++){
      const edge = r===SECRET.r || r===SECRET.r+SECRET.h-1 || c===SECRET.c0 || c===SECRET.c0+SECRET.w-1;
      Tt[c] = edge ? ROCK : AIR;
    }
    if(r === SECRET.r+SECRET.h-2) W.items.push({k:'chest', r, c:SECRET.c0+2, alive:true});
  }
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
const RC = D.recogibles || {cada:9, desdeFila:6, probPuntal:0.45, cantidad:1, regenerar:true};
function addKit(r, fresh){
  W.herr = true;
  const L = layout(r); if(!L || L.surface || L.part !== undefined || r - SURF < RC.desdeFila) return;
  if(h2(r, 3, W.seed + 51) > 1/RC.cada) return;
  if(W.items.some(i => i.k === 'herr' && i.r === r)) return;
  const c = Math.floor(h2(r, 9, W.seed + 52)*COLS);
  if(fresh){ const R = W.rows[r]; if(R.t[c] !== WATER && R.t[c] !== GAS){ R.t[c] = AIR; R.hp[c] = 0; R.nat[c] = 1; } else return; }
  W.items.push({k:'herr', tipo: h2(r, 11, W.seed + 53) < RC.probPuntal ? 'puntal' : 'escalera', r, c, alive:true});
}
// Las salas seguras se reconstruyen en cada bajada: techo y suelo de viga, dentro vacío
function restoreRooms(){
  for(let i=0;i<ROOM_ROW.length;i++){
    const r0 = ROOM_ROW[i]; if(r0 + ROOM_H > W.rows.length) break;
    for(let k=0;k<ROOM_H;k++){ const r = r0 + k; for(let c=0;c<COLS;c++){ const v = k === 0 || k === ROOM_H-1 ? BEAM : AIR; if(W.rows[r].t[c] !== v) setT(r, c, v); } }
    for(const it of W.items) if(it.alive && it.k === 'bag' && it.r >= r0 && it.r < r0 + ROOM_H) it.alive = false;
    if(W.bag && W.bag.r >= r0 && W.bag.r < r0 + ROOM_H){ W.bag.r = r0 + ROOM_H - 2; }   // si la mochila estaba en una sala, queda dentro, en el suelo
  }
}
function tAt(r,c){ if(c<0 || c>=COLS) return ROCK; if(r<0) return AIR; ensure(r+1); return W.rows[r].t[c]; }
function setT(r,c,v){ const R = W.rows[r]; R.t[c] = v; R.hp[c] = INFO[v].hp||0; R.sh[c] = 0; R.lv[c] = v === WATER ? 1 : 0; }

// ---------- estado de la bajada ----------
let platOpen = 0, p, lamp, bag, props, ladders, wick, dead, deadT, cashed, rocks, particles, floats, fillQ, digT, moveT, buried, crackMsgT, lockMsgT, flashT, maxDepth, lastRoomFloor, roomsSeen, segSeen, shake = 0, shakeKick = 0, cracking = 0, looking = false, driftT = 0, started = false, simAcc = 0, stabAcc = 0, tick = 0, t = 0, wet = false, gasNear = false;
const input = {L:false, R:false, U:false, D:false};
// pulsaciones cortas: se guardan un momento para que un toque rápido no se pierda entre fotogramas
const tapped = {L:0, R:0, U:0, D:0};
const want = k => input[k] || tapped[k] > 0;
function press(k){ input[k] = true; tapped[k] = 0.3; }

// Al volver del pueblo: lo que abriste por debajo de la primera sala se rellena de escombro y piedra dura.
// Queda el rastro (ya lo habías visto) pero no un tubo para tirarse en bomba.
function refillTunnels(){
  if(!VU || !VU.rellenar || !ROOM_ROW.length) return 0;
  const from = ROOM_ROW[0] + ROOM_H, mix = VU.relleno, tot = (mix.escombro||0) + (mix.piedra||0) + (mix.rocaDura||0) || 1;
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
  if(!W) W = newWorld();
  if(!W.rewarded) W.rewarded = [];
  lastOil = SURF;
  ensure(SURF + 40);
  const refilled = W.runs > 0 ? refillTunnels() : 0;
  if(W.runs > 0) restoreRooms();
  if(W.runs > 0 && RC.regenerar) for(const it of W.items) if(it.k === 'herr') it.alive = true;
  // que no quede ninguna pulsación de la bajada anterior
  for(const k in input){ input[k] = false; tapped[k] = 0; }
  document.querySelectorAll('#pad button.on').forEach(b => b.classList.remove('on'));
  W.runs = (W.runs||0) + 1;
  looking = false; $('verBtn').classList.remove('activo');
  shake = 0; shakeKick = 0; cracking = 0; driftT = 0;
  p = {c:7, r:SURF-2, x:7, y:SURF-2, face:1, anim:'reposo', animT:0, act:null, actT:0, falling:false, fallN:0, onPlat:true, stun:0};
  platOpen = 0;
  lamp = 100; bag = {}; props = Pa.kit.puntales; ladders = Pa.kit.escaleras; wick = 1;
  dead = null; deadT = 0; cashed = false; rocks = []; particles = []; floats = []; fillQ = [];
  digT = 0; moveT = 0; buried = 0; crackMsgT = 0; lockMsgT = 0; flashT = 0; maxDepth = 0;
  lastRoomFloor = SURF - 1; roomsSeen = new Set(); segSeen = 0;
  cam = p.y - (VH/T)*0.35; zoom = ZCLOSE; camX = (p.x+0.5)*T; started = true;
  renderInv(); hud(true);
  if(W.bag) toast('Tu mochila te espera', 'Bajo el escombro, a '+(W.bag.r - SURF + 1)+' m');
  else if(refilled) toast('El pozo se ha asentado', 'Tus túneles de abajo se han llenado de escombro y piedra');
  else toast('Pozo 1', TRAMOS[0].n);
}

// ---------- simulación de materiales ----------
function playerCell(r,c){ return !dead && p && p.r === r && p.c === c; }
function fluids(top, bot){
  tick++;
  for(let r=bot-1; r>=top; r--){
    const R = W.rows[r], dir = (tick + r) & 1 ? 1 : -1;
    for(let i=0;i<COLS;i++){
      const c = dir > 0 ? i : COLS-1-i, v = R.t[c];
      if((v !== SAND && v !== WATER && v !== RUBBLE) || R.mv[c] === tick) continue;
      if(v === WATER){ waterStep(r, c, dir); continue; }
      const below = tAt(r+1, c);
      const can = (rr, cc) => { if(cc<0 || cc>=COLS) return false; const x = tAt(rr,cc); if(v !== WATER && playerCell(rr,cc)) return false; return isOpen(x) || (v !== WATER && x === WATER); };
      if(can(r+1, c)){ swap(r,c,r+1,c); continue; }
      if(v === RUBBLE) continue;
      // arena: rampa de 45º (siempre el mismo orden, sin azar)
      const order = v === SAND ? [dir, -dir] : [dir, -dir];
      let moved = false;
      for(const dd of order){
        const side = tAt(r, c+dd);
        if(can(r+1, c+dd) && (isOpen(side) || side === WATER)){ swap(r,c,r+1,c+dd); moved = true; break; }
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
  // a los lados: se iguala con el vecino más bajo (nunca deja láminas más finas que el mínimo)
  for(const dd of [dir, -dir]){
    const cc = c + dd; if(cc < 0 || cc >= COLS) continue;
    const x = R.t[cc];
    if(isOpen(x)){
      if(L >= 2*AG.nivelMinimo){ const m = L/2; R.t[cc] = WATER; R.hp[cc] = 0; R.sh[cc] = 0; R.lv[cc] = m; R.mv[cc] = tick; L -= m; }
    } else if(x === WATER){
      const n = R.lv[cc];
      if(L - n > AG.diferenciaMinima){ const m = (L - n)/2; R.lv[cc] = n + m; R.mv[cc] = tick; L -= m; }
    }
  }
  R.lv[c] = L;
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
  if(!isSolid(below) && !playerCell(it.r+1, it.c) && !rocks.some(k => k.c === it.c && Math.abs(k.y - it.r - 1) < 1)){
    it.r++; B.r = it.r; it.fall = (it.fall||0) + 1; it.dy = 1;
  } else if(it.fall){ if(it.fall >= 2) SND('aterriza', near(it.r, it.c)*0.8); it.fall = 0; }
}
function swap(r1,c1,r2,c2){
  const A = W.rows[r1], B = W.rows[r2];
  const tv = A.t[c1], th = A.hp[c1], tl = A.lv[c1]; A.t[c1] = B.t[c2]; A.hp[c1] = B.hp[c2]; A.lv[c1] = B.lv[c2]; B.t[c2] = tv; B.hp[c2] = th; B.lv[c2] = tl;
  A.sh[c1] = 0; B.sh[c2] = 0; B.mv[c2] = tick; A.mv[c1] = tick;
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
    k.vy = Math.min(16, k.vy + 34*dt); k.y += k.vy*dt;
    const rr = Math.floor(k.y) + 1, b = tAt(rr, k.c);
    if(isSolid(b)){
      let r = rr - 1; while(r > 0 && isSolid(tAt(r, k.c))) r--;
      const fall = r - k.y0;
      const broke = fall >= cfg.thrH || k.grp >= cfg.thrS;
      setT(r, k.c, broke ? RUBBLE : k.t); k.done = true;
      const nv = near(r, k.c); SND(broke ? 'escombro' : 'cae', nv); shakeKick = Math.max(shakeKick, nv*1.6);
      burst(r+0.9, k.c+0.5, broke ? '#847e87' : '#8f563b', broke ? 9 : 4);
      if(broke && Math.abs(r - p.r) < 10 && Math.random() < 0.35) floats.push({x:k.c+0.5, y:r+0.2, txt:'escombro', life:0.8, col:'#9badb7'});
      for(const it of W.items) if(it.alive && it.k === 'oil' && it.r === r && it.c === k.c) it.alive = false;
    }
    if(!dead && k.vy > 2 && !k.spared && Math.abs(k.c - p.x) < 0.95 && k.y + 0.95 > p.y + 0.15 && k.y < p.y + 0.9){
      if(k.c === p.c) die('crush');
      else { // ya estabas saliendo de esa casilla: te salvas, pero caes al suelo aturdido
        k.spared = true; p.stun = JU.aturdidoPorLosPelos; p.x = p.c; p.act = null; p.falling = false; SND('tropiezo');
        floats.push({x:p.c+0.5, y:p.r-0.3, txt:'¡Por los pelos!', life:1.2, col:'#fbf236'});
        burst(p.r+0.8, p.c+0.5, '#eec39a', 8);
      }
    }
    for(const it of W.items) if(it.alive && it.k === 'moth' && Math.floor(it.x) === k.c && it.y > k.y && it.y < k.y+1){ it.alive = false; floats.push({x:it.x, y:it.y, txt:'¡Aplastada!', life:0.9, col:'#eec39a'}); }
  }
  rocks = rocks.filter(k => !k.done);
}

// ---------- jugador ----------
function weight(){ let w = 0; for(const k in bag) w += bag[k]*INFO[k].val; return w; }
function stepTime(){ return JU.tiempoPaso * (1 + weight()/JU.pesoQueFrena); }
function canStand(r, c){ if(p.onPlat && r === SURF-2 && c === 7) return true; const below = tAt(r+1, c); return isSolid(below) || below === LADDER || tAt(r, c) === LADDER; }
function passable(r, c){ const v = tAt(r, c); return !isSolid(v) && !rocks.some(k => k.c === c && Math.abs(k.y - r) < 1); }
function hit(r, c, dir){
  const R = W.rows[r], v = R.t[c];
  p.act = dir.y > 0 ? 'picar_abajo' : 'picar_lado'; p.actT = 0;
  if(INFO[v].hp >= 999){
    digT = 0.3; burst(r+0.5, c+0.5, '#cbdbfc', 4); SND('clin');
    if(lockMsgT <= 0){ floats.push({x:c+0.5, y:r, txt:'Hace falta un taladro', life:1.4, col:'#cbdbfc'}); lockMsgT = 1.6; }
    return;
  }
  if(v === RUBBLE){ clearRubble(r, c); digT = JU.tiempoGolpe; lamp -= LA.costeGolpe; SND('escombro'); return; }
  R.hp[c]--; digT = JU.tiempoGolpe; lamp -= LA.costeGolpe;
  burst(r+0.5, c+0.5, '#d9a066', 2);
  if(R.hp[c] > 0) SND('golpe');
  if(R.hp[c] <= 0){
    setT(r, c, AIR); SND('rompe');
    burst(r+0.5, c+0.5, v === RUBBLE ? '#847e87' : '#8f563b', 7);
    if(INFO[v].val){ bag[v] = (bag[v]||0) + 1; renderInv(v); }
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
  const sp = (p.falling ? JU.velocidadCaida : 1/stepTime()) * dt;
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
            if(passable(p.r, tc)){ p.c = tc; moveT = stepTime(); SND('paso', 0.6); }
            else if(isSolid(v)) hit(p.r, tc, {x:ax, y:0});
          }
        } else if(want('D')){ tapped.D = 0;
          const v = tAt(p.r+1, p.c);
          if(v === LADDER || passable(p.r+1, p.c)){ p.r++; moveT = stepTime(); }
          else if(isSolid(v)) hit(p.r+1, p.c, {x:0, y:1});
        } else if(want('U')){ tapped.U = 0;
          if(tAt(p.r, p.c) === LADDER && passable(p.r-1, p.c)){ p.r--; moveT = stepTime(); }
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
  wet = wetLv > 0.3;
  gasNear = false;
  const GA = PE.grisuAviso;
  for(let r=p.r-GA; r<=p.r+GA && !gasNear; r++) for(let c=p.c-GA; c<=p.c+GA; c++) if(tAt(r,c) === GAS){ gasNear = true; break; }
  if(gasNear && !roomsSeen.has('gas')){ roomsSeen.add('gas'); toast('La llama se vuelve azul', 'Hay grisú cerca. Baja la mecha para pasar'); }
  if(wick && lamp > 0 && (tAt(p.r, p.c) === GAS || tAt(p.r-1, p.c) === GAS)) explode(tAt(p.r, p.c) === GAS ? p.r : p.r-1, p.c);
  const L = layout(p.r);
  const inRoom = L.part !== undefined && L.part > 0 && L.part < ROOM_H-1;
  if(inRoom) lamp = Math.min(100, lamp + LA.recargaSala*dt);
  else if(!L.surface) lamp -= cfg.drain*dt*(wick ? 1 : LA.multMechaBaja)*(1 + (LA.multMojada - 1)*wetLv);
  // arena encima: te va cubriendo
  if(tAt(p.r-1, p.c) === SAND && !inRoom){ buried += dt; } else buried = Math.max(0, buried - dt*1.5);
  if(buried > JU.sepultadoEn) die('buried');
  // objetos
  for(const it of W.items){
    if(!it.alive || it.k === 'moth') continue;
    if(it.r === p.r && it.c === p.c){
      if(it.k === 'herr'){ it.alive = false; SND('poner'); const n = RC.cantidad;
        if(it.tipo === 'puntal') props += n; else ladders += n; renderInv();
        burst(it.r+0.5, it.c+0.5, '#d9a066', 10); floats.push({x:it.c+0.5, y:it.r, txt:'+'+n+' '+(it.tipo === 'puntal' ? 'puntal' : 'escalera'), life:1.2, col:'#fbf236'}); }
      else if(it.k === 'oil'){ it.alive = false; SND('aceite'); lamp = Math.min(100, lamp + LA.aceite); burst(it.r+0.5, it.c+0.5, '#fbf236', 14); floats.push({x:it.c+0.5, y:it.r, txt:'+'+LA.aceite+'% luz', life:1.2, col:'#fbf236'}); }
      else if(it.k === 'bag'){ it.alive = false; SND('mochila'); for(const k in W.bag.items) bag[k] = (bag[k]||0) + W.bag.items[k]; W.bag = null; renderInv(); toast('Mochila recuperada', 'Todo lo que perdiste vuelve contigo'); burst(it.r+0.5, it.c+0.5, '#fbf236', 20); }
    }
  }
  // avisos
  const depth = Math.max(0, p.r - SURF + 1); if(depth > maxDepth) maxDepth = depth;
  if(inRoom && !roomsSeen.has(L.room)){
    roomsSeen.add(L.room); SND('sala');
    // las herramientas de cada sala se regalan una sola vez por pozo
    if(!W.rewarded.includes(L.room)){
      W.rewarded.push(L.room);
      const g = D.herramientas.porSalaSegura; props += g.puntales; ladders += g.escaleras; renderInv();
      toast('Sala segura', 'Lámpara recargada · +'+g.puntales+' puntales · +'+g.escaleras+' escaleras');
    } else toast('Sala segura', 'Lámpara recargada · aquí ya cogiste las herramientas');
  }
  if(L.part !== undefined) lastRoomFloor = Math.max(lastRoomFloor, ROOM_ROW[L.room] + ROOM_H - 1);
  if(L.part === undefined && !L.surface && L.seg > segSeen){ segSeen = L.seg; toast('Tramo '+(L.seg+1), TRAMOS[L.seg].n); }
}
function explode(r0, c0){
  const seen = new Set([r0*16+c0]), q = [[r0,c0]], cells = [];
  while(q.length && cells.length < 140){
    const [r,c] = q.pop(); cells.push([r,c]);
    for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){ const rr=r+dr, cc=c+dc, k=rr*16+cc; if(cc<0||cc>=COLS||seen.has(k)||tAt(rr,cc)!==GAS) continue; seen.add(k); q.push([rr,cc]); }
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
function placeTool(kind){
  if(!started || dead || cashed) return;
  const v = tAt(p.r, p.c);
  if(v !== AIR){ floats.push({x:p.c+0.5, y:p.r-0.2, txt:'Aquí no cabe', life:0.9, col:'#d9a066'}); return; }
  if(kind === 'prop'){ if(props <= 0) return noTool('Sin puntales'); setT(p.r, p.c, PROP); props--; }
  else { if(ladders <= 0) return noTool('Sin escaleras'); setT(p.r, p.c, LADDER); ladders--; }
  SND('poner');
  renderInv();
}
function noTool(msg){ floats.push({x:p.c+0.5, y:p.r-0.2, txt:msg, life:1, col:'#d95763'}); }

// ---------- polillas ----------
function lightRadius(){ return (LA.radioMin + (LA.radioMax-LA.radioMin)*Math.max(0,lamp)/100) * (wick ? 1 : LA.multRadioMechaBaja); }
function los(x0,y0,x1,y1,tr,tc){
  const dx = x1-x0, dy = y1-y0, n = Math.ceil(Math.hypot(dx,dy)*3);
  for(let i=1;i<n;i++){ const x = x0+dx*i/n, y = y0+dy*i/n, r = Math.floor(y), c = Math.floor(x); if(r===tr && c===tc) return true; if(isSolid(tAt(r,c))) return false; }
  return true;
}
function updateMoths(dt){
  const px = p.x + 0.5, py = p.y + 0.3, R = lightRadius();
  for(const m of W.items){
    if(!m.alive || m.k !== 'moth' || Math.abs(m.y - py) > 24) continue;
    m.ph = (m.ph||0) + dt*22;
    const dx = px - m.x, dy = py - m.y, d = Math.hypot(dx,dy) || 1;
    let tvx, tvy;
    if(!dead && d < R*1.1 && los(m.x,m.y,px,py,-1,-1)){ tvx = dx/d*PE.polillaVelocidad; tvy = dy/d*PE.polillaVelocidad; m.hunt = true; }
    else { m.ang = (m.ang||0) + (Math.random()-0.5)*dt*6; tvx = Math.cos(m.ang)*0.7; tvy = Math.sin(m.ang)*0.5; m.hunt = false; }
    m.vx = (m.vx||0) + (tvx - (m.vx||0))*Math.min(1, dt*3); m.vy = (m.vy||0) + (tvy - (m.vy||0))*Math.min(1, dt*3);
    const nx = m.x + m.vx*dt, ny = m.y + m.vy*dt;
    if(isSolid(tAt(Math.floor(m.y), Math.floor(nx)))){ m.vx *= -0.6; m.ang = Math.PI - (m.ang||0); } else m.x = nx;
    if(isSolid(tAt(Math.floor(ny), Math.floor(m.x)))){ m.vy *= -0.6; m.ang = -(m.ang||0); } else m.y = ny;
    if(!dead && Math.abs(m.x - px) < 0.55 && Math.abs(m.y - (p.y+0.5)) < 0.6){
      m.alive = false; lamp -= PE.polillaLuz; SND('polilla'); floats.push({x:px, y:p.y-0.1, txt:'-'+PE.polillaLuz+'% luz', life:1.2, col:'#d95763'}); burst(m.y, m.x, '#eec39a', 10);
    }
  }
}

// ---------- muerte y cobro ----------
function die(cause){
  if(dead || cashed) return;
  dead = cause; deadT = 0; SND('muerte'); shakeKick = Math.max(shakeKick, 3);
  burst(p.y+0.5, p.x+0.5, cause === 'crush' ? '#eec39a' : '#fbf236', 24);
  const lost = {props, ladders};
  const n = Object.values(bag).reduce((a,b)=>a+b,0);
  const oldBagLost = !!W.bag;
  W.bag = n ? {r:p.r, c:p.c, items:{...bag}} : null;
  W.items = W.items.filter(it => it.k !== 'bag');
  // el último tramo (desde la última sala segura) se llena de escombro sin vetas
  const top = lastRoomFloor + 1, bot = p.r + 2;
  fillQ = [];
  for(let r=top; r<=bot; r++) for(let c=0;c<COLS;c++){ const v = tAt(r,c); if(v !== ROCK && v !== BEAM) fillQ.push([r,c]); }
  fillQ.sort((a,b)=> a[0]-b[0] || Math.random()-0.5);
  for(const it of W.items) if(it.r >= top && it.r <= bot && (it.k === 'oil' || it.k === 'moth')) it.alive = false;
  if(D.herramientas.alMorir === 'perder'){ Pa.kit = {puntales:0, escaleras:0}; } else { Pa.kit = {puntales:props, escaleras:ladders}; lost.props = 0; lost.ladders = 0; }
  Pa.guardar();
  dead = {cause, n, lost, oldBagLost};
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
  for(const k in bag) Pa.almacen[INFO[k].key] = (Pa.almacen[INFO[k].key]||0) + bag[k];
  Pa.kit = {puntales:props, escaleras:ladders}; Pa.guardar();
  persist();
  showEnd();
}
function persist(){ save('pozoviejo-mina1', packWorld()); }

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
function resize(){
  const r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  const n = Math.floor(r.width*dpr / VW);
  scale = n >= 1 ? n/dpr : r.width / VW;
  VH = Math.floor(r.height / scale);
  cv.width = Math.round(VW*scale*dpr); cv.height = Math.round(VH*scale*dpr);
  cv.style.width = (VW*scale)+'px'; cv.style.height = (VH*scale)+'px';
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
  if(v === PROP){ ctx.drawImage(PS.puntal, X, Y); return; }
  if(v === LADDER){ ctx.drawImage(PS.escalera, X, Y); return; }
  if(v === BEAM){ ctx.drawImage(PS.viga, X, Y); return; }
  const I = INFO[v];
  let jx = 0; if(R && R.sh[c] > 0) jx = Math.round(Math.sin(t*60 + c*3)*1.5);
  const vs = TS[I.tile]; ctx.drawImage(vs[hsh(r,c) % vs.length], X + jx, Y);
  if(I.veta) ctx.drawImage(VS[I.veta][hsh(c,r) % VS[I.veta].length], X + jx, Y);
  const B = BS[I.tile] || BS.piedra, open = (rr,cc) => !isSolid(tAt(rr,cc));
  if(open(r-1,c)) ctx.drawImage(B.arriba, X+jx, Y); if(open(r+1,c)) ctx.drawImage(B.abajo, X+jx, Y);
  if(open(r,c-1)) ctx.drawImage(B.izquierda, X+jx, Y); if(open(r,c+1)) ctx.drawImage(B.derecha, X+jx, Y);
  if(R){
    const dmg = (I.hp||0) - R.hp[c];
    if(R.sh[c] > 0) ctx.drawImage(GS[2], X+jx, Y);
    else if(dmg > 0 && I.hp < 999) ctx.drawImage(GS[Math.min(2, Math.floor(dmg / Math.max(1, I.hp) * 3))], X, Y);
  }
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
function drawItem(it){
  const X = it.c*T, Y = Math.round((it.r - (it.dy||0) - cam)*T);
  if(it.k === 'oil') ctx.drawImage(PS.aceite, X, Y);
  else if(it.k === 'chest') ctx.drawImage(PS.cofre, X, Y);
  else if(it.k === 'bag') ctx.drawImage(PS.mochila_suelo, X, Y);
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
  const S0 = scale*(window.devicePixelRatio||1);
  ctx.setTransform(S0, 0, 0, S0, 0, 0);
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
  if(ys > 0) drawSurface(ys);
  const rooms = new Set();
  for(let r=Math.max(SURF, r0); r<=r1; r++){
    const L = layout(r), Y = Math.round((r-cam)*T);
    if(L.part !== undefined) rooms.add(L.room);
    for(let c=0;c<COLS;c++){
      const v = W.rows[r].t[c], X = c*T;
      if(!isSolid(v) || v === BEAM) ctx.drawImage(TS.fondo[hsh(r,c)%2], X, Y);
      if(L.part !== undefined && L.part > 0 && L.part < ROOM_H-1 && !isSolid(v)){ ctx.fillStyle = 'rgba(143,86,59,0.35)'; ctx.fillRect(X, Y, T, T); }
      if(v !== AIR) drawTile(v, r, c, X, Y);
    }
  }
  // antorchas de las salas
  for(const i of rooms){
    const Y = Math.round((ROOM_ROW[i]+1-cam)*T), X = 2*T + 10;
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
    addLight(r0, r1, p.x+0.5, p.y+0.25, lightRadius()*flick*fade, 1, true, true);
    for(const i of rooms) addLight(r0, r1, 2.5, ROOM_ROW[i]+1.5, 6.5, 1, true, true);
    for(const it of W.items) if(it.alive && (it.k === 'oil' || it.k === 'chest' || it.k === 'bag' || it.k === 'herr') && it.r >= r0-2 && it.r <= r1+2) addLight(r0, r1, it.c+0.5, it.r+0.6, it.k === 'oil' ? 1.6 : 2.4, 0.6, false, false);
    for(let r=Math.max(SURF,r0); r<=r1; r++) for(let c=0;c<COLS;c++){
      if(!isSolid(W.rows[r].t[c])) continue;
      const i = (r-r0)*COLS + c; let m = lbuf[i];
      for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){ const rr=r+dr, cc=c+dc; if(rr<r0||rr>r1||cc<0||cc>=COLS||isSolid(tAt(rr,cc))) continue; m = Math.max(m, lbuf[(rr-r0)*COLS+cc]*0.8); }
      lbuf[i] = m; if(m > 0.12) W.rows[r].seen[c] = 1;
    }
    const D = limg.data;
    for(let r=r0; r<=r1; r++) for(let c=0;c<COLS;c++){
      const i = (r-r0)*COLS + c; let a = 1 - lbuf[i];
      if(r < SURF) a = Math.min(a, 0.3); else if(W.rows[r] && W.rows[r].seen[c]) a = Math.min(a, 0.7);
      D[i*4] = 5; D[i*4+1] = 3; D[i*4+2] = 8; D[i*4+3] = Math.max(0, Math.min(255, a*255));
    }
    lctx.putImageData(limg, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lc, 0, (r0 - cam)*T, VW, nR*T);
    ctx.imageSmoothingEnabled = false;
  }
  ctx.textAlign = 'center'; ctx.font = '800 13px "Sofia Sans Condensed", "Arial Narrow", sans-serif';
  for(const f of floats){ ctx.globalAlpha = Math.min(1, f.life*1.6); const x = Math.round(f.x*T), y = Math.round((f.y-cam)*T);
    ctx.save(); ctx.translate(x, y); ctx.scale(1/zoom, 1/zoom);
    ctx.fillStyle = '#000'; ctx.fillText(f.txt, 1, 1); ctx.fillStyle = f.col; ctx.fillText(f.txt, 0, 0); ctx.restore(); }
  ctx.globalAlpha = 1;
  ctx.restore();
  drawBagMarker(fx, fy);
  if(looking){ ctx.textAlign = 'center'; ctx.font = '900 14px Nunito, sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(VW/2-70, 8, 140, 22); ctx.fillStyle = '#fbf236'; ctx.fillText('Mirando · pulsa Ver', VW/2, 24); }
  if(flashT > 0){ ctx.fillStyle = `rgba(251,242,54,${flashT})`; ctx.fillRect(0,0,VW,VH); }
}

// Indicador de la mochila perdida: encima de ella si se ve, o en el borde con los metros si no
function bagDist(){ return W.bag ? W.bag.r - p.r : 0; }
function drawBagMarker(fx, fy){
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

// ---------- interfaz ----------
const $ = id => document.getElementById(id);
function chip(k, n, bump){ return `<span class="chip${bump?' bump':''}"><i style="background:${INFO[k].dot}"></i>${INFO[k].n} <b>${n}</b></span>`; }
function renderInv(bump){
  const keys = Object.keys(bag).filter(k => bag[k] > 0);
  let h = keys.length ? keys.map(k => chip(k, bag[k], +k === +bump)).join('') : '<span class="chip muted">Mochila vacía</span>';
  h += `<span class="chip">Peso <b>${weight()}</b></span>`;
  if(W && W.bag) h += `<span class="chip warn" id="bagChip">Mochila <b id="bagDist"></b></span>`;
  $('inv').innerHTML = h;
  $('nProp').textContent = props ?? 0; $('nLad').textContent = ladders ?? 0;
}
const last = {};
function hud(force){
  if(!p) return;
  const pct = Math.max(0, Math.ceil(lamp)), L = layout(p.r), safe = L.part !== undefined && L.part > 0 && L.part < ROOM_H-1;
  const cls = safe ? 'safe' : wet ? 'wet' : pct < 25 ? 'low' : '';
  if(force || pct !== last.pct || cls !== last.cls){ last.pct = pct; last.cls = cls; $('lampPct').textContent = pct+'%'; $('lampFill').style.width = pct+'%'; $('lampFill').className = cls; }
  const depth = Math.max(0, p.r - SURF + 1); if(force || depth !== last.depth){ last.depth = depth; $('depth').textContent = depth; }
  if(W.bag && $('bagDist')){ const d = bagDist(), txt = d === 0 ? 'aquí al lado' : Math.abs(d)+' m '+(d > 0 ? 'más abajo' : 'más arriba');
    if(force || txt !== last.bag || !$('bagDist').textContent){ last.bag = txt; $('bagDist').textContent = txt; } }
  else if(!W.bag && $('bagChip')) renderInv();
  let seg, next;
  if(L.surface){ seg = 'Pozo 1 · Superficie'; next = 'Sala a '+(ROOM_ROW[0]-p.r)+' m'; }
  else if(L.part !== undefined){ seg = 'Pozo 1 · Sala segura '+(L.room+1); next = safe ? 'A salvo' : 'Sala segura'; }
  else { seg = 'Pozo 1 · '+TRAMOS[L.seg].n; next = L.seg < ROOM_ROW.length ? 'Sala a '+(ROOM_ROW[L.seg]-p.r)+' m' : 'Sin más salas'; }
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
    const M = {crush:['Te aplastó un derrumbe','El techo sin apoyo crujió y se vino abajo.'], buried:['Sepultado por la arena','La arena te cubrió la cabeza y no saliste a tiempo.'], lamp:['La lámpara se apagó','A oscuras no hay forma de seguir.']}[dead.cause];
    $('ovEyebrow').textContent = 'Fin de la bajada · '+maxDepth+' m';
    $('ovTitle').textContent = M[0];
    $('ovText').textContent = M[1];
    $('ovList').innerHTML = dead.n ? list : '';
    let note = 'El último tramo se ha llenado de escombro y piedra suelta.';
    if(dead.n) note += ' Tu mochila ha quedado enterrada dentro, a '+maxDepth+' m: pica el escombro para recuperarla.';
    if(dead.oldBagLost && dead.n) note += ' La mochila que ya habías perdido antes se ha perdido para siempre.';
    if(dead.lost.props || dead.lost.ladders) note += ' Pierdes las herramientas que llevabas ('+dead.lost.props+' puntales y '+dead.lost.ladders+' escaleras).';
    $('ovNote').textContent = note;
  }
  $('over').hidden = false;
}
function toVillage(){ started = false; $('over').hidden = true; window.Pantallas.mostrar('plaza'); }

// ---------- bucle ----------
let lastT = performance.now();
function frame(now){
  const dt = Math.max(0, Math.min(0.05, (now - lastT)/1000)); lastT = now; t += dt;
  if(started && !cashed && p){
    const top = Math.max(SURF, p.r - 22), bot = p.r + 22;
    ensure(bot + 30);
    simAcc += dt; stabAcc += dt; crackMsgT -= dt; lockMsgT -= dt; flashT = Math.max(0, flashT - dt);
    while(simAcc > 1/14){ simAcc -= 1/14; fluids(top, bot); updateBag(); }
    if(stabAcc > 0.1){ stabAcc = 0; stability(top, bot); }
    updateCracks(top, bot, dt);
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
  else if(!e.repeat && (e.key === 'p' || e.key === 'P')) placeTool('prop');
  else if(!e.repeat && (e.key === 'e' || e.key === 'E')) placeTool('lad');
  else if(!e.repeat && (e.key === 'm' || e.key === 'M')) wick = wick ? 0 : 1;
});
function toggleLook(){
  if(!started || dead || cashed) return;
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
    else if(k === 'prop') placeTool('prop'); else if(k === 'lad') placeTool('lad'); else if(k === 'wick') wick = wick ? 0 : 1; else press(k); };
  const up = () => { b.classList.remove('on'); if(k in input) input[k] = false; if(k === 'ver') b.classList.toggle('activo', looking); };
  b.addEventListener('pointerdown', down);
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev => b.addEventListener(ev, up));
  b.addEventListener('contextmenu', e => e.preventDefault());
});
$('cashBtn').addEventListener('click', cashOut);
$('ovBtn').addEventListener('click', toVillage);
$('helpBtn').addEventListener('click', () => { $('help').hidden = false; });
$('helpClose').addEventListener('click', () => { $('help').hidden = true; });
// ajustes
const SL = ['drain','span','crack','thrH','thrS'];
function syncTune(){ SL.forEach(k => { $('s_'+k).value = cfg[k]; $('o_'+k).textContent = cfg[k]; }); $('s_dark').value = cfg.dark; $('s_zoom').value = cfg.zoom; $('s_sound').value = window.Sonido && !window.Sonido.activado ? '0' : '1'; }
SL.forEach(k => $('s_'+k).addEventListener('input', e => { cfg[k] = +e.target.value; $('o_'+k).textContent = cfg[k]; save('pozoviejo-cfg', cfg); }));
$('s_dark').addEventListener('change', e => { cfg.dark = e.target.value; save('pozoviejo-cfg', cfg); });
$('s_sound').addEventListener('change', e => { window.Sonido && window.Sonido.activar(e.target.value === '1'); });
$('s_zoom').addEventListener('change', e => { cfg.zoom = e.target.value; save('pozoviejo-cfg', cfg); });
let wasStarted = false;
$('tuneBtn').addEventListener('click', () => { syncTune(); wasStarted = started; started = false; $('tuning').hidden = false; });
$('tuneClose').addEventListener('click', () => { $('tuning').hidden = true; started = wasStarted; lastT = performance.now(); });
$('tuneReset').addEventListener('click', () => { cfg = {...BASE}; save('pozoviejo-cfg', null); syncTune(); });

// ---------- arranque ----------
let activa = false;
function cargarMundo(){
  const saved = load('pozoviejo-mina1', null);
  W = null;
  if(saved){ try{ W = unpackWorld(saved); }catch(e){ W = null; } }
  if(!W) W = newWorld();
}
cargarMundo();
p = {c:7, r:SURF-2, x:7, y:SURF-2, face:1, anim:'reposo', animT:0, act:null, actT:0, onPlat:true, stun:0};
lamp = 100; bag = {}; props = 0; ladders = 0; wick = 1; rocks = []; particles = []; floats = []; fillQ = []; buried = 0;
requestAnimationFrame(frame);
return {
  entrar(){ activa = true; resize(); startRun(); },
  salir(){ activa = false; started = false; },
  borrar(){ save('pozoviejo-mina1', null); W = newWorld(); },
  _dbg(){ return {p, W, rocks, setT, tAt, consts:{AIR, RUBBLE, STONE, HARD, DIRT, SURF, ROOM_ROW, ROOM_H}, get looking(){ return looking; }, get zoom(){ return zoom; }, get shake(){ return shake + shakeKick; }, get props(){ return props; }}; },
};
})();
