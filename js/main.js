// =====================================================================
//  PANTALLAS: mapa, plaza y mina
// =====================================================================
window.Pantallas = (()=>{
  const ids = {mapa:'pantalla-mapa', plaza:'pantalla-plaza', mina:'pantalla-mina'};
  let actual = null;
  function mostrar(nombre, pozo, opts){
    if(actual === 'mina' && nombre !== 'mina') window.Mina.salir();
    for(const [k, id] of Object.entries(ids)) document.getElementById(id).hidden = k !== nombre;
    actual = nombre;
    if(nombre === 'mapa'){ window.Pueblo.mapa(); }
    else if(nombre === 'plaza'){ window.Pueblo.plaza(); }
    else { window.Pueblo.parar(); window.Mina.entrar(pozo, opts); }
  }
  return {mostrar, get actual(){ return actual; }};
})();
// versión visible en el menú y en ajustes
document.getElementById('verLbl').textContent = 'v' + window.DATOS.version;
document.querySelectorAll('.verTxt').forEach(e => e.textContent = window.DATOS.version);
document.title = 'Deep v' + window.DATOS.version;
window.Pantallas.mostrar('mapa');

// sonido al pulsar cualquier botón o desplegable de los menús (no los mandos de la mina, que ya suenan a su manera)
document.addEventListener('click', e => {
  const b = e.target.closest('button, select, .punto');
  if(b && !b.closest('#pad') && window.Sonido) window.Sonido.tocar('clic', 0.9);
}, true);
document.addEventListener('change', e => { if(e.target.matches('select') && window.Sonido) window.Sonido.tocar('clic', 0.7); }, true);
