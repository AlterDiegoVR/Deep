// =====================================================================
//  DATOS DEL JUEGO
//  Todos los números y textos que se pueden ajustar sin tocar el código.
//  Cambia un valor, guarda y recarga la página.
// =====================================================================
window.DATOS = {

  // Versión del juego: sale en el menú para saber si has cargado la última
  version: '0.222d',

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
  // daño por caída (valores por defecto; en la mina se pueden cambiar en los ajustes)
  caida: { activado: true, desde: 4, lampara: 20, modo: 'crece', crece: 5, arena: 0.25 },      // caer sobre arena hace esta parte del daño; caer en agua o barro (media casilla o más) no hace daño

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
  // peso = probabilidad relativa (0 = ya no sale en la ruleta: es un ungüento de la ardilla); unica = solo se puede tener una; las demás se acumulan (cargas).
  cartas: [
    { id: 'mecha_cera',    icono: '🕯️', nombre: 'Mecha de cera',       texto: 'La lámpara gasta un 25 % menos.', valor: 0.75, peso: 1, unica: true },
    { id: 'bidon_grande',  icono: '🛢️', nombre: 'Bidón grande',        texto: 'El aceite da el doble de luz.', valor: 2, peso: 1, unica: true },
    { id: 'llama_fria',    icono: '🧊', nombre: 'Llama fría',          texto: 'La próxima explosión de gas no ocurre.', peso: 1 },
    { id: 'segunda',       icono: '💖', nombre: 'Segunda oportunidad', texto: 'La próxima vez que mueras, vuelves a la última sala segura con tu mochila.', peso: 0 },
    { id: 'casco',         icono: '⛑️', nombre: 'Casco reforzado',     texto: 'Aguantas una piedra encima, una vez.', peso: 0 },
    { id: 'pulmones',      icono: '🫧', nombre: 'Pulmones de topo',    texto: 'El aire bajo el agua o el barro dura el doble.', peso: 0, unica: true },
    { id: 'reflejos',      icono: '⚡', nombre: 'Reflejos',            texto: 'Al librarte por los pelos no te quedas tumbado.', peso: 0.8, unica: true },
    { id: 'pico_afilado',  icono: '⛏️', nombre: 'Pico afilado',        texto: 'Un golpe menos para romper cualquier cosa (mínimo uno).', peso: 1, unica: true },
    { id: 'recuperador',   icono: '♻️', nombre: 'Recuperador',         texto: 'Lo que cae y se rompe tiene un 50 % de conservar su material.', valor: 0.5, peso: 0.8, unica: true },
    { id: 'zahori',        icono: '🧭', nombre: 'Zahorí',              texto: 'Una flecha te indica el aceite más cercano.', peso: 0.8, unica: true },
    { id: 'mochila_cuero', icono: '🎒', nombre: 'Mochila de cuero',    texto: 'En la mochila cabe un 50 % más.', valor: 1.5, peso: 1, unica: true },
    { id: 'bolsillo',      icono: '👖', nombre: 'Bolsillo secreto',    texto: 'Si mueres, el material que más vale de tu mochila llega igualmente al almacén.', peso: 0.7, unica: true },
    { id: 'carpintero',    icono: '🪜', nombre: 'Carpintero',          texto: 'Cada 10 m que bajas te dan una escalera.', valor: 10, peso: 1, unica: true },
    { id: 'cera_nenufar',  icono: '🪷', nombre: 'Cera de nenúfar',     texto: 'La lámpara no se moja.', peso: 0, unica: true },
    { id: 'rodillas',      icono: '🦵', nombre: 'Rodillas de topo',    texto: 'Las caídas quitan la mitad de lámpara.', valor: 0.5, peso: 0, unica: true },
    { id: 'codicia',       icono: '💰', nombre: 'Codicia',             texto: 'Cada mineral que picas cuenta doble, pero la lámpara gasta un 25 % más.', valor: 1.25, peso: 0.6, unica: true },
  ],

  // ---------- Tienda del pueblo ----------
  // La arcilla es la moneda de la tienda: ningún objetivo, montacargas ni kit la pide.
  // precio: material -> cantidad. Materiales: arcilla, carbon, cobre, cuarzo
  tienda: [
    { id: 'puntal',   nombre: 'Puntal',   texto: '',     da: { puntales: 1 },  precio: { arcilla: 2 } },
    { id: 'escalera', nombre: 'Escalera', texto: '',  da: { escaleras: 1 }, precio: { arcilla: 1 } },
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
    latidoDesde: 25,           // por debajo de este % (fuera de las salas) suena un latido que se acelera y se oscurecen los bordes
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
    // un mineral nuevo por mina desde la 3 (salvo la 5 y la 10). El de cada mina sale más que los antiguos (ver «vetas» en cada pozo)
    hierro:   { nombre: 'Hierro',      golpes: 3, valor: 1, color: '#847e87', fragilidad: 0, mina: 3 },
    estano:   { nombre: 'Estaño',      golpes: 2, valor: 1, color: '#9badb7', mina: 4 },
    // preparados para las minas que aún no existen (todavía no salen en ningún pozo)
    plata:    { nombre: 'Plata',       golpes: 3, valor: 2, color: '#cbdbfc', mina: 6, futuro: true },
    azufre:   { nombre: 'Azufre',      golpes: 1, valor: 1, color: '#fbf236', fragilidad: -1, mina: 7, futuro: true },
    oro:      { nombre: 'Oro',         golpes: 4, valor: 3, color: '#fbf236', mina: 8, futuro: true },
    diamante: { nombre: 'Diamante',    golpes: 6, valor: 4, color: '#5fcde4', mina: 9, futuro: true },
  },

  // ---------- Peligros ----------
  peligros: {
    grisuLuz: 35,              // % de lámpara que quita una explosión de gas
    grisuAviso: 2,             // casillas de distancia a las que la llama se pone azul
    polillaLuz: 20,            // % de lámpara que roba una polilla
    polillaVelocidad: 2.4,     // casillas por segundo al perseguir tu luz
    polillaMechaBaja: 0.45,    // con la mecha baja van a esta parte de su velocidad
    polillaVista: 1.6,         // te ven si estás a menos de (radio de tu luz x esto) y en línea recta, sin nada en medio
  },

  // ---------- Hielo y murciélagos (mina 4) ----------
  hielo: {
    derriteAlta: 2.2,          // segundos que tarda en derretirse una casilla de hielo pegada a ti con la mecha alta
    derriteBaja: 30,           // ...y con la mecha baja (casi nada)
    radio: 1.6,                // casillas alrededor de la lámpara que se derriten (la de debajo de tus pies también)
    lamina: 0.3,               // agua que deja cada casilla derretida (de 0 a 1)
  },
  murcielago: {
    luz: 15,                   // % de lámpara que quita al tocarte
    despierta: 4.5,            // con la mecha baja, se despiertan si pasas a menos de estas casillas
    velocidad: 3,              // casillas por segundo volando
    despierto: 9,              // segundos que vuelan antes de volver a colgarse
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
  mapa: { pueblo: [150, 280], viejo: [222, 150],
    // caminos por los que anda el Deep pequeñito: puntos (píxeles del mapa) y tramos entre ellos. El tramo «oculto-sale» es el
    // sendero de la casa del viejo topo, que no se ve: Deep se mete detrás del peñasco y sale junto a la casa.
    nodos: {pueblo:[150,268], n1:[146,240], m1:[147,222], a1:[131,232], a2:[112,207], a3:[110,188], j1:[117,174], o8:[70,166], m8:[42,156], a4:[133,156], j2:[146,150], b1:[135,128], b2:[118,112], b3:[90,96], mP:[58,80], c1:[146,118], c2:[148,100], mS:[146,84], d1:[172,135], d2:[198,124], d3:[218,108], d4:[236,99], m2:[252,98], w1:[110,267], w2:[70,268], m7:[36,262], s1:[157,300], s2:[150,330], s3:[133,358], j3:[140,383], e1:[110,392], e2:[75,398], m6:[30,416], f1:[200,393], f2:[228,410], g1:[150,420], g2:[152,450], m4:[151,483], r1:[178,268], r2:[212,266], m3:[244,256], oculto:[178,205], sale:[212,172], v1:[222,166], casa:[225,160], h1:[245,168], m5:[265,160]},
    tramos: 'pueblo-n1 n1-m1 n1-a1 a1-a2 a2-a3 a3-j1 j1-o8 o8-m8 j1-a4 a4-j2 j2-b1 b1-b2 b2-b3 b3-mP j2-c1 c1-c2 c2-mS j2-d1 d1-d2 d2-d3 d3-d4 d4-m2 pueblo-w1 w1-w2 w2-m7 pueblo-s1 s1-s2 s2-s3 s3-j3 j3-e1 e1-e2 e2-m6 j3-f1 f1-f2 j3-g1 g1-g2 g2-m4 pueblo-r1 r1-r2 r2-m3 m1-oculto sale-v1 v1-casa v1-h1 h1-m5',
    oculto: ['oculto', 'sale'],
    velocidad: 70,             // píxeles del mapa por segundo
    // punto del camino donde se para Deep en cada mina, el pueblo y la casa del viejo
    paradas: {1:'m1', 2:'m2', 3:'m3', 4:'m4', 5:'m5', 6:'m6', 7:'m7', 8:'m8', S:'mS', P:'mP', pueblo:'pueblo', viejo:'casa'},
    // cuánto reverdece cada mina al abrir su respiradero (radio en píxeles alrededor de la boca, dentro de su zona);
    // la zona entera se completa cuando revive el pueblo
    verde: {1:34, 2:60, 3:70, 4:80, 5:90, 6:100, 7:110, 8:125, S:0, P:0},
    // la plaza del pueblo: parte de la imagen que reverdece con cada respiradero abierto (de 0 a 1; manda el más alto)
    plazaVerde: {1:0.03, 2:0.06, 3:0.15, 4:0.24, 5:0.34, 6:0.46, 7:0.6, 8:0.75, 9:0.9, 10:1},
  },
  minas: [
    { id: 1, boca: [147, 212], nombre: 'Pozo viejo',          abierta: true,  pozo: 'uno',     texto: 'Simulacro del primer pozo: cinco tramos, poca arena y poca agua, sin gas. Arcilla, carbón y algo de cobre, y flores de mina. Al fondo, un ascensor viejo.' },
    { id: 2, boca: [255, 90], nombre: 'Cantera del molino',  abierta: false, pozo: 'dos', desbloqueo: { carbon: 25, cobre: 12 },
      texto: 'Prototipo del segundo pozo: más largo que el primero, con dos ramales, algo de agua y de barro al final, puertas con llave, cuarzo y hongos luminosos. Está cerrada: se abre con carbón y cobre del Pozo viejo.' },
    { id: 3, boca: [248, 245], nombre: 'Galería del río',     abierta: false, pozo: 'tres', desbloqueo: { carbon: 40, cobre: 30, cuarzo: 3 },
      texto: 'El pozo del agua: galerías inundadas, pozas hondas y aire que hay que vigilar. Tiene una noria vieja y una galería de la cuadrilla. Está cerrada: se abre con materiales de la Cantera del molino.' },
    { id: 4, boca: [150, 475], nombre: 'Mina de los cuervos', abierta: false, pozo: 'cuatro', desbloqueo: { hierro: 30, cobre: 10 },
      texto: 'La mina del hielo: galerías heladas, una cascada congelada y el nido de los murciélagos. Estaño entre el hielo. Se abre con hierro de la Galería del río.' },
    { id: 5, boca: [267, 150], nombre: 'El socavón del viejo', abierta: false, texto: 'Junto a la casa del viejo topo. Próximamente.' },
    { id: 6, boca: [22, 407], nombre: 'Cueva de las arenas', abierta: false, texto: 'Próximamente.' },
    { id: 7, boca: [30, 250], nombre: 'Pozo del gas',        abierta: false, texto: 'Próximamente.' },
    { id: 8, boca: [37, 145], nombre: 'La sima',             abierta: false, texto: 'Próximamente.' },
    { id: 'S', boca: [145, 74], nombre: 'Pozo sin fondo',    abierta: true,  pozo: 'viejo',   texto: 'Vertical slice: un pozo sin fondo con lo básico (picar, la lámpara, los derrumbes, los puntales, la mochila y los montacargas) para probar la jugabilidad en sesiones largas.' },
    { id: 'P', boca: [52, 70], nombre: 'Pozo de pruebas',   abierta: true,  pozo: 'pruebas', texto: 'Banco de pruebas: aquí está todo lo que se va probando (agua, barro, gas, polillas, cartas, puertas, ramal…).' },
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
    //     agua / gas (más bajo = más agua o gas en los huecos) · polillas (probabilidad por hueco)
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
        { nombre: 'Tramo de gas',         cuevas: 0.55, gas: 0.3, agua: 0.9 },
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
    // Siete tramos que crecen 4 filas, dos ramales (pozos paralelos) con su montacargas al fondo, gas, barro,
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
      version: 1,                  // sube cuando cambia algo de este pozo que obliga a empezarlo de nuevo (solo este)
      // los coleccionables de la cuadrilla ya no salen sueltos: están en sitios fijos (piezas) y no se repiten
      sueltos: { flor_mina: { cada: 30, desdeFila: 20 }, hongo_azul: { cada: 45, desdeFila: 30 } },
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
      contenido: { salaSellada: false, grisu: false },   // sin gas: irá en un pozo propio
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
      version: 2,
      sueltos: { flor_mina: { cada: 30, desdeFila: 16 }, hongo_azul: { cada: 60, desdeFila: 20 } },
      // nenúfares: flotan en la superficie de las pozas (uno cada tantas pozas, más o menos)
      enAgua: { nenufar: { cada: 5, desdeFila: 10 } },
      // vetas: el mineral nuevo de la mina sale más que los demás; los antiguos, menos (umbral: más alto = menos)
      //   umbral (en su primer tramo) · umbralFinal (en el último) · escala (tamaño de las vetas) · desde (tramo)
      vetas: { hierro: { umbral: 0.83, umbralFinal: 0.755, escala: 2.2, desde: 1 } },   // poco al principio y más abajo: en total, 1,2-1,5 veces el carbón
      escasezVieja: 0.035,         // se suma al umbral del carbón y del cobre (salen menos que en las minas 1 y 2)
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
    // Pozo 4 (mina 4, la Mina de los cuervos): el pozo del hielo. El hielo resbala y se derrite con la lámpara
    // (deprisa con la mecha alta, casi nada con la baja) y deja una lámina de agua. El estaño sale a menudo dentro del hielo.
    // Murciélagos colgados en las cuevas: con la mecha baja se despiertan y vuelan como locos; si te tocan, te quitan luz.
    // Piezas propias (js/piezas.js): la cascada congelada, el campamento abandonado de la cuadrilla (ramal) y el fondo.
    cuatro: {
      nombre: 'Mina de los cuervos',
      real: true,
      guardado: 'deep-pozo4',
      columnas: 15,
      tramos: [
        { nombre: 'Boca nevada',            largo: 16 },
        { nombre: 'Galerías heladas',       largo: 22 },
        { nombre: 'La cascada congelada',   largo: 26 },
        { nombre: 'Hielo viejo',            largo: 28 },
        { nombre: 'El nido de los cuervos', largo: 30 },
        { nombre: 'Galerías de escarcha',   largo: 32 },
        { nombre: 'El fondo helado',        largo: 34 },
      ],
      conFondo: true,
      altoSala: 4,
      escasez: 0.03,
      escasezVieja: 0.05,          // el carbón y el cobre, aún menos
      arenaUmbral: 0.9,
      aguaUmbral: 0.75,            // poca agua suelta: la mayoría está helada
      cuevasUmbral: 0.68,
      montacargasCada: 2,
      // hielo: umbral en su primer tramo y en el último (más bajo = más hielo) · escala (tamaño de las placas)
      hielo: { umbral: 0.72, umbralFinal: 0.6, escala: 3.2, desde: 0 },
      // estaño: poco en la roca y mucho dentro del hielo («hielo»: umbral dentro del hielo)
      vetas: { estano: { umbral: 0.87, umbralFinal: 0.83, hielo: 0.72, escala: 2.2, desde: 1 } },
      // murciélagos colgados del techo de las cuevas (probabilidad por hueco con techo); en el nido, muchos más
      murcielagos: { prob: 0.05, desde: 1, tramos: { 4: 0.3 } },
      sueltos: { flor_mina: { cada: 30, desdeFila: 14 }, campanilla: { cada: 24, desdeFila: 8 } },
      sueltosRamal: { campanilla: { cada: 9, desdeFila: 4 }, flor_mina: { cada: 16, desdeFila: 6 } },
      cofreEspecial: [
        { texto: '6 de estaño', material: { estano: 6 } },
        { texto: '5 de hierro y 3 de estaño', material: { hierro: 5, estano: 3 } },
        { texto: '4 de cuarzo y 4 de estaño', material: { cuarzo: 4, estano: 4 } },
        { texto: 'Dos campanillas de nieve y 3 de estaño', objeto: 'campanilla', cantidadObjeto: 2, material: { estano: 3 } },
      ],
      ramales: [
        { id: 'hielo_campamento', nombre: 'El campamento helado', fila: 70, lado: 'derecha', largo: 30 },
      ],
      contenido: { salaSellada: false, grisu: false, barro: false },
      desdeTramo: { carbon: 1, cobre: 2, cuarzo: 3, cuevas: 0, agua: 2, polillas: 9 },
    },
  },

  // roca maciza con el taladro del tejón: golpes que hacen falta
  taladro: { golpes: 6 },

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
    lampara_vieja:  { nombre: 'Lámpara de carburo', categoria: 'mineria',  icono: '🏮', dibujo: 'reliquia', unico: true,   // al fondo de la Galería de los carros (mina 2)
                      texto: 'Una lámpara de la época dorada de las minas. Ya no alumbra.' },
    foto_cuadrilla: { nombre: 'Foto de una cuadrilla', categoria: 'mineria', icono: '🖼️', dibujo: 'reliquia', unico: true,   // al fondo del Tiro de los cuervos (mina 2)
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
    nota_4:         { nombre: 'Nota de la cuadrilla (4)', categoria: 'mineria', icono: '📜', dibujo: 'nota',
                      texto: '«Acampamos en el hielo, esperando a que pase la tormenta de dentro. El viejo dice que el socavón junto a su casa baja hasta el corazón de la montaña. Mañana entramos por ahí. Si no volvemos…»' },
    casco_cuadrilla: { nombre: 'Casco abollado', categoria: 'mineria', icono: '⛑️', dibujo: 'reliquia', brilla: true,
                      texto: 'Un casco de minero con el símbolo de la cuadrilla. Tiene una abolladura enorme, pero aguantó.' },
    nenufar:        { nombre: 'Nenúfar', plural: 'nenúfares', categoria: 'herbario', icono: '🪷', dibujo: 'nenufar', brilla: true, mina: 3,
                      texto: 'Una hoja redonda con una flor pálida que brilla un poco. Flota en las pozas de la Galería del río.' },
    campanilla:     { nombre: 'Campanilla de nieve', plural: 'campanillas de nieve', categoria: 'herbario', icono: '❄️', dibujo: 'campanilla', brilla: true, mina: 4,
                      texto: 'Una florecilla blanca que asoma entre el hielo. Crece en la Mina de los cuervos.' },
    taladro_viejo:  { nombre: 'Taladro viejo', categoria: 'mineria', icono: '🔩', dibujo: 'reliquia',
                      texto: 'El taladro de la vitrina del museo, de la época dorada. Está oxidado, pero el tejón dice que tiene arreglo.' },
    pieza_ascensor: { nombre: 'Pieza del ascensor', categoria: 'mineria', icono: '⚙️', dibujo: 'pieza',
                      texto: 'Un engranaje grande, viejo pero entero. Parece del mecanismo de un ascensor.' },
  },

  // ---------- Herboristería de la ardilla ----------
  // La ardilla colecciona plantas de las minas. Sus encargos van uno detrás de otro; cada uno da una recompensa y
  // enseña a preparar un ungüento. Los ungüentos se compran con plantas y son de un solo uso: si llevas uno a la mina,
  // se gasta cuando hace efecto (si no hace falta, vuelve contigo).
  herboristeria: {
    huecos: 2,                 // ungüentos que puedes llevar a la vez a una bajada (se eligen aquí antes de bajar)
    encargos: [
      { id: 'hongos_1', nombre: 'Hongos luminosos', pide: { hongo_azul: 5 }, receta: 'pulmones', regalo: { pulmones: 1 },
        texto: 'Cinco hongos luminosos de la Cantera del molino.' },
      { id: 'flores_1', nombre: 'Un ramo de flores de mina', pide: { flor_mina: 15 }, receta: 'piel', regalo: { piel: 1 },
        texto: 'Quince flores de mina.' },
      { id: 'flores_2', nombre: 'El gran ramo', pide: { flor_mina: 25 }, receta: 'segunda', regalo: { segunda: 1 },
        texto: 'Veinticinco flores de mina.' },
      { id: 'nenufares_1', nombre: 'Nenúfares del río', pide: { nenufar: 4 }, receta: 'cera', regalo: { cera: 1 }, mina: 3,
        texto: 'Cuatro nenúfares de la Galería del río.' },
      // mina 4 (preparado): rodillas de topo con campanillas de nieve
      { id: 'campanillas_1', nombre: 'Campanillas de nieve', pide: { campanilla: 5 }, receta: 'rodillas', regalo: { rodillas: 1 }, mina: 4,
        texto: 'Cinco campanillas de nieve de la Mina de los cuervos.' },
    ],
    // carta: el efecto que da en la mina (el mismo que la carta de la ruleta con ese id)
    unguentos: {
      pulmones: { nombre: 'Ungüento de pulmones de topo', icono: '🫧', carta: 'pulmones', precio: { hongo_azul: 2 },
                  texto: 'Aire bajo el agua ×2.' },
      piel:     { nombre: 'Ungüento de piel dura',        icono: '🛡️', carta: 'casco',    precio: { flor_mina: 3 },
                  texto: 'Aguantas una piedra encima.' },
      segunda:  { nombre: 'Ungüento de segunda oportunidad', icono: '💖', carta: 'segunda', precio: { flor_mina: 4, hongo_azul: 2 },
                  texto: 'Si mueres, vuelves a la última sala.' },
      cera:     { nombre: 'Cera de nenúfar', icono: '🪷', carta: 'cera_nenufar', precio: { nenufar: 2 },
                  texto: 'El agua no gasta la lámpara.' },
      rodillas: { nombre: 'Ungüento de rodillas de topo', icono: '🦵', carta: 'rodillas', precio: { campanilla: 2 },
                  texto: 'Caídas a la mitad.' },
    },
  },

  // ---------- Taller del tejón: mejoras para siempre ----------
  // REGLA: cada mejora pide dos materiales distintos. «desde»: bandera con la que aparece (por ejemplo, abrir una mina).
  //   efecto: mochila (x capacidad) · golpe (golpes menos al picar, mínimo uno) · taladro (rompe la roca maciza)
  //   necesita: algo que tiene que estar en tu colección (el pico, el taladro viejo…)
  taller: {
    mejoras: [
      { id: 'mochila_1', icono: '🎒', nombre: 'Mochila reforzada', desde: 'mina_3_abierta', precio: { hierro: 16, cobre: 8 }, efecto: { mochila: 1.4 },
        texto: '+40 % de mochila.' },
      { id: 'pico_padre', icono: '⛏️', nombre: 'Pico del padre, restaurado', desde: 'mina_4_abierta', precio: { hierro: 20, estano: 15 }, efecto: { golpe: 1 },
        texto: 'Un golpe menos al picar.', necesita: 'pico_padre' },
      { id: 'taladro', icono: '🔩', nombre: 'Taladro de la época dorada', desde: 'temblor_mina5', precio: { cobre: 12, cuarzo: 6 }, efecto: { taladro: 1 },
        texto: 'Rompe la roca maciza.', necesita: 'taladro_viejo' },
    ],
  },

  // ---------- Vecinos nuevos de las casas de paja ----------
  // Llegan al pueblo cuando revive (al abrir el respiradero de una mina). Sus encargos van uno detrás de otro;
  // piden minerales (del almacén) o cosas de la colección, y pagan sobre todo con escaleras y puntales.
  vecinos: {
    castor: { encargos: [
      { pide: { hierro: 10 },            da: { escaleras: 4, puntales: 3 } },
      { pide: { nenufar: 3 },            da: { escaleras: 3, puntales: 4 } },
      { pide: { carbon: 15, cobre: 8 },  da: { escaleras: 6, puntales: 6 } },
    ] },
    marmota: { encargos: [
      { pide: { estano: 12 },            da: { escaleras: 4, puntales: 4 } },
      { pide: { campanilla: 3 },         da: { escaleras: 4, puntales: 4 } },
      { pide: { hierro: 12, estano: 10 }, da: { escaleras: 7, puntales: 7 } },
    ] },
    gemelos: { encargos: [
      { pide: { flor_mina: 5 },          da: { escaleras: 4, puntales: 4 } },
      { pide: { plata: 10 },             da: { escaleras: 5, puntales: 5 } },
      { pide: { cuarzo: 6, plata: 8 },   da: { escaleras: 8, puntales: 8 } },
    ] },
  },

  // ---------- Casa de Deep ----------
  //   dormir: se puede una vez cada «cada» bajadas; en la bajada siguiente cabe «carga» veces más en la mochila
  //   armario: aspectos del arcade que se ganan en el juego (ids de arcade.aspectos): uno por mina terminada (respiradero)
  //            y uno por cada flor de mina de un color nuevo que le llevas a la coneja. Para cambiarte hay que venir a casa.
  casaDeep: {
    dormir: { cada: 3, carga: 1.25 },
    armario: {
      minas: { 1: 'alfarero', 2: 'carbonero', 3: 'buzo', 4: 'explorador', 5: 'viejo', 6: 'cobrizo', 7: 'singafas', 8: 'oro', 9: 'cuarzo', 10: 'natural' },
      flores: { azul: 'azul', amarilla: 'rayo', blanca: 'fantasma', naranja: 'ardilla', morada: 'neon', roja: 'coneja' },
    },
    // diario: lo que Deep escribe a mano. Sale cada entrada cuando se cumple su condición («si»: una bandera, o «col:» y un objeto de la colección)
    diario: [
      { si: null, texto: 'Dicen que van a cerrar las minas. Que unos señores de la ciudad quieren sellarlas con hormigón. Papá decía que las minas eran el corazón del pueblo. Yo no sé si un pueblo puede vivir sin corazón.' },
      { si: 'flor_entregada', texto: 'Hoy he bajado al Pozo viejo. Solo. Hacía frío y la lámpara temblaba, pero abajo había una flor que brillaba como una brasa. Se la he llevado a la señora Coneja. Ha llorado un poco. Yo también, pero no se lo digas a nadie.' },
      { si: 'pico_encontrado', texto: 'En el fondo del Pozo viejo había un pico con un símbolo grabado. Lo tengo encima de la mesa y no paro de mirarlo. No sé por qué, pero me da calor en las manos.' },
      { si: 'viejo_pico', texto: 'El viejo topo dice que es el pico de papá. Que aquel día no bajaron por el Pozo viejo. Entonces, ¿cómo llegó hasta allí? Esta noche no voy a dormir.' },
      { si: 'ascensor_pozo1_apanado', texto: 'El tejón ha arreglado el ascensor de los topos. Dice que lo construyó mi gente. Mi gente. Nunca había pensado que yo tuviera «gente».' },
      { si: 'mina_2_abierta', texto: 'He abierto la Cantera del molino. Huele a harina vieja y a piedra. Hay hongos que brillan azul; la ardilla dice que con ellos se aguanta el aire bajo el agua. Me gusta la ardilla. Habla sola, como yo.' },
      { si: 'col:nota_1', texto: 'He encontrado una nota de la cuadrilla. «Somos seis.» Papá era uno de los seis. La he leído tantas veces que ya me la sé de memoria.' },
      { si: 'alcalde_intro', texto: 'El alcalde dice que lo mejor es vender las minas. Que son el pasado. Lo dice muy seguro, con el pecho hinchado, pero cuando habla de los mineros mira al suelo.' },
      { si: 'mina_3_abierta', texto: 'La Galería del río. Agua por todas partes. Hay un abismo tan hondo que no se ve el fondo. Algún día lo cruzaré. Algo me dice que al otro lado hay respuestas.' },
      { si: 'col:casco_cuadrilla', texto: 'Un casco abollado con el símbolo de la cuadrilla. Aguantó el golpe. Quiero creer que quien lo llevaba también.' },
      { si: 'museo_abierto', texto: 'He entrado en el museo. Polvo, vitrinas, fotos de topos sonriendo. En una de ellas estaba papá, muy joven. Me he llevado el taladro de la vitrina. Creo que a él le habría parecido bien.' },
      { si: 'respiradero_3', texto: 'Ha llegado un castor al pueblo. ¡Un vecino nuevo! Dice que ha oído que esto vuelve a ser un buen sitio. La plaza está un poco más verde. No es mucho, pero es algo.' },
      { si: 'respiradero_4', texto: 'Una marmota se ha mudado a la casa de paja. Duerme más que yo. El pueblo se llena de ruido otra vez y me gusta.' },
      { si: 'viejo_mina5', texto: 'El viejo topo me ha cerrado el paso al socavón. Nunca le había visto tan serio. ¿Qué hay ahí dentro que no quiere que vea?' },
    ],
  },

  // ---------- Flores de mina de colores ----------
  // Desde la mina 4, una flor de mina puede salir de color (sigue siendo una flor de mina). Los colores posibles se van
  // ampliando: «desde» = mina que hay que tener abierta. Más «peso» = más fácil. Llevarle a la coneja una de un color
  // nuevo da escaleras, puntales y un aspecto (casaDeep.armario.flores).
  floresColor: { prob: 0.15, regalo: { escaleras: 3, puntales: 3 },
    colores: [
      { id: 'azul',     nombre: 'azul',     color: '#639bff', claro: '#cbdbfc', desde: 4, peso: 5 },
      { id: 'amarilla', nombre: 'amarilla', color: '#fbf236', claro: '#fffbb0', desde: 4, peso: 4 },
      { id: 'blanca',   nombre: 'blanca',   color: '#ffffff', claro: '#ffffff', desde: 5, peso: 3 },
      { id: 'naranja',  nombre: 'naranja',  color: '#df7126', claro: '#f0b070', desde: 6, peso: 2.5 },
      { id: 'morada',   nombre: 'morada',   color: '#76428a', claro: '#d77bba', desde: 7, peso: 1.6 },
      { id: 'roja',     nombre: 'roja',     color: '#ac3232', claro: '#d95763', desde: 8, peso: 1 },
    ] },

  // ---------- Pueblo: casas de la plaza ----------
  casas: [
    { id: 'tienda',   nombre: 'Tienda',          dueno: 'Señora Coneja',   tipo: 'tienda',  color: '#ac3232' },
    { id: 'almacen',  nombre: 'Almacén',         dueno: 'Tu almacén',    tipo: 'almacen', color: '#8f563b' },
    { id: 'herboristeria', nombre: 'Herboristería', dueno: 'La ardilla', tipo: 'herbolaria', color: '#6abe30' },
    { id: 'taller',   nombre: 'Taller del tejón', dueno: 'El tejón',     tipo: 'taller',  color: '#df7126' },
    { id: 'alcaldia', nombre: 'Ayuntamiento',    dueno: 'El alcalde',    tipo: 'alcaldia', color: '#3f3f74' },
    { id: 'casa',     nombre: 'Casa de Deep',   dueno: 'Tu casa',       tipo: 'casa',    color: '#37946e' },
    // cerradas al principio: el museo lo recuperará Deep; en las casas de paja irán llegando vecinos nuevos.
    //   abreCon: bandera con la que se abre · abierta: cómo queda (nombre, dueño, tipo y, si es de un vecino, cuál).
    //   Al abrirse, en la plaza se dibuja la casa abierta (la de la imagen verde).
    { id: 'museo',    nombre: 'Museo de minería', dueno: 'Cerrado',      tipo: 'cerrada', texto: 'El viejo museo de minería. Las puertas están clavadas con tablas y el letrero, comido por el polvo.',
      abreCon: 'museo_abierto', abierta: { dueno: 'Tu colección', tipo: 'museo' } },   // la cadena del museo empieza tras el temblor de la mina 5
    { id: 'paja1',    nombre: 'Casa tapiada',   dueno: 'Nadie',         tipo: 'cerrada', texto: 'Las ventanas están tapadas con tablas. Hace años que aquí no vive nadie.',
      abreCon: 'respiradero_3', abierta: { nombre: 'Casa del castor', dueno: 'El castor', tipo: 'vecino', vecino: 'castor' } },
    { id: 'paja2',    nombre: 'Casa tapiada',   dueno: 'Nadie',         tipo: 'cerrada', texto: 'Una casita de paja con la puerta clavada. Alguien dejó unas macetas secas en la ventana.',
      abreCon: 'respiradero_4', abierta: { nombre: 'Casa de la marmota', dueno: 'La marmota', tipo: 'vecino', vecino: 'marmota' } },
    { id: 'paja3',    nombre: 'Casa tapiada',   dueno: 'Nadie',         tipo: 'cerrada', texto: 'Tapiada. Por una rendija se ven muebles cubiertos con sábanas.',
      abreCon: 'respiradero_6', abierta: { nombre: 'Casa de los gemelos', dueno: 'Los gemelos', tipo: 'vecino', vecino: 'gemelos' } },
  ],

  // =====================================================================
  //  DEEP ARCADE (arcade/index.html): un pozo nuevo en cada partida, sin pueblo ni historia
  // =====================================================================
  arcade: {
    puntales: 12, escaleras: 10,     // con lo que empiezas (los cofres de las salas dan más)
    cajonCada: 4,                    // la cuarta sala segura de cada fase tiene el cajón
    // cinco fases de cuatro secciones; cada fase con sus minerales (umbral: más bajo = más), sus peligros y lo que pide su cajón
    //   arena / cuevas / agua: umbrales del ruido (más alto = menos; 2 = nada) · polillas: probabilidad por hueco
    fases: [
      { nombre: 'Galerías de arcilla', largo: 14, pide: { arcilla: 10, carbon: 4 },
        min: { arcilla: 0.66, carbon: 0.78 }, arena: 0.88, cuevas: 0.76, agua: 2, polillas: 0 },
      { nombre: 'Vetas de carbón',     largo: 18, pide: { carbon: 14, cobre: 4 },
        min: { arcilla: 0.8, carbon: 0.71, cobre: 0.8 }, arena: 0.85, cuevas: 0.72, agua: 2, polillas: 0 },
      { nombre: 'Cuevas del cobre',    largo: 22, pide: { cobre: 14, carbon: 6 },
        min: { carbon: 0.77, cobre: 0.72 }, arena: 0.83, cuevas: 0.68, agua: 0.62, polillas: 0 },
      { nombre: 'Grutas de cuarzo',    largo: 26, pide: { cuarzo: 4, cobre: 10 },
        min: { carbon: 0.8, cobre: 0.75, cuarzo: 0.035 }, arena: 0.82, cuevas: 0.66, agua: 0.62, polillas: 0.03 },
      { nombre: 'Lo más hondo',        largo: 30, pide: { carbon: 12, cobre: 12, cuarzo: 4 },
        min: { arcilla: 0.82, carbon: 0.74, cobre: 0.74, cuarzo: 0.03 }, arena: 0.8, cuevas: 0.64, agua: 0.6, polillas: 0.04 },
    ],
    // puntos: lo que vale cada mineral (al picarlo, por el combo; y en el recuento, lo que sobra)
    puntos: { arcilla: 10, carbon: 10, cobre: 20, cuarzo: 30 },
    // combo: cada mineral seguido sube el multiplicador 1, hasta el tope (¡MAX!). Se ve encima de Deep.
    // Los puntos del combo no son tuyos hasta cobrarlo: se cobra si pasan «cobrar» segundos sin picar otro mineral, o al
    // entrar en una sala segura. Se pierde si rompes algo que no sea mineral, te hace daño una caída o te toca una polilla.
    // Dos maneras de jugarlo: «puro» (todo el combo del mismo mineral, desde «puroDesde» minerales) vale «puroMult» veces más
    // al cobrarlo; «enlace» (los «tipos» minerales distintos en el mismo combo) da un regalo de puntales y escaleras.
    //   quieto: si te quedas quieto, el tiempo para cobrar corre estas veces más deprisa (andar sin picar no lo acelera)
    //   quietoMargen: segundos sin hacer nada (ni moverte, ni picar, ni pulsar) antes de que empiece a correr más deprisa
    //   golpeMargen: tras golpear un mineral (aunque no se rompa), la cuenta no corre durante estos segundos
    combo: { tope: 9, cobrar: 3, quieto: 3, quietoMargen: 0.7, golpeMargen: 0.6, fuegoDesde: 3, puroDesde: 3, puroMult: 2, enlace: { tipos: 4, puntales: 2, escaleras: 2 } },
    // tarjetas de cómo se juega: cada una sale una sola vez, la primera vez que aparece esa cosa (gif: js/tutorial-gifs.js)
    tutorial: [
      { id: 'picar',     titulo: 'Pica hacia abajo',      texto: 'Toca abajo o a los lados para picar. Cada golpe gasta un poco de lámpara. La tierra cae de un golpe; la piedra y la roca dura cuestan más.' },
      { id: 'cajon',     titulo: 'El cajón de cada fase', texto: 'Al final de cada fase hay un cajón que pide minerales. Llega con ellos en la mochila y pasas de fase. Si no los llevas, se acaba la partida.' },
      { id: 'recorrido', titulo: 'Baja todo lo que puedas', texto: 'Aquí no hay cajones: llega a la meta de metros lo antes posible. Las franjas de roca maciza solo tienen hueco por un lado.' },
      { id: 'combo',     titulo: 'Combo',                 texto: 'Cada mineral que picas seguido sube el multiplicador. Los puntos del combo no son tuyos hasta cobrarlo: si rompes algo que no sea mineral, te caes o te toca una polilla, lo pierdes.' },
      { id: 'cobrar',    titulo: 'Cobrar, puro y enlace', texto: 'El combo se cobra solo si dejas de picar mineral un momento (quieto, más rápido). Todo del mismo mineral: <b>¡PURO!</b>, vale el doble. Los cuatro minerales en un combo: <b>¡ENLACE!</b>, te da puntales y escaleras.' },
      { id: 'escaleras', titulo: 'Escaleras',             texto: 'Picando hacia abajo no puedes volver a subir. Pon una escalera (botón Escalera) donde estés para poder trepar después.' },
      { id: 'derrumbe',  titulo: 'Derrumbes y puntales',  texto: 'Lo que queda sin apoyo cruje y cae. Si cae desde muy alto se rompe en escombro y el mineral se pierde. Un puntal (botón Puntal) sujeta el techo; la roca dura nunca cae.' },
      { id: 'lampara',   titulo: 'La lámpara',            texto: 'Si se apaga, se acabó. Recárgala en la llama de las salas seguras y con los bidones de aceite. Con la mecha baja gasta la mitad, pero ves menos.' },
      { id: 'agua',      titulo: 'Bajo el agua',          texto: 'Bajo el agua se gasta el aire: sal antes de que se acabe. El agua también gasta más lámpara.' },
      { id: 'sala',      titulo: 'Sala segura',           texto: 'Aquí no cae nada y la llama recarga la lámpara. Abre el cofre: trae puntales o escaleras. Entrar cobra tu combo.' },
      { id: 'flor',      titulo: 'Flor de mina',          texto: 'Durante unos segundos no hay oscuridad: lo ves todo.' },
      { id: 'hongo',     titulo: 'Hongo luminoso',        texto: 'Durante unos segundos andas y picas el doble de rápido.' },
      { id: 'polilla',   titulo: 'Polillas',              texto: 'Persiguen tu luz y te la roban. Con la mecha baja te ven menos y van más despacio; un derrumbe encima las aplasta.' },
    ],
    efectos: { hongo: 10, flor: 10 },  // segundos: el hongo te hace el doble de rápido; la flor de mina quita la oscuridad
    plantas: { flor_mina: { cada: 26, desdeFila: 6 }, hongo_azul: { cada: 38, desdeFila: 12 } },   // flores y hongos sueltos
    // colores de cada fase: el fondo de la página (degradado vivo) y el tinte de la roca (multiplica)
    colores: [
      { fondo: ['#ff9a3c', '#ff5f1f'], roca: null },
      { fondo: ['#3fe0d0', '#1aa39a'], roca: '#9fb0d8' },
      { fondo: ['#ff7ac8', '#e0389a'], roca: '#e8a088' },
      { fondo: ['#b6f24a', '#6cc21c'], roca: '#c4a0e8' },
      { fondo: ['#b45cff', '#6a1fd0'], roca: '#6a5a72' },
    ],
    bonusFinal: { lampara: 10, puntal: 50, escalera: 50 },   // al subir en el ascensor: puntos por cada % de lámpara y cada herramienta que te queda
    sinFin: { crece: 4, largoMax: 40, pideCrece: 0.5 },     // sin fin: las fases se repiten, cada vuelta más largas y pidiendo más
    mrDeep: { aceiteFilas: 9, porMetro: 5 },                 // Mr. Deep: aceite cada tantas filas; puntos por metro
    porSegundo: 5,                   // puntos por cada segundo por debajo del tiempo de referencia
    segundosPorFila: 2.2,            // tiempo de referencia: filas de la fase (o metros del recorrido) por esto
    vidas: 3,                        // modo de tres vidas: reapareces en la última sala segura
    // aspectos de Deep: colores cambiados (letras de la paleta del topo) y, a veces, un adorno. «como» = cómo se consigue
    aspectos: [
      { id: 'clasico',   nombre: 'Clásico',     tipo: 'aspecto', pal: {} },
      { id: 'azul',      nombre: 'Casco azul',  tipo: 'aspecto', como: 'Llegar al fondo en 100 m', pal: { a: '#306082', b: '#5b6ee1', c: '#222034', '2': '#fbf236', '1': '#df7126' } },
      { id: 'explorador',nombre: 'Explorador',  tipo: 'aspecto', como: 'Llegar al fondo en 300 m', pal: { a: '#9badb7', b: '#ffffff', c: '#595652', '2': '#76428a', '1': '#45283c' } },
      { id: 'oro',       nombre: 'Topo de oro', tipo: 'aspecto', como: 'Terminar el arcade', pal: { a: '#d9a066', b: '#fbf236', c: '#8f563b', d: '#ffffff', F: '#d9a066', G: '#fbf236', K: '#fbf236', e: '#8f563b', h: '#d9a066', k: '#fbf236', p: '#8f563b', i: '#8f563b', f: '#d9a066', g: '#fbf236', P: '#fbf236', L: '#ffffff', N: '#fbf236', m: '#fbf236', '0': '#45283c' } },
      { id: 'neon',      nombre: 'Neón',        tipo: 'aspecto', como: 'Llegar a ¡MAX! en un combo', pal: { a: '#d77bba', b: '#ffb3e0', c: '#76428a', '2': '#5fcde4', '1': '#306082' } },
      { id: 'buzo',      nombre: 'Buzo',        tipo: 'aspecto', como: 'Aguantar 30 s bajo el agua', pal: { a: '#37946e', b: '#99e550', c: '#4b692f', '2': '#5fcde4', '1': '#306082' } },
      { id: 'rayo',      nombre: 'Rayo',        tipo: 'aspecto', como: 'Contrarreloj en menos de 6:00', pal: { a: '#ac3232', b: '#d95763', c: '#45283c', '2': '#fbf236', '1': '#df7126' } },
      { id: 'fantasma',  nombre: 'Fantasma',    tipo: 'aspecto', como: 'Morir 20 veces', pal: { a: '#cbdbfc', b: '#ffffff', c: '#9badb7', F: '#9badb7', G: '#cbdbfc', K: '#ffffff', h: '#9badb7', e: '#847e87', '2': '#cbdbfc', '1': '#9badb7' } },
      { id: 'alfarero',  nombre: 'Alfarero',    tipo: 'aspecto', como: 'Picar 300 de arcilla', pal: { a: '#8f563b', b: '#d9a066', c: '#663931', h: '#8f563b', e: '#663931', '2': '#eec39a', '1': '#d9a066' } },
      { id: 'carbonero', nombre: 'Carbonero',   tipo: 'aspecto', como: 'Picar 500 de carbón', pal: { a: '#595652', b: '#847e87', c: '#222034', F: '#222034', G: '#323c39', K: '#45283c', k: '#595652', '2': '#696a6a', '1': '#45283c' } },
      { id: 'cobrizo',   nombre: 'Cobrizo',     tipo: 'aspecto', como: 'Picar 300 de cobre', pal: { a: '#df7126', b: '#ffa040', c: '#8a3a10', h: '#8f563b', '2': '#37946e', '1': '#4b692f' } },
      { id: 'cuarzo',    nombre: 'Cuarzo',      tipo: 'aspecto', como: 'Picar 100 cuarzos', pal: { a: '#639bff', b: '#cbdbfc', c: '#5b6ee1', d: '#ffffff', '2': '#ffffff', '1': '#9badb7' } },
      { id: 'sincasco',  nombre: 'Deep sin casco', tipo: 'aspecto', como: 'Bajar 50 m sin poner un puntal', pal: { a: '#323c39', b: '#595652', c: '#323c39', d: '#595652' } },
      { id: 'singafas',  nombre: 'Deep sin gafas', tipo: 'aspecto', como: 'Pasar una fase entera con la mecha baja', pal: { P: '#595652', L: '#595652' } },
      { id: 'natural',   nombre: 'Sin casco ni gafas', tipo: 'aspecto', como: 'Tener Deep sin casco y Deep sin gafas', pal: { a: '#323c39', b: '#595652', c: '#323c39', d: '#595652', P: '#595652', L: '#595652' } },
      { id: 'tejon',     nombre: 'El tejón',    tipo: 'vecino', como: 'Usar 100 herramientas (escaleras y puntales)', pal: { a: '#9badb7', b: '#ffffff', c: '#595652', d: '#ffffff', F: '#323c39', G: '#595652', K: '#9badb7', h: '#696a6a', e: '#323232', '2': '#8f563b', '1': '#663931' } },
      { id: 'coneja',    nombre: 'La coneja',   tipo: 'vecino', como: 'Abrir 50 cofres', adorno: 'conejo', pal: { a: '#eec39a', b: '#ffffff', c: '#d9a066', d: '#ffffff', F: '#eec39a', G: '#ffffff', K: '#ffffff', P: '#ffffff', L: '#ffffff', n: '#222034', h: '#cbdbfc', e: '#9badb7', m: '#d77bba', N: '#d77bba', k: '#eec39a', '2': '#d95763', '1': '#ac3232' } },
      { id: 'ardilla',   nombre: 'La ardilla',  tipo: 'vecino', como: 'Encontrar 25 plantas (flores y hongos)', adorno: 'ardilla', pal: { a: '#df7126', b: '#d9a066', c: '#8f563b', d: '#d9a066', F: '#df7126', G: '#d9a066', K: '#eec39a', P: '#8f563b', L: '#eec39a', h: '#8f563b', e: '#663931', N: '#d77bba', '2': '#6abe30', '1': '#37946e' } },
      { id: 'viejo',     nombre: 'El viejo topo', tipo: 'vecino', como: 'Llegar al fondo en 500 m', pal: { a: '#696a6a', b: '#9badb7', c: '#595652', d: '#9badb7', F: '#696a6a', G: '#9badb7', K: '#cbdbfc', P: '#d9a066', L: '#cbdbfc', '2': '#ffffff', '1': '#cbdbfc', h: '#45283c', e: '#323232' } },
    ],
    // recorridos de 100, 300 y 500 m: sin salas seguras, con franjas de roca maciza (hueco a un lado, cambiando cada vez)
    // y más aceite. Cuenta el tiempo y los minerales
    recorridos: {
      franjas: { cada: 22, hueco: 2 }, aceiteFilas: 11,
      tema: { min: { arcilla: 0.76, carbon: 0.75, cobre: 0.77, cuarzo: 0.015 }, arena: 0.85, cuevas: 0.7, agua: 0.66, polillas: 0.015 },
    },
  },
};
