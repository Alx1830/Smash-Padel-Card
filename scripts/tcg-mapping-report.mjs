/**
 * Genera una pagina para revisar el mapeo a TCGplayer con los ojos.
 *
 * Lee scripts/tcgplayer-mapping/ y escribe un HTML autocontenido: resumen,
 * lo que quedo pendiente, y la tabla de sets que se despliega carta por carta.
 *
 * Uso: node scripts/tcg-mapping-report.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAP_DIR   = path.resolve(__dirname, "tcgplayer-mapping");
const CARDS_DIR = path.join(MAP_DIR, "cards");
const OUT       = process.argv[2] ?? path.join(MAP_DIR, "mapeo.html");

// Los sets que armamos desde TCGplayer traen el producto de origen anotado por
// el scraper, asi que su mapeo es directo y entra en la cuenta como cualquiera.

const sets = JSON.parse(fs.readFileSync(path.join(MAP_DIR, "sets.json"), "utf8"));

// ── Recoger datos ───────────────────────────────────────────────────────────
const FLAG = { ok: 0, review: 1, missing: 2 };
const filas = [];
const pendientes = [];
let tot = 0, ok = 0, rev = 0, mis = 0;

for (const file of fs.readdirSync(CARDS_DIR)) {
  const j = JSON.parse(fs.readFileSync(path.join(CARDS_DIR, file), "utf8"));
  const propio = j.propio === true;

  const cards = Object.entries(j.cards).map(([n, c]) => [
    +n, c.name, c.product_id ?? 0, FLAG[c.status], c.versions?.length ?? 0,
  ]).sort((a, b) => a[0] - b[0]);

  filas.push({
    id: j.set,
    nombre: sets[j.set]?.name ?? j.set,
    tcg: j.tcg_set,
    code: j.code ?? null,
    propio,
    s: j.summary,
    cards,
  });

  tot += j.summary.total; ok += j.summary.ok; rev += j.summary.review; mis += j.summary.missing;
  for (const [n, c] of Object.entries(j.cards)) {
    if (c.status === "ok") continue;
    pendientes.push({
      set: sets[j.set]?.name ?? j.set,
      num: +n, name: c.name, status: c.status,
      tcg: c.tcg_name ?? null, note: c.note ?? null,
    });
  }
}

filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
pendientes.sort((a, b) => a.set.localeCompare(b.set, "es") || a.num - b.num);

const sinEquivalente = Object.entries(sets)
  .filter(([, e]) => e.status === "no_existe")
  .map(([id, e]) => ({ id, nombre: e.name, motivo: e.note }))
  .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

const datos = { filas, pendientes, sinEquivalente, resumen: { tot, ok, rev, mis, sets: filas.length } };

// Los mismos datos para la seccion de admin dentro de la app
const PUBLIC_JSON = path.resolve(__dirname, "../public/tcg-mapping.json");
fs.writeFileSync(PUBLIC_JSON, JSON.stringify({ ...datos, generado: new Date().toISOString() }));

// ── Pagina ──────────────────────────────────────────────────────────────────
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pct = ((ok / tot) * 100).toFixed(2);

const html = `<title>Mapeo FaceBinder · TCGplayer</title>
<style>
:root {
  /* Neutros con sesgo verde, tomados del acento de la app */
  --ground: #0a0f11;
  --surface: #111a1d;
  --surface-2: #162227;
  --line: #24343a;
  --ink: #eaf2f1;
  --ink-soft: #8aa4a2;
  --ink-faint: #5d7573;
  --accent: #2ee6c1;
  --accent-dim: #1c8f7a;
  --warn: #e8a33d;
  --crit: #f0616b;
  --radius: 4px;
  --mono: ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace;
  --sans: "Segoe UI", system-ui, -apple-system, sans-serif;
}
@media (prefers-color-scheme: light) {
  :root {
    --ground: #f4f7f7; --surface: #ffffff; --surface-2: #eef3f3;
    --line: #d3e0df; --ink: #0d1a1c; --ink-soft: #526a68; --ink-faint: #7b918f;
    --accent: #0f9e85; --accent-dim: #8fd9cb; --warn: #9a6410; --crit: #c0313c;
  }
}
:root[data-theme="light"] {
  --ground: #f4f7f7; --surface: #ffffff; --surface-2: #eef3f3;
  --line: #d3e0df; --ink: #0d1a1c; --ink-soft: #526a68; --ink-faint: #7b918f;
  --accent: #0f9e85; --accent-dim: #8fd9cb; --warn: #9a6410; --crit: #c0313c;
}
:root[data-theme="dark"] {
  --ground: #0a0f11; --surface: #111a1d; --surface-2: #162227;
  --line: #24343a; --ink: #eaf2f1; --ink-soft: #8aa4a2; --ink-faint: #5d7573;
  --accent: #2ee6c1; --accent-dim: #1c8f7a; --warn: #e8a33d; --crit: #f0616b;
}

