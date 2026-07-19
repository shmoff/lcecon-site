/* Cloudflare Pages Function — caching proxy for the CSO PxStat API (data.cso.ie).
 *
 *   GET /api/cso/{MATRIX}            → full dataset, JSON-stat 2.0
 *   GET /api/cso/{MATRIX}?q={json}   → filtered subset via PxStat JSON-RPC,
 *                                      where q = {"DIMENSION_CODE":["cat1","cat2"], ...}
 *
 * Why this exists: the CSO sends `cache-control: no-cache` on every response,
 * so without this layer every visitor pays a cold round-trip to ws.cso.ie.
 * Responses here are cached at the Cloudflare edge for 6h and in the browser
 * for 30min. Deployed automatically by Cloudflare Pages (any /functions dir).
 * Full pipeline documentation: /docs/cso-data-pipeline.md
 */

const ALLOWED = new Set([
  'MUM01',           // unemployment (monthly, seasonally adjusted)
  'CPM20',           // consumer price index by commodity group (current, back to 1996)
  'NAQ03',           // GDP and GNP, quarterly
  'NA001', 'NA002',  // modified GNI (GNI*) — NA001 items include GDP/GNP/GNI/GNI*
  'HPM09',           // residential property price index (current series)
  'NDQ01',           // new dwelling completions, quarterly
  'LRM04',           // live register
  'GFQ12', 'GFA12',  // government debt as % of GDP
  'PEA11',           // population estimates by single year of age and sex, 1926–
  'TSM01',           // value of merchandise trade: totals + surplus, monthly 1970–
  'EHQ05',           // average earnings
  'SIA01', 'SIA43',  // poverty rates, income distribution
]);

const REST = 'https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/';
const RPC  = 'https://ws.cso.ie/public/api.jsonrpc';
const CACHE_CONTROL = 'public, max-age=1800, s-maxage=21600';

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign(
      { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      extraHeaders || {}
    ),
  });
}

export async function onRequestGet(context) {
  const { request, params, waitUntil } = context;

  const matrix = String(params.matrix || '').toUpperCase();
  if (!ALLOWED.has(matrix)) {
    return json({ error: 'Unknown or unsupported table: ' + matrix }, 400);
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  if (q && q.length > 4096) return json({ error: 'Query too large' }, 400);

  // Normalised cache key: matrix + q only, so stray params can't fragment the cache
  const cacheKey = new Request(
    url.origin + '/api/cso/' + matrix + (q ? '?q=' + encodeURIComponent(q) : '')
  );
  const cache = caches.default;

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let upstream;
  try {
    if (q) {
      let dims;
      try { dims = JSON.parse(q); } catch (e) {
        return json({ error: 'q is not valid JSON' }, 400);
      }
      if (typeof dims !== 'object' || dims === null || Array.isArray(dims)) {
        return json({ error: 'q must be an object of {dimension: [codes]}' }, 400);
      }
      const dimension = {};
      for (const d of Object.keys(dims)) {
        dimension[d] = { category: { index: dims[d] } };
      }
      // extension is always built server-side so the allowlist can't be bypassed
      const envelope = {
        jsonrpc: '2.0',
        method: 'PxStat.Data.Cube_API.ReadDataset',
        params: {
          class: 'query',
          id: Object.keys(dims),
          dimension: dimension,
          extension: {
            language: { code: 'en' },
            format: { type: 'JSON-stat', version: '2.0' },
            matrix: matrix,
          },
          version: '2.0',
        },
        id: Date.now(),
      };
      upstream = await fetch(RPC, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(envelope),
      });
    } else {
      upstream = await fetch(REST + matrix + '/JSON-stat/2.0/en');
    }
  } catch (e) {
    return json({ error: 'CSO API unreachable' }, 502);
  }

  if (!upstream.ok) {
    return json({ error: 'CSO API returned HTTP ' + upstream.status }, 502);
  }

  let payload;
  try { payload = await upstream.json(); } catch (e) {
    return json({ error: 'CSO API returned non-JSON' }, 502);
  }
  if (payload && payload.error) {
    return json({ error: 'CSO rejected the query', detail: payload.error }, 502);
  }
  if (payload && payload.result) payload = payload.result; // unwrap JSON-RPC
  if (!payload || !payload.dimension || payload.value === undefined) {
    return json({ error: 'Unexpected CSO response shape' }, 502);
  }

  const response = json(payload, 200, {
    'cache-control': CACHE_CONTROL,
    'x-lcecon-cache': 'MISS',
  });
  waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
