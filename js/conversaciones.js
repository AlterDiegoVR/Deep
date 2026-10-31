// =====================================================================
//  CONVERSACIONES del pueblo (borrador: los textos son provisionales)
//  Cada casa puede tener conversaciones que salen al entrar, según lo que haya pasado (banderas de la partida).
//  Caras de Deep: contento, alegre, sorprendido, asustado, triste, decidido, cansado, pensativo
//  Caras de la Señora Coneja: contenta, alegre, emocionada, sorprendida, triste, pensativa
//  Caras del tejón: contento, alegre, sorprendido, pensativo, sudando
//  Caras del viejo topo: gruñon, sorprendido, triste, pensativo, cansado
// =====================================================================
window.Conversaciones = (()=>{
  const Pa = window.Partida;
  const d = (cara, texto) => ({quien:'deep', cara, texto});
  const c = (cara, texto) => ({quien:'coneja', cara, texto});
  const t = (cara, texto) => ({quien:'tejon', cara, texto});
  const v = (cara, texto) => ({quien:'viejo', cara, texto});
  const D = window.DATOS, MAT = D.materiales;
  const listaMat = o => Object.entries(o).map(([k, n]) => n + ' de ' + MAT[k].nombre.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' y $1');

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

  // ---------- Taller del tejón: el ascensor del Pozo viejo ----------
  const FINO = (D.ascensor && D.ascensor.fino) || {arcilla: 15, carbon: 12, cobre: 6};
  const TEJON_ASCENSOR = () => [
    d('pensativo', 'Hola… ¿Es usted el que arregla cosas?'),
    t('contento', 'Arreglo todo lo que tenga tornillos, y lo que no los tiene, se los pongo. ¿Qué te trae por aquí, chaval?'),
    d('decidido', 'He bajado al Pozo viejo. Hasta el fondo.'),
    t('sorprendido', '¿Hasta el fondo? ¿Tú solo? …¿Y cómo demonios has vuelto a subir?'),
    d('contento', 'Abajo había un ascensor viejo. Le faltaba una pieza, la encontré por allí, la puse y arrancó… a trompicones.'),
    d('asustado', 'Me dejó arriba, pero se paró echando humo. Y ahora no puedo volver a bajar: no tendría forma de subir.'),
    t('pensativo', 'El ascensor de los topos… Lo construyó tu gente hace muchos años, antes de que yo llegara al pueblo. Un trasto precioso.'),
    t('alegre', '¡Déjamelo a mí! Voy a echarle un vistazo.'),
    t('sudando', '…Uf. Ya está. Apañado. Sube, aunque chirría como un grillo con tos. Para bajar, yo no me fiaría.'),
    t('contento', 'Si me trajeras ' + listaMat(FINO) + ', lo dejaría fino. Podrías bajar y subir con él siempre que quisieras.'),
    d('alegre', '¡Trato hecho!'),
  ];
  const TEJON_FINO = () => [
    d('alegre', '¡Le traigo los materiales para el ascensor!'),
    t('sorprendido', 'A ver, a ver… ' + listaMat(FINO) + '. ¡Está todo!'),
    t('sudando', 'Dame un rato… Una tuerca por aquí, un poco de grasa por allá…'),
    t('alegre', '¡Listo! Ahora el ascensor baja y sube suave como la seda. Cuando vayas al Pozo viejo podrás elegir: bajar por la boca o en el ascensor, hasta el fondo.'),
    d('contento', '¡Gracias, señor Tejón!'),
    t('contento', 'Nada de señor. Tejón a secas. Y vuelve cuando quieras: siempre tengo algún invento a medias.'),
  ];
  const TEJON_FALTA = () => [[t('pensativo', 'Para dejar fino el ascensor me hacen falta ' + listaMat(FINO) + '. Tú tráemelos y yo hago magia.'), d('decidido', 'Bajaré a por ellos.')]];
  const TEJON_NADA = [
    [t('contento', '¿Un topo en mi taller? Hacía años que no veía uno… Si algún día necesitas arreglar algún trasto, ya sabes dónde estoy.'), d('contento', 'Lo tendré en cuenta.')],
  ];
  const TEJON_DESPUES = [
    [t('contento', '¿Qué tal funciona mi ascensor? Si oyes un chirrido raro, ni caso. Es su forma de saludar.'), d('alegre', 'Va de maravilla.')],
    [t('pensativo', 'Estoy pensando en un trasto para subir la carga por los pozos sin que tengas que cargar con ella… Algún día.'), d('sorprendido', '¿Como un montacargas?')],
  ];

  // ---------- Casa del viejo topo ----------
  const VIEJO_CERRADO = [
    [v('gruñon', '¿Quién anda ahí? …No compro nada y no quiero visitas. Vete a casa, chaval.'), d('triste', '…')],
    [v('gruñon', 'Ya te he dicho que te vayas. Aquí no hay nada para ti.'), d('triste', 'Solo quería hablar de mi padre…'), v('cansado', '…Vete.')],
  ];
  const VIEJO_PICO = [
    d('pensativo', 'Señor… La señora Coneja me dijo que usted conocía a mi padre.'),
    v('gruñon', 'Tu padre… Hace mucho que nadie lo nombra en este pueblo. ¿Qué quieres?'),
    d('decidido', 'Encontré esto en el fondo del Pozo viejo.'),
    v('sorprendido', 'Ese pico… Trae acá. …Es el suyo. Lo reconocería entre mil. Esa marca la grabamos juntos, el día que nos dieron la cuadrilla.'),
    v('pensativo', 'Pero no puede ser. Aquel día la cuadrilla no bajó por el Pozo viejo. Entramos por otra mina. Este pico no debería estar ahí.'),
    d('sorprendido', '¿Entonces…?'),
    v('pensativo', 'Entonces algo no cuadra. Si su pico llegó al Pozo viejo, alguien lo llevó hasta allí… por dentro de la montaña.'),
    d('triste', '¿Cree que mi padre…?'),
    v('triste', 'No creo nada. Llevo años sin creer en nada, chaval.'),
    v('pensativo', '…Pero bajaste hasta el fondo tú solo. Un crío. Hacía mucho que nadie hacía eso.'),
    v('pensativo', 'Dime una cosa. Allí abajo… ¿notaste calor?'),
    d('pensativo', 'Por una grieta del fondo subía aire caliente. Como si la montaña respirara.'),
    v('cansado', '…Vuelve otro día. Tengo que pensar.'),
  ];
  const VIEJO_DESPUES = [
    [v('gruñon', 'Sigue bajando, si quieres. Pero con cabeza: los puntales no son un adorno.'), d('decidido', 'Lo sé.')],
    [v('pensativo', 'Tu padre siempre decía que la montaña habla, si sabes escuchar. Yo hace años que me tapé los oídos.'), d('pensativo', '¿Y qué decía?')],
  ];

  // Devuelve la conversación que toca al entrar en una casa (o null) y lo que pasa al acabarla
  function alEntrar(casa){
    if(casa === 'taller'){
      if(Pa.bandera('ascensor_pozo1_roto') && !Pa.bandera('ascensor_pozo1_apanado'))
        return {lineas: TEJON_ASCENSOR(), fin: () => { Pa.ponerBandera('ascensor_pozo1_apanado'); Pa.sumarProsperidad(1); }};
      if(Pa.bandera('ascensor_pozo1_apanado') && !Pa.bandera('ascensor_pozo1_fino')){
        if(Pa.puedePagar(FINO)) return {lineas: TEJON_FINO(), fin: () => { for(const [k, n] of Object.entries(FINO)) Pa.almacen[k] -= n; Pa.ponerBandera('ascensor_pozo1_fino'); Pa.sumarProsperidad(1); }};
        return {lineas: azar(TEJON_FALTA()), fin: null};
      }
      return {lineas: azar(Pa.bandera('ascensor_pozo1_fino') ? TEJON_DESPUES : TEJON_NADA), fin: null};
    }
    if(casa === 'viejo'){
      if((Pa.coleccion.pico_padre || 0) > 0 && !Pa.bandera('viejo_pico')) return {lineas: VIEJO_PICO, fin: () => { Pa.ponerBandera('viejo_pico'); }};
      return {lineas: azar(Pa.bandera('viejo_pico') ? VIEJO_DESPUES : VIEJO_CERRADO), fin: null};
    }
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
