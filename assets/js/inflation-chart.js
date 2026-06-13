/* Inflation Chart — HICP annual average inflation rates for Ireland and EU27
   Fetches live data from Eurostat API and renders a line chart on #inflation-canvas */
var InflationChart = (function () {
  'use strict';

  var COLORS = {
    bg:      '#12121f',
    surface: '#25253a',
    accent:  '#58c4dd',
    red:     '#fc6255',
    equil:   '#f0ac5f',
    green:   '#83c167',
    text:    '#e8e8f4',
    muted:   '#8888aa',
    axis:    '#50506a',
    grid:    'rgba(80,80,106,0.22)'
  };

  var EUROSTAT_URL =
    'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/' +
    'prc_hicp_aind?geo=IE&geo=EU27_2020&coicop=CP00&unit=INX_A_AVG' +
    '&time=2015:2024&sinceTimePeriod=2015&format=JSON';

  // Static fallback data (index values 2015=100), rates will be computed
  var FALLBACK_INDICES = {
    IE: [100, 99.9, 100.3, 100.8, 101.5, 103.9, 106.9, 116.1, 129.4, 131.3],
    EU: [100, 99.9, 101.3, 103.1, 104.9, 106.2, 108.3, 117.5, 127.8, 131.4]
  };
  // years 2015..2024
  var ALL_YEARS = [2015,2016,2017,2018,2019,2020,2021,2022,2023,2024];

  var canvas, ctx;
  var M = { top: 44, right: 120, bottom: 56, left: 58 };
  var chartData = null; // {years, ie, eu} arrays for display years 2016-2024

  /* ── helpers ── */
  function indicesToRates(indices) {
    var rates = [];
    for (var i = 1; i < indices.length; i++) {
      if (indices[i] != null && indices[i-1] != null && indices[i-1] !== 0) {
        rates.push((indices[i] / indices[i-1] - 1) * 100);
      } else {
        rates.push(null);
      }
    }
    return rates; // length n-1, years[1]..years[n-1]
  }

  function setupCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var parent = canvas.parentElement;
    var W = Math.min(Math.round(parent.getBoundingClientRect().width - 32), 860);
    var H = 300;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { W: W, H: H };
  }

  /* ── parse Eurostat JSON ── */
  function parseEurostat(data) {
    var dim   = data.dimension;
    var vals  = data.value;
    var timeIdx  = dim.time.category.index;   // e.g. {"2015":0,"2016":1,...}
    var geoIdx   = dim.geo.category.index;    // e.g. {"IE":0,"EU27_2020":1}

    var years    = Object.keys(timeIdx).map(Number).sort(function(a,b){return a-b;});
    var nYears   = years.length;

    var geoKeys  = Object.keys(geoIdx);
    var ieKey    = geoKeys.find(function(k){return k==='IE';})||geoKeys[0];
    var euKey    = geoKeys.find(function(k){return /EU27/i.test(k);})||geoKeys[1];
    var iePos    = geoIdx[ieKey];
    var euPos    = geoIdx[euKey];

    function extract(geoPos) {
      return years.map(function(y) {
        var yp = timeIdx[String(y)];
        var idx = geoPos * nYears + yp;
        return vals[idx] != null ? vals[idx] : null;
      });
    }

    var ieIndices = extract(iePos);
    var euIndices = extract(euPos);

    var ieRates = indicesToRates(ieIndices);
    var euRates = indicesToRates(euIndices);
    var dispYears = years.slice(1); // 2016..2024

    return { years: dispYears, ie: ieRates, eu: euRates };
  }

  /* ── draw ── */
  function draw() {
    var dims = setupCanvas();
    var W = dims.W, H = dims.H;
    if (!chartData) return;

    var years = chartData.years;
    var ieRates = chartData.ie;
    var euRates = chartData.eu;

    // y-scale
    var allVals = ieRates.concat(euRates).filter(function(v){return v!=null;});
    var yMin = Math.min.apply(null, allVals);
    var yMax = Math.max.apply(null, allVals);
    var pad  = Math.max(0.5, (yMax - yMin) * 0.12);
    yMin = Math.floor((yMin - pad) * 2) / 2;
    yMax = Math.ceil((yMax  + pad) * 2) / 2;

    var plotW = W - M.left - M.right;
    var plotH = H - M.top  - M.bottom;

    function toX(i) { return M.left + (i / (years.length - 1)) * plotW; }
    function toY(v) { return H - M.bottom - ((v - yMin) / (yMax - yMin)) * plotH; }
    function toYZero() { return toY(0); }

    /* background */
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    /* shading above zero (mild red tint for positive inflation region) */
    var yZero = toYZero();
    if (yZero > M.top) {
      ctx.fillStyle = 'rgba(252,98,85,0.06)';
      ctx.fillRect(M.left, M.top, plotW, Math.min(yZero - M.top, plotH));
    }

    /* grid lines */
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    var yStep = yMax > 5 ? 2 : 1;
    for (var yv = Math.ceil(yMin); yv <= yMax; yv += yStep) {
      var yy = toY(yv);
      if (yy < M.top || yy > H - M.bottom) continue;
      ctx.beginPath(); ctx.moveTo(M.left, yy); ctx.lineTo(W - M.right, yy); ctx.stroke();
    }

    /* zero line */
    if (yMin < 0 && yMax > 0) {
      var yz = toYZero();
      ctx.strokeStyle = 'rgba(232,232,244,0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(M.left, yz); ctx.lineTo(W - M.right, yz); ctx.stroke();
      ctx.setLineDash([]);
    }

    /* x-axis grid / ticks */
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (var xi = 0; xi < years.length; xi++) {
      var xx = toX(xi);
      ctx.beginPath(); ctx.moveTo(xx, M.top); ctx.lineTo(xx, H - M.bottom + 4); ctx.stroke();
    }

    /* axes */
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(M.left, M.top);
    ctx.lineTo(M.left, H - M.bottom);
    ctx.lineTo(W - M.right, H - M.bottom);
    ctx.stroke();

    /* y-axis labels */
    ctx.fillStyle = COLORS.muted;
    ctx.font = '11px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign = 'right';
    for (var yv2 = Math.ceil(yMin); yv2 <= yMax; yv2 += yStep) {
      var yy2 = toY(yv2);
      if (yy2 < M.top - 2 || yy2 > H - M.bottom + 2) continue;
      ctx.fillText(yv2.toFixed(0) + '%', M.left - 6, yy2 + 4);
    }

    /* x-axis labels */
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'center';
    for (var xi2 = 0; xi2 < years.length; xi2++) {
      ctx.fillText(String(years[xi2]), toX(xi2), H - M.bottom + 18);
    }

    /* title */
    ctx.fillStyle = COLORS.text;
    ctx.font = '13px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign = 'center';
    ctx.fillText('HICP Inflation Rate (%, annual average)', W / 2, M.top - 18);

    /* helper: draw a line series */
    function drawLine(rates, color, dashed, lineW) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW || 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = dashed ? 0 : 8;
      if (dashed) ctx.setLineDash([6, 3]); else ctx.setLineDash([]);
      ctx.beginPath();
      var started = false;
      for (var i = 0; i < rates.length; i++) {
        if (rates[i] == null) { started = false; continue; }
        var px = toX(i), py = toY(rates[i]);
        if (!started) { ctx.moveTo(px, py); started = true; } else { ctx.lineTo(px, py); }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      /* dots at each data point */
      ctx.shadowColor = color; ctx.shadowBlur = 10;
      for (var i2 = 0; i2 < rates.length; i2++) {
        if (rates[i2] == null) continue;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(toX(i2), toY(rates[i2]), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    /* EU27 (dashed yellow, behind) */
    drawLine(euRates, COLORS.equil, true, 2);

    /* Ireland (solid blue, in front) */
    drawLine(ieRates, COLORS.accent, false, 2.5);

    /* legend — top right inside plot */
    var lx = W - M.right + 8;
    var ly = M.top + 10;
    var legendItems = [
      { color: COLORS.accent, label: 'Ireland',   dashed: false },
      { color: COLORS.equil,  label: 'EU27 avg',  dashed: true  }
    ];
    ctx.font = '11px "Latin Modern Roman",Georgia,serif';
    legendItems.forEach(function (leg, i) {
      var liy = ly + i * 20;
      ctx.strokeStyle = leg.color; ctx.lineWidth = 2;
      if (leg.dashed) ctx.setLineDash([6, 3]); else ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(lx, liy); ctx.lineTo(lx + 22, liy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = leg.color; ctx.textAlign = 'left';
      ctx.fillText(leg.label, lx + 26, liy + 4);
    });

    /* y-axis rotated label */
    ctx.save();
    ctx.fillStyle = COLORS.muted;
    ctx.font = '11px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign = 'center';
    ctx.translate(13, (M.top + H - M.bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Rate (%)', 0, 0);
    ctx.restore();
  }

  /* ── fetch ── */
  function useFallback() {
    var yearsAll = ALL_YEARS;
    var ieIdx = FALLBACK_INDICES.IE;
    var euIdx = FALLBACK_INDICES.EU;
    var ieRates = indicesToRates(ieIdx);
    var euRates = indicesToRates(euIdx);
    chartData = { years: yearsAll.slice(1), ie: ieRates, eu: euRates };
    draw();
  }

  function fetchData() {
    if (!window.fetch) { useFallback(); return; }
    fetch(EUROSTAT_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        try {
          chartData = parseEurostat(json);
          draw();
        } catch (e) {
          useFallback();
        }
      })
      .catch(function () {
        useFallback();
      });
  }

  /* ── init ── */
  function init() {
    canvas = document.getElementById('inflation-canvas');
    if (!canvas) return;
    fetchData();
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { if (chartData) draw(); }, 80);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { redraw: function () { if (chartData) draw(); } };
})();
