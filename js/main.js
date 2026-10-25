// =====================================================================
//  PANTALLAS: mapa, plaza y mina
// =====================================================================
window.Pantallas = (()=>{
  const ids = {mapa:'pantalla-mapa', plaza:'pantalla-plaza', mina:'pantalla-mina'};
  let actual = null;
  function mostrar(nombre){
    if(actual === 'mina' && nombre !== 'mina') window.Mina.salir();
    for(const [k, id] of Object.entries(ids)) document.getElementById(id).hidden = k !== nombre;
    actual = nombre;
    if(nombre === 'mapa'){ window.Pueblo.mapa(); }
    else if(nombre === 'plaza'){ window.Pueblo.plaza(); }
    else { window.Pueblo.parar(); window.Mina.entrar(); }
  }
  return {mostrar, get actual(){ return actual; }};
})();
window.Pantallas.mostrar('mapa');
