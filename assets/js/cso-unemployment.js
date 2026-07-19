/* Unemployment chart — seasonally adjusted monthly unemployment rate (CSO MUM01),
   fetched live via CsoData, rendered on #unemp-canvas with hover crosshair,
   age-group selector and data-table view. Follows inflation-chart.js conventions. */
var UnempChart = (function () {
  'use strict';

  var COLORS = {
    bg: '#12121f', accent: '#58c4dd', text: '#e8e8f4', muted: '#8888aa',
    axis: '#50506a', grid: 'rgba(80,80,106,0.22)', surface2: '#2e2e46',
    border: '#38385a', equil: '#f0ac5f'
  };

  var MATRIX = 'MUM01';
  var DIM_AGE = 'C02076V02508', DIM_SEX = 'C02199V02655', STAT_RATE = 'MUM01C02';
  var QUERY = {}; // filled in init: rate statistic, both sexes, all ages, all months
  QUERY.STATISTIC = [STAT_RATE];
  QUERY[DIM_SEX] = ['-'];

  /* Approximate January values (15–74, both sexes) shown only if every live
     path fails — clearly labelled as fallback in the UI. */
  var FALLBACK = [
    ['1998', 7.6], ['1999', 5.9], ['2000', 4.9], ['2001', 4.2], ['2002', 4.7],
    ['2003', 4.9], ['2004', 4.6], ['2005', 4.4], ['2006', 4.4], ['2007', 4.7],
    ['2008', 5.7], ['2009', 12.3], ['2010', 13.9], ['2011', 14.7], ['2012', 15.5],
    ['2013', 14.3], ['2014', 12.2], ['2015', 10.3], ['2016', 8.9], ['2017', 7.4],
    ['2018', 6.1], ['2019', 5.4], ['2020', 5.3], ['2021', 6.7], ['2022', 5.2],
    ['2023', 4.4], ['2024', 4.3], ['2025', 4.5]
  ];

  var canvas, ctx, ds = null, seriesData = null;
  var age = '316'; // 15–74 years
  var hoverIdx = null, isFallback = false;
  var M = { top: 46, right: 26, bottom: 52, left: 56 };
  var H = 320;

  function $(id) { return document.getElementById(id); }

  function setupCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var W = Math.min(Math.round(canvas.parentElement.getBoundingClientRect().width - 32), 860);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return W;
  }

  function niceStep(max) {
    var steps = [1, 2, 5, 10];
    for (var i = 0; i < steps.length; i++) {
      if (max / steps[i] <= 8) return steps[i];
    }
    return 10;
  }

  function ageLabel() {
    if (!ds) return '15 - 74 years';
    var cats = CsoData.categories(ds, DIM_AGE);
    for (var i = 0; i < cats.length; i++) if (cats[i].code === age) return cats[i].label;
    return age;
  }

  function draw() {
    var W = setupCanvas();
    if (!seriesData || !seriesData.length) return;

    var n = seriesData.length;
    var vals = seriesData.map(function (p) { return p.value; });
    var maxV = 0;
    vals.forEach(function (v) { if (v != null && v > maxV) maxV = v; });
    var yMax = Math.ceil(maxV * 1.15);
    var yStep = niceStep(yMax);
    yMax = Math.ceil(yMax / yStep) * yStep;

    var plotW = W - M.left - M.right, plotH = H - M.top - M.bottom;
    function toX(i) { return M.left + (n === 1 ? 0.5 : i / (n - 1)) * plotW; }
    function toY(v) { return H - M.bottom - (v / yMax) * plotH; }

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    /* grid + y labels */
    ctx.font = '11px "Latin Modern Roman",Georgia,serif';
    for (var g = 0; g <= yMax; g += yStep) {
      var gy = toY(g);
      ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(M.left, gy); ctx.lineTo(W - M.right, gy); ctx.stroke();
      ctx.fillStyle = COLORS.muted; ctx.textAlign = 'right';
      ctx.fillText(g + '%', M.left - 6, gy + 4);
    }

    /* x labels: January ticks on a year step that yields ~8 labels */
    var janIdx = [];
    seriesData.forEach(function (p, i) {
      if (/^\d{4}01$/.test(p.code) || /^\d{4}$/.test(p.code)) janIdx.push(i);
    });
    var yearStep = Math.max(1, Math.ceil(janIdx.length / 8));
    ctx.fillStyle = COLORS.muted; ctx.textAlign = 'center';
    janIdx.forEach(function (i, k) {
      var year = seriesData[i].code.slice(0, 4);
      if (+year % yearStep !== 0 && k !== 0) return;
      var xx = toX(i);
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath(); ctx.moveTo(xx, H - M.bottom); ctx.lineTo(xx, H - M.bottom + 5); ctx.stroke();
      ctx.fillText(year, xx, H - M.bottom + 19);
    });

    /* axes */
    ctx.strokeStyle = COLORS.axis; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(M.left, M.top); ctx.lineTo(M.left, H - M.bottom);
    ctx.lineTo(W - M.right, H - M.bottom); ctx.stroke();

    /* area fill under the line */
    var grad = ctx.createLinearGradient(0, M.top, 0, H - M.bottom);
    grad.addColorStop(0, 'rgba(88,196,221,0.18)');
    grad.addColorStop(1, 'rgba(88,196,221,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    var started = false, firstX = null, lastX = null;
    for (var i = 0; i < n; i++) {
      if (vals[i] == null) continue;
      var px = toX(i), py = toY(vals[i]);
      if (!started) { ctx.moveTo(px, py); firstX = px; started = true; }
      else ctx.lineTo(px, py);
      lastX = px;
    }
    if (started) {
      ctx.lineTo(lastX, H - M.bottom); ctx.lineTo(firstX, H - M.bottom);
      ctx.closePath(); ctx.fill();
    }

    /* the line */
    ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 2.2;
    ctx.shadowColor = COLORS.accent; ctx.shadowBlur = 8;
    ctx.beginPath(); started = false;
    for (var j = 0; j < n; j++) {
      if (vals[j] == null) { started = false; continue; }
      var qx = toX(j), qy = toY(vals[j]);
      if (!started) { ctx.moveTo(qx, qy); started = true; } else ctx.lineTo(qx, qy);
    }
    ctx.stroke(); ctx.shadowBlur = 0;

    /* latest point: glow dot + value */
    var last = n - 1;
    while (last >= 0 && vals[last] == null) last--;
    if (last >= 0) {
      var lx = toX(last), ly = toY(vals[last]);
      ctx.fillStyle = COLORS.equil; ctx.shadowColor = COLORS.equil; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(lx, ly, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.equil;
      ctx.font = 'bold 13px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign = 'right';
      ctx.fillText(vals[last].toFixed(1) + '%', lx - 8, ly - 10);
    }

    /* title */
    ctx.fillStyle = COLORS.text;
    ctx.font = '13px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign = 'center';
    ctx.fillText('Unemployment Rate (%, seasonally adjusted) — ' + ageLabel(), W / 2, M.top - 18);

    /* hover crosshair + tooltip */
    if (hoverIdx != null && vals[hoverIdx] != null) {
      var hx = toX(hoverIdx), hy = toY(vals[hoverIdx]);
      ctx.strokeStyle = 'rgba(232,232,244,0.3)'; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(hx, M.top); ctx.lineTo(hx, H - M.bottom); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.accent; ctx.shadowColor = COLORS.accent; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

      var tip = seriesData[hoverIdx].label + '  ·  ' + vals[hoverIdx].toFixed(1) + '%';
      ctx.font = '12px "Latin Modern Roman",Georgia,serif';
      var tw = ctx.measureText(tip).width + 16;
      var tx = hx + 10 + tw > W - M.right ? hx - tw - 10 : hx + 10;
      var ty = Math.max(hy - 34, M.top + 2);
      ctx.fillStyle = COLORS.surface2; ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(tx, ty, tw, 24, 6) : ctx.rect(tx, ty, tw, 24);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = COLORS.text; ctx.textAlign = 'left';
      ctx.fillText(tip, tx + 8, ty + 16);
    }
  }

  /* ── data table ── */
  function buildTable() {
    var wrap = $('unemp-table-wrap');
    if (!wrap || !seriesData) return;
    var rows = seriesData.slice().reverse();
    var html = '<table class="data-table"><thead><tr><th>Month</th>' +
      '<th>Rate (%) — ' + ageLabel() + '</th></tr></thead><tbody>';
    rows.forEach(function (p) {
      if (p.value == null) return;
      html += '<tr><td>' + p.label + '</td><td>' + p.value.toFixed(1) + '</td></tr>';
    });
    wrap.innerHTML = html + '</tbody></table>';
  }

  function toggleTable() {
    var wrap = $('unemp-table-wrap'), btn = $('unemp-table-btn');
    var open = wrap.style.display !== 'none';
    if (open) {
      wrap.style.display = 'none';
      btn.textContent = 'View data table';
      btn.classList.remove('active');
    } else {
      buildTable();
      wrap.style.display = 'block';
      btn.textContent = 'Hide data table';
      btn.classList.add('active');
    }
  }

  /* ── wiring ── */
  function setStatus(msg) {
    var el = $('unemp-status');
    if (el) { el.textContent = msg || ''; el.style.display = msg ? 'block' : 'none'; }
  }

  function refreshSeries() {
    var fixed = {};
    fixed.STATISTIC = STAT_RATE;
    fixed[DIM_AGE] = age;
    fixed[DIM_SEX] = '-';
    seriesData = CsoData.series(ds, fixed);
    hoverIdx = null;
    draw();
    if ($('unemp-table-wrap').style.display !== 'none') buildTable();
  }

  function onData(dataset) {
    ds = dataset;
    var sel = $('unemp-age');
    if (sel) {
      sel.innerHTML = '';
      CsoData.categories(ds, DIM_AGE).forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c.code; opt.textContent = c.label;
        if (c.code === age) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.disabled = false;
    }
    var up = CsoData.fmtDate(CsoData.updated(ds));
    var updEl = $('unemp-updated');
    if (updEl && up) updEl.textContent = 'Updated ' + up + '.';
    setStatus('');
    refreshSeries();
  }

  function useFallback() {
    isFallback = true;
    seriesData = FALLBACK.map(function (p) {
      return { code: p[0], label: p[0], value: p[1] };
    });
    var sel = $('unemp-age');
    if (sel) sel.disabled = true;
    setStatus('Live connection to the CSO is unavailable — showing approximate cached figures (15–74 years).');
    draw();
  }

  function onMove(e) {
    if (!seriesData) return;
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var W = parseFloat(canvas.style.width);
    var plotW = W - M.left - M.right;
    var frac = (x - M.left) / plotW;
    var idx = Math.round(frac * (seriesData.length - 1));
    idx = Math.max(0, Math.min(seriesData.length - 1, idx));
    if (idx !== hoverIdx) { hoverIdx = idx; draw(); }
  }
  function onLeave() { if (hoverIdx != null) { hoverIdx = null; draw(); } }

  function init() {
    canvas = $('unemp-canvas');
    if (!canvas || typeof CsoData === 'undefined') return;

    setStatus('Fetching live data from the CSO…');
    CsoData.fetchDataset(MATRIX, QUERY).then(onData).catch(useFallback);

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    var sel = $('unemp-age');
    if (sel) sel.addEventListener('change', function () { age = sel.value; refreshSeries(); });

    var btn = $('unemp-table-btn');
    if (btn) btn.addEventListener('click', toggleTable);

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { if (seriesData) draw(); }, 80);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { redraw: function () { if (seriesData) draw(); } };
})();
