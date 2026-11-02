// =====================================================================
//  DATOS DEL JUEGO
//  Todos los números y textos que se pueden ajustar sin tocar el código.
//  Cambia un valor, guarda y recarga la página.
// =====================================================================
window.DATOS = {

  // Versión del juego: sale en el menú para saber si has cargado la última
  version: '0.214',

  // Pantalla. calidad 0 = resolución completa del móvil (movimiento suave; lo normal).
  // 1 o 2 = la mina se dibuja con menos píxeles: más ligero en móviles lentos, pero el movimiento va a saltos.
  pantalla: { calidad: 0 },

  // ---------- Ascensor del Pozo viejo ----------
  // Lo arregla el tejón: primero lo deja «apañado» (solo sube) y, si le llevas estos materiales, «fino» (baja y sube cuando quieras)
  ascensor: {
    fino: { carbon: 6, cobre: 3 },              // lo que pide el tejón para dejarlo fino (poco: una bajada). La arcilla es solo la moneda de la tienda
    primeraCarga: 5,                             // la primera vez (con la pieza) solo sube con esta carga: el resto se queda abajo
  },

  // ---------- Montacargas ----------
  // Cada montacargas pide los minerales del tramo de justo encima de su sala: cobre y carbón si salen ahí (nunca arcilla,
  // que es la moneda de la tienda, ni cuarzo, que es muy escaso). Si en ese tramo solo hay carbón, pide «soloCarbon».
  //   cantidades: lo que pide del más valioso y del segundo · crece: cuánto más pide cada montacargas que el anterior
  //   kit: el tejón fabrica un kit de reparación para un montacargas concreto que ya hayas visto (uno cada vez);
  //        cuesta «kit» veces lo que pide ese montacargas abajo (redondeando hacia arriba)
  montacargas: { cantidades: [3, 4], soloCarbon: 5, crece: 1, kit: 1.5 },

  // ---------- Aceite ----------
  // Los bidones se reparten por tramos: en los tramos cortos no hay; en los largos, entre «minimo» y «maximo» al azar.
  aceite: { desdeLargo: 20, minimo: 1, maximo: 2 },

  // ---------- Daño por caída ----------
  caida: { arena: 0.25 },      // caer sobre arena hace esta parte del daño; caer en agua o barro (media casilla o más) no hace daño

  // ---------- Brasas (pozo del agua) ----------
  brasas: { quema: 9 },        // % de lámpara por segundo mientras pisas brasas encendidas (el agua las apaga)

  // ---------- Arena ----------
  arena: { caeCadaTicks: 2 },  // la arena se mueve un paso de cada tantos de la simulación (más despacio = se ve derramarse)

  // ---------- Mochila ----------
  // Se llena según lo que vale cada material (arcilla y carbón 1, cobre 2...). No frena: el drama es no poder coger más.
  // Con la mochila llena, lo que picas se pierde. El material se suelta solo en las salas seguras.
  mochila: { capacidad: 35 },

  // ---------- Herramientas ----------
  herramientas: {
    inicial: { puntales: 15, escaleras: 9 },       // con lo que empieza una partida nueva
    minimoPorBajada: { puntales: 1, escaleras: 1 },  // al empezar cada bajada tienes al menos esto (lo que gastas se queda en la mina: puedes volver a recogerlo)
    // Las herramientas se guardan en el almacén. En cada bajada te llevas esta cifra (si las tienes; si no, todas) y el resto
    // se queda arriba a salvo. Lo que encuentras abajo se suma sin límite y se arriesga en esa bajada. (Más adelante, una mejora del tejón la sube.)
    llevarPorBajada: { puntales: 12, escaleras: 8 },
    recogerPuntales: true,                          // pulsar Puntal encima de un puntal (o dentro de un tablón) lo recoge. Más adelante lo enseñará el topo viejo
    alMorir: 'perder',                              // 'perder' = se quedan en tu mochila, enterrada donde mueres (recupérala y vuelven); 'conservar' = no pierdes nada
  },

  // ---------- Salas seguras ----------
  salas: {
    radioLlama: 1.5,           // casillas alrededor de la antorcha en las que se recarga la lámpara
    columnasLlama: [1, 13],    // dónde está cada cosa dentro de la sala (columna 0 a 14): una antorcha a cada lado
    columnaRuleta: 7,
    columnaCofre: 11,          // (el montacargas, si hay, va en la columna 14: al borde de la sala)
    // cofre de suministros: uno por sala, se abre una vez por pozo (se vuelve a llenar cuando el pozo se regenere)
    cofre: {
      base: { escaleras: 2, puntales: 2 },
      extras: [                // cada extra sale con su probabilidad
        { prob: 0.35, llaves: 1, texto: '+1 llave' },
        { prob: 0.3, escaleras: 2, texto: '+2 escaleras' },
        { prob: 0.2, puntales: 2, texto: '+2 puntales' },
      ],
    },
    ruletaCada: 2,             // una ruleta de cartas cada tantas salas (gira una vez por bajada)
    // tiempos de la ruleta (milisegundos): cada carta cambia cada vez más despacio hasta pararse
    ruleta: { pasos: 18, msInicial: 50, msFinal: 320, curva: 2.5, escalonado: 5 },
  },

  // ---------- Cartas de la ruleta ----------
  // Se acumulan durante la bajada y se pierden al volver al principio del pozo (cobrar o morir).
  // peso = probabilidad relativa; unica = solo se puede tener una; las demás se acumulan (cargas).
  cartas: [
    { id: 'mecha_cera',    icono: '🕯️', nombre: 'Mecha de cera',       texto: 'La lámpara gasta un 25 % menos.', valor: 0.75, peso: 1, unica: true },
    { id: 'bidon_grande',  icono: '🛢️', nombre: 'Bidón grande',        texto: 'El aceite da el doble de luz.', valor: 2, peso: 1, unica: true },
    { id: 'llama_fria',    icono: '🧊', nombre: 'Llama fría',          texto: 'La próxima explosión de grisú no ocurre.', peso: 1 },
    { id: 'segunda',       icono: '💖', nombre: 'Segunda oportunidad', texto: 'La próxima vez que mueras, vuelves a la última sala segura con tu mochila.', peso: 0.5 },
    { id: 'casco',         icono: '⛑️', nombre: 'Casco reforzado',     texto: 'Aguantas una piedra encima, una vez.', peso: 0.8 },
    { id: 'pulmones',      icono: '🫧', nombre: 'Pulmones de topo',    texto: 'El aire bajo el agua o el barro dura el doble.', peso: 0.8, unica: true },
    { id: 'reflejos',      icono: '⚡', nombre: 'Reflejos',            texto: 'Al librarte por los pelos no te quedas tumbado.', peso: 0.8, unica: true },
    { id: 'pico_afilado',  icono: '⛏️', nombre: 'Pico afilado',        texto: 'Un golpe menos para romper cualquier cosa (mínimo uno).', peso: 1, unica: true },
    { id: 'recuperador',   icono: '♻️', nombre: 'Recuperador',         texto: 'Lo que cae y se rompe tiene un 50 % de conservar su material.', valor: 0.5, peso: 0.8, unica: true },
    { id: 'zahori',        icono: '🧭', nombre: 'Zahorí',              texto: 'Una flecha te indica el aceite más cercano.', peso: 0.8, unica: true },
    { id: 'mochila_cuero', icono: '🎒', nombre: 'Mochila de cuero',    texto: 'En la mochila cabe un 50 % más.', valor: 1.5, peso: 1, unica: true },
    { id: 'bolsillo',      icono: '👖', nombre: 'Bolsillo secreto',    texto: 'Si mueres, el material que más vale de tu mochila llega igualmente al almacén.', peso: 0.7, unica: true },
    { id: 'carpintero',    icono: '🪜', nombre: 'Carpintero',          texto: 'Cada 10 m que bajas te dan una escalera.', valor: 10, peso: 1, unica: true },
    { id: 'codicia',       icono: '💰', nombre: 'Codicia',             texto: 'Cada mineral que picas cuenta doble, pero la lámpara gasta un 25 % más.', valor: 1.25, peso: 0.6, unica: true },
  ],

  // ---------- Tienda del pueblo ----------
  // La arcilla es la moneda de la tienda: ningún objetivo, montacargas ni kit la pide.
  // precio: material -> cantidad. Materiales: arcilla, carbon, cobre, cuarzo
  tienda: [
    { id: 'puntal',   nombre: 'Puntal',   texto: 'Sostiene el techo.',     da: { puntales: 1 },  precio: { arcilla: 2 } },
    { id: 'escalera', nombre: 'Escalera', texto: 'Para subir escalones.',  da: { escaleras: 1 }, precio: { arcilla: 1 } },
  ],

  // ---------- Lámpara ----------
  lampara: {
    consumo: 0.8,              // % por segundo con la mecha alta
    multMechaBaja: 0.5,        // la mecha baja gasta esto (x consumo)
    multMojada: 3,             // dentro del agua gasta esto (x consumo)
    costeGolpe: 0.1,           // % por cada golpe de pico
    recargaSala: 60,           // % por segundo dentro de una sala segura
    aceite: 35,                // % que da cada bidón de aceite
    radioMin: 1.8,             // radio de luz (casillas) con la lámpara a 0
    radioMax: 7.4,             // radio de luz (casillas) con la lámpara a 100
    multRadioMechaBaja: 0.22,  // la mecha baja reduce el radio a esto (tiene que notarse: con la mecha baja se ve muy poco)
    luzMechaBaja: 0.42,        // y la luz es más débil (1 = igual que con la mecha alta)
    // brillo de lo que hay tirado por la mina (aceite, cofres, objetos…): solo se ve de cerca, no ilumina la estancia
    brilloAceite: { radio: 0.9, intensidad: 0.3 },
    brilloObjetos: { radio: 1.2, intensidad: 0.35 },
  },

  // ---------- Jugador ----------
  jugador: {
    tiempoPaso: 0.15,          // segundos por casilla al andar
    pesoQueFrena: 40,          // cuanto más alto, menos frena el peso (tiempo = paso * (1 + peso/este))
    velocidadCaida: 13,        // casillas por segundo al caer
    tiempoGolpe: 0.17,         // segundos entre golpes de pico
    aturdidoPorLosPelos: 0.9,  // segundos tumbado al librarse de una piedra
    sepultadoEn: 6,            // segundos con arena encima hasta morir (se recupera al salir de debajo)
    controlEnCaida: 0.12,      // segundos entre cada paso lateral mientras caes (0 = sin control en el aire)
    caidaLargaDesde: 3,        // casillas cayendo a partir de las que pone cara de susto
  },

  // ---------- Estructura y derrumbes ----------
  estructura: {
    cornisa: 3,                // casillas que aguanta un techo en voladizo (sujeto por un lado). Sujeto por los dos lados (puente) aguanta el doble
    tiempoCrujido: 0.8,        // segundos que cruje antes de caer
    escombroSiCaeDesde: 3,     // se rompe en escombro si cae desde estas casillas o más...
    escombroSiCaenJuntos: 5,   // ...o si el derrumbe tiene estos bloques o más
    // la roca dura, la maciza y la roca madre siempre sujetan; un puntal sujeta aunque le quiten el suelo
    maxEscombroPorGolpe: 300,  // un golpe quita como mucho este escombro conectado
  },

  // ---------- Materiales ----------
  // golpes: dureza. valor: peso en la mochila (0 = no vale nada, ni se cuenta)
  // fragilidad: casillas que se suman (o restan) a la caída que lo rompe en escombro. El cuarzo se rompe con nada; el carbón aguanta
  materiales: {
    tierra:   { nombre: 'Tierra',      golpes: 1, valor: 0 },
    piedra:   { nombre: 'Piedra',      golpes: 2, valor: 0 },
    rocaDura: { nombre: 'Roca dura',   golpes: 5, valor: 0 },
    arena:    { nombre: 'Arena',       golpes: 1, valor: 0 },
    arenaArcillosa: { nombre: 'Arena arcillosa', golpes: 1, valor: 0 },   // como la arena, pero con agua se vuelve barro
    escombro: { nombre: 'Escombro',    golpes: 1, valor: 0 },
    arcilla:  { nombre: 'Arcilla',     golpes: 1, valor: 1, color: '#d9a066' },
    carbon:   { nombre: 'Carbón',      golpes: 2, valor: 1, color: '#3f3f74', fragilidad: 2 },
    cobre:    { nombre: 'Cobre',       golpes: 3, valor: 2, color: '#df7126', fragilidad: 0 },
    cuarzo:   { nombre: 'Cuarzo',      golpes: 2, valor: 1, color: '#cbdbfc', fragilidad: -2 },
  },

  // ---------- Peligros ----------
  peligros: {
    grisuLuz: 35,              // % de lámpara que quita una explosión de grisú
    grisuAviso: 2,             // casillas de distancia a las que la llama se pone azul
    polillaLuz: 20,            // % de lámpara que roba una polilla
    polillaVelocidad: 2.4,     // casillas por segundo al perseguir tu luz
    polillaMechaBaja: 0.45,    // con la mecha baja van a esta parte de su velocidad
    polillaVista: 1.6,         // te ven si estás a menos de (radio de tu luz x esto) y en línea recta, sin nada en medio
  },

  // ---------- Aire ----------
  // Bajo la superficie del agua o del barro (tu casilla llena y la de encima también) empieza la cuenta atrás.
  aire: {
    segundos: 10,              // aire que tienes
    conPulmones: 20,           // con la carta Pulmones de topo
    recupera: 4,               // segundos de aire que recuperas por cada segundo fuera
  },

  // ---------- Barro ----------
  // Se forma cuando el agua toca arena arcillosa (la arena normal no). No es sólido: te metes dentro, te frena y te hundes despacio.
  barro: {
    pasoMult: 3,               // andar dentro del barro cuesta esto (x tiempo de paso)
    hundimiento: 0.8,          // casillas por segundo que te hundes
    multLuz: 3,                // dentro del barro la lámpara gasta esto (x consumo)
    aguaQueGasta: 0.5,         // agua (de 0 a 1 casilla) que se gasta en convertir una arena en barro
    caeCadaTicks: 3,           // el barro se mueve despacio: cae una vez de cada tantos pasos de simulación
    escurreCadaTicks: 6,       // ...y se escurre de lado una vez de cada tantos
    rocaEnBarro: 3,            // velocidad máxima (casillas/s) de un bloque que cae dentro del barro (no se rompe)
  },

  // ---------- Muerte ----------
  muerte: {
    piedraEnRelleno: 0.5,      // 0 = todo escombro; 1 = todo piedra. Mezcla del tramo que se derrumba al morir
  },

  // ---------- Herramientas tiradas por la mina ----------
  // Escaleras y puntales sueltos que se recogen al pasar por encima.
  // Vuelven a aparecer en cada bajada nueva (si su hueco quedó tapado, salen al picarlo).
  recogibles: {
    cada: 9,                   // una cada tantas filas (aprox.)
    desdeFila: 6,              // no aparecen en las primeras filas del pozo
    probPuntal: 0.45,          // probabilidad de que sea un puntal (si no, escalera)
    cantidad: 1,               // cuántas da cada una
    regenerar: true,           // reaparecen al empezar otra bajada
  },

  // ---------- Agua ----------
  // El agua conserva su volumen: si encuentra hueco se reparte y baja de nivel.
  agua: {
    nivelMinimo: 0.05,         // se extiende hasta láminas de este grosor (de 0 a 1 casilla). El agua nunca desaparece: se conserva siempre
    diferenciaMinima: 0.02,    // diferencia de nivel por debajo de la cual deja de moverse (evita temblores)
    mojaLamparaDesde: 0.5,
    salasSecan: 0.3,           // nivel que pierde por segundo el agua dentro de una sala segura (no pasa de un tramo al siguiente)     // el agua solo gasta más lámpara cuando llega a esta altura del topo (media altura)
    ahogaDesde: 0.7,           // el aire empieza a contar cuando el agua de tu casilla llega a este nivel (te cubre la cabeza)
  },

  // ---------- Llaves, puertas y salas de bonus ----------
  llaves: { cada: 24, desdeFila: 10 },             // una llave suelta cada tantas filas (aprox.); no reaparecen
  puertas: { cada: 20, desdeFila: 14 },            // una puerta en un lateral cada tantas filas (aprox.)
  salaBonus: {
    // cofres especiales (salas de bonus tras una puerta con llave y fondo de los ramales): sale uno al azar.
    // Minerales caros o un coleccionable; nunca escaleras ni puntales. Cada pozo puede tener su lista (cofreEspecial).
    premios: [
      { texto: '5 de cobre', material: { cobre: 5 } },
      { texto: '3 de cuarzo', material: { cuarzo: 3 } },
      { texto: '3 de cobre y 4 de carbón', material: { cobre: 3, carbon: 4 } },
      { texto: 'Una flor de mina', objeto: 'flor_mina' },
    ],
  },

  // ---------- Al volver del pueblo ----------
  // Los túneles que abriste por debajo de la primera sala segura se rellenan.
  // Proporciones del relleno (se reparten solas aunque no sumen 1).
  vuelta: {
    rellenar: true,
    relleno: { escombro: 0.45, piedra: 0.4, rocaDura: 0.15 },
  },

  // ---------- Sonido ----------
  sonido: {
    activado: true,
    volumen: 0.6,              // 0 a 1
  },

  // ---------- Temblor de pantalla ----------
  temblor: {
    porBloque: 0.35,           // píxeles por cada bloque cayendo o crujiendo
    maximo: 3,                 // píxeles como mucho
    alAterrizar: 2.5,          // golpe de temblor al caer tú desde lejos
  },

  // ---------- Cámara ----------
  camara: {
    zoomCerca: 3,              // en la superficie y en las salas seguras
    zoomExplorar: 2,           // mientras excavas (1 = ver todo el ancho)
    velocidadAcercar: 2.5,     // cuanto mayor, más rápido se acerca
    velocidadAlejar: 0.6,      // cuanto mayor, más rápido se aleja
    seguirLateral: 5,          // suavidad del scroll lateral
    zoomVer: 0.6,              // botón «Ver»: aleja la cámara para mirar (menos de 1 = ver más que la pantalla)
  },

  // ---------- Mapa: las minas alrededor del pueblo ----------
  // boca: dónde está su entrada en la imagen del mapa (píxeles de js/escenarios.js, 286x512). Cada mina tiene su zona
  // del mapa alrededor (la más cercana a su boca): al abrir su respiradero (llegar al fondo), esa zona reverdece.
  mapa: { pueblo: [150, 280], viejo: [222, 150] },
  minas: [
    { id: 1, boca: [147, 212], nombre: 'Pozo viejo',          abierta: true,  pozo: 'uno',     texto: 'Simulacro del primer pozo: cinco tramos, poca arena y poca agua, sin grisú. Arcilla, carbón y algo de cobre, y flores de mina. Al fondo, un ascensor viejo.' },
    { id: 2, boca: [255, 90], nombre: 'Cantera del molino',  abierta: false, pozo: 'dos', desbloqueo: { carbon: 25, cobre: 12 },
      texto: 'Prototipo del segundo pozo: más largo que el primero, con dos ramales, algo de agua y de barro al final, puertas con llave, cuarzo y hongos luminosos. Está cerrada: se abre con carbón y cobre del Pozo viejo.' },
    { id: 3, boca: [248, 245], nombre: 'Galería del río',     abierta: false, pozo: 'tres', desbloqueo: { carbon: 40, cobre: 30, cuarzo: 3 },
      texto: 'El pozo del agua: galerías inundadas, pozas hondas y aire que hay que vigilar. Tiene una noria vieja y una galería de la cuadrilla. Está cerrada: se abre con materiales de la Cantera del molino.' },
    { id: 4, boca: [150, 475], nombre: 'Mina de los cuervos', abierta: false, texto: 'Próximamente.' },
    { id: 5, boca: [267, 150], nombre: 'El socavón del viejo', abierta: false, texto: 'Junto a la casa del viejo topo. Próximamente.' },
    { id: 6, boca: [22, 407], nombre: 'Cueva de las arenas', abierta: false, texto: 'Próximamente.' },
    { id: 7, boca: [30, 250], nombre: 'Pozo del grisú',      abierta: false, texto: 'Próximamente.' },
    { id: 8, boca: [37, 145], nombre: 'La sima',             abierta: false, texto: 'Próximamente.' },
    { id: 'S', boca: [145, 74], nombre: 'Pozo sin fondo',    abierta: true,  pozo: 'viejo',   texto: 'Vertical slice: un pozo sin fondo con lo básico (picar, la lámpara, los derrumbes, los puntales, la mochila y los montacargas) para probar la jugabilidad en sesiones largas.' },
    { id: 'P', boca: [52, 70], nombre: 'Pozo de pruebas',   abierta: true,  pozo: 'pruebas', texto: 'Banco de pruebas: aquí está todo lo que se va probando (agua, barro, grisú, polillas, cartas, puertas, ramal…).' },
  ],

  // ---------- Pozos ----------
  // Cada mina del mapa usa uno de estos pozos (campo «pozo» de la mina).
  //   contenido: qué cosas salen en ese pozo (false = no sale)
  //   tramos: los tramos entre salas seguras. Si hay «salasCada», después del primero se repiten sin fin tramos de ese largo.
  //   desdeTramo: a partir de qué tramo aparece cada cosa (0 = el primero)
  pozos: {
    // Simulacro del primer pozo (mina 1 del mapa): cinco tramos y un fondo con el ascensor, su pieza y el pico del padre.
    //   conFondo: el último tramo acaba en roca madre (y ahí va la pieza «fondo» de js/piezas.js)
    //   escasez: cuánto menos mineral sale (se suma al umbral de cada veta) · arenaUmbral / aguaUmbral: más alto = menos
    //   sueltos: objetos que aparecen sueltos en este pozo (solo estos)
    uno: {
      nombre: 'Pozo viejo',
      real: true,                  // pozo del juego (cuenta para la red de seguridad de materiales; los de prueba no)
      guardado: 'deep-pozo1',
      columnas: 15,
      tramos: [
        { nombre: 'Boca del pozo',      largo: 12 },
        { nombre: 'Galerías de arcilla', largo: 16 },
        { nombre: 'Vetas de carbón',    largo: 20 },
        { nombre: 'Cuevas húmedas',     largo: 24 },
        { nombre: 'El fondo',           largo: 28 },
      ],
      conFondo: true,
      altoSala: 4,
      aceiteCada: 9,
      escasez: 0.06,
      arenaUmbral: 0.86,
      aguaUmbral: 0.68,
      sueltos: { flor_mina: { cada: 22, desdeFila: 8 } },
      contenido: { grisu: false, barro: false, cartas: false, puertas: false, llaves: false, ramales: false, salaSellada: false },
      desdeTramo: { carbon: 2, cobre: 3, cuevas: 0, agua: 3, polillas: 2 },
    },
    // Vertical slice: pozo sin fondo con lo básico, para ver si la jugabilidad cruda aguanta 20 o 30 minutos
    viejo: {
      nombre: 'Pozo sin fondo',
      guardado: 'deep-pozoviejo',
      columnas: 15,
      tramos: [ { nombre: 'Boca del pozo', largo: 12 } ],
      salasCada: 14,               // filas del tramo que sigue al primero (una sala segura al final de cada uno)...
      salasCrece: 2,               // ...cada tramo tiene estas filas más que el anterior...
      salasMax: 40,                // ...hasta este largo como mucho
      nombresTramos: ['Galerías de tierra', 'Vetas de carbón', 'Piedra vieja', 'Filón de cobre', 'Roca profunda'],
      altoSala: 4,
      aceiteCada: 9,
      montacargasCada: 3,          // una sala de cada tantas tiene montacargas (para mandar la carga arriba y seguir bajando; su coste, en «montacargas»)
      contenido: { agua: false, grisu: false, polillas: false, barro: false, cartas: false, puertas: false, llaves: false,
                   ramales: false, objetos: false, salaSellada: false, piezas: false },
      desdeTramo: { carbon: 1, cuarzo: 3, cobre: 3, cuevas: 0 },
    },
    // Banco de pruebas: todo lo que se va probando. Salas sin fin y, a partir del cuarto tramo, tramos temáticos exagerados
    //   temas: se van turnando desde el tramo «temasDesde» (0 = el primero). Cada tema cambia umbrales del generador:
    //     arena (más bajo = más arena) · arcillosa (parte de la arena que hace barro) · cuevas (más bajo = más huecos)
    //     agua / gas (más bajo = más agua o grisú en los huecos) · polillas (probabilidad por hueco)
    pruebas: {
      nombre: 'Pozo de pruebas',
      guardado: 'pozoviejo-mina1',
      columnas: 15,
      tramos: [
        { nombre: 'Boca del pozo',   largo: 12 },
        { nombre: 'Vetas de carbón', largo: 16 },
        { nombre: 'Cuevas húmedas',  largo: 20 },
      ],
      salasCada: 24, salasCrece: 4, salasMax: 80,
      temasDesde: 3,
      temas: [
        { nombre: 'Tramo de arena',      arena: 0.5, arcillosa: 0 },
        { nombre: 'Tramo de barro',      arena: 0.58, arcillosa: 1, cuevas: 0.6, agua: 0.4 },
        { nombre: 'Tramo inundado',      cuevas: 0.5, agua: 0.25 },
        { nombre: 'Tramo de grisú',      cuevas: 0.55, gas: 0.3, agua: 0.9 },
        { nombre: 'Tramo de polillas',   cuevas: 0.45, agua: 0.9, gas: 0.9, polillas: 0.08 },
        { nombre: 'Tramo de cuevas',     cuevas: 0.4 },
      ],
      altoSala: 4,                 // filas de cada sala segura (techo + 2 de aire + suelo)
      salaSellada: { fila: 6, columna: 9, ancho: 5, alto: 4 },  // roca maciza con cofre (hace falta taladro)
      arenaArcillosa: 0.5,         // parte de la arena que es arcillosa (hace barro con el agua)
      montacargasCada: 2,
      aguaUltimaSeccion: true,     // en el banco de pruebas sí hay agua en la última sección
      ramales: [ { id: 'ramal1', nombre: 'Ramal del carbón', fila: 48, lado: 'izquierda', largo: 24 } ],
      contenido: {},               // todo
      // el desvío del tramo 2 es una pieza hecha a mano: está en js/piezas.js
      desdeTramo: { carbon: 1, cuarzo: 2, cobre: 3, cuevas: 0, gas: 1, agua: 2, polillas: 1 },
    },
    // Prototipo del segundo pozo (mina 2, la Cantera del molino): más grande y más complejo que el primero.
    // Siete tramos que crecen 4 filas, dos ramales (pozos paralelos) con su montacargas al fondo, grisú, barro,
    // puertas con llave, ruleta de cartas, montacargas y cuarzo. Se abre en el mapa pagando materiales del Pozo viejo.
    dos: {
      nombre: 'Cantera del molino',
      real: true,
      guardado: 'deep-pozo2',
      columnas: 15,
      tramos: [
        { nombre: 'Boca de la cantera',  largo: 16 },
        { nombre: 'Galerías del molino', largo: 20 },
        { nombre: 'Vetas negras',        largo: 24 },
        { nombre: 'Cuevas húmedas',      largo: 28 },
        { nombre: 'Galerías hondas',     largo: 32 },
        { nombre: 'Cuarzo y cobre',      largo: 36 },
        { nombre: 'Lo más hondo',        largo: 40 },
      ],
      conFondo: true,
      altoSala: 4,
      escasez: 0.02,
      arenaArcillosa: 0.12,        // poca: solo algún charco de barro como aviso (el barro de verdad tendrá su propio pozo)
      montacargasCada: 2,
      sueltos: { flor_mina: { cada: 30, desdeFila: 20 }, hongo_azul: { cada: 45, desdeFila: 30 }, lampara_vieja: { cada: 60, desdeFila: 30 }, foto_cuadrilla: { cada: 90, desdeFila: 60 } },
      sueltosRamal: { hongo_azul: { cada: 7, desdeFila: 4 }, flor_mina: { cada: 15, desdeFila: 8 } },   // en los ramales, más coleccionables propios del pozo
      cofreEspecial: [
        { texto: '4 de cuarzo', material: { cuarzo: 4 } },
        { texto: '6 de cobre', material: { cobre: 6 } },
        { texto: '3 de cuarzo y 3 de cobre', material: { cuarzo: 3, cobre: 3 } },
        { texto: 'Dos hongos luminosos y 2 de cuarzo', objeto: 'hongo_azul', cantidadObjeto: 2, material: { cuarzo: 2 } },
      ],
      ramales: [
        { id: 'molino_a', nombre: 'Galería de los carros', fila: 30, lado: 'izquierda', largo: 30 },
        { id: 'molino_b', nombre: 'Tiro de los cuervos',   fila: 85, lado: 'derecha',   largo: 40 },
      ],
      contenido: { salaSellada: false, grisu: false },   // sin grisú: irá en un pozo propio
      desdeTramo: { carbon: 0, cobre: 2, cuarzo: 3, cuevas: 0, agua: 1, polillas: 1, barro: 5 },
    },
    // Pozo 3 (mina 3, la Galería del río): el pozo del agua. Largo parecido al 2, con mucha agua y pozas.
    // Piezas propias (js/piezas.js): la noria (hay que llevarle agua para que abra una compuerta) y las brasas
    // (queman la lámpara hasta que las inundas). Dos ramales: la galería del abismo (un precipicio que no se puede
    // cruzar todavía: hará falta el salto u otra habilidad) y la galería de la cuadrilla (ya entibada por ellos).
    tres: {
      nombre: 'Galería del río',
      real: true,
      guardado: 'deep-pozo3',
      columnas: 15,
      tramos: [
        { nombre: 'Boca del río',        largo: 16 },
        { nombre: 'Filtraciones',        largo: 20 },
        { nombre: 'La noria vieja',      largo: 24 },
        { nombre: 'Pozas hondas',        largo: 28 },
        { nombre: 'Las brasas',          largo: 30 },
        { nombre: 'Galerías anegadas',   largo: 32 },
        { nombre: 'El lecho del río',    largo: 36 },
      ],
      conFondo: true,
      altoSala: 4,
      escasez: 0.02,
      arenaUmbral: 0.84,
      aguaUmbral: 0.5,             // mucha agua en los huecos, pero en masas no tan grandes...
      aguaEscala: 4,               // ...(más pequeño = charcas más pequeñas; normal 5)
      cuevasUmbral: 0.64,          // más cuevas (normal 0.7): muchas quedan secas y sirven para llevar el agua
      montacargasCada: 2,
      sueltos: { flor_mina: { cada: 30, desdeFila: 16 }, hongo_azul: { cada: 40, desdeFila: 20 }, lampara_vieja: { cada: 70, desdeFila: 40 } },
      sueltosRamal: { hongo_azul: { cada: 10, desdeFila: 4 }, flor_mina: { cada: 18, desdeFila: 6 } },
      cofreEspecial: [
        { texto: '5 de cuarzo', material: { cuarzo: 5 } },
        { texto: '7 de cobre', material: { cobre: 7 } },
        { texto: '4 de cuarzo y 4 de cobre', material: { cuarzo: 4, cobre: 4 } },
        { texto: 'Tres hongos luminosos y 3 de cuarzo', objeto: 'hongo_azul', cantidadObjeto: 3, material: { cuarzo: 3 } },
      ],
      ramales: [
        { id: 'rio_abismo',    nombre: 'Galería del abismo',     fila: 35, lado: 'izquierda', largo: 40 },
        { id: 'rio_cuadrilla', nombre: 'Galería de la cuadrilla', fila: 90, lado: 'derecha',   largo: 44 },
      ],
      contenido: { salaSellada: false, grisu: false, barro: false },
      desdeTramo: { carbon: 0, cobre: 1, cuarzo: 2, cuevas: 0, agua: 0, polillas: 2 },
    },
  },

  // ---------- Ramales (tiros secundarios) ----------
  // Un ramal es otro tiro al que se pasa por un pasadizo (con fundido a negro). Solo el tiro principal llega al fondo;
  // los ramales son callejones con premio. fila = profundidad de la boca del pasadizo en el tiro principal.
  ramales: [
    { id: 'ramal1', nombre: 'Ramal del carbón', fila: 48, lado: 'izquierda', largo: 24 },
  ],

  // ---------- Objetos y colección ----------
  // Cosas que se recogen en la mina. Van a la mochila (si mueres se quedan en ella) y al subir pasan a la colección.
  // categoria: herbario · bestiario · mineralogia · mineria (secciones del futuro museo).
  // suelto: aparecen sueltos por la mina, uno cada tantas filas (aprox.), a partir de desdeFila. Sin «suelto» solo salen en piezas.
  objetos: {
    flor_mina:      { nombre: 'Flor de mina', plural: 'flores de mina',       categoria: 'herbario', icono: '🌸', dibujo: 'flor',     brilla: true, suelto: { cada: 28, desdeFila: 8 },
                      texto: 'Una flor que brilla en la oscuridad. Solo crece en lo hondo de las minas.' },
    lampara_vieja:  { nombre: 'Lámpara de carburo', categoria: 'mineria',  icono: '🏮', dibujo: 'reliquia', suelto: { cada: 45, desdeFila: 16 },
                      texto: 'Una lámpara de la época dorada de las minas. Ya no alumbra.' },
    foto_cuadrilla: { nombre: 'Foto de una cuadrilla', categoria: 'mineria', icono: '🖼️', dibujo: 'reliquia', suelto: { cada: 70, desdeFila: 30 },
                      texto: 'Varios topos mineros posan a la entrada del pozo. Uno se parece mucho a ti.' },
    pico_padre:     { nombre: 'Pico con un símbolo', categoria: 'mineria', icono: '⛏️', dibujo: 'pico', brilla: true,
                      texto: 'Un pico de topo minero, gastado de tanto uso. En el mango hay un símbolo grabado.' },
    hongo_azul:     { nombre: 'Hongo luminoso', plural: 'hongos luminosos', categoria: 'herbario', icono: '🍄', dibujo: 'hongo', brilla: true,
                      texto: 'Un hongo que da una luz azul y fría. Crece en las galerías húmedas de la Cantera del molino.' },
    nota_1:         { nombre: 'Nota de la cuadrilla (1)', categoria: 'mineria', icono: '📜', dibujo: 'nota',
                      texto: '«Tercer día bajo tierra. El derrumbe nos ha cerrado la galería. Somos seis. El respiradero de esta mina estaba casi tapado; cada vez es más difícil mantenerlos limpios…»' },
    nota_2:         { nombre: 'Nota de la cuadrilla (2)', categoria: 'mineria', icono: '📜', dibujo: 'nota',
                      texto: '«Hemos encontrado un paso entre las minas. Las galerías de los antiguos llegan mucho más lejos de lo que nadie sabía.»' },
    nota_3:         { nombre: 'Nota de la cuadrilla (3)', categoria: 'mineria', icono: '📜', dibujo: 'nota',
                      texto: '«Si alguien encuentra esto: no estamos perdidos. Estamos donde tenemos que estar. Cuidad del pueblo.»' },
    casco_cuadrilla: { nombre: 'Casco abollado', categoria: 'mineria', icono: '⛑️', dibujo: 'reliquia', brilla: true,
                      texto: 'Un casco de minero con el símbolo de la cuadrilla. Tiene una abolladura enorme, pero aguantó.' },
    pieza_ascensor: { nombre: 'Pieza del ascensor', categoria: 'mineria', icono: '⚙️', dibujo: 'pieza',
                      texto: 'Un engranaje grande, viejo pero entero. Parece del mecanismo de un ascensor.' },
  },

  // ---------- Herboristería de la ardilla ----------
  // La ardilla colecciona plantas de las minas. Sus encargos van uno detrás de otro; cada uno da una recompensa y
  // enseña a preparar un ungüento. Los ungüentos se compran con plantas y son de un solo uso: si llevas uno a la mina,
  // se gasta cuando hace efecto (si no hace falta, vuelve contigo).
  herboristeria: {
    encargos: [
      { id: 'hongos_1', nombre: 'Hongos luminosos', pide: { hongo_azul: 5 }, receta: 'pulmones', regalo: { pulmones: 1 },
        texto: 'Cinco hongos luminosos de la Cantera del molino.' },
      { id: 'flores_1', nombre: 'Un ramo de flores de mina', pide: { flor_mina: 15 }, receta: 'piel', regalo: { piel: 1 },
        texto: 'Quince flores de mina.' },
      { id: 'flores_2', nombre: 'El gran ramo', pide: { flor_mina: 25 }, receta: 'segunda', regalo: { segunda: 1 },
        texto: 'Veinticinco flores de mina.' },
    ],
    // carta: el efecto que da en la mina (el mismo que la carta de la ruleta con ese id)
    unguentos: {
      pulmones: { nombre: 'Ungüento de pulmones de topo', icono: '🫧', carta: 'pulmones', precio: { hongo_azul: 2 },
                  texto: 'El aire bajo el agua o el barro dura el doble durante una bajada. Se gasta al meterte bajo el agua.' },
      piel:     { nombre: 'Ungüento de piel dura',        icono: '🛡️', carta: 'casco',    precio: { flor_mina: 3 },
                  texto: 'Aguantas una piedra encima, una vez.' },
      segunda:  { nombre: 'Ungüento de segunda oportunidad', icono: '💖', carta: 'segunda', precio: { flor_mina: 4, hongo_azul: 2 },
                  texto: 'Si mueres, vuelves a la última sala segura con tu mochila. Una vez.' },
    },
  },

  // ---------- Pueblo: casas de la plaza ----------
  casas: [
    { id: 'tienda',   nombre: 'Tienda',          dueno: 'Señora Coneja',   tipo: 'tienda',  color: '#ac3232' },
    { id: 'almacen',  nombre: 'Almacén',         dueno: 'Tu almacén',    tipo: 'almacen', color: '#8f563b' },
    { id: 'herboristeria', nombre: 'Herboristería', dueno: 'La ardilla', tipo: 'herbolaria', color: '#6abe30' },
    { id: 'taller',   nombre: 'Taller del tejón', dueno: 'El tejón',     tipo: 'taller',  color: '#df7126' },
    { id: 'alcaldia', nombre: 'Ayuntamiento',    dueno: 'El alcalde',    tipo: 'vecino',  color: '#3f3f74' },
    { id: 'casa',     nombre: 'Casa de Deep',   dueno: 'Tu casa',       tipo: 'vecino',  color: '#37946e' },
    // cerradas al principio: el museo lo recuperará Deep; en las casas de paja irán llegando vecinos nuevos
    { id: 'museo',    nombre: 'Museo de minería', dueno: 'Cerrado',      tipo: 'cerrada', texto: 'El viejo museo de minería. Las puertas están clavadas con tablas y el letrero, comido por el polvo.' },
    { id: 'paja1',    nombre: 'Casa tapiada',   dueno: 'Nadie',         tipo: 'cerrada', texto: 'Las ventanas están tapadas con tablas. Hace años que aquí no vive nadie.' },
    { id: 'paja2',    nombre: 'Casa tapiada',   dueno: 'Nadie',         tipo: 'cerrada', texto: 'Una casita de paja con la puerta clavada. Alguien dejó unas macetas secas en la ventana.' },
    { id: 'paja3',    nombre: 'Casa tapiada',   dueno: 'Nadie',         tipo: 'cerrada', texto: 'Tapiada. Por una rendija se ven muebles cubiertos con sábanas.' },
  ],
};
