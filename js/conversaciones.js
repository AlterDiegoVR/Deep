// =====================================================================
//  CONVERSACIONES del pueblo (borrador: los textos son provisionales)
//  Cada casa puede tener conversaciones que salen al entrar, según lo que haya pasado (banderas de la partida).
//  Caras de Deep: contento, alegre, sorprendido, asustado, triste, decidido, cansado, pensativo
//  Caras de la Señora Coneja: contenta, alegre, emocionada, sorprendida, triste, pensativa
//  Caras del tejón: contento, alegre, sorprendido, pensativo, sudando
//  Caras del viejo topo: gruñon, sorprendido, triste, pensativo, cansado
//  Caras de la ardilla: contenta, alegre, emocionada, sorprendida, pensativa, despistada
//  Caras del alcalde: contento, orgulloso, serio, triste, sorprendido, nervioso
//  Caras del castor: contento, alegre, pensativo, sorprendido · de la marmota: contenta, alegre, dormida, sorprendida, pensativa
//  Caras de los gemelos: contentos, alegres, traviesos, sorprendidos
// =====================================================================
window.Conversaciones = (()=>{
  const Pa = window.Partida;
  const d = (cara, texto) => ({quien:'deep', cara, texto});
  const c = (cara, texto) => ({quien:'coneja', cara, texto});
  const t = (cara, texto) => ({quien:'tejon', cara, texto});
  const v = (cara, texto) => ({quien:'viejo', cara, texto});
  const a = (cara, texto) => ({quien:'ardilla', cara, texto});
  const al = (cara, texto) => ({quien:'alcalde', cara, texto});
  const ca = (cara, texto) => ({quien:'castor', cara, texto});
  const ma = (cara, texto) => ({quien:'marmota', cara, texto});
  const ge = (cara, texto) => ({quien:'gemelos', cara, texto});
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
  const listaObj = o => Object.entries(o).map(([k, n]) => OBJ[k] ? n + ' ' + (n > 1 && OBJ[k].plural ? OBJ[k].plural : OBJ[k].nombre.toLowerCase()) : n + ' de ' + (D.materiales[k] ? D.materiales[k].nombre.toLowerCase() : k)).join(', ').replace(/, ([^,]*)$/, ' y $1');
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
    a('emocionada', '¡Míralo, cómo brilla! Con estos hongos se preparaba un tónico que te devuelve a la última sala segura en un suspiro. Los mineros no bajaban sin él.'),
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
      a('contenta', 'Toma: un tónico de vuelta, recién hecho. Allí abajo, cuando lo necesites, te lo bebes y apareces en la última sala segura, con tu mochila.'),
      a('pensativa', 'Y ahora que me acuerdo de la receta, te puedo preparar más cuando quieras: dos hongos y una flor por frasco.'),
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
    lavanda_1: () => [
      d('alegre', '¡Le traigo flores y hongos!'),
      a('emocionada', '¡Ay, qué olor! Machacadas con un hongo, estas flores huelen a lavanda de la de antes.'),
      a('contenta', 'Es el bálsamo de lavanda: las polillas no soportan el olor y no se te acercan. Toma el primero. Los siguientes, dos flores y un hongo por tarro.'),
      d('contento', '¡Adiós, polillas!'),
    ],
    nenufares_2: () => [
      d('alegre', '¡Más nenúfares! Y hongos.'),
      a('pensativa', 'Nenúfar y hongo luminoso… Es la receta de los pulmones de topo. Los mineros del río no bajaban sin ella.'),
      a('contenta', 'Te lo untas en el pecho y el aire bajo el agua te dura el doble. Toma el primero. Los siguientes, un nenúfar y un hongo por tarro.'),
      d('contento', '¡Podré bucear el doble!'),
    ],
    campanillas_2: () => [
      d('alegre', '¡Campanillas y cuarzo!'),
      a('sorprendida', '¿Cuarzo? Ah, sí, sí: el polvo de cuarzo hace de lente. Con la campanilla se prepara el ungüento de ojos de topo.'),
      a('contenta', 'Te lo pones en los párpados y con la mecha baja ves casi como con la alta. Toma el primero. Los siguientes, una campanilla y dos de cuarzo.'),
      d('contento', '¡Así no despertaré a los murciélagos!'),
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
  const tieneObj = pide => Pa.puedeDar ? Pa.puedeDar(pide) : Object.entries(pide).every(([k, n]) => (Pa.coleccion[k] || 0) >= n);   // plantas de la colección y minerales del almacén

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

  // ---------- El alcalde ----------
  // si Deep aún no ha bajado a ninguna mina, no puede decir «yo he bajado»
  const yaBajo = () => Pa.bandera('flor_entregada') || Pa.bandera('ascensor_pozo1_roto') || (Pa.estad && Pa.estad().bajadas > 0);
  const ALCALDE_INTRO = () => [
    al('orgulloso', '¡Hombre, el pequeño Deep! Pasa, pasa. Mira qué despacho. Madera noble. Bueno, noble… de pino, pero noble.'),
    d('pensativo', 'Buenos días, señor alcalde. Quería preguntarle por las minas.'),
    al('contento', '¡Las minas! Ya está todo arreglado: unos señores de la ciudad nos las compran. Las sellan con hormigón, nos pagan y el pueblo tiene dinero para… para muchas cosas. Cosas importantes.'),
    d('triste', 'Pero son las minas del pueblo.'),
    al('serio', 'Eran, chaval. Hace muchos años que nadie baja. Los pozos se tapan, las galerías se caen… Nadie va a volver a picar ahí abajo.'),
    ...(yaBajo() ? [d('decidido', 'Yo he bajado.'), al('sorprendido', '¿Tú? …Bueno. Muy valiente. Muy valiente y muy peligroso.')]
      : [d('decidido', 'Pues yo voy a bajar.'), al('sorprendido', '¿Tú? …Bueno. Muy valiente. Muy valiente y muy peligroso. Ni se te ocurra.')]),
    al('triste', 'Mira, a mí también me da pena. Mi abuelo también ayudaba en las minas, ¿sabes? Les llevaba el pan a los topos. Pero las minas son parte del pasado. Ya no valen para nada.'),
    al('orgulloso', 'Hay que mirar hacia delante. ¡Progreso! Lo pone en mi banda. Bueno, no lo pone, pero lo pondría.'),
    d('pensativo', '…'),
  ];
  const ALCALDE_DESPUES = [
    [al('orgulloso', 'Los señores de la ciudad vienen en primavera a firmar. Me estoy dejando el bigote para la foto.'), d('pensativo', 'Ya…')],
    [al('nervioso', '¿Otra vez bajando a las minas? Si te pasa algo, la culpa será mía. ¡Y yo no tengo tiempo para culpas!'), d('decidido', 'Tendré cuidado.')],
    [al('triste', 'Dicen que la plaza está más verde. Será la lluvia. Seguro que es la lluvia.'), d('contento', 'Seguro.')],
  ];
  const ALCALDE_NIEGA = [
    d('decidido', 'Señor alcalde, necesito la llave del museo. El tejón dice que en la vitrina hay un taladro de la época dorada.'),
    al('serio', '¿El museo? Ni hablar. Lleva cerrado desde… desde que tenía que estar cerrado.'),
    al('triste', '¿Para qué remover el pasado, Deep? Fotos viejas, cascos viejos, topos que ya no están. Eso no le hace bien a nadie.'),
    d('triste', 'Mi padre está en esas fotos.'),
    al('nervioso', '…La llave no está en venta. Ni en préstamo. Ni nada. Buenos días.'),
  ];
  const ALCALDE_CEDE = [
    d('decidido', 'He vuelto por la llave del museo.'),
    al('serio', 'Ya te dije que…'),
    al('triste', '…'),
    al('triste', 'Mi abuelo les llevaba el pan a los mineros. Un topo le regaló una lámpara de carburo, y me la dejaba encender los domingos.'),
    al('nervioso', 'Toma. La llave. Pero no le digas a nadie que te la he dado. Y no rompas nada. Y límpiate los pies.'),
    d('alegre', '¡Gracias, señor alcalde!'),
    al('orgulloso', 'Nada, nada. Un alcalde tiene que saber cuándo… ceder con elegancia. Eso también lo pondría en mi banda.'),
  ];
  const ALCALDE_MUSEO = [
    [al('triste', 'He pasado por el museo. Hay una foto de mi abuelo con la cuadrilla, con su cesta de pan. No me acordaba de que sonreía tanto.'), d('contento', 'Se parece a usted.')],
    [al('orgulloso', 'El museo abierto le da prestigio al pueblo, ¿eh? Fue idea mía. Bueno, fue idea tuya, pero yo dejé la llave.'), d('alegre', 'Gracias otra vez.')],
  ];
  // ---------- El museo ----------
  const MUSEO_CERRADO_PISTA = [d('pensativo', 'Aquí dentro está el taladro… La puerta tiene un candado enorme. El alcalde tiene la llave.')];
  const MUSEO_ENTRAR = [
    d('pensativo', 'La llave entra a la primera. Quito las tablas… La puerta cruje como si llevara años aguantando la respiración.'),
    d('sorprendido', 'Vitrinas, cascos, lámparas, mapas de las galerías… Todo cubierto de polvo. Y fotos. Muchas fotos de topos sonriendo.'),
    d('triste', 'En una está la cuadrilla. Seis topos a la entrada de un pozo. El del medio… es papá. Muy joven.'),
    d('decidido', 'Y ahí está la vitrina. Un taladro de la época dorada. Pesa un montón… ¡pero me lo llevo!'),
    d('contento', 'A partir de hoy, el museo se queda abierto. Lo que vaya encontrando en las minas vendrá aquí, con ellos.'),
  ];
  // ---------- El tejón y el taladro ----------
  // (después del temblor de la mina 5, cuando las minas se han vuelto a cerrar: es el momento de volver a las viejas)
  const TEJON_PISTA_TALADRO = [
    t('pensativo', 'Menudo temblor, ¿eh? Se me cayeron todas las llaves inglesas. Oye, chaval: en tus bajadas, ¿no has visto una roca azulada, dura como el demonio, que no hay pico que la arañe?'),
    d('sorprendido', '¡Sí! Desde el Pozo viejo. Siempre he querido saber qué hay detrás.'),
    t('contento', 'Roca maciza. En la época dorada la rompían con taladros. Había uno en la vitrina del viejo museo, lo sé porque yo mismo le cambié la broca.'),
    d('decidido', '¿Y dónde está el museo?'),
    t('pensativo', 'En la plaza, tapiado. La llave la tiene el alcalde… y el alcalde no suelta una llave ni aunque le pagues. Tú inténtalo.'),
  ];
  const TJ = () => { const m = ((D.taller && D.taller.mejoras) || []).find(x => x.id === 'taladro'); return m ? listaMat(m.precio) : 'algo de mineral'; };
  const TEJON_TALADRO = () => [
    d('alegre', '¡Lo tengo! El taladro del museo.'),
    t('sorprendido', '¿Le has sacado la llave al alcalde? Tú vales más de lo que pesas, chaval.'),
    t('pensativo', 'A ver… Óxido, la broca mellada, el motor hecho polvo. Pero el corazón está sano.'),
    t('alegre', 'Tráeme ' + TJ() + ' y te lo dejo como nuevo. Con él podrás romper la roca maciza.'),
    d('decidido', '¡Bajo a por ello!'),
  ];
  const TP_ = () => { const m = ((D.taller && D.taller.mejoras) || []).find(x => x.id === 'pico_padre'); return m ? listaMat(m.precio) : 'hierro y estaño'; };
  const TEJON_PICO = () => [
    t('pensativo', 'Chaval, ¿sigues llevando el pico de tu padre a todas partes? Déjamelo ver.'),
    t('sorprendido', 'Buen acero, el de antes. El mango está podrido y la punta, roma, pero el alma está intacta.'),
    t('alegre', 'Con hierro de la Galería del río y estaño de la Mina de los cuervos te lo dejo como el primer día: ' + TP_() + '. Picarás un golpe menos con todo.'),
    d('decidido', 'El pico de papá… ¡Voy a por ello!'),
  ];
  // ---------- Vecinos nuevos ----------
  const VECINOS = {
    castor: { casa: 'paja1', habla: ca, caras: {c: 'contento', a: 'alegre', p: 'pensativo', s: 'sorprendido'},
      intro: [
        ca('contento', '¡Hola, hola! Tú debes de ser Deep. Soy nuevo en el pueblo. He oído que esto vuelve a ser un buen sitio para vivir.'),
        d('sorprendido', '¿Un vecino nuevo? ¡Hacía años que no venía nadie!'),
        ca('alegre', 'Vengo del río, más arriba. Allí ya no queda nada que roer. Dicen que en la Galería del río ha vuelto a correr el agua… y donde corre el agua, un castor es feliz.'),
        ca('pensativo', 'Voy a arreglar esta casita. Si me traes cosas de las minas, te pago con escaleras y puntales. Hago los mejores de la comarca. Bueno, los únicos.'),
        d('contento', '¡Trato hecho!'),
      ],
      gracias: [ca('alegre', '¡Justo lo que necesitaba! Toma, recién hechos. Huelen a madera buena.'), d('contento', '¡Gracias!')],
      espera: [[ca('pensativo', 'Sigo esperando lo que te pedí. Sin prisa, sin prisa… bueno, con un poco de prisa.'), d('decidido', 'Ya voy.')]],
      fin: [[ca('contento', 'La casa ya está como nueva. ¿Has visto el tejado? Ni una gota. ¡Gracias, vecino!'), d('alegre', 'Ha quedado preciosa.')]] },
    marmota: { casa: 'paja2', habla: ma, caras: {c: 'contenta', a: 'alegre', p: 'pensativa', s: 'sorprendida'},
      intro: [
        ma('dormida', '¿Eh? ¿Qué día es hoy?'),
        d('pensativo', 'Martes, creo.'),
        ma('sorprendida', '¿Martes? ¿Otra vez? Te juro que ayer también era martes. Y anteayer. Me despierto y siempre es el mismo día…'),
        d('sorprendido', '¿Eres nueva en el pueblo?'),
        ma('contenta', 'Recién llegada. Bajé de la montaña nevada: dicen que este pueblo vuelve a estar vivo. Y yo necesito un sitio tranquilo donde dormir… hasta la primavera. O hasta el martes.'),
        ma('pensativa', 'Por cierto: si salgo y veo mi sombra, seis semanas más de invierno. Así que, por si acaso, no salgo. Si me traes cosas, te pago con escaleras y puntales.'),
        d('alegre', '¡Bienvenida!'),
      ],
      gracias: [ma('alegre', '¡Uy, qué bien! Toma, que yo para lo que salgo… Oye, ¿hoy no es martes?'), d('contento', 'No, hoy no.')],
      espera: [[ma('dormida', 'Zzz… ¿Ya lo traes? …Zzz.'), d('pensativo', 'Todavía no.')]],
      fin: [[ma('contenta', 'Gracias a ti tengo la casa más calentita del valle. Ahora sí, a hibernar.'), d('contento', 'Que descanses.')]] },
    gemelos: { casa: 'paja3', habla: ge, caras: {c: 'contentos', a: 'alegres', p: 'traviesos', s: 'sorprendidos'},
      intro: [
        ge('alegres', '¡Hola! ¡Hola! ¿Tú eres el topo que baja a las minas? ¡Nuestros padres dicen que gracias a ti nos hemos mudado aquí!'),
        d('sorprendido', '¿Dos hámsters? ¿Gemelos?'),
        ge('traviesos', 'Yo soy el mayor. ¡Mentira, soy yo! Bueno, por tres minutos. ¡Por cuatro!'),
        ge('contentos', '¿Nos traes cosas de las minas? ¡Te damos escaleras y puntales! Papá los hace en el taller del tejón.'),
        d('alegre', '¡Claro que sí!'),
      ],
      gracias: [ge('alegres', '¡Toma! ¡Toma! ¡Esto es para ti! ¡No, esto también!'), d('contento', '¡Gracias, chicos!')],
      espera: [[ge('traviesos', '¿Lo traes? ¿Lo traes? ¿No? ¡Jo!'), d('contento', 'Pronto, pronto.')]],
      fin: [[ge('contentos', '¡De mayores vamos a ser mineros como tú!'), d('alegre', 'Os enseñaré a picar.')]] },
  };
  const VD = D.vecinos || {};
  const nombreCosa = k => MAT[k] ? n => n + ' de ' + MAT[k].nombre.toLowerCase() : n => n + ' ' + (OBJ[k] ? (n > 1 && OBJ[k].plural ? OBJ[k].plural : OBJ[k].nombre.toLowerCase()) : k);
  const listaCosas = o => Object.entries(o).map(([k, n]) => nombreCosa(k)(n)).join(', ').replace(/, ([^,]*)$/, ' y $1');
  function vecino(id){
    const V = VECINOS[id], E = (VD[id] || {}).encargos || [], est = Pa.vecino(id);
    if(!est.intro){
      const e0 = E[0];
      return {lineas: V.intro.concat(e0 ? [V.habla(V.caras.p, 'Para empezar, me vendría bien ' + listaCosas(e0.pide) + '.')] : []), fin: () => { est.intro = true; Pa.guardar(); Pa.sumarProsperidad(1); }};
    }
    const e = E[est.hechos || 0];
    if(!e) return {lineas: azar(V.fin), fin: null};
    if(Pa.puedeDar(e.pide)){
      const sig = E[(est.hechos || 0) + 1];
      return {lineas: [d('alegre', 'Te traigo ' + listaCosas(e.pide) + '.')].concat(V.gracias,
        sig ? [V.habla(V.caras.p, 'Ahora que lo pienso… ¿me traerías ' + listaCosas(sig.pide) + '?')] : []),
        fin: () => { Pa.cobrarCosas(e.pide); Pa.kit.escaleras = (Pa.kit.escaleras || 0) + (e.da.escaleras || 0); Pa.kit.puntales = (Pa.kit.puntales || 0) + (e.da.puntales || 0);
          est.hechos = (est.hechos || 0) + 1; Pa.sumarProsperidad(1); Pa.guardar(); }};
    }
    return {lineas: azar(V.espera).concat([V.habla(V.caras.c, 'Recuerda: ' + listaCosas(e.pide) + '.')]), fin: null};
  }
  // ---------- La coneja y las flores de colores ----------
  const CONEJA_COLOR = fc => [
    d('alegre', '¡Señora Coneja! Mire: una flor de mina ' + fc.nombre + '.'),
    c('sorprendida', '¿' + fc.nombre[0].toUpperCase() + fc.nombre.slice(1) + '? ¡Nunca había visto una! Tu padre decía que en lo más hondo salían de todos los colores, pero yo creía que eran cuentos.'),
    c('emocionada', 'Toma, llévate unas escaleras y unos puntales. Y esto… era de tu padre. Lo guardaba para cuando fueras mayor. Ve a casa a probártelo.'),
    d('contento', '¡Gracias!'),
  ];
  // ---------- El viejo topo en la boca del socavón (mina 5) ----------
  const VIEJO_MINA5 = [
    v('gruñon', '¿Adónde vas?'),
    d('sorprendido', '¡Señor! No le había visto. Quería entrar en el socavón.'),
    v('pensativo', 'Este socavón no es como las otras minas, chaval. No hay mineral que sacar. Lo que hay ahí dentro… es otra cosa.'),
    d('decidido', '¿Tiene que ver con mi padre?'),
    v('triste', '…Todo tiene que ver con tu padre. Por eso no.'),
    v('cansado', 'Todavía no estás preparado. Y yo tampoco. Vuelve más adelante.'),
  ];

  // Devuelve la conversación que toca al entrar en una casa (o null) y lo que pasa al acabarla
  function alEntrar(casa){
    if(casa === 'alcaldia'){
      if(!Pa.bandera('alcalde_intro')) return {lineas: ALCALDE_INTRO(), fin: () => Pa.ponerBandera('alcalde_intro')};
      if(Pa.bandera('temblor_mina5') && Pa.bandera('pista_taladro') && !Pa.bandera('llave_museo')){
        if(!Pa.bandera('alcalde_niega')) return {lineas: ALCALDE_NIEGA, fin: () => Pa.ponerBandera('alcalde_niega')};
        return {lineas: ALCALDE_CEDE, fin: () => { Pa.ponerBandera('llave_museo'); Pa.sumarProsperidad(1); }};
      }
      return {lineas: azar(Pa.bandera('museo_abierto') ? ALCALDE_MUSEO : ALCALDE_DESPUES), fin: null};
    }
    if(casa === 'museo'){
      if(Pa.bandera('temblor_mina5') && Pa.bandera('llave_museo') && !Pa.bandera('museo_abierto')) return {lineas: MUSEO_ENTRAR, fin: () => {
        Pa.ponerBandera('museo_abierto'); Pa.guardarEnColeccion('taladro_viejo', 1); Pa.sumarProsperidad(2); Pa.guardar(); }};
      if(!Pa.bandera('museo_abierto')) return Pa.bandera('temblor_mina5') && Pa.bandera('pista_taladro') ? {lineas: MUSEO_CERRADO_PISTA, fin: null} : null;
      return null;
    }
    if(casa === 'casa') return null;
    const veci = Object.keys(VECINOS).find(k => VECINOS[k].casa === casa);
    if(veci) return vecino(veci);
    if(casa === 'taller'){
      if(Pa.bandera('ascensor_pozo1_roto') && !Pa.bandera('ascensor_pozo1_apanado'))
        return {lineas: TEJON_ASCENSOR(), fin: () => { Pa.ponerBandera('ascensor_pozo1_apanado'); Pa.sumarProsperidad(1); }};
      if(Pa.bandera('ascensor_pozo1_apanado') && !Pa.bandera('ascensor_pozo1_fino')){
        if(Pa.puedePagar(FINO)) return {lineas: TEJON_FINO(), fin: () => { for(const [k, n] of Object.entries(FINO)) Pa.almacen[k] -= n; Pa.ponerBandera('ascensor_pozo1_fino'); Pa.sumarProsperidad(1); }};
        return {lineas: azar(TEJON_FALTA()), fin: null};
      }
      if(Pa.bandera('mina_3_abierta') && !Pa.bandera('tejon_mochila')) return {lineas: TEJON_MOCHILA, fin: () => Pa.ponerBandera('tejon_mochila')};
      // el taladro: primero la pista (hay roca maciza desde el primer pozo) y, con el taladro viejo del museo, el arreglo
      if(Pa.bandera('temblor_mina5') && !Pa.bandera('pista_taladro')) return {lineas: TEJON_PISTA_TALADRO, fin: () => Pa.ponerBandera('pista_taladro')};
      if(Pa.bandera('temblor_mina5') && Pa.bandera('museo_abierto') && !Pa.bandera('tejon_taladro')) return {lineas: TEJON_TALADRO(), fin: () => Pa.ponerBandera('tejon_taladro')};
      if(Pa.bandera('mina_4_abierta') && (Pa.coleccion.pico_padre || Pa.bandera('viejo_pico')) && !Pa.bandera('tejon_pico')) return {lineas: TEJON_PICO(), fin: () => Pa.ponerBandera('tejon_pico')};
      return {lineas: azar(Pa.bandera('ascensor_pozo1_fino') ? TEJON_DESPUES : TEJON_NADA), fin: null};
    }
    if(casa === 'mina5') return {lineas: VIEJO_MINA5, fin: () => Pa.ponerBandera('viejo_mina5')};
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
        Pa.cobrarCosas(e.pide);
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
    // flor de mina de un color nuevo: escaleras, puntales y un aspecto para el armario
    const fc = Pa.florNueva && Pa.florNueva();
    if(fc) return {lineas: CONEJA_COLOR(fc), fin: () => Pa.entregarFlorColor(fc.id)};
    // con un hongo luminoso en la colección: la coneja te manda a la herboristería
    if(!Pa.bandera('coneja_hongo') && (Pa.coleccion.hongo_azul || 0) > 0) return {lineas: CONEJA_HONGO, fin: () => Pa.ponerBandera('coneja_hongo')};
    return {lineas: azar(Pa.bandera('flor_entregada') ? CONEJA_DESPUES : CONEJA_ESPERA), fin: null};
  }
  return { alEntrar };
})();
