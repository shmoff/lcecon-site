# CSO Live Data Pipeline

How lcecon.ie pulls live data from the CSO statistical database (data.cso.ie) into
interactive charts. Everything here was verified against the live API in July 2026.

## Architecture

```
Student's browser  (research page, vanilla JS + <canvas>)
      │  GET /api/cso/MUM01?q={"STATISTIC":["MUM01C02"],...}     same-origin
      ▼
Cloudflare Pages Function   functions/api/cso/[matrix].js
      │  edge cache 6h · browser cache 30min · matrix allowlist
      ▼
CSO PxStat API   ws.cso.ie   (JSON-stat 2.0, CC BY 4.0, no auth)
```

If the proxy is unreachable (e.g. local dev with `python3 -m http.server`, which
doesn't run Pages Functions), `cso-data.js` falls back to calling ws.cso.ie
directly — its CORS is open — and below that to a stale localStorage copy, and
finally each chart module has hardcoded fallback data so the page never breaks.

## Files

| File | Role |
|---|---|
| `functions/api/cso/[matrix].js` | Pages Function proxy: allowlist, JSON-RPC translation, edge caching. Deployed automatically by Cloudflare Pages — any repo with a `/functions` dir gets them, zero config. |
| `assets/js/cso-data.js` | `CsoData` module: fetch with three-level fallback, JSON-stat 2.0 decoder, localStorage cache, period/date formatters. |
| `assets/js/cso-chart.js` | `CsoChart` engine: builds each chart's controls (multi-select series pills that double as the legend, statistic/unit toggle, data table, PNG export in dark/light theme), renders multi-series canvas line charts with hover crosshair. |
| `assets/js/cso-charts-config.js` | One config object per line chart — this is where charts are added. |
| `assets/js/cso-pyramid.js` | Population pyramid (PEA11): custom renderer with year slider, shares `CsoChart.exportCanvas` for PNG downloads. |
| `assets/js/cso-pie.js` | `CsoPie` donut engine with year slider: data-driven top-N + "Other" slices, legend with shares, hover, themed PNG export. Supports `annualize` (sums monthly/quarterly cubes per year), `signed` (slice size = magnitude, sign shown in legend, centre shows net — for BoP balances), and array-valued `fixedExtra` (sums across codes, e.g. coal+petroleum+gas). Ten donuts across tax, social protection, BoP, UK trade mix, energy and aircraft leasing. |
| `assets/js/cso-map.js` + `ie-regions.js` | Choropleth of Ireland's 8 NUTS3 regions (canvas + Path2D hit-testing, sequential colour scale, ranked bars, year slider). Geometry generated from Eurostat GISCO NUTS 2021 1:3M GeoJSON (© EuroGeographics), 17KB. First dataset: NDQ08 new-dwelling ESB connections summed per year. |
| `research/index.html` | The research study page hosting the charts (each chart = an `.interactive-block` with a mount `<div>`). |
| `docs/cso-pipeline.tex` / `.pdf` | Visual one-glance LaTeX documentation of the whole pipeline. |

## The CSO PxStat API (verified facts)

- **Full dataset (GET):** `https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/{MATRIX}/JSON-stat/2.0/en`
- **CSV (GET):** same URL with `/CSV/1.0/en` — tidy long format, used for the "Download CSV" buttons.
- **Filtered subset (POST):** `https://ws.cso.ie/public/api.jsonrpc`, JSON-RPC 2.0 envelope, method `PxStat.Data.Cube_API.ReadDataset`, params = a JSON-stat query (`class: "query"`, dimension selections, `extension.matrix`). Dimensions you omit return **all** their categories. ~3KB for a filtered slice vs 42KB for the full MUM01 cube.
- **CORS:** open (origin-reflective) — direct browser calls work, including the POST preflight.
- **No API key, no auth.** Licence CC BY 4.0 — attribution is required and is baked into every chart caption.

### Gotchas (learned the hard way)

- The CSO sends `cache-control: no-cache` on everything — that's why the proxy exists.
- `ReadCollection` (list-all-tables) ignores its date filter and returns the whole
  23.5MB catalogue of ~12,800 tables. Never call it client-side; matrix codes are
  hardcoded instead.
- HEAD requests return HTTP 500 — always test with GET.
- PxStat's `category.index` is an **array** of codes; Eurostat's is a `{code: pos}`
  object. `CsoData` handles both.
- JSON-RPC errors come back as HTTP 200 with an `error` field — both the proxy and
  the client check for it.
- Flat-index rule (JSON-stat): value index = row-major position over the `id`
  dimension order using `size` — `CsoData.series()` does this arithmetic.

### Table codes in the allowlist (all verified current, July 2026)

MUM01 (unemployment, monthly SA, 1998–) · CPM20 (CPI by commodity group, 1996–,
index rebased Dec 2023 **and backcast**, plus annual/monthly % change) · NAQ03
(quarterly GDP/GNP) · NA001/NA002 (annual — NA001's *items* include GDP, GNP, GNI
and GNI* in one cube) · HPM09 (RPPI 2005–, 20 property types) · NDQ01 (quarterly
dwelling completions 2011–, raw + SA) · LRM04 (Live Register) · GFQ12/GFA12 (gov
debt %GDP) · PEA11 (population by **single year of age** and sex, 1926–) · TSM01
(monthly trade totals 1970–: exports, imports, surplus, each raw + SA) · EHQ05
(earnings) · SIA01 (poverty) · SIA43 (income distribution)

**Beware discontinued tables**: the catalogue keeps dead series alive with no
flag (CPM13 ends 2016, CPM16 ends 2023, HPM01 ends 2019, URA26 ends 2018, TSA05
ends 2019, PEA21 is by nationality not age). Always check the time dimension's
last period via ReadMetadata before adopting a table:
`curl -s ".../PxStat.Data.Cube_API.ReadMetadata/{CODE}/JSON-stat/2.0/en" | jq '.dimension["TLIST(M1)"].category.index | last'`
Find candidate codes by browsing data.cso.ie — the code is shown on every table page.

## Caching layers

| Layer | TTL | Purpose |
|---|---|---|
| Cloudflare edge (`caches.default`) | 6h | Absorbs all traffic; CSO releases land ~11am so data is never stale by more than a few hours |
| Browser HTTP cache (`max-age`) | 30min | Repeat page views |
| localStorage (`cso:{matrix}:{query}`) | 6h, stale kept | Survives CSO/proxy outages |
| Hardcoded fallback in each chart | — | Page never renders broken; clearly labelled in the UI |

## Adding a new line chart (config-driven — no chart code needed)

1. Find the table on data.cso.ie; **verify it is current** (see above).
2. Add its code to `ALLOWED` in `functions/api/cso/[matrix].js`.
3. Inspect the cube's dimensions once via ReadMetadata (ids, statistic codes,
   category codes).
