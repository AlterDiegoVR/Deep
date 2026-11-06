// =====================================================================
//  PARTIDA: lo que se guarda entre bajadas (almacén y herramientas)
// =====================================================================
window.Partida = (()=>{
  const D = window.DATOS;
  const load = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; }catch(e){ return d; } };
  const save = (k, v) => { try{ if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
  // Estado del pueblo: aquí se irá guardando el progreso de la historia (aún no se muestra en el juego).
  //   dia          días que han pasado (sube cada vez que vuelves al pueblo)
  //   prosperidad  cuánto ha revivido el pueblo
  //   casas        casas abiertas (id de DATOS.casas)
  //   encargos     estado de cada encargo: { id: 'activo' | 'hecho' }
  //   banderas     marcas sueltas de la historia: { 'pico_padre': true, ... }
  const puebloNuevo = () => ({ dia: 1, prosperidad: 0, casas: D.casas.map(c => c.id), encargos: {}, banderas: {} });
  // 0.300: el primer encargo de la ardilla ahora enseña el tónico de vuelta (los pulmones de topo pasan a la mina 3)
  const migrar = Pu => { if(Pu.encargos && Pu.encargos.hongos_1 === 'hecho' && Pu.banderas && !Pu.banderas.receta_tonico) Pu.banderas.receta_tonico = true;
    // 0.301: los vecinos llegan tras la mina 5; los que ya conocías se quedan
    const V = Pu.vecinos || {}; for(const id of ['castor', 'marmota', 'gemelos']) if(V[id] && V[id].intro && Pu.banderas) Pu.banderas['llega_' + id] = true;
    return Pu; };
  const P = {
    almacen: load('pozoviejo-almacen', {}),
    kit: load('pozoviejo-kit', {...D.herramientas.inicial}),
    // colección: objetos encontrados que ya llegaron al pueblo { id: cantidad }; visto: todo lo que has llegado a tener (minerales y objetos)
    coleccion: load('pozoviejo-coleccion', {}),
    visto: load('pozoviejo-visto', {}),
    pueblo: migrar(Object.assign(puebloNuevo(), load('pozoviejo-pueblo', {}))),
    guardar(){ save('pozoviejo-almacen', P.almacen); save('pozoviejo-kit', P.kit); save('pozoviejo-coleccion', P.coleccion); save('pozoviejo-visto', P.visto); save('pozoviejo-pueblo', P.pueblo); },
    borrarTodo(){ P.almacen = {}; P.kit = {...D.herramientas.inicial}; P.coleccion = {}; P.visto = {}; P.pueblo = puebloNuevo(); P.guardar(); window.Mina && window.Mina.borrar(); },
    // ---- ayudas para la historia ----
    bandera(n){ return !!P.pueblo.banderas[n]; },
    ponerBandera(n, v = true){ P.pueblo.banderas[n] = v; P.guardar(); },
    sumarProsperidad(n){ P.pueblo.prosperidad += n; P.guardar(); },
    pasarDia(){ P.pueblo.dia++; P.guardar(); },
    // ---- colección ----
    guardarEnColeccion(id, n){ P.coleccion[id] = (P.coleccion[id] || 0) + n; P.visto[id] = true; },
    marcarVisto(id){ P.visto[id] = true; },
    // siguiente objetivo de la historia: lo que hace falta y para qué (dejar fino el ascensor, abrir la siguiente mina…)
    // 0.302: también los pasos de la historia que no son de materiales (sin coste: solo dicen qué hacer)
    objetivo(){
      const B = k => P.bandera(k), hist = (corto, nombre) => ({nombre: nombre || corto, corto, coste: null, historia: true});
      if((P.coleccion.flor_mina || 0) > 0 && !B('flor_entregada')) return hist('lleva la flor a la señora Coneja');
      if((P.coleccion.pico_padre || 0) > 0 && !B('viejo_pico')) return hist('enseña el pico al viejo topo');
      if(B('ascensor_pozo1_roto') && !B('ascensor_pozo1_apanado')) return hist('habla con el tejón del ascensor', 'habla con el tejón: el ascensor del Pozo viejo está roto');
      if(!B('ascensor_pozo1_roto')) return null;   // en el prólogo (el fondo del Pozo viejo) aún no hay objetivo
      if(B('ascensor_pozo1_apanado') && !B('ascensor_pozo1_fino') && D.ascensor && D.ascensor.fino)
        return {nombre: 'dejar fino el ascensor del Pozo viejo', corto: 'el ascensor fino', coste: D.ascensor.fino};
      for(const m of D.minas) if(m.desbloqueo && !m.abierta && !B('mina_' + m.id + '_abierta'))
        return {nombre: 'abrir la mina ' + m.id + ' (' + m.nombre + ')', corto: 'abrir la mina ' + m.id, coste: m.desbloqueo};
      if(B('respiradero_4') && !B('mina_5_abierta')) return hist('habla con el viejo topo', 'habla con el viejo topo: en su casa o en la boca del socavón');
      if(B('mina_5_abierta') && !B('temblor_mina5')) return hist('baja al socavón del viejo');
      if(B('temblor_mina5') && !B('viejo_verdad')) return hist('vuelve a hablar con el viejo');
      if(B('temblor_mina5') && !B('pista_taladro')) return hist('habla con el tejón');
      if(B('pista_taladro') && !B('llave_museo')) return hist('pide la llave del museo al alcalde');
      if(B('llave_museo') && !B('museo_abierto')) return hist('abre el museo');
      if(B('museo_abierto') && !B('tejon_taladro')) return hist('lleva el taladro al tejón');
      const MJ = (P.pueblo.mejoras || {}), tal = ((D.taller && D.taller.mejoras) || []).find(m => m.id === 'taladro');
      if(B('tejon_taladro') && tal && !MJ.taladro) return {nombre: 'arreglar el taladro (en el taller del tejón)', corto: 'arreglar el taladro', coste: tal.precio};
      return null;
    },
    // ungüentos que te llevas a la próxima bajada: los marcados primero y, si quedan huecos, los que nunca has tocado
    ungElegidos(){
      const HB = D.herboristeria || {unguentos: {}}, U = P.kit.unguentos || {}, L = P.kit.llevarUng || {}, H = HB.huecos || 2;
      const ids = Object.keys(HB.unguentos).filter(id => (U[id] || 0) > 0);
      const r = ids.filter(id => L[id] === true); for(const id of ids) if(r.length < H && L[id] === undefined) r.push(id);
      return r.slice(0, H);
    },
    // encargos de la ardilla que se pueden hacer ahora: el primero de la cadena de siempre y los de las minas abiertas
    encargosDisponibles(){
      const E = (D.herboristeria && D.herboristeria.encargos) || [], hecho = e => P.pueblo.encargos[e.id] === 'hecho';
      const out = [], cadena = E.find(e => !e.mina && !hecho(e)); if(cadena) out.push(cadena);
      for(const e of E) if(e.mina && !hecho(e) && P.bandera('mina_' + e.mina + '_abierta')) out.push(e);
      return out;
    },
    // ---- vecinos nuevos y cosas que piden (minerales del almacén u objetos de la colección) ----
    vecino(id){ const V = P.pueblo.vecinos || (P.pueblo.vecinos = {}); return V[id] || (V[id] = {intro: false, hechos: 0}); },
    puedeDar(pide){ return Object.entries(pide).every(([k, n]) => ((D.materiales[k] ? P.almacen[k] : P.coleccion[k]) || 0) >= n); },
    cobrarCosas(pide){ for(const [k, n] of Object.entries(pide)){ const A = D.materiales[k] ? P.almacen : P.coleccion; A[k] = (A[k] || 0) - n; if(A[k] <= 0) delete A[k]; } P.guardar(); },
    // ---- flores de mina de colores: {color: 'nueva' | 'entregada'} ----
    florNueva(){ const F = P.pueblo.flores || {}, FC = D.floresColor || {colores: []}; return FC.colores.find(c => F[c.id] === 'nueva') || null; },
    entregarFlorColor(id){ const F = P.pueblo.flores || (P.pueblo.flores = {}), R = (D.floresColor || {}).regalo || {};
      F[id] = 'entregada'; P.kit.escaleras = (P.kit.escaleras || 0) + (R.escaleras || 0); P.kit.puntales = (P.kit.puntales || 0) + (R.puntales || 0); P.sumarProsperidad(1); P.guardar(); },
    // ---- armario: aspectos ganados (uno por mina terminada y uno por flor de color entregada) ----
    aspectosGanados(){
      const AR = (D.casaDeep && D.casaDeep.armario) || {minas: {}, flores: {}}, out = ['clasico'];
      for(const [m, id] of Object.entries(AR.minas)) if(P.bandera('respiradero_' + m)) out.push(id);
      for(const [f, id] of Object.entries(AR.flores)) if((P.pueblo.flores || {})[f] === 'entregada') out.push(id);
      return [...new Set(out)];
    },
    // ---- estadísticas de la partida ----
    estad(){ return P.pueblo.estad || (P.pueblo.estad = {bajadas: 0, muertes: 0, record: 0, minerales: {}, cofres: 0}); },
    puedePagar(precio){ return Object.entries(precio).every(([m, n]) => (P.almacen[m] || 0) >= n); },
    comprar(item){
      if(!P.puedePagar(item.precio)) return false;
      for(const [m, n] of Object.entries(item.precio)) P.almacen[m] -= n;
      for(const [h, n] of Object.entries(item.da)) P.kit[h] = (P.kit[h] || 0) + n;
      P.guardar(); return true;
    },
  };
  return P;
})();
