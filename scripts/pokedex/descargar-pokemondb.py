"""
Descarga la Pokédex completa de pokemondb.net para los minijuegos.

Por cada Pokémon guarda:
  html/<slug>.html          la página entera (para sacarle más datos en el futuro)
  datos/<slug>.json         lo principal, por forma: número, nombre, tipos, especie,
                            altura, peso, habilidades, entrenamiento, crianza,
                            estadísticas, evoluciones, entradas de la Pokédex,
                            nombres en otros idiomas
  imagenes/<forma>.jpg      la ilustración oficial grande de cada forma
y además indice.json con la tabla de pokedex/all (1.260 filas, con formas).

Respeta el robots.txt del sitio: 2 segundos entre páginas. Si se corta, al
volver a correrlo sigue donde quedó (lo ya bajado no se repite).

Uso:  python scripts/pokedex/descargar-pokemondb.py "<carpeta de salida>"
"""
import json, os, re, sys, time
import requests
from bs4 import BeautifulSoup

SALIDA = sys.argv[1] if len(sys.argv) > 1 else r"C:/Users/Usuario/Documents/VIBE CODING/FACEBINDER PROJECT/pokedex-datos"
BASE = "https://pokemondb.net"
ESPERA = 2.0  # Crawl-delay del robots.txt
sesion = requests.Session()
sesion.headers["User-Agent"] = "FacebinderPokedex/1.0 (minijuego; admin@facebinder.com)"

for carpeta in ("html", "datos", "imagenes"):
    os.makedirs(os.path.join(SALIDA, carpeta), exist_ok=True)

ultimo = [0.0]
def pedir(url, binario=False):
    for intento in range(4):
        falta = ESPERA - (time.time() - ultimo[0])
        if falta > 0: time.sleep(falta)
        ultimo[0] = time.time()
        try:
            r = sesion.get(url, timeout=30)
            if r.status_code == 200: return r.content if binario else r.text
            if r.status_code == 404: return None
        except requests.RequestException:
            pass
        time.sleep(5 * (intento + 1))
    raise RuntimeError(f"No se pudo bajar {url}")

texto = lambda el: " ".join(el.get_text(" ", strip=True).split()) if el else ""

# ── 1. La tabla de todos ──
ruta_indice = os.path.join(SALIDA, "indice.json")
if os.path.exists(ruta_indice):
    indice = json.load(open(ruta_indice, encoding="utf-8"))
