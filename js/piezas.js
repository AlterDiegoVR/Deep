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
//    j  hongo luminoso   R  lámpara de carburo   F  foto de una cuadrilla   w  polilla
//    *  gas              &  barro
//    T  cartel de tutorial (título, texto y, si quieres, un gif)   D  frase de Deep (con su cara)
//       (los textos van en «textos»: { 'fila,columna': { titulo, texto, gif } } o { texto, cara })
//
//  Las piezas que hagas en el editor de niveles se guardan en tu navegador y se suman a estas
//  (si tienen el mismo id, mandan las tuyas). Con «Exportar» se pasan aquí.
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
    // La noria vieja (0.217b): una cámara de roca madre junto al pozo, con un paso de 2 casillas al lado para seguir bajando.
    // Arriba, un depósito de agua tapado por 3 casillas de tierra: hay que picarlas a propósito desde el rellano.
    // El agua baja por la escalera de la cuadrilla y se queda en el suelo de tierra de la cámara; para que llegue a la
    // noria hay que abrir el agujero justo encima de ella. La noria abre la reja del cuartito del cofre.
    // Se refleja al azar (el paso sale a un lado u otro).
    id: 'noria_pozo3',
    pozo: 'tres',
    tiro: 'principal',
    colocar: { fila: 50 },
    reflejar: true,
    filas: [
      'xxxxxxxx__xx..x',
      'x~~~~ttt__xx..x',
      'x~~~~xxxLxxx..x',
      'x_______LGfx..x',
      'x_______LGBx..x',
      'xttttttttxxx..x',
      'xx_xxxxxxxxx..x',
      'xxWxxxxxxxxx..x',
      'xxxxxxxxxxxx..x',
    ],
  },
  {
    // Las brasas (0.217b): un pasillo con ascuas y un cofre al fondo, junto a un paso de 1 casilla para seguir bajando.
    // Desde el rellano, el depósito de agua está tapado por 2 piedras: pícalas y el agua baja por la escalera y apaga
    // las brasas. Si cruzas a pelo, te queman la lámpara. Se refleja al azar.
    id: 'brasas_pozo3',
    pozo: 'tres',
    tiro: 'principal',
    colocar: { fila: 115 },
    reflejar: true,
    filas: [
      'xxxx.x__xxxxxxx',
      'xxxx.x____pp~~x',
      'xxxx.xxxLxxx~~x',
      'xxxx.xbbLbbbbBx',
      'xxxx.xxxxxxxxxx',
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

// piezas del juego más las del editor de niveles guardadas en este navegador (solo las marcadas como activas)
window.piezasActivas = () => {
  let loc = {}; try{ loc = (JSON.parse(localStorage.getItem('deep-editor') || '{}') || {}).piezas || {}; }catch(e){}
  const mias = Object.values(loc).filter(p => p && p.activa !== false && Array.isArray(p.filas));
  const ids = new Set(mias.map(p => p.id));
  return window.PIEZAS.filter(p => !ids.has(p.id)).concat(mias);
};