* { box-sizing: border-box; }
body {
  margin: 0; background: var(--ground); color: var(--ink);
  font-family: var(--sans); font-size: 15px; line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 1180px; margin: 0 auto; padding: 40px 24px 80px; }

.eyebrow {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.24em;
  text-transform: uppercase; color: var(--accent);
  display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
}
.eyebrow::before { content: ""; width: 22px; height: 1px; background: var(--accent); }

h1 {
  font-size: clamp(26px, 3.4vw, 40px); line-height: 1.1; margin: 0 0 10px;
  letter-spacing: -0.025em; font-weight: 700; text-wrap: balance;
}
.lede { color: var(--ink-soft); max-width: 62ch; margin: 0 0 34px; }

/* Resumen */
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1px;
  background: var(--line); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; margin-bottom: 14px; }
.stat { background: var(--surface); padding: 18px 20px; }
.stat-k { font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ink-faint); margin-bottom: 8px; }
.stat-v { font-size: 27px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.stat-v.good { color: var(--accent); }
.stat-v.warn { color: var(--warn); }
.stat-v.crit { color: var(--crit); }
.stat-sub { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); margin-top: 3px; }

section { margin-top: 46px; }
h2 { font-size: 19px; letter-spacing: -0.01em; margin: 0 0 6px; font-weight: 650; }
.sub { color: var(--ink-soft); font-size: 14px; margin: 0 0 18px; max-width: 68ch; }

/* Controles */
.controls { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px; }
input[type="search"] {
  flex: 1 1 260px; min-width: 0; background: var(--surface); color: var(--ink);
  border: 1px solid var(--line); border-radius: var(--radius);
  padding: 9px 12px; font-family: var(--sans); font-size: 14px;
}
input[type="search"]::placeholder { color: var(--ink-faint); }
input[type="search"]:focus-visible, button:focus-visible, .row:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px;
}
.seg { display: flex; border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.seg button {
  background: var(--surface); color: var(--ink-soft); border: 0; cursor: pointer;
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 9px 14px; border-right: 1px solid var(--line);
}
.seg button:last-child { border-right: 0; }
.seg button[aria-pressed="true"] { background: var(--surface-2); color: var(--accent); }

/* Tabla */
.tablewrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th {
  text-align: left; font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink-faint); font-weight: 500;
  padding: 11px 14px; border-bottom: 1px solid var(--line); white-space: nowrap;
  position: sticky; top: 0; background: var(--surface);
}
td { padding: 10px 14px; border-bottom: 1px solid var(--line); vertical-align: middle; }
tr:last-child td { border-bottom: 0; }
.num { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--mono); font-size: 13px; }
.row { cursor: pointer; }
.row:hover td { background: var(--surface-2); }
.setname { font-weight: 600; }
.tcgname { color: var(--ink-soft); font-family: var(--mono); font-size: 12px; }
.caret { color: var(--ink-faint); font-family: var(--mono); width: 1em; display: inline-block; }

/* Barra de cobertura */
.bar { width: 100px; height: 5px; background: var(--surface-2); border-radius: 3px; overflow: hidden; }
.bar > i { display: block; height: 100%; background: var(--accent); }
.bar > i.part { background: var(--warn); }

.pill {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 999px; white-space: nowrap; border: 1px solid;
}
.pill.ok { color: var(--accent); border-color: var(--accent-dim); }
.pill.rev { color: var(--warn); border-color: var(--warn); }
.pill.mis { color: var(--crit); border-color: var(--crit); }
.pill.own { color: var(--ink-faint); border-color: var(--line); }

