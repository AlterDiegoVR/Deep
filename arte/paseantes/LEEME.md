# Paseantes del pueblo (maqueta, 06/11)

Sprites provisionales de los vecinos que pasean por la plaza (idea de Diego: aún sin meter en el juego).

- `coneja.png`, `tejon.png`, `ardilla.png`, `alcalde.png`, `castor.png`: tiras de 5 fotogramas de 32 × 31 (quieto + 4 de andar), mirando a la derecha; para la izquierda se reflejan.
- `npcs.py`: el script que los dibuja (`python3 npcs.py <carpeta>`). `gif.py`: la maqueta sobre la plaza.
- `plaza_vecinos.gif`, `vecinos_fotogramas.png`: la maqueta y la hoja ampliada.

Pendiente al implementarlo: que no pasen por encima de árboles, muebles ni tejados (usar la cuadrícula de por dónde se anda de la plaza y pintar por orden de profundidad).