4. Add a config object to `assets/js/cso-charts-config.js`:
   - `stats`: the statistic codes to expose — >1 creates the unit-toggle buttons.
     Per-stat formatting: `prefix`/`suffix`/`dp`/`scale` (e.g. €000s → €bn is
     `scale: 1e-6, prefix: '€', suffix: 'bn'`).
   - `sliceDim`: the dimension for the multi-select overlay pills;
     `'STATISTIC'` makes the statistics themselves the pills (e.g. exports vs
     imports); `null` gives a single series.
   - `sliceCodes`/`sliceLabels` to curate and rename pills; `defaultSlices` for
     what's on at load; `fixed` to pin remaining dimensions; `zeroBase` for
     rate-like series.
5. Add an `.interactive-block` with a mount `<div id="cc-…">` to
   `research/index.html`. The engine builds everything else (pills, toggles,
   table, PNG/CSV buttons, citation line) automatically — pill lists come from
   live metadata, so they survive the CSO adding categories.

Non-line charts (like the population pyramid) get their own module but should
reuse `CsoData` for fetching and `CsoChart.exportCanvas` for themed PNG export.

## Verifying changes

- Local: `python3 -m http.server 8899` serves the page; charts use the direct-CSO
  fallback path (the proxy only runs on Cloudflare). Check the browser console —
  the proxy 404 is expected locally, errors after it are not.
- Canvas can't be screenshot-verified in the agent environment — verify by
  sampling pixels (`getImageData`) and counting accent-coloured pixels.
- Live after deploy: `curl -s https://lcecon.ie/api/cso/MUM01 | jq .label` proves
  the Pages Function; second request should return fast (edge cache HIT).
- Deploy = push to `main`; Cloudflare Pages auto-builds (~1 min).
