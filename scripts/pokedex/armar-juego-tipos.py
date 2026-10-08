"""
Arma los datos del minijuego "¿De qué tipo es?" a partir de la Pokédex
descargada con descargar-pokemondb.py:

  <pokedex-datos>/juego-tipos.json   cada Pokémon y cada forma con sus tipos, para
                                     cargar la tabla pokedex_tipos de Supabase (el
                                     navegador nunca recibe los tipos: los corrige la base)
  public/pokedex/<id>.webp           la ilustración achicada a 256 px (ignorada por git;
                                     al publicar se sube a R2)

Uso:  python scripts/pokedex/armar-juego-tipos.py "<carpeta pokedex-datos>"
"""
import glob, json, os, sys
from PIL import Image, ImageDraw

ORIGEN = sys.argv[1] if len(sys.argv) > 1 else r"C:/Users/Usuario/Documents/VIBE CODING/FACEBINDER PROJECT/pokedex-datos"
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
JSON_SALIDA = os.path.join(ORIGEN, "juego-tipos.json")
IMG_SALIDA = os.path.join(RAIZ, "public", "pokedex")
LADO = 256
TIPOS = {"Normal", "Fire", "Water", "Grass", "Electric", "Ice", "Fighting", "Poison", "Ground",
         "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"}

os.makedirs(IMG_SALIDA, exist_ok=True)
indice = json.load(open(os.path.join(ORIGEN, "indice.json"), encoding="utf-8"))
numero = {f["slug"]: f["numero"] for f in indice}
# El nombre limpio sale de la lista ("Nidoran♀"); el título de la ficha trae agregados ("Nidoran♀ (female)")
nombre = {}
for f in indice: nombre.setdefault(f["slug"], f["nombre"])

salida, sin_foto = [], 0
for ruta in sorted(glob.glob(os.path.join(ORIGEN, "datos", "*.json"))):
    ficha = json.load(open(ruta, encoding="utf-8"))
    vistos = set()
    for f in ficha["formas"]:
        tipos = [t for t in f["tipos"] if t in TIPOS]
        art = f.get("artwork")
        if not tipos or not art: continue
        archivo = art.rsplit("/", 1)[-1]
        ident = archivo.rsplit(".", 1)[0]
        if ident in vistos: continue
        vistos.add(ident)
        original = os.path.join(ORIGEN, "imagenes", archivo)
        if not os.path.exists(original):
            sin_foto += 1
            continue
        destino = os.path.join(IMG_SALIDA, ident + ".webp")
        if not os.path.exists(destino):
            # El fondo de las ilustraciones es blanco: se rellena desde las esquinas
            # (solo el blanco que toca el borde) y se vuelve transparente. Así un
            # Pokémon blanco no queda con agujeros.
            rgb = Image.open(original).convert("RGB")
            MARCA = (255, 0, 255)
            w, h = rgb.size
            for xy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
                if rgb.getpixel(xy) != MARCA: ImageDraw.floodfill(rgb, xy, MARCA, thresh=18)
            im = rgb.convert("RGBA")
            im.putdata([(0, 0, 0, 0) if p[:3] == MARCA else p for p in im.getdata()])
            im.thumbnail((LADO, LADO), Image.LANCZOS)
            im.save(destino, "WEBP", quality=82, method=6)
        forma = f.get("forma")
        base = nombre.get(ficha["slug"], ficha["nombre"])
        salida.append({
            "id": ident,
            "n": numero.get(ficha["slug"], 0),
            "nombre": base,
            "forma": forma if forma and forma != base else None,
            "tipos": tipos,
        })

salida.sort(key=lambda p: (p["n"], p["forma"] or ""))
json.dump(salida, open(JSON_SALIDA, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"{len(salida)} Pokémon y formas · {sin_foto} sin ilustración todavía")
