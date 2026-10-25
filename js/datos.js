// =====================================================================
//  DATOS DEL JUEGO
//  Todos los números y textos que se pueden ajustar sin tocar el código.
//  Cambia un valor, guarda y recarga la página.
// =====================================================================
window.DATOS = {

  // ---------- Herramientas ----------
  herramientas: {
    inicial: { puntales: 3, escaleras: 4 },        // con lo que empieza una partida nueva
    porSalaSegura: { puntales: 2, escaleras: 2 },  // regalo la primera vez que entras en cada sala segura (una sola vez por pozo)
    alMorir: 'perder',                              // 'perder' = pierdes las que llevabas; 'conservar' = no pierdes nada
  },

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

  // ---------- Agua ----------
  // El agua conserva su volumen: si encuentra hueco se reparte y baja de nivel.
  agua: {
    nivelMinimo: 0.25,         // no se extiende en láminas más finas que esto (de 0 a 1 casilla)
    diferenciaMinima: 0.02,    // diferencia de nivel por debajo de la cual deja de moverse (evita temblores)
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
    salaSellada: { fila: 6, columna: 9, ancho: 5, alto: 4 },  // roca maciza con cofre (hace falta taladro)
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
