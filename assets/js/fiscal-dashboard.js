var FiscalDashboard = (function () {
  'use strict';

  var C = {
    bg: '#12121f',
    grid: 'rgba(80,80,106,0.22)',
    axis: '#50506a',
    text: '#e8e8f4',
    muted: '#8888aa',
    irl: '#58c4dd',
    eu: '#f0ac5f',
    zeroLine: 'rgba(232,232,244,0.55)',
    deficitFill: 'rgba(252,98,85,0.08)',
    surplusFill: 'rgba(131,193,103,0.08)',
  };

  var FONT = '"Latin Modern Roman",Georgia,serif';

  // ── Canvas setup ────────────────────────────────────────────────────────────
  function setupCanvas(canvas, h) {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx: ctx, W: canvas.offsetWidth, H: h };
  }

  // ── Loading / error text helpers ─────────────────────────────────────────────
  function drawMessage(canvas, h, msg, color) {
    var s = setupCanvas(canvas, h);
    var ctx = s.ctx;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, s.W, h);
    ctx.fillStyle = color || C.muted;
    ctx.font = '14px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, s.W / 2, h / 2);
  }

  function showLoading() {
    var bc = document.getElementById('fiscal-balance-canvas');
    var dc = document.getElementById('fiscal-debt-canvas');
    if (bc) drawMessage(bc, 280, 'Fetching Eurostat data…', C.muted);
    if (dc) drawMessage(dc, 280, 'Fetching Eurostat data…', C.muted);
  }

  function showError() {
    var bc = document.getElementById('fiscal-balance-canvas');
    var dc = document.getElementById('fiscal-debt-canvas');
    if (bc) {
      drawMessage(bc, 280,
        'Data unavailable — Eurostat API unreachable  ·  Ireland 2023: +1.4% GDP (surplus)',
        C.muted);
    }
    if (dc) {
      drawMessage(dc, 280,
        'Data unavailable — Eurostat API unreachable  ·  Ireland 2023 debt: 43.7% GDP',
        C.muted);
    }
  }

  // ── JSON-stat parser ─────────────────────────────────────────────────────────
  // Returns { years: [...], irl: [...], eu: [...] }
  // Values may be null where data is missing.
  function parseJsonStat(data) {
    var timeIndex = data.dimension.time.category.index; // { "2010": 0, "2011": 1, … }
    var geoIndex  = data.dimension.geo.category.index;  // { "EU27_2020": 0, "IE": 1 } (order varies)

    var years = Object.keys(timeIndex).sort();
    var nTime = years.length;
    var nGeo  = Object.keys(geoIndex).length;

    // The flat value array is laid out as geo × time (outer × inner).
    // Determine which geo offset corresponds to IE and EU27_2020.
    var irlOffset = geoIndex['IE'];
    var euOffset  = geoIndex['EU27_2020'];

    var irlSeries = [];
    var euSeries  = [];

    years.forEach(function (yr) {
      var tIdx = timeIndex[yr];
      var irlIdx = irlOffset * nTime + tIdx;
      var euIdx  = euOffset  * nTime + tIdx;
      var irlVal = data.value[irlIdx];
      var euVal  = data.value[euIdx];
      irlSeries.push(irlVal == null ? null : +irlVal);
      euSeries.push(euVal  == null ? null : +euVal);
    });

    return { years: years, irl: irlSeries, eu: euSeries };
  }

  // ── Nice axis bounds ─────────────────────────────────────────────────────────
  function niceRange(minV, maxV, steps) {
    steps = steps || 5;
    var range = maxV - minV;
    var rough = range / steps;
    var mag = Math.pow(10, Math.floor(Math.log(rough) / Math.LN10));
    var nice = [1, 2, 2.5, 5, 10];
    var step = mag;
    for (var i = 0; i < nice.length; i++) {
      if (nice[i] * mag >= rough) { step = nice[i] * mag; break; }
    }
    var lo = Math.floor(minV / step) * step;
    var hi = Math.ceil(maxV  / step) * step;
    return { lo: lo, hi: hi, step: step };
  }

  // ── Chart renderer ───────────────────────────────────────────────────────────
  function drawChart(canvasId, parsed, opts) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    var H = 280;
    var s = setupCanvas(canvas, H);
    var ctx = s.ctx;
    var W = s.W;

    var M = { top: 48, right: 24, bottom: 38, left: 52 };
    var cW = W - M.left - M.right;
    var cH = H - M.top - M.bottom;

    // Background
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    var years = parsed.years;
    var nYears = years.length;
    if (nYears < 2) return;

    // Gather all non-null values to determine axis range
    var allVals = [];
    parsed.irl.forEach(function (v) { if (v != null) allVals.push(v); });
    parsed.eu.forEach(function (v)  { if (v != null) allVals.push(v); });
    if (!allVals.length) return;

    var dataMin = Math.min.apply(null, allVals);
    var dataMax = Math.max.apply(null, allVals);

    // Apply manual hints if provided, else auto-scale with padding
    var pad = (dataMax - dataMin) * 0.12 || 2;
    var sugMin = opts.yMin != null ? opts.yMin : dataMin - pad;
    var sugMax = opts.yMax != null ? opts.yMax : dataMax + pad;

    var r = niceRange(sugMin, sugMax, 5);
    var yLo = r.lo, yHi = r.hi, yStep = r.step;

    // Coordinate helpers
    function xOf(i) { return M.left + (i / (nYears - 1)) * cW; }
    function yOf(v) { return M.top + cH - ((v - yLo) / (yHi - yLo)) * cH; }
    function yOfZero() { return yOf(0); }

    // ── Grid lines ──
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (var gv = yLo; gv <= yHi + yStep * 0.01; gv += yStep) {
      var gy = Math.round(yOf(gv)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(M.left, gy);
      ctx.lineTo(M.left + cW, gy);
      ctx.stroke();
      // Y-axis labels
      ctx.fillStyle = C.axis;
      ctx.font = '10px ' + FONT;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(gv.toFixed(gv % 1 === 0 ? 0 : 1) + '%', M.left - 6, gy);
    }

    // ── Zero line (balance chart only) ──
    if (opts.zeroLine && yLo < 0 && yHi > 0) {
      var z0 = Math.round(yOfZero()) + 0.5;

      // Deficit shade (below zero)
      ctx.fillStyle = C.deficitFill;
      ctx.fillRect(M.left, z0, cW, M.top + cH - z0);

      // Surplus shade (above zero)
      ctx.fillStyle = C.surplusFill;
      ctx.fillRect(M.left, M.top, cW, z0 - M.top);

      // Dashed zero line
      ctx.strokeStyle = C.zeroLine;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(M.left, z0);
      ctx.lineTo(M.left + cW, z0);
      ctx.stroke();
      ctx.setLineDash([]);

      // "0%" label on zero line
      ctx.fillStyle = C.zeroLine;
      ctx.font = '9px ' + FONT;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('0%', M.left - 6, z0);
    }

    // ── X-axis year labels ──
    ctx.fillStyle = C.axis;
    ctx.font = '10px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    years.forEach(function (yr, i) {
      // Label every other year to avoid crowding
      if (nYears > 10 && i % 2 !== 0) return;
      ctx.fillText(yr, xOf(i), H - M.bottom + 6);
    });

    // ── Helper: draw a polyline ignoring null segments ──
    function drawLine(series, color, lw, dash) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.setLineDash(dash || []);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      var started = false;
      ctx.beginPath();
      series.forEach(function (v, i) {
        if (v == null) { started = false; return; }
        var x = xOf(i), y = yOf(v);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else { ctx.lineTo(x, y); }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Helper: draw dots at each data point ──
    function drawDots(series, color, r_dot) {
      ctx.fillStyle = color;
      series.forEach(function (v, i) {
        if (v == null) return;
        ctx.beginPath();
        ctx.arc(xOf(i), yOf(v), r_dot, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // EU27 (dashed yellow) drawn first so Ireland sits on top
    drawLine(parsed.eu,  C.eu,  2,   [6, 3]);
    drawDots(parsed.eu,  C.eu,  2.5);

    // Ireland (solid blue)
    drawLine(parsed.irl, C.irl, 2.5, []);
    drawDots(parsed.irl, C.irl, 3);

    // ── Title ──
    ctx.fillStyle = C.text;
    ctx.font = 'bold 13px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(opts.title, M.left, 10);

    // ── Legend (top-right) ──
    var legX = W - M.right;
    var legY = 10;
    var legSpacing = 16;

    function legendItem(label, color, dash) {
      // Swatch
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      ctx.moveTo(legX - 90, legY + 5);
      ctx.lineTo(legX - 68, legY + 5);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label
      ctx.fillStyle = color;
      ctx.font = '11px ' + FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, legX - 64, legY);
      legY += legSpacing;
    }

    legendItem('Ireland',      C.irl, []);
    legendItem('EU27 average', C.eu,  [6, 3]);
  }

  // ── Data fetch ───────────────────────────────────────────────────────────────
  var BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10dd_edpt1';
  var COMMON = '&unit=PC_GDP&time=2010:2024&sinceTimePeriod=2010&format=JSON';

  function fetchSeries(naItem) {
    var url = BASE + '?geo=IE&geo=EU27_2020&na_item=' + naItem + COMMON;
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    showLoading();

    Promise.all([
      fetchSeries('B9'),  // Budget balance
      fetchSeries('GD'),  // Government debt
    ]).then(function (results) {
      var balanceParsed = parseJsonStat(results[0]);
      var debtParsed    = parseJsonStat(results[1]);

      drawChart('fiscal-balance-canvas', balanceParsed, {
        title: 'Government Budget Balance (% GDP)',
        zeroLine: true,
        yMin: null, // auto-scale
        yMax: null,
      });

      drawChart('fiscal-debt-canvas', debtParsed, {
        title: 'Government Debt (% GDP)',
        zeroLine: false,
        yMin: 0,
        yMax: null,
      });
    }).catch(function () {
      showError();
    });
  }

  // Defer until DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init: init };
})();
