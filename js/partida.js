// =====================================================================
//  PARTIDA: lo que se guarda entre bajadas (almacén y herramientas)
// =====================================================================
window.Partida = (()=>{
  const D = window.DATOS;
  const load = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; }catch(e){ return d; } };
  const save = (k, v) => { try{ if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
  const P = {
    almacen: load('pozoviejo-almacen', {}),
    kit: load('pozoviejo-kit', {...D.herramientas.inicial}),
    guardar(){ save('pozoviejo-almacen', P.almacen); save('pozoviejo-kit', P.kit); },
    borrarTodo(){ P.almacen = {}; P.kit = {...D.herramientas.inicial}; P.guardar(); window.Mina && window.Mina.borrar(); },
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
