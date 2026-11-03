// =====================================================================
//  CONVERSACIONES del pueblo (borrador: los textos son provisionales)
//  Cada casa puede tener conversaciones que salen al entrar, según lo que haya pasado (banderas de la partida).
//  Caras de Deep: contento, alegre, sorprendido, asustado, triste, decidido, cansado, pensativo
//  Caras de la Señora Coneja: contenta, alegre, emocionada, sorprendida, triste, pensativa
//  Caras del tejón: contento, alegre, sorprendido, pensativo, sudando
//  Caras del viejo topo: gruñon, sorprendido, triste, pensativo, cansado
//  Caras de la ardilla: contenta, alegre, emocionada, sorprendida, pensativa, despistada
// =====================================================================
window.Conversaciones = (()=>{
  const Pa = window.Partida;
  const d = (cara, texto) => ({quien:'deep', cara, texto});
  const c = (cara, texto) => ({quien:'coneja', cara, texto});
  const t = (cara, texto) => ({quien:'tejon', cara, texto});
  const v = (cara, texto) => ({quien:'viejo', cara, texto});
  const a = (cara, texto) => ({quien:'ardilla', cara, texto});
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

  // Vuelve de la Cantera del molino con un hongo luminoso: la coneja le manda a la herboristería
  const CONEJA_HONGO = [
    d('sorprendido', 'Señora Coneja, ¿sabe qué es esto? Brilla con una luz azul, como las flores, pero fría.'),
    c('sorprendida', '¡Un hongo luminoso! Hacía años que no veía uno. Los topos los subían de la Cantera del molino.'),
    c('pensativa', 'Yo de plantas solo sé lo justo para hacer infusiones. La que sabe de verdad es la ardilla de la herboristería.'),
    c('contenta', 'Es un poco despistada y siempre está liada con sus frascos, pero tiene buen corazón. Llévaselo: se va a volver loca de alegría.'),
    d('contento', '¡Voy ahora mismo!'),
  ];

  // ---------- Herboristería de la ardilla ----------
  const H = D.herboristeria || {encargos: [], unguentos: {}};
  const OBJ = D.objetos || {};
  const listaObj = o => Object.entries(o).map(([k, n]) => n + ' ' + (OBJ[k] ? (n > 1 && OBJ[k].plural ? OBJ[k].plural : OBJ[k].nombre.toLowerCase()) : k)).join(', ').replace(/, ([^,]*)$/, ' y $1');
  // antes de que la coneja te mande, la ardilla está demasiado liada para atenderte
  const ARDILLA_OCUPADA = [
    [a('despistada', '¡Ahora no, ahora no! Estoy en mitad de una infusión y si se me pasa el punto… ¡Vuelve otro día, cielo!'), d('pensativo', 'Vale…')],
    [a('pensativa', 'Raíz de brezo, tres hojas de menta… ¿Dónde habré puesto el mortero? …¿Querías algo? Ay, luego, luego.'), d('pensativo', '…')],
  ];
  const ARDILLA_INTRO = () => [
    d('pensativo', 'Hola… La señora Coneja me ha dicho que usted sabe de plantas.'),
    a('despistada', '¿Plantas? Sé un poco de todo y de nada en particular. ¿Dónde habré dejado las gafas…? Ah, las llevo puestas.'),
    d('decidido', 'Le traigo esto. Lo encontré en la Cantera del molino.'),
    a('sorprendida', '¿Eso es…? ¡Un hongo luminoso! ¡Uno de verdad! Déjame verlo, déjame verlo…'),
    a('emocionada', '¡Míralo, cómo brilla! Con estos hongos se preparaba un ungüento que te deja aguantar la respiración el doble. Los mineros no bajaban sin él.'),
    a('pensativa', 'Antes los topos me traían de todo: hongos, flores de mina, raíces que solo crecen a oscuras… Desde que dejaron de bajar, mis frascos están vacíos.'),
    d('contento', 'Yo puedo traerle más. Bajo a las minas.'),
    a('alegre', '¿Harías eso por una ardilla vieja? ¡Ay, qué alegría!'),
    a('contenta', 'Tráeme ' + listaObj(H.encargos[0] ? H.encargos[0].pide : {}) + ' y te enseñaré lo que sé hacer con ellos. Te prepararé ungüentos para tus bajadas.'),
  ];
  // entrega de un encargo
  const ARDILLA_ENTREGA = {
    hongos_1: () => [
      d('alegre', '¡Le traigo los hongos!'),
      a('emocionada', '¡Cinco hongos luminosos! Mira cómo llenan el estante… Hacía años que esta tienda no brillaba así.'),
      a('contenta', 'Toma: un ungüento de pulmones de topo, recién hecho. Úntatelo antes de bajar y el aire bajo el agua te durará el doble.'),
      a('pensativa', 'Y ahora que me acuerdo de la receta, te puedo preparar más cuando quieras: dos hongos por tarro.'),
      a('despistada', 'Ah, y otra cosa… Las flores de mina. Necesito muchas, muchas, para unas pomadas. ¿Me traerías quince?'),
      d('decidido', '¡Quince flores! Haré lo que pueda.'),
    ],
    flores_1: () => [
      d('alegre', '¡Quince flores de mina!'),
      a('emocionada', '¡Qué ramo tan precioso! Brillan todas a la vez, como un farolillo.'),
      a('contenta', 'Con ellas sale el ungüento de piel dura: si te cae una piedra encima, aguantas el golpe. Toma el primero. Los siguientes, tres flores por tarro.'),
      a('pensativa', 'Hay una receta más, la más difícil… Para esa me harían falta veinticinco flores. Sí, ya sé, ya sé. Pero vale la pena.'),
      d('pensativo', 'Veinticinco… Vale. Bajaré a por ellas.'),
    ],
    flores_2: () => [
      d('cansado', 'Veinticinco flores de mina… Uf. Aquí están.'),
      a('sorprendida', '¡Lo has hecho de verdad! Ni los mejores topos me traían tantas de una vez.'),
      a('emocionada', 'Esta es la receta más antigua de la herboristería: el ungüento de segunda oportunidad. Si algo sale mal allí abajo, te devuelve a la última sala segura.'),
      a('contenta', 'Toma el primero. Y prométeme que no lo vas a necesitar.'),
      d('contento', 'Se lo prometo.'),
    ],
    nenufares_1: () => [
      d('alegre', '¡Le traigo nenúfares! Flotaban en las pozas de la Galería del río.'),
      a('emocionada', '¡Nenúfares de mina! Huelen a río y a piedra mojada… Mira cómo brilla la flor.'),
      a('pensativa', 'Mi abuela hacía con ellos una cera para las lámparas de los mineros. La untaban en el cristal y la mecha, y el agua resbalaba sin tocar la llama.'),
      a('contenta', 'Toma, la primera: con la cera de nenúfar, el agua no te ahoga la lámpara. Las siguientes, dos nenúfares por tarro.'),
      d('contento', '¡Así podré bucear sin quedarme a oscuras!'),
      a('despistada', 'Bucear… Ay, no me lo digas, que me pongo nerviosa.'),
    ],
    campanillas_1: () => [
      d('alegre', '¡Campanillas de nieve! Asomaban entre el hielo de la Mina de los cuervos.'),
      a('emocionada', '¡Qué blancas! Parecen de porcelana. Con estas se hace el ungüento de rodillas de topo.'),
      a('contenta', 'Te lo untas en las rodillas y las caídas duelen la mitad. Toma el primero. Los siguientes, dos campanillas por tarro.'),
      d('contento', '¡Gracias! Mis rodillas también se lo agradecen.'),
    ],
  };
  const ARDILLA_ESPERA = e => [[a('pensativa', 'Recuerda: me hacen falta ' + listaObj(e.pide) + '. Cuando los tengas, aquí estaré. Creo.'), d('decidido', 'No se me olvida.')],
    [a('despistada', '¿Ya me traes ' + listaObj(e.pide) + '? Ah, no, aún no… Ay, perdona, es que hoy no sé dónde tengo la cabeza.'), d('contento', 'Pronto.')]];
  const ARDILLA_DESPUES = [
    [a('contenta', 'Desde que me traes plantas, vienen vecinos a por infusiones. ¡Hasta el alcalde me ha pedido una para los nervios!'), d('alegre', '¡Qué bien!')],
    [a('pensativa', 'Dicen que en las minas más hondas crecen plantas que ni yo conozco. Si ves alguna rara, tráemela, ¿eh?'), d('decidido', 'Prometido.')],
  ];
  // encargos: los de siempre van uno detrás de otro; los de una mina («mina») se abren aparte al abrir esa mina
  const encargoActual = () => (Pa.encargosDisponibles ? Pa.encargosDisponibles()[0] : null) || null;
  const encargoListo = () => (Pa.encargosDisponibles ? Pa.encargosDisponibles() : []).find(e => tieneObj(e.pide)) || null;
  const tieneObj = pide => Object.entries(pide).every(([k, n]) => (Pa.coleccion[k] || 0) >= n);

  // ---------- Taller del tejón: el ascensor del Pozo viejo ----------
  const FINO = (D.ascensor && D.ascensor.fino) || {arcilla: 15, carbon: 12, cobre: 6};
  const TEJON_ASCENSOR = () => [
    d('pensativo', 'Hola… ¿Es usted el que arregla cosas?'),
    t('contento', 'Arreglo todo lo que tenga tornillos, y lo que no los tiene, se los pongo. ¿Qué te trae por aquí, chaval?'),
    d('decidido', 'He bajado al Pozo viejo. Hasta el fondo.'),
    t('sorprendido', '¿Hasta el fondo? ¿Tú solo? …¿Y cómo demonios has vuelto a subir?'),
    d('contento', 'Abajo había un ascensor viejo. Le faltaba una pieza, la encontré por allí, la puse y arrancó… a trompicones.'),
    d('asustado', 'Me dejó arriba, pero se paró echando humo. Tuve que dejar casi todo lo que llevaba. Y ahora no puedo volver a bajar: no tendría forma de subir.'),
    t('pensativo', 'El ascensor de los topos… Lo construyó tu gente hace muchos años, antes de que yo llegara al pueblo. Un trasto precioso.'),
    t('alegre', '¡Déjamelo a mí! Voy a echarle un vistazo.'),
    t('sudando', '…Uf. Ya está. Apañado. Pero no aguantará mucho: uno o dos viajes como mucho. Ten cuidado.'),
    t('contento', 'Tráeme ' + listaMat(FINO) + ' y te lo dejo fino. Podrás bajar y subir con él siempre que quieras.'),
    d('asustado', '¿Y el pozo? Al salir se derrumbó todo…'),
    t('contento', 'Mejor para ti: con el derrumbe habrá salido mineral nuevo. Las montañas son así.'),
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
  const TEJON_MOCHILA = [
    t('sorprendido', '¡Vaya, vaya! ¿Has abierto la Galería del río? Allí abajo hay hierro, chaval. Buen hierro.'),
    d('pensativo', '¿Y para qué sirve?'),
    t('alegre', 'Para todo. Mira esa mochila tuya: se te va a romper de tanto llenarla. Tráeme hierro y un poco de cobre y te la refuerzo: cuero doble y remaches. Te cabrá mucho más.'),
    d('alegre', '¡Trato hecho!'),
  ];
  const TEJON_DESPUES = [
    [t('contento', '¿Qué tal funciona mi ascensor? Si oyes un chirrido raro, ni caso. Es su forma de saludar.'), d('alegre', 'Va de maravilla.')],
    [t('pensativo', 'Si ves un montacargas roto allí abajo y no encuentras con qué arreglarlo, dímelo: te preparo un kit. Eso sí, sale más caro que apañarlo con lo que encuentres.'), d('pensativo', 'Lo tendré en cuenta.')],
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
      if(Pa.bandera('mina_3_abierta') && !Pa.bandera('tejon_mochila')) return {lineas: TEJON_MOCHILA, fin: () => Pa.ponerBandera('tejon_mochila')};
      return {lineas: azar(Pa.bandera('ascensor_pozo1_fino') ? TEJON_DESPUES : TEJON_NADA), fin: null};
    }
    if(casa === 'viejo'){
      if((Pa.coleccion.pico_padre || 0) > 0 && !Pa.bandera('viejo_pico')) return {lineas: VIEJO_PICO, fin: () => { Pa.ponerBandera('viejo_pico'); }};
      return {lineas: azar(Pa.bandera('viejo_pico') ? VIEJO_DESPUES : VIEJO_CERRADO), fin: null};
    }
    if(casa === 'herboristeria'){
      if(!Pa.bandera('ardilla_intro')){
        if(Pa.bandera('coneja_hongo')) return {lineas: ARDILLA_INTRO(), fin: () => { Pa.ponerBandera('ardilla_intro'); const e = encargoActual(); if(e) Pa.pueblo.encargos[e.id] = 'activo'; Pa.sumarProsperidad(1); }};
        return {lineas: azar(ARDILLA_OCUPADA), fin: null};
      }
      const e = encargoListo() || encargoActual();
      if(e && tieneObj(e.pide) && ARDILLA_ENTREGA[e.id]) return {lineas: ARDILLA_ENTREGA[e.id](), fin: () => {
        for(const [k, n] of Object.entries(e.pide)){ Pa.coleccion[k] -= n; if(Pa.coleccion[k] <= 0) delete Pa.coleccion[k]; }
        Pa.pueblo.encargos[e.id] = 'hecho';
        if(e.receta) Pa.ponerBandera('receta_' + e.receta);
        const U = Pa.kit.unguentos || (Pa.kit.unguentos = {}); for(const [k, n] of Object.entries(e.regalo || {})) U[k] = (U[k] || 0) + n;
        for(const sig of Pa.encargosDisponibles()) if(!Pa.pueblo.encargos[sig.id]) Pa.pueblo.encargos[sig.id] = 'activo';
        Pa.sumarProsperidad(1); Pa.guardar();
      }};
      return {lineas: azar(e ? ARDILLA_ESPERA(e) : ARDILLA_DESPUES), fin: null};
    }
    if(casa !== 'tienda') return null;
    if(!Pa.bandera('coneja_intro')) return {lineas: CONEJA_ANTES, fin: () => Pa.ponerBandera('coneja_intro')};
    if(!Pa.bandera('flor_entregada') && (Pa.coleccion.flor_mina || 0) > 0)
      return {lineas: coneja_flor(), fin: () => {
        Pa.coleccion.flor_mina--; if(!Pa.coleccion.flor_mina) delete Pa.coleccion.flor_mina;
        Pa.kit.puntales = (Pa.kit.puntales || 0) + 2;
        Pa.ponerBandera('flor_entregada'); Pa.sumarProsperidad(1);
      }};
    // con un hongo luminoso en la colección: la coneja te manda a la herboristería
    if(!Pa.bandera('coneja_hongo') && (Pa.coleccion.hongo_azul || 0) > 0) return {lineas: CONEJA_HONGO, fin: () => Pa.ponerBandera('coneja_hongo')};
    return {lineas: azar(Pa.bandera('flor_entregada') ? CONEJA_DESPUES : CONEJA_ESPERA), fin: null};
  }
  return { alEntrar };
})();
