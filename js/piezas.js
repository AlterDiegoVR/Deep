// =====================================================================
//  PIEZAS: zonas del pozo hechas a mano
//  El generador procedural pone el terreno y, donde toque, estampa estas piezas encima.
//  Más adelante las dibujará el editor de niveles; de momento se escriben aquí a mano.
//
//  Cada pieza:
//    id        nombre único
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
//    m  roca maciza   a  arena         ~  agua          e  escombro
//    r  arcilla       c  carbón        u  cobre         q  cuarzo
//    o  bidón de aceite   k  llave     h  escalera suelta   H  puntal suelto
//    B  cofre con premio  f  flor de mina (coleccionable)   P  puerta con candado (solo en los bordes)
// =====================================================================
window.PIEZAS = [
  {
    // El antiguo desvío del tramo 2: un pasillo de roca maciza de lado a lado. Dentro crecen flores de mina.
    id: 'desvio_flores',
    tiro: 'principal',
    colocar: { fila: 26 },
    reflejar: true,
    filas: [
      '..mmmmmmmmmmmmm',
      '_____________mm',
      '__f___f___o__mm',
      'mmmmmmmmmmm__mm',
      'mmmmmmmmmmm__mm',
      '...........__..',
    ],
  },
  {
    // Fondo del ramal: una cámara con un cofre y una flor. El premio de haber elegido este camino.
    id: 'fondo_ramal',
    tiro: 'ramales',
    colocar: { fondo: true },
    reflejar: true,
    filas: [
      'mm___________mm',
      'mm__f__B__o__mm',
      'mmmmmmmmmmmmmmm',
      'mmmmmmmmmmmmmmm',
    ],
  },
];
