// =====================================================================
//  PANTALLAS: mapa, plaza y mina
// =====================================================================
window.Pantallas = (()=>{
  const ids = {mapa:'pantalla-mapa', plaza:'pantalla-plaza', mina:'pantalla-mina', editor:'pantalla-editor', sprites:'pantalla-sprites'};
  let actual = null;
  function mostrar(nombre, pozo, opts){
    if(actual === 'mina' && nombre !== 'mina') window.Mina.salir();
    if(actual === 'editor' && nombre !== 'editor') window.Editor.cerrar();
    if(actual === 'sprites' && nombre !== 'sprites') window.EditorSprites.cerrar();
    document.getElementById('app').classList.toggle('ancho', nombre === 'editor' || nombre === 'sprites');
    for(const [k, id] of Object.entries(ids)) document.getElementById(id).hidden = k !== nombre;
    actual = nombre;
    if(nombre === 'mapa'){ window.Pueblo.mapa(); }
    else if(nombre === 'plaza'){ window.Pueblo.plaza(); }
    else if(nombre === 'editor'){ window.Pueblo.parar(); window.Editor.abrir(); }
    else if(nombre === 'sprites'){ window.Pueblo.parar(); window.EditorSprites.abrir(); }
    else { window.Pueblo.parar(); window.Mina.entrar(pozo, opts); }
  }
  return {mostrar, get actual(){ return actual; }};
})();
// versión visible en el menú y en ajustes
document.getElementById('verLbl').textContent = 'v' + window.DATOS.version;
document.querySelectorAll('.verTxt').forEach(e => e.textContent = window.DATOS.version);
document.title = 'Deep v' + window.DATOS.version;
window.Pantallas.mostrar(location.hash === '#editor' ? 'editor' : location.hash === '#sprites' ? 'sprites' : 'mapa');
document.getElementById('abrirEditor').onclick = () => window.Pantallas.mostrar('editor');
document.getElementById('abrirSprites').onclick = () => window.Pantallas.mostrar('sprites');

// sonido al pulsar cualquier botón o desplegable de los menús (no los mandos de la mina, que ya suenan a su manera)
document.addEventListener('click', e => {
  const b = e.target.closest('button, select, .punto');
  if(b && !b.closest('#pad') && window.Sonido) window.Sonido.tocar('clic', 0.9);
}, true);
document.addEventListener('change', e => { if(e.target.matches('select') && window.Sonido) window.Sonido.tocar('clic', 0.7); }, true);

// En el móvil, al primer toque se pone a pantalla completa (fuera la barra del navegador). En iPhone no se puede.
// 0.302b: con el dedo, el navegador solo lo deja al LEVANTARLO (touchend / pointerup), no al apretar.
(() => { const d = document.documentElement; let hecho = false;
  const ir = () => { if(hecho || document.fullscreenElement || !d.requestFullscreen || !matchMedia('(hover:none)').matches) return;
    d.requestFullscreen({navigationUI: 'hide'}).then(() => { hecho = true; }).catch(() => {}); };
  addEventListener('touchend', ir, {passive: true}); addEventListener('pointerup', ir); })();
