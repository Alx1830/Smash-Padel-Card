"""
Versión de noche del paisaje de Higher Or Lower (public/juego/paisaje.png, 160×90)
para el minijuego "¿De qué tipo es?": cambia la paleta color por color, pone
la luna y estrellas, y las florcitas del pasto pasan a ser luciérnagas.

Uso:  python scripts/pokedex/paisaje-noche.py
"""
import os, random
from PIL import Image

random.seed(7)
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "juego")
dia = Image.open(os.path.join(RAIZ, "paisaje.png")).convert("RGB")
W, H = dia.size
HORIZONTE = 52  # arriba de esta fila los azules son cielo; abajo, el río

CIELO = {(159, 228, 253): (40, 48, 98), (111, 211, 251): (28, 34, 78), (79, 195, 247): (18, 22, 56),
         (94, 200, 240): (24, 30, 68), (58, 174, 222): (14, 18, 46)}
RIO = {(159, 228, 253): (120, 150, 210), (111, 211, 251): (52, 88, 150), (79, 195, 247): (38, 70, 128),
       (94, 200, 240): (44, 78, 138), (58, 174, 222): (30, 56, 108)}
FIJOS = {
    # nubes y nieve: blancos bajo la luna
    (223, 243, 255): (92, 104, 150), (207, 233, 247): (80, 92, 136), (242, 251, 255): (110, 122, 168), (255, 255, 255): (128, 140, 186),
    # montañas
    (87, 104, 138): (38, 44, 72), (107, 127, 163): (50, 58, 90), (143, 168, 196): (64, 74, 110),
    # pasto
    (99, 194, 70): (28, 70, 50), (126, 217, 87): (36, 86, 58), (61, 138, 44): (16, 46, 34), (77, 166, 55): (22, 58, 42),
    (87, 176, 58): (26, 64, 46), (63, 138, 42): (16, 46, 32), (168, 232, 122): (214, 255, 61),
    # tronco
    (138, 90, 43): (64, 42, 26),
}

noche = Image.new("RGB", (W, H))
for y in range(H):
    for x in range(W):
        c = dia.getpixel((x, y))
        if c in FIJOS: n = FIJOS[c]
        elif c in CIELO: n = CIELO[c] if y < HORIZONTE else RIO[c]
        else: n = tuple(int(v * 0.33) + d for v, d in zip(c, (4, 6, 18)))
        # Solo una de cada cuatro florcitas queda como luciérnaga; el resto, pasto
        if c == (168, 232, 122) and random.random() > 0.25: n = (36, 86, 58)
        noche.putpixel((x, y), n)

# Estrellas en el cielo libre (donde no hay nube ni montaña)
cielos = set(CIELO.values())
for _ in range(70):
    x, y = random.randrange(W), random.randrange(HORIZONTE - 6)
    if noche.getpixel((x, y)) in cielos:
        noche.putpixel((x, y), random.choice([(235, 240, 255), (190, 200, 240), (150, 160, 210)]))

# La luna, arriba a la izquierda, con dos cráteres
cx, cy, r = 22, 14, 6
for y in range(cy - r, cy + r + 1):
    for x in range(cx - r, cx + r + 1):
        if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 2:
            noche.putpixel((x, y), (238, 240, 214))
for x, y in ((cx - 2, cy - 1), (cx + 2, cy + 2), (cx + 1, cy - 3)):
    noche.putpixel((x, y), (210, 212, 186))

noche.save(os.path.join(RAIZ, "paisaje-noche.png"), optimize=True)
print("paisaje-noche.png", noche.size, os.path.getsize(os.path.join(RAIZ, "paisaje-noche.png")), "bytes")
