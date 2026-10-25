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
  const P = {
    almacen: load('pozoviejo-almacen', {}),
    kit: load('pozoviejo-kit', {...D.herramientas.inicial}),
    // colección: objetos encontrados que ya llegaron al pueblo { id: cantidad }; visto: todo lo que has llegado a tener (minerales y objetos)
    coleccion: load('pozoviejo-coleccion', {}),
    visto: load('pozoviejo-visto', {}),
    pueblo: Object.assign(puebloNuevo(), load('pozoviejo-pueblo', {})),
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
