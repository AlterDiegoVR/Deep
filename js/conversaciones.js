// =====================================================================
//  CONVERSACIONES del pueblo (borrador: los textos son provisionales)
//  Cada casa puede tener conversaciones que salen al entrar, según lo que haya pasado (banderas de la partida).
//  Caras de Deep: contento, alegre, sorprendido, asustado, triste, decidido, cansado, pensativo
//  Caras de la Señora Coneja: contenta, alegre, emocionada, sorprendida, triste, pensativa
// =====================================================================
window.Conversaciones = (()=>{
  const Pa = window.Partida;
  const d = (cara, texto) => ({quien:'deep', cara, texto});
  const c = (cara, texto) => ({quien:'coneja', cara, texto});

  // Primera visita a la tienda: antes de bajar a la mina
  const CONEJA_ANTES = [
    c('contenta', '¡Deep! Pasa, pasa, que fuera hace frío. Cada invierno llega antes, ¿te has fijado?'),
    d('pensativo', 'Buenos días, señora Coneja. ¿Es verdad lo que dicen en la plaza? ¿Que van a cerrar las minas?'),
    c('triste', 'Eso dice el alcalde. Unos señores de la ciudad quieren comprar la montaña y sellar los pozos con hormigón. Dicen que así el pueblo tendrá dinero.'),
    d('triste', 'Mi padre decía que las minas eran el corazón del pueblo.'),
    c('pensativa', 'Y tenía razón, cariño. Cuando yo era joven, esto estaba lleno de topos. Bajaban cantando y subían cubiertos de polvo, con los bolsillos llenos de mineral.'),
    c('emocionada', 'Tu padre siempre me traía una flor de mina. Brillan en la oscuridad, ¿sabes? Como si guardaran dentro un poquito de calor.'),
    d('sorprendido', '¿Flores? ¿Allí abajo?'),
    c('contenta', 'Solo crecen en lo hondo. Me gustaría ver una otra vez, antes de que lo cierren todo.'),
    c('triste', 'Pero no me hagas caso, son cosas de vieja. Tu padre nunca quiso que bajaras.'),
    d('decidido', '…'),
  ];
  // Ha hablado con ella pero aún no le ha traído la flor
  const CONEJA_ESPERA = [
    [c('pensativa', 'Ten mucho cuidado si bajas al Pozo viejo, Deep. Las galerías llevan años sin que nadie las apuntale.'), d('decidido', 'Lo tendré, señora Coneja.')],
    [c('contenta', '¿Necesitas puntales? Los hago con la arcilla que me traen. Bueno, que me traían…'), d('contento', 'Ya le traeré yo arcilla.')],
  ];
  // Vuelve de la mina con una flor
  function coneja_flor(){
    const pico = (Pa.coleccion.pico_padre || 0) > 0;
    const L = [
      d('alegre', '¡Señora Coneja! Mire lo que le traigo.'),
      c('sorprendida', 'Pero… ¿eso es…? ¡Una flor de mina! ¿Has bajado tú solo?'),
      d('contento', 'Estaba en lo hondo del Pozo viejo, brillando, como usted dijo.'),
      c('emocionada', 'Es igual que las que traía tu padre… Gracias, cariño. No sabes lo que significa para esta vieja.'),
    ];
    if(pico) L.push(
      d('pensativo', 'Allí abajo también encontré esto. Un pico, con un símbolo grabado en el mango.'),
      c('sorprendida', 'Ese símbolo… Lo he visto antes. Era el de la cuadrilla de tu padre.'),
      c('pensativa', 'El viejo topo que vive apartado, junto al camino del molino, bajaba con ellos. Quizá él sepa algo. Pero ve con tiento: no habla con nadie desde hace años.'),
    );
    else L.push(
      c('pensativa', 'Dicen que en los buenos tiempos ahí abajo hacía calor, mucho calor. ¿Notaste algo raro?'),
      d('pensativo', 'Ahora que lo dice… por algunas grietas subía un aire tibio.'),
    );
    L.push(c('contenta', 'Toma, llévate estos puntales para el camino. Y vuelve cuando quieras: aquí siempre tendrás una taza caliente.'));
    return L;
  }
  const CONEJA_DESPUES = [
    [c('contenta', 'He puesto la flor en la ventana. Por las noches ilumina toda la tienda.'), d('contento', 'Me alegro mucho.')],
    [c('pensativa', 'Desde que trajiste la flor, la gente pregunta por las minas. Hacía años que nadie lo hacía.'), d('decidido', 'Pues que pregunten. Yo voy a seguir bajando.')],
  ];
  const azar = L => L[Math.floor(Math.random()*L.length)];

  // Devuelve la conversación que toca al entrar en una casa (o null) y lo que pasa al acabarla
  function alEntrar(casa){
    if(casa !== 'tienda') return null;
    if(!Pa.bandera('coneja_intro')) return {lineas: CONEJA_ANTES, fin: () => Pa.ponerBandera('coneja_intro')};
    if(!Pa.bandera('flor_entregada') && (Pa.coleccion.flor_mina || 0) > 0)
      return {lineas: coneja_flor(), fin: () => {
        Pa.coleccion.flor_mina--; if(!Pa.coleccion.flor_mina) delete Pa.coleccion.flor_mina;
        Pa.kit.puntales = (Pa.kit.puntales || 0) + 2;
        Pa.ponerBandera('flor_entregada'); Pa.sumarProsperidad(1);
      }};
    return {lineas: azar(Pa.bandera('flor_entregada') ? CONEJA_DESPUES : CONEJA_ESPERA), fin: null};
  }
  return { alEntrar };
})();
