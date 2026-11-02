// =====================================================================
//  PIEZAS: zonas del pozo hechas a mano
//  El generador procedural pone el terreno y, donde toque, estampa estas piezas encima.
//  Más adelante las dibujará el editor de niveles; de momento se escriben aquí a mano.
//
//  Cada pieza:
//    id        nombre único
//    pozo      en qué pozo sale ('pruebas' si no se pone), o una lista de pozos: ['pruebas', 'dos']
//    tiro      'principal' o el id de un ramal (por ejemplo 'ramal1'); 'ramales' = cualquier ramal
//    colocar   dónde va. Una de estas formas:
//                { fila: 26 }                     a esa profundidad (filas desde la boca del pozo)
//                { sala: 1, donde: 'debajo' }     pegada a una sala segura (0 = la primera); 'debajo' o 'encima'
//                { fondo: true }                  al fondo del tiro (para ramales, que tienen fondo)
//                { tramo: 2, prob: 0.5 }          en algún sitio del tramo, con esa probabilidad (al azar según la semilla)
//    reflejar  true = puede salir dada la vuelta de izquierda a derecha (al azar según la semilla)
//    filas     15 caracteres por fila (el ancho del pozo), de arriba abajo
//
//  Leyenda de casillas:
//    .  libre: lo decide el generador (así la pieza se funde con la mina normal)
//    _  aire          t  tierra        p  piedra        d  roca dura (fija)
//    m  roca maciza (azul: la romperá el taladro; solo donde haya algo detrás)
//    x  roca madre (casi negra: el límite del mundo, no se rompe nunca)
//    a  arena         g  arena arcillosa (con agua, barro)   ~  agua   e  escombro
//    r  arcilla       c  carbón        u  cobre         q  cuarzo
//    o  bidón de aceite   k  llave     h  escalera suelta   H  puntal suelto
//    B  cofre con premio  f  flor de mina (coleccionable)   P  puerta con candado (solo en los bordes)
//    M  montacargas (al fondo de un ramal: te sube al tiro principal)
//    A  ascensor viejo (roto: hace falta su pieza)   Z  pieza del ascensor   K  pico con un símbolo
//    V  respiradero (sube aire caliente desde abajo)
//    N  nota de la cuadrilla (sale la siguiente que aún no tengas; si ya las tienes todas, nada)
//    L  escalera de la cuadrilla   I  puntal de la cuadrilla   =  tablón de la cuadrilla (bien clavados: no se recogen)
//    W  noria vieja (gira cuando le llega agua y abre las compuertas G)   G  compuerta (roca maciza que abre la noria)
//    b  brasas (queman la lámpara al pisarlas; el agua las apaga)   X  puerta de la cuadrilla (atrancada)
//    Q  casco de la cuadrilla (coleccionable)
// =====================================================================
window.PIEZAS = [
  {
    // El antiguo desvío del tramo 2: un pasillo de roca maciza de lado a lado. Dentro crecen flores de mina.
    id: 'desvio_flores',
    tiro: 'principal',
    colocar: { fila: 26 },
    reflejar: true,
    filas: [
      '..xxxxxxxxxxxxx',
      '_____________xx',
      '__f___f___o__xx',
      'xxxxxxxxxxx__xx',
      'xxxxxxxxxxx__xx',
      '...........__..',
    ],
  },
  {
    // Fondo del ramal: una cámara con un cofre, una flor y el montacargas para volver. Debajo, una capa de roca
    // maciza (azul): la promesa de que con el taladro habrá algo más abajo.
    id: 'fondo_ramal',
    pozo: ['pruebas', 'dos'],
    tiro: 'ramales',
    colocar: { fondo: true },
    reflejar: true,
    filas: [
      'xxxxxxtttxxxxxx',
      'xx___________xx',
      'xxM_f__B_No__xx',
      'xxxxxmmmmmxxxxx',
      'xxxxxxxxxxxxxxx',
    ],
  },
  {
    // Fondo del Pozo viejo (simulacro del primer pozo): el ascensor roto, su pieza, el pico con el símbolo
    // y una grieta por la que sube aire caliente (el corazón de la montaña).
    id: 'fondo_pozo1',
    pozo: 'uno',
    tiro: 'principal',
    colocar: { fondo: true },
    filas: [
      '...............',
      'x_____________x',
      'xA__K____V__Z_x',
    ],
  },
  {
    // Fondo de la Cantera del molino (prototipo del pozo 2): un respiradero, un cofre y una flor.
    id: 'fondo_pozo2',
    pozo: 'dos',
    tiro: 'principal',
    colocar: { fondo: true },
    filas: [
      '...............',
      'x_____________x',
      'xAf___B___V__ox',
    ],
  },
  {
    // Pozo viejo: en el último tramo, una cámara lateral tapada con roca maciza (la abrirá el taladro).
    // Una promesa para volver al primer pozo más adelante.
    id: 'camara_maciza_pozo1',
    pozo: 'uno',
    tiro: 'principal',
    colocar: { fila: 98 },
    reflejar: true,
    filas: [
      'xxxxxm.........',
      'x__B_m.........',
      'x_f__m.........',
      'xxxxxm.........',
    ],
  },
  // ===================== Pozo 3: la Galería del río (el pozo del agua) =====================
  {
    // La noria vieja: un depósito de agua tapado con un tapón de piedra. Si lo rompes, el agua baja por el canal
    // hasta la rueda, que gira y abre la compuerta de una camarita con un cofre y una flor.
    id: 'noria_pozo3',
    pozo: 'tres',
    tiro: 'principal',
    colocar: { fila: 50 },
    reflejar: true,
    filas: [
      'ddddddddpptxxxx',
      'd______dpptx__x',
      'd~~~~~~p__tGfBx',
      'ddddddddd_dxxxx',
      'ddddddddd_ddddd',
      'dddddddddWddddd',
      'ddddddddddddddd',
    ],
  },
  {
    // Las brasas: un pasillo cerrado con ascuas en el suelo y un cofre al final. Bajas por la escalera de la cuadrilla;
    // si cruzas a pelo, te quema la lámpara. Arriba, un depósito de agua tapado: rompe el tapón y el agua las apaga.
    id: 'brasas_pozo3',
    pozo: 'tres',
    tiro: 'principal',
    colocar: { fila: 115 },
    reflejar: true,
    filas: [
      'xxxxxx.........',
      'x~~~~p__.......',
      'xxxxxxxLxxxxxxx',
      'xxxx_bbLbbbbBxx',
      'xxxxxxxxxxxxxxx',
    ],
  },
  {
    // Fondo de la Galería del río: el ascensor, un respiradero, un cofre y una flor.
    id: 'fondo_pozo3',
    pozo: 'tres',
    tiro: 'principal',
    colocar: { fondo: true },
    filas: [
      '...............',
      'x_____________x',
      'xA__f__B__V__ox',
    ],
  },
  {
    // Galería del abismo: un precipicio de roca madre de 5 casillas. El puente más largo que se puede tender
    // desde un lado (3 tablones en voladizo, y el 4.º si llega a la otra orilla) se queda a una casilla.
    // Al otro lado, una puerta de la cuadrilla: hará falta el salto u otra habilidad. Si caes al fondo,
    // el agua amortigua y un montacargas viejo te sube al tiro principal.
    id: 'abismo_pozo3',
    pozo: 'tres',
    tiro: 'rio_abismo',
    colocar: { fondo: true },
    filas: [
      'xxxxxxxxxx.....',
      'xxxxxxxxxx.....',
      'xxxxxxxxxx.....',
      '_______________',
      '_______________',
      '__X____________',
      'xxxx_____xxxxxx',
      'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx',
      'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx',
      'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx',
      'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx',
      'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx', 'xxxx_____xxxxxx',
      'xxxx~~~_Mxxxxxx',
      'xxxxxxxxxxxxxxx',
      'xxxxxxxxxxxxxxx',
    ],
  },
  {
    // Galería de la cuadrilla: hasta la mitad, galerías ya hechas por los topos de la cuadrilla, con sus escaleras,
    // puntales y un tablón sobre una poza (no se pueden recoger). Después, un derrumbe de roca dura y escombro.
    id: 'cuadrilla_pozo3',
    pozo: 'tres',
    tiro: 'rio_cuadrilla',
    colocar: { fila: 0 },
    filas: [
      '..._I____I___pp',
      '...ppppppppdLpp',
      'ppppppppppcpLpp',
      'pppptppppppdLpp',
      'pppppppppppdLpp',
      'pp_I___I____L_p',
      'ppLpp===ppppppp',
      'ppLpp~~~ppppppp',
      'ppLpppppcpppppp',
      'p_L___I____I__p',
      'ppppppppppppLpp',
      'pppdppppppppLpp',
      'pppppppcppppLpp',
      'p__I_____I__L_p',
      'p_o_________L_p',
      'ppppLpppppppppp',
      'ppppLpppcpppppp',
      'ppppLpppppppppp',
      'pI__L_____I___p',
      'ppppppppppppepp',
      'pppddeedeeeddpp',
      'ppddedddeeedLpp',
      'pdddeeddddeeedp',
      'pdeeddddeedddpp',
      'ppdddeeddddeppp',
      'pppdeedddeedppp',
      'pppppddeddppppp',
    ],
  },
  {
    // Al fondo de la galería de la cuadrilla: una camarita con algo suyo (un casco abollado y una nota).
    id: 'fondo_cuadrilla_pozo3',
    pozo: 'tres',
    tiro: 'rio_cuadrilla',
    colocar: { fondo: true },
    filas: [
      'pppdddddddddppp',
      'ppd_________dpp',
      'pd__N_____Q_Mdp',
      'pdddddddddddddp',
    ],
  },
];
