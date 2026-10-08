"""
Carga (o actualiza) la tabla pokedex_tipos de Supabase con juego-tipos.json,
que arma armar-juego-tipos.py. Es la tabla con la que la base corrige las
respuestas de "¿De qué tipo es?".

Usa la llave de servicio de .env.local (la tabla no tiene políticas: el
navegador no la puede leer). Uso:
  python scripts/pokedex/cargar-pokedex-tipos.py "<carpeta pokedex-datos>"
"""
import json, os, sys
import requests

ORIGEN = sys.argv[1] if len(sys.argv) > 1 else r"C:/Users/Usuario/Documents/VIBE CODING/FACEBINDER PROJECT/pokedex-datos"
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")

entorno = {}
for linea in open(os.path.join(RAIZ, ".env.local"), encoding="utf-8"):
    if "=" in linea and not linea.lstrip().startswith("#"):
        k, v = linea.strip().split("=", 1)
        entorno[k] = v.strip().strip('"')
URL = entorno["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
LLAVE = entorno["SUPABASE_SERVICE_ROLE_KEY"]

filas = json.load(open(os.path.join(ORIGEN, "juego-tipos.json"), encoding="utf-8"))
cab = {"apikey": LLAVE, "Authorization": f"Bearer {LLAVE}", "Content-Type": "application/json",
       "Prefer": "resolution=merge-duplicates,return=minimal"}
for i in range(0, len(filas), 300):
    tanda = filas[i:i + 300]
    r = requests.post(f"{URL}/rest/v1/pokedex_tipos?on_conflict=id", headers=cab, json=tanda, timeout=60)
    if r.status_code >= 300:
        raise SystemExit(f"Error {r.status_code}: {r.text[:300]}")
r = requests.get(f"{URL}/rest/v1/pokedex_tipos?select=id", headers={**cab, "Prefer": "count=exact", "Range": "0-0"}, timeout=30)
print("cargados:", len(filas), "· en la tabla:", r.headers.get("Content-Range", "?").split("/")[-1])
