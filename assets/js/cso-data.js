/* CsoData — shared loader + JSON-stat 2.0 decoder for CSO PxStat data (data.cso.ie).
 *
 * Fetch order: /api/cso/{matrix} (edge-cached Pages Function proxy)
 *   → direct ws.cso.ie fallback (CORS is open; covers local dev with no proxy)
 *   → stale localStorage copy → reject (chart modules then show static fallback).
 *
 * Full pipeline documentation: /docs/cso-data-pipeline.md
 */
var CsoData = (function () {
  'use strict';

  var PROXY = '/api/cso/';
  var REST  = 'https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/';
  var RPC   = 'https://ws.cso.ie/public/api.jsonrpc';
  var TTL   = 6 * 3600 * 1000; // matches the edge cache: 6 hours

  /* ── localStorage cache (belt-and-braces under the edge cache) ── */
  function lsGet(key) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function lsSet(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
  }

  function isDataset(ds) {
    return !!(ds && ds.dimension && ds.id && ds.value !== undefined);
  }

  function rpcEnvelope(matrix, dims) {
    var dimension = {};
    Object.keys(dims).forEach(function (d) {
      dimension[d] = { category: { index: dims[d] } };
    });
    return {
      jsonrpc: '2.0',
      method: 'PxStat.Data.Cube_API.ReadDataset',
      params: {
        class: 'query',
        id: Object.keys(dims),
        dimension: dimension,
        extension: {
          language: { code: 'en' },
          format: { type: 'JSON-stat', version: '2.0' },
          matrix: matrix
        },
        version: '2.0'
      },
      id: 1
    };
  }

  function fetchJson(url, opts) {
    return fetch(url, opts).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  /* fetchDataset('MUM01') → full cube.
     fetchDataset('MUM01', {STATISTIC:['MUM01C02'], 'C02199V02655':['-']}) → subset.
     Unlisted dimensions return all their categories. Resolves a JSON-stat 2.0 object. */
  function fetchDataset(matrix, dims) {
    var key = 'cso:' + matrix + ':' + (dims ? JSON.stringify(dims) : 'full');
    var cached = lsGet(key);
    if (cached && cached.t && (Date.now() - cached.t) < TTL && isDataset(cached.ds)) {
      return Promise.resolve(cached.ds);
    }

    var proxyUrl = PROXY + matrix +
      (dims ? '?q=' + encodeURIComponent(JSON.stringify(dims)) : '');

    return fetchJson(proxyUrl)
      .catch(function () {
        if (dims) {
          return fetchJson(RPC, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(rpcEnvelope(matrix, dims))
          }).then(function (body) {
            if (body && body.error) throw new Error('CSO rejected query');
            return body.result;
          });
        }
        return fetchJson(REST + matrix + '/JSON-stat/2.0/en');
      })
      .then(function (ds) {
        if (ds && ds.result) ds = ds.result;
        if (!isDataset(ds)) throw new Error('Unexpected response shape for ' + matrix);
        lsSet(key, { t: Date.now(), ds: ds });
        return ds;
      })
      .catch(function (err) {
        if (cached && isDataset(cached.ds)) return cached.ds; // stale beats nothing
        throw err;
      });
  }

  /* ── JSON-stat 2.0 decoding ──
     category.index is an array of codes in PxStat output, but may be a
     {code: position} object in other JSON-stat sources — handle both. */
  function codeList(dim) {
    var idx = dim.category.index;
    if (Array.isArray(idx)) return idx.slice();
    return Object.keys(idx).sort(function (a, b) { return idx[a] - idx[b]; });
  }
  function codePos(dim, code) {
    var idx = dim.category.index;
    if (Array.isArray(idx)) return idx.indexOf(code);
    return (code in idx) ? idx[code] : -1;
  }

  /* [{code, label}] for one dimension — build UI controls from this so they
     never go stale when the CSO adds categories */
  function categories(ds, dimId) {
    var dim = ds.dimension[dimId];
    if (!dim) return [];
    var labels = dim.category.label || {};
    return codeList(dim).map(function (c) {
      return { code: c, label: labels[c] || c };
    });
  }

  function timeDimension(ds) {
    if (ds.role && ds.role.time && ds.role.time.length) return ds.role.time[0];
    for (var i = 0; i < ds.id.length; i++) {
      if (/^TLIST/.test(ds.id[i])) return ds.id[i];
    }
    return ds.id[ds.id.length - 1];
  }

  function valueAt(ds, flatIdx) {
    var v = Array.isArray(ds.value) ? ds.value[flatIdx] : ds.value[String(flatIdx)];
    return v === undefined ? null : v;
  }

  /* Extract a time series. fixed = {dimId: categoryCode} pinning every
     non-time dimension (a dimension with one category defaults to it).
     Returns [{code, label, value}] in chronological order. */
  function series(ds, fixed) {
    var timeId = timeDimension(ds);
    var n = ds.id.length;

    // row-major strides over ds.id order (the JSON-stat flat-index rule)
    var strides = new Array(n);
    var s = 1;
    for (var i = n - 1; i >= 0; i--) { strides[i] = s; s *= ds.size[i]; }

    var base = 0, timeAxis = -1;
    for (var d = 0; d < n; d++) {
      var dimId = ds.id[d];
      if (dimId === timeId) { timeAxis = d; continue; }
      var code = fixed ? fixed[dimId] : undefined;
      var pos = (code === undefined) ? 0 : codePos(ds.dimension[dimId], code);
      if (pos < 0) throw new Error('Unknown category "' + code + '" in ' + dimId);
      base += pos * strides[d];
    }

    var tDim = ds.dimension[timeId];
    var labels = tDim.category.label || {};
    return codeList(tDim).map(function (code, t) {
      return {
        code: code,
        label: labels[code] || fmtPeriod(code),
        value: valueAt(ds, base + t * strides[timeAxis])
      };
    });
  }

  function updated(ds) { return ds.updated ? new Date(ds.updated) : null; }

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  /* '202606' → 'Jun 2026'; PxStat quarterly '20254' → '2025 Q4'; annual passes through */
  function fmtPeriod(code) {
    var m = /^(\d{4})(\d{2})$/.exec(code);
    if (m && +m[2] >= 1 && +m[2] <= 12) return MONTHS[+m[2] - 1] + ' ' + m[1];
    var q = /^(\d{4})([1-4])$/.exec(code);
    if (q) return q[1] + ' Q' + q[2];
    return code;
  }

  function fmtDate(d) {
    if (!d || isNaN(d.getTime())) return null;
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  return {
    fetchDataset: fetchDataset,
    categories: categories,
    series: series,
    updated: updated,
    fmtPeriod: fmtPeriod,
    fmtDate: fmtDate
  };
})();