/* Detalle de cartas */
.detail td { background: var(--ground); padding: 0; }
.cards { max-height: 420px; overflow-y: auto; }
.cards table { font-size: 13px; }
.cards th { background: var(--ground); font-size: 9px; }
.cards td { padding: 6px 14px; border-bottom: 1px solid var(--line); }
.cards tr:hover td { background: var(--surface); }
a { color: var(--accent); text-decoration: none; border-bottom: 1px solid transparent; }
a:hover { border-bottom-color: var(--accent); }
.empty { padding: 26px 14px; color: var(--ink-faint); font-family: var(--mono); font-size: 13px; }
.note { color: var(--ink-faint); font-size: 12px; }
footer { margin-top: 54px; padding-top: 18px; border-top: 1px solid var(--line);
  color: var(--ink-faint); font-family: var(--mono); font-size: 11px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
@media (max-width: 640px) { .wrap { padding: 26px 14px 60px; } .hide-sm { display: none; } }
</style>

<div class="wrap">
  <div class="eyebrow">Auditoría previa a la migración</div>
  <h1>Mapeo de nuestras cartas contra TCGplayer</h1>
  <p class="lede">
    Qué carta nuestra corresponde a cuál de TCGplayer, y con cuánta certeza.
    Esto es solo el mapeo: todavía no se ha cambiado de dónde salen los precios.
  </p>

  <div class="stats">
    <div class="stat"><div class="stat-k">Cartas comparadas</div><div class="stat-v">${tot.toLocaleString("es")}</div><div class="stat-sub">en ${filas.length} sets</div></div>
    <div class="stat"><div class="stat-k">Identificadas</div><div class="stat-v good">${pct}%</div><div class="stat-sub">${ok.toLocaleString("es")} cartas</div></div>
    <div class="stat"><div class="stat-k">Por revisar</div><div class="stat-v ${rev ? "warn" : ""}">${rev}</div><div class="stat-sub">casos ambiguos</div></div>
    <div class="stat"><div class="stat-k">Sin equivalente</div><div class="stat-v ${mis ? "crit" : ""}">${mis}</div><div class="stat-sub">no están en TCGplayer</div></div>
  </div>
  <p class="note">
    Prize Pack Series y Miscellaneous Cards salen al 100 % porque el scraper ya anotó de qué
    producto vino cada carta: ahí el mapeo no hay que deducirlo, viene de origen.
  </p>

  <section>
    <h2>Lo que necesita tu decisión</h2>
    <p class="sub">${pendientes.length === 1 ? "Una carta" : `${pendientes.length} cartas`}. El resto está resuelto.</p>
    <div class="tablewrap">
      <table>
        <thead><tr><th>Set</th><th class="num">Nº</th><th>Nuestra carta</th><th class="hide-sm">En TCGplayer</th><th>Estado</th></tr></thead>
        <tbody id="pend"></tbody>
      </table>
    </div>
  </section>

  <section>
    <h2>Sets que TCGplayer no tiene</h2>
    <p class="sub">Sus precios tendrían que seguir saliendo de Scrydex.</p>
    <div class="tablewrap">
      <table>
        <thead><tr><th>Set</th><th>Motivo</th></tr></thead>
        <tbody id="noexiste"></tbody>
      </table>
    </div>
  </section>

  <section>
    <h2>Todos los sets</h2>
    <p class="sub">Toca cualquier fila para ver sus cartas una por una.</p>
    <div class="controls">
      <input type="search" id="q" placeholder="Buscar un set o una carta…" autocomplete="off">
      <div class="seg" role="group" aria-label="Filtrar por estado">
        <button data-f="todos" aria-pressed="true">Todos</button>
        <button data-f="pendientes" aria-pressed="false">Con pendientes</button>
        <button data-f="completos" aria-pressed="false">Completos</button>
      </div>
    </div>
    <div class="tablewrap">
      <table>
        <thead><tr>
          <th>Set</th><th class="hide-sm">Nombre en TCGplayer</th>
          <th class="num">Cartas</th><th class="num">Listas</th><th>Cobertura</th><th>Estado</th>
        </tr></thead>
        <tbody id="sets"></tbody>
      </table>
    </div>
  </section>

  <footer>Generado desde scripts/tcgplayer-mapping · ${new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</footer>
</div>

<script>
const D = ${JSON.stringify(datos)};
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const PILL = { ok: ['ok','Lista'], review: ['rev','Revisar'], missing: ['mis','Sin match'] };
const FLAGNAME = ['ok','review','missing'];

// Pendientes
document.getElementById('pend').innerHTML = D.pendientes.map(p => {
  const [cls, txt] = PILL[p.status];
  return '<tr><td>' + esc(p.set) + '</td><td class="num">' + p.num + '</td>' +
    '<td class="setname">' + esc(p.name) + '</td>' +
    '<td class="tcgname hide-sm">' + (p.tcg ? esc(p.tcg) : '—') + '</td>' +
    '<td><span class="pill ' + cls + '">' + txt + '</span></td></tr>';
}).join('') || '<tr><td colspan="5" class="empty">Nada pendiente.</td></tr>';

// Sets sin equivalente
document.getElementById('noexiste').innerHTML = D.sinEquivalente.map(s =>
  '<tr><td class="setname">' + esc(s.nombre) + '</td><td class="note">' + esc(s.motivo) + '</td></tr>'
).join('');

// Tabla de sets
const tbody = document.getElementById('sets');
let filtro = 'todos', busq = '';
const abiertos = new Set();

function cobertura(f) { return f.s.total ? Math.round(f.s.ok / f.s.total * 100) : 0; }

function cardsHtml(f) {
  const rows = f.cards.map(([n, name, pid, flag]) => {
    const [cls, txt] = PILL[FLAGNAME[flag]];
    const link = pid
      ? '<a href="https://www.tcgplayer.com/product/' + pid + '" target="_blank" rel="noopener">' + pid + '</a>'
      : '<span class="note">—</span>';
    return '<tr><td class="num">' + n + '</td><td>' + esc(name) + '</td>' +
      '<td class="num">' + link + '</td>' +
      '<td><span class="pill ' + cls + '">' + txt + '</span></td></tr>';
  }).join('');
  return '<tr class="detail"><td colspan="6"><div class="cards"><table>' +
    '<thead><tr><th class="num">Nº</th><th>Carta</th><th class="num">Producto TCGplayer</th><th>Estado</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div></td></tr>';
}

function render() {
  const q = busq.trim().toLowerCase();
  const vis = D.filas.filter(f => {
    if (filtro === 'pendientes' && f.s.review + f.s.missing === 0) return false;
    if (filtro === 'completos' && f.s.review + f.s.missing > 0) return false;
    if (!q) return true;
    if (f.nombre.toLowerCase().includes(q) || (f.tcg ?? '').toLowerCase().includes(q)) return true;
    return f.cards.some(c => c[1].toLowerCase().includes(q));
  });

  if (!vis.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Ningún set coincide con «' + esc(busq) + '».</td></tr>'; return; }

  tbody.innerHTML = vis.map(f => {
    const c = cobertura(f);
    const pend = f.s.review + f.s.missing;
    const estado = f.propio
      ? '<span class="pill ok">Directo del scraper</span>'
      : pend === 0 ? '<span class="pill ok">Completo</span>'
      : '<span class="pill ' + (f.s.missing ? 'mis' : 'rev') + '">' + pend + ' pendiente' + (pend > 1 ? 's' : '') + '</span>';
    const abierto = abiertos.has(f.id);
    return '<tr class="row" tabindex="0" data-id="' + f.id + '" aria-expanded="' + abierto + '">' +
        '<td class="setname"><span class="caret">' + (abierto ? '▾' : '▸') + '</span> ' + esc(f.nombre) + '</td>' +
        '<td class="tcgname hide-sm">' + esc(f.tcg ?? '—') + '</td>' +
        '<td class="num">' + f.s.total + '</td>' +
        '<td class="num">' + f.s.ok + '</td>' +
        '<td><div class="bar" title="' + c + '% identificadas"><i class="' + (c === 100 ? '' : 'part') + '" style="width:' + c + '%"></i></div></td>' +
        '<td>' + estado + '</td>' +
      '</tr>' + (abierto ? cardsHtml(f) : '');
  }).join('');
}

function toggle(id) { abiertos.has(id) ? abiertos.delete(id) : abiertos.add(id); render(); }
tbody.addEventListener('click', e => { const r = e.target.closest('.row'); if (r) toggle(r.dataset.id); });
tbody.addEventListener('keydown', e => {
  const r = e.target.closest('.row');
  if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(r.dataset.id); }
});
document.getElementById('q').addEventListener('input', e => { busq = e.target.value; render(); });
document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
  filtro = b.dataset.f;
  document.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  render();
}));

render();
</script>
`;

fs.writeFileSync(OUT, html, "utf8");
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`${filas.length} sets, ${tot.toLocaleString("es")} cartas comparadas, ${pct}% identificadas`);
console.log(`→ ${path.relative(process.cwd(), OUT)}  (${kb} KB)`);
