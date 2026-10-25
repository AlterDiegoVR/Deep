// =====================================================================
//  DATOS DEL JUEGO
//  Todos los números y textos que se pueden ajustar sin tocar el código.
//  Cambia un valor, guarda y recarga la página.
// =====================================================================
window.DATOS = {

  // Versión del juego: sale en el menú para saber si has cargado la última
  version: '0.2',

  // ---------- Herramientas ----------
  herramientas: {
    inicial: { puntales: 3, escaleras: 4 },        // con lo que empieza una partida nueva
    minimoPorBajada: { puntales: 2, escaleras: 2 },  // provisional hasta que haya economía: al empezar cada bajada tienes al menos esto
    alMorir: 'perder',                              // 'perder' = pierdes las que llevabas; 'conservar' = no pierdes nada
  },

  // ---------- Salas seguras ----------
  salas: {
    radioLlama: 1.5,           // casillas alrededor de la antorcha en las que se recarga la lámpara
    columnaLlama: 2,           // dónde está cada cosa dentro de la sala (columna 0 a 14)
    columnaRuleta: 7,
    columnaCofre: 12,
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
    { id: 'mochila_cuero', icono: '🎒', nombre: 'Mochila de cuero',    texto: 'El peso te frena la mitad.', valor: 0.5, peso: 1, unica: true },
    { id: 'bolsillo',      icono: '👖', nombre: 'Bolsillo secreto',    texto: 'Si mueres, el material que más vale de tu mochila llega igualmente al almacén.', peso: 0.7, unica: true },
    { id: 'carpintero',    icono: '🪜', nombre: 'Carpintero',          texto: 'Cada 10 m que bajas te dan una escalera.', valor: 10, peso: 1, unica: true },
    { id: 'plegable',      icono: '🪵', nombre: 'Puntal plegable',     texto: 'Pulsa Puntal encima de un puntal para recogerlo.', peso: 0.8, unica: true },
    { id: 'codicia',       icono: '💰', nombre: 'Codicia',             texto: 'Cada mineral que picas cuenta doble, pero la lámpara gasta un 25 % más.', valor: 1.25, peso: 0.6, unica: true },
  ],

  // ---------- Tienda del pueblo ----------
  // precio: material -> cantidad. Materiales: arcilla, carbon, cobre, cuarzo
  tienda: [
    { id: 'puntal',   nombre: 'Puntal',   texto: 'Sostiene el techo.',     da: { puntales: 1 },  precio: { arcilla: 3 } },
    { id: 'escalera', nombre: 'Escalera', texto: 'Para subir escalones.',  da: { escaleras: 1 }, precio: { arcilla: 2 } },
  ],

  // ---------- Lámpara ----------
  lampara: {
    consumo: 1.0,              // % por segundo con la mecha alta
    multMechaBaja: 0.5,        // la mecha baja gasta esto (x consumo)
    multMojada: 3,             // dentro del agua gasta esto (x consumo)
    costeGolpe: 0.1,           // % por cada golpe de pico
    recargaSala: 60,           // % por segundo dentro de una sala segura
    aceite: 35,                // % que da cada bidón de aceite
    radioMin: 1.8,             // radio de luz (casillas) con la lámpara a 0
    radioMax: 7.4,             // radio de luz (casillas) con la lámpara a 100
    multRadioMechaBaja: 0.5,   // la mecha baja reduce el radio a esto
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
    anchoMaxTecho: 5,          // casillas de techo que aguantan sin apoyo
    tiempoCrujido: 0.8,        // segundos que cruje antes de caer
    escombroSiCaeDesde: 2,     // se rompe en escombro si cae desde estas casillas o más...
    escombroSiCaenJuntos: 4,   // ...o si el derrumbe tiene estos bloques o más
    maxEscombroPorGolpe: 300,  // un golpe quita como mucho este escombro conectado
  },

  // ---------- Materiales ----------
  // golpes: dureza. valor: peso en la mochila (0 = no vale nada, ni se cuenta)
  materiales: {
    tierra:   { nombre: 'Tierra',      golpes: 1, valor: 0 },
    piedra:   { nombre: 'Piedra',      golpes: 2, valor: 0 },
    rocaDura: { nombre: 'Roca dura',   golpes: 5, valor: 0 },
    arena:    { nombre: 'Arena',       golpes: 1, valor: 0 },
    escombro: { nombre: 'Escombro',    golpes: 1, valor: 0 },
    arcilla:  { nombre: 'Arcilla',     golpes: 1, valor: 1, color: '#d9a066' },
    carbon:   { nombre: 'Carbón',      golpes: 2, valor: 1, color: '#3f3f74' },
    cobre:    { nombre: 'Cobre',       golpes: 3, valor: 2, color: '#df7126' },
    cuarzo:   { nombre: 'Cuarzo',      golpes: 2, valor: 1, color: '#cbdbfc' },
  },

  // ---------- Peligros ----------
  peligros: {
    grisuLuz: 35,              // % de lámpara que quita una explosión de grisú
    grisuAviso: 2,             // casillas de distancia a las que la llama se pone azul
    polillaLuz: 20,            // % de lámpara que roba una polilla
    polillaVelocidad: 2.4,     // casillas por segundo al perseguir tu luz
  },

  // ---------- Aire ----------
  // Bajo la superficie del agua o del barro (tu casilla llena y la de encima también) empieza la cuenta atrás.
  aire: {
    segundos: 10,              // aire que tienes
    conPulmones: 20,           // con la carta Pulmones de topo
    recupera: 4,               // segundos de aire que recuperas por cada segundo fuera
  },

  // ---------- Barro ----------
  // Se forma cuando el agua toca arena. No es sólido: te metes dentro, te frena y te hundes despacio.
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
    nivelMinimo: 0.25,         // no se extiende en láminas más finas que esto (de 0 a 1 casilla)
    diferenciaMinima: 0.02,    // diferencia de nivel por debajo de la cual deja de moverse (evita temblores)
    charcoGrande: 8,           // un charco al mínimo que ocupa estas casillas o más se filtra y desaparece
    filtrado: 0.15,            // nivel que pierde por segundo un charco que se está filtrando
  },

  // ---------- Llaves, puertas y salas de bonus ----------
  llaves: { cada: 24, desdeFila: 10 },             // una llave suelta cada tantas filas (aprox.); no reaparecen
  puertas: { cada: 20, desdeFila: 14 },            // una puerta en un lateral cada tantas filas (aprox.)
  salaBonus: {
    // lo que puede dar el cofre de la sala de bonus (sale uno al azar)
    premios: [
      { texto: '3 escaleras y 3 puntales', escaleras: 3, puntales: 3 },
      { texto: 'Lámpara al máximo y 2 escaleras', luz: 100, escaleras: 2 },
      { texto: '4 de cobre', material: { cobre: 4 } },
      { texto: '5 de carbón y 2 puntales', material: { carbon: 5 }, puntales: 2 },
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
  minas: [
    { id: 1, nombre: 'Pozo viejo',          abierta: true,  texto: 'Tierra, arcilla y algo de carbón. Para empezar.' },
    { id: 2, nombre: 'Cantera del molino',  abierta: false, texto: 'Próximamente.' },
    { id: 3, nombre: 'Galería del río',     abierta: false, texto: 'Próximamente.' },
    { id: 4, nombre: 'Mina de los cuervos', abierta: false, texto: 'Próximamente.' },
    { id: 5, nombre: 'Socavón de cobre',    abierta: false, texto: 'Próximamente.' },
    { id: 6, nombre: 'Cueva de las arenas', abierta: false, texto: 'Próximamente.' },
    { id: 7, nombre: 'Pozo del grisú',      abierta: false, texto: 'Próximamente.' },
    { id: 8, nombre: 'La sima',             abierta: false, texto: 'Próximamente.' },
  ],

  // ---------- Pozo 1 ----------
  pozo1: {
    columnas: 15,
    tramos: [
      { nombre: 'Boca del pozo',   largo: 12 },
      { nombre: 'Vetas de carbón', largo: 18 },
      { nombre: 'Cuevas húmedas',  largo: 26 },
      { nombre: 'Fondo de cobre',  largo: 999 },
    ],
    altoSala: 4,                 // filas de cada sala segura (techo + 2 de aire + suelo)
    aceiteCada: 9,               // filas entre bidones de aceite (más 2 por tramo)
    salaSellada: { fila: 6, columna: 9, ancho: 5, alto: 4 },
    desvio: { fila: 26, entrada: 'izquierda' },  // franja de roca maciza con un pasillo: se entra por un lado y se sale bajando por el otro  // roca maciza con cofre (hace falta taladro)
    // a partir de qué tramo aparece cada cosa (0 = el primero)
    desdeTramo: { carbon: 1, cuarzo: 2, cobre: 3, cuevas: 0, gas: 1, agua: 2, polillas: 1 },
  },

  // ---------- Pueblo: casas de la plaza ----------
  casas: [
    { id: 'tienda',   nombre: 'Tienda',          dueno: 'Señora Rita',   tipo: 'tienda',  color: '#ac3232' },
    { id: 'almacen',  nombre: 'Almacén',         dueno: 'Tu almacén',    tipo: 'almacen', color: '#8f563b' },
    { id: 'herreria', nombre: 'Herrería',        dueno: 'Don Ernesto',   tipo: 'vecino',  color: '#595652' },
    { id: 'panaderia',nombre: 'Panadería',       dueno: 'Lola',          tipo: 'vecino',  color: '#df7126' },
    { id: 'alcaldia', nombre: 'Ayuntamiento',    dueno: 'El alcalde',    tipo: 'vecino',  color: '#3f3f74' },
    { id: 'casa',     nombre: 'Casa del topo',   dueno: 'Tu casa',       tipo: 'vecino',  color: '#37946e' },
  ],
};
