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
| `assets/js/cso-unemployment.js` | First chart (MUM01). The template to copy for new charts. |
| `research/index.html` | The research study page hosting the charts. |

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

### Table codes in the allowlist

MUM01 (unemployment) · CPM13/CPM16 (CPI) · NAQ03 (GDP/GNP) · NA001/NA002 (GNI*) ·
HPM01 (house prices) · URA26 (dwelling completions) · LRM04 (Live Register) ·
GFQ12/GFA12 (gov debt %GDP) · PEA21 (population) · TSA05 (trade) · EHQ05 (earnings)
· SIA01 (poverty) · SIA43 (income distribution)

Find new codes by browsing data.cso.ie — the table code is shown on every table page.

## Caching layers

| Layer | TTL | Purpose |
|---|---|---|
| Cloudflare edge (`caches.default`) | 6h | Absorbs all traffic; CSO releases land ~11am so data is never stale by more than a few hours |
| Browser HTTP cache (`max-age`) | 30min | Repeat page views |
| localStorage (`cso:{matrix}:{query}`) | 6h, stale kept | Survives CSO/proxy outages |
| Hardcoded fallback in each chart | — | Page never renders broken; clearly labelled in the UI |

## Adding a new chart (checklist)

1. Find the table on data.cso.ie, note its matrix code.
2. Add the code to `ALLOWED` in `functions/api/cso/[matrix].js`.
3. Inspect the cube once: `curl -s ".../ReadDataset/{CODE}/JSON-stat/2.0/en" | jq '.id, .size, (.dimension | map_values(.category.label))'` — note dimension ids and category codes.
4. Copy `cso-unemployment.js` as the template: set the matrix, the query dims
   (pin the statistic + any dimension you don't want to expose), and the fixed
   codes passed to `CsoData.series()`.
5. Build any dropdowns from `CsoData.categories(ds, dimId)` — never hardcode
   category lists; they must survive CSO adding categories.
6. Add the `.interactive-block` section to the page: canvas, controls,
   status line, table wrap, and a caption with table code + `updated` date +
   CC BY 4.0 + a copyable citation.
7. Include a hardcoded fallback series and a status message for the offline case.

## Verifying changes

- Local: `python3 -m http.server 8899` serves the page; charts use the direct-CSO
  fallback path (the proxy only runs on Cloudflare). Check the browser console —
  the proxy 404 is expected locally, errors after it are not.
- Canvas can't be screenshot-verified in the agent environment — verify by
  sampling pixels (`getImageData`) and counting accent-coloured pixels.
- Live after deploy: `curl -s https://lcecon.ie/api/cso/MUM01 | jq .label` proves
  the Pages Function; second request should return fast (edge cache HIT).
- Deploy = push to `main`; Cloudflare Pages auto-builds (~1 min).
