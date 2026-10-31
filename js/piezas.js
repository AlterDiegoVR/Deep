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
      'xxM_f__B__o__xx',
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
      'x_f___B___V__ox',
    ],
  },
];
