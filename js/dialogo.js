// =====================================================================
//  DIÁLOGOS: conversación a pantalla completa encima del pueblo, al estilo JRPG.
//  Deep a la izquierda, el otro personaje a la derecha; quien habla se ve en color y el otro en sombra.
//  Toca para que el texto salga entero; vuelve a tocar para seguir.
//  Uso: Dialogo.mostrar([{quien:'deep', cara:'contento', texto:'...'}, ...], alAcabar)
// =====================================================================
window.Dialogo = (()=>{
  const R = window.RETRATOS || {}, $ = id => document.getElementById(id);
  const NOMBRES = { deep: 'Deep', coneja: 'Señora Coneja', tejon: 'El tejón', viejo: 'El viejo topo' };
  const LADO = { deep: 'izq' };   // el resto, a la derecha
  let lineas = [], i = 0, escrito = 0, timer = 0, fin = null, abierto = false;
  function cara(quien, c){ const set = R[quien] || {}; return set[c] || set[Object.keys(set)[0]] || ''; }
  function pintar(){
    const L = lineas[i], lado = LADO[L.quien] || 'der';
    const img = $('dlg' + (lado === 'izq' ? 'Izq' : 'Der'));
    img.src = cara(L.quien, L.cara); img.parentNode.hidden = false; img.alt = NOMBRES[L.quien] || L.quien;
    $('dlgRetIzq').classList.toggle('callado', lado !== 'izq'); $('dlgRetDer').classList.toggle('callado', lado !== 'der');
    $('dlgRetIzq').classList.toggle('habla', lado === 'izq'); $('dlgRetDer').classList.toggle('habla', lado === 'der');
    $('dlgNombre').textContent = NOMBRES[L.quien] || L.quien;
    $('dlgCaja').className = 'dlg-caja ' + lado + ' ' + L.quien;
    escrito = 0; $('dlgTexto').textContent = ''; $('dlgSig').hidden = true;
    clearInterval(timer);
    timer = setInterval(() => {
      escrito += 1;
      $('dlgTexto').textContent = L.texto.slice(0, escrito);
      if(escrito % 3 === 1 && L.texto[escrito-1] !== ' ' && window.Sonido) window.Sonido.tocar(L.quien === 'deep' ? 'vozDeep' : 'vozOtro', 0.5);
      if(escrito >= L.texto.length){ clearInterval(timer); $('dlgSig').hidden = false; }
    }, 28);
  }
  function avanzar(){
    if(!abierto) return;
    const L = lineas[i];
    if(escrito < L.texto.length){ clearInterval(timer); escrito = L.texto.length; $('dlgTexto').textContent = L.texto; $('dlgSig').hidden = false; return; }
    i++;
    if(i >= lineas.length){ cerrar(); return; }
    pintar();
  }
  function cerrar(){ abierto = false; clearInterval(timer); $('dialogo').hidden = true; const f = fin; fin = null; if(f) f(); }
  function mostrar(ls, alAcabar){
    if(!ls || !ls.length){ if(alAcabar) alAcabar(); return; }
    lineas = ls; i = 0; fin = alAcabar || null; abierto = true;
    $('dlgRetIzq').hidden = true; $('dlgRetDer').hidden = true;
    $('dialogo').hidden = false; pintar();
  }
  $('dialogo').addEventListener('click', avanzar);
  addEventListener('keydown', e => { if(abierto && (e.key === ' ' || e.key === 'Enter')){ e.preventDefault(); avanzar(); } });
  return { mostrar, get abierto(){ return abierto; } };
})();