else:
    s = BeautifulSoup(pedir(f"{BASE}/pokedex/all"), "html.parser")
    indice = []
    for tr in s.select("table#pokedex tbody tr"):
        tds = tr.select("td")
        enlace = tr.select_one("a.ent-name")
        forma = tr.select_one("td.cell-name small")
        icono = tr.select_one("img.icon-pkmn")
        indice.append({
            "numero": int(tds[0].get("data-sort-value")),
            "nombre": enlace.get_text(strip=True),
            "forma": forma.get_text(strip=True) if forma else None,
            "slug": enlace["href"].rsplit("/", 1)[-1],
            "tipos": [a.get_text(strip=True) for a in tds[2].select("a.type-icon")],
            "total": int(tds[3].get_text(strip=True)),
            "stats": dict(zip(["hp", "ataque", "defensa", "at_esp", "def_esp", "velocidad"], [int(td.get_text(strip=True)) for td in tds[4:10]])),
            "icono": icono["src"] if icono else None,
        })
    json.dump(indice, open(ruta_indice, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("índice:", len(indice), "filas")

# ── 2. La ficha de cada Pokémon ──
def tabla_vitales(t):
    out = {}
    for tr in t.select("tr"):
        if tr.th and tr.td: out[texto(tr.th)] = texto(tr.td)
    return out

def leer_ficha(html, slug):
    s = BeautifulSoup(html, "html.parser")
    tabs = s.select_one(".sv-tabs-tab-list")
    nombres_forma = [a.get_text(strip=True) for a in tabs.select("a")] if tabs else []
    formas = []
    for i, panel in enumerate(s.select("div.sv-tabs-panel[id^=tab-basic-]")):
        art = panel.select_one("a[href*='/artwork/large/']")
        img = panel.select_one("img[src*='/artwork/']")
        tablas = {texto(t.find_previous("h2")): t for t in panel.select("table.vitals-table")}
        datos = tabla_vitales(tablas.get("Pokédex data")) if "Pokédex data" in tablas else {}
        tipos_el = None
        for tr in (tablas.get("Pokédex data").select("tr") if "Pokédex data" in tablas else []):
            if tr.th and texto(tr.th) == "Type": tipos_el = tr.td
        stats = {}
        if "Base stats" in tablas:
            for tr in tablas["Base stats"].select("tr"):
                cel = tr.select("td")
                if tr.th and cel: stats[texto(tr.th)] = {"base": texto(cel[0]), "min": texto(cel[2]) if len(cel) > 2 else "", "max": texto(cel[3]) if len(cel) > 3 else ""}
        defensas = {}
        for t in panel.select("table.type-table"):
            for th, td in zip(t.select("th a, th abbr"), t.select("td")):
                defensas[th.get("title") or texto(th)] = texto(td) or "1"
        formas.append({
            "forma": nombres_forma[i] if i < len(nombres_forma) else None,
            "tipos": [a.get_text(strip=True) for a in tipos_el.select("a")] if tipos_el else [],
            "datos": datos,
            "entrenamiento": tabla_vitales(tablas["Training"]) if "Training" in tablas else {},
            "crianza": tabla_vitales(tablas["Breeding"]) if "Breeding" in tablas else {},
            "stats": stats,
            "defensas_de_tipo": defensas,
            "artwork": art["href"] if art else (img["src"] if img else None),
        })
    def seccion(titulo):
        h = next((h for h in s.select("h2") if texto(h).startswith(titulo)), None)
        return h
    evol = s.select_one(".infocard-list-evo")
    entradas = []
    h = seccion("Pokédex entries")
    if h:
        t = h.find_next("table")
        for tr in t.select("tr"):
            if tr.td: entradas.append({"juegos": texto(tr.th), "texto": texto(tr.td)})
    idiomas = {}
    h = seccion("Other languages")
    if h:
        t = h.find_next("table")
        for tr in t.select("tr"):
            if tr.th and tr.td: idiomas[texto(tr.th)] = texto(tr.td)
    origen = seccion("Name origin")
    return {
        "slug": slug,
        "nombre": texto(s.select_one("main h1")),
        "formas": formas,
        "evoluciones": texto(evol),
        "pokedex": entradas,
        "otros_idiomas": idiomas,
        "origen_nombre": texto(origen.find_next(["p", "dl"])) if origen else "",
    }

slugs = list(dict.fromkeys(f["slug"] for f in indice))
for n, slug in enumerate(slugs, 1):
    ruta_json = os.path.join(SALIDA, "datos", f"{slug}.json")
    ruta_html = os.path.join(SALIDA, "html", f"{slug}.html")
    if os.path.exists(ruta_json):
        ficha = json.load(open(ruta_json, encoding="utf-8"))
    else:
        html = open(ruta_html, encoding="utf-8").read() if os.path.exists(ruta_html) else pedir(f"{BASE}/pokedex/{slug}")
        if html is None: print("sin página:", slug); continue
        open(ruta_html, "w", encoding="utf-8").write(html)
        ficha = leer_ficha(html, slug)
        json.dump(ficha, open(ruta_json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for f in ficha["formas"]:
        url = f.get("artwork")
        if not url: continue
        destino = os.path.join(SALIDA, "imagenes", url.rsplit("/", 1)[-1])
        if not os.path.exists(destino):
            datos = pedir(url, binario=True)
            if datos: open(destino, "wb").write(datos)
    if n % 25 == 0 or n == len(slugs):
        print(f"{n}/{len(slugs)} {slug}", flush=True)
print("listo")
