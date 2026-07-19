/* CsoChart — shared engine for live CSO line charts on the research page.
 *
 * Each chart is CsoChart.create(config): the engine builds its own controls
 * (multi-select series pills that double as the legend, statistic/unit toggle,
 * data table, PNG export with dark/light theme), fetches one filtered cube via
 * CsoData, and renders to canvas. Chart definitions live in cso-charts-config.js.
 * Full pipeline documentation: /docs/cso-data-pipeline.md
 *
 * Config: {
 *   mount, slug, matrix, title, source,
 *   stats: [{code, label, suffix?, prefix?, scale?, dp?}],   // ≥1; >1 → toggle buttons
 *   sliceDim,              // dimension for the multi-select pills; 'STATISTIC' → stats ARE the pills; null → single series
 *   sliceCodes?,           // curated subset (default: all categories from metadata)
 *   sliceLabels?,          // {code: shortLabel} overrides
 *   defaultSlices?,        // codes on by default
 *   fixed?,                // {dimId: code} pinned dimensions
 *   zeroBase?              // force y-axis to include 0
 * }
 */
var CsoChart = (function () {
  'use strict';

  var PALETTE = ['#58c4dd', '#f0ac5f', '#83c167', '#fc6255', '#9a72ac',
                 '#5cd0b3', '#f472b6', '#818cf8', '#e8b84b', '#76b3fa',
                 '#c4a35a', '#8fd18a', '#d98cb3', '#7fb8d8'];

  var THEMES = {
    dark: {
      bg: '#12121f', text: '#e8e8f4', muted: '#8888aa', axis: '#50506a',
      grid: 'rgba(80,80,106,0.22)', zero: 'rgba(232,232,244,0.25)',
      tooltipBg: '#2e2e46', tooltipBorder: '#58c4dd', glow: true
    },
    light: {
      bg: '#ffffff', text: '#26263a', muted: '#6a6a80', axis: '#9a9ab0',
      grid: 'rgba(60,60,90,0.12)', zero: 'rgba(38,38,58,0.35)',
      tooltipBg: '#f2f2f7', tooltipBorder: '#3ba8c0', glow: false
    }
  };

  var FONT = '"Latin Modern Roman",Georgia,serif';

  /* ── generic helpers ── */
  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  function niceStep(range, maxTicks) {
    var raw = range / (maxTicks || 6);
    if (raw <= 0) return 1;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    return mag * (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10);
  }

  function fmtVal(v, stat) {
    if (v == null) return '–';
    var dp = (stat.dp != null) ? stat.dp : 1;
    var s = v.toFixed(dp);
    if (dp === 0 && Math.abs(v) >= 10000) s = Number(s).toLocaleString('en-IE');
    return (stat.prefix || '') + s + (stat.suffix || '');
  }

  /* first period of its year? code shapes: YYYYMM / YYYYQ / YYYY */
  function firstOfYear(code) {
    if (code.length === 6) return code.slice(4) === '01';
    if (code.length === 5) return code.slice(4) === '1';
    return true;
  }

  /* ── the shared chart renderer (screen + export) ── */
  function drawChart(ctx, W, H, theme, state, opts) {
    opts = opts || {};
    var f = opts.fontScale || 1;
    var M = {
      top: Math.round(46 * f), right: Math.round((opts.legend ? 230 : 26) * f),
      bottom: Math.round((opts.footer ? 74 : 52) * f), left: Math.round(64 * f)
    };
    var series = state.series;      // [{label, color, data:[{code,label,value}]}]
    var stat = state.stat;          // formatting spec
    var periods = series.length ? series[0].data : [];
    var n = periods.length;
    if (!n) return;

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    /* y-range across active series */
    var lo = Infinity, hi = -Infinity;
    series.forEach(function (s) {
      s.data.forEach(function (p) {
        if (p.value == null) return;
        if (p.value < lo) lo = p.value;
        if (p.value > hi) hi = p.value;
      });
    });
    if (lo === Infinity) return;
    if (state.zeroBase) { lo = Math.min(0, lo); }
    var pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
    if (!state.zeroBase || lo < 0) lo -= pad;
    if (lo > 0 && state.zeroBase) lo = 0;
    hi += pad;
    var step = niceStep(hi - lo);
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;

    var plotW = W - M.left - M.right, plotH = H - M.top - M.bottom;
    function toX(i) { return M.left + (n === 1 ? 0.5 : i / (n - 1)) * plotW; }
    function toY(v) { return H - M.bottom - ((v - lo) / (hi - lo)) * plotH; }

    /* grid + y labels */
    ctx.font = Math.round(11 * f) + 'px ' + FONT;
    for (var g = lo; g <= hi + step * 0.01; g += step) {
      var gy = toY(g);
      ctx.strokeStyle = theme.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(M.left, gy); ctx.lineTo(W - M.right, gy); ctx.stroke();
      ctx.fillStyle = theme.muted; ctx.textAlign = 'right';
      var gl = Math.abs(g) < step * 0.01 ? 0 : g;
      ctx.fillText(fmtVal(gl, { dp: step < 1 ? 1 : 0, prefix: stat.prefix, suffix: stat.suffix }), M.left - 6 * f, gy + 4 * f);
    }

    /* zero line when the range crosses it */
    if (lo < 0 && hi > 0) {
      ctx.strokeStyle = theme.zero; ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(M.left, toY(0)); ctx.lineTo(W - M.right, toY(0)); ctx.stroke();
      ctx.setLineDash([]);
    }

    /* x ticks: first period of selected years */
    var yearIdx = [];
    periods.forEach(function (p, i) { if (firstOfYear(p.code)) yearIdx.push(i); });
    var yStepN = Math.max(1, Math.ceil(yearIdx.length / 8));
    ctx.fillStyle = theme.muted; ctx.textAlign = 'center';
    yearIdx.forEach(function (i, k) {
      var year = periods[i].code.slice(0, 4);
      if (+year % yStepN !== 0 && !(yStepN === 1) && k !== 0) return;
      var xx = toX(i);
      ctx.strokeStyle = theme.grid;
      ctx.beginPath(); ctx.moveTo(xx, H - M.bottom); ctx.lineTo(xx, H - M.bottom + 5 * f); ctx.stroke();
      ctx.fillText(year, xx, H - M.bottom + 19 * f);
    });

    /* axes */
    ctx.strokeStyle = theme.axis; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(M.left, M.top); ctx.lineTo(M.left, H - M.bottom);
    ctx.lineTo(W - M.right, H - M.bottom); ctx.stroke();

    /* single-series area fill */
    if (series.length === 1) {
      var grad = ctx.createLinearGradient(0, M.top, 0, H - M.bottom);
      var c = series[0].color;
      grad.addColorStop(0, c + '2e'); grad.addColorStop(1, c + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      var st = false, fx = null, lx = null;
      series[0].data.forEach(function (p, i) {
        if (p.value == null) return;
        var px = toX(i), py = toY(p.value);
        if (!st) { ctx.moveTo(px, py); fx = px; st = true; } else ctx.lineTo(px, py);
        lx = px;
      });
      if (st) {
        var base = toY(Math.max(lo, Math.min(hi, 0)));
        ctx.lineTo(lx, base); ctx.lineTo(fx, base); ctx.closePath(); ctx.fill();
      }
    }

    /* lines */
    series.forEach(function (s) {
      ctx.strokeStyle = s.color; ctx.lineWidth = 2.2 * f;
      ctx.shadowColor = s.color; ctx.shadowBlur = theme.glow ? 7 : 0;
      ctx.beginPath();
      var started = false;
      s.data.forEach(function (p, i) {
        if (p.value == null) { started = false; return; }
        var px = toX(i), py = toY(p.value);
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      });
      ctx.stroke(); ctx.shadowBlur = 0;
      /* endpoint dot */
      var last = s.data.length - 1;
      while (last >= 0 && s.data[last].value == null) last--;
      if (last >= 0) {
        ctx.fillStyle = s.color; ctx.shadowColor = s.color;
        ctx.shadowBlur = theme.glow ? 10 : 0;
        ctx.beginPath(); ctx.arc(toX(last), toY(s.data[last].value), 3.5 * f, 0, Math.PI * 2);
        ctx.fill(); ctx.shadowBlur = 0;
      }
    });

    /* title */
    ctx.fillStyle = theme.text;
    ctx.font = Math.round(13 * f) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(state.title, (M.left + W - M.right) / 2, M.top - 18 * f);

    /* legend (exports; on screen the coloured pills are the legend) */
    if (opts.legend) {
      ctx.font = Math.round(12 * f) + 'px ' + FONT;
      ctx.textAlign = 'left';
      series.forEach(function (s, i) {
        var ly = M.top + 8 * f + i * 22 * f, lx = W - M.right + 14 * f;
        ctx.strokeStyle = s.color; ctx.lineWidth = 2.5 * f;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 24 * f, ly); ctx.stroke();
        ctx.fillStyle = s.color;
        ctx.fillText(s.label, lx + 30 * f, ly + 4 * f);
      });
    }

    /* footer (exports) */
    if (opts.footer) {
      ctx.fillStyle = theme.muted;
      ctx.font = Math.round(11 * f) + 'px ' + FONT;
      ctx.textAlign = 'left';
      ctx.fillText(opts.footer, M.left, H - 18 * f);
    }

    /* hover crosshair + tooltip (screen only) */
    if (!opts.forExport && state.hoverIdx != null) {
      var hi2 = state.hoverIdx;
      if (hi2 >= 0 && hi2 < n) {
        var hx = toX(hi2);
        ctx.strokeStyle = theme.zero; ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(hx, M.top); ctx.lineTo(hx, H - M.bottom); ctx.stroke();
        ctx.setLineDash([]);
        var rows = [];
        series.forEach(function (s) {
          var v = s.data[hi2] ? s.data[hi2].value : null;
          if (v == null) return;
          ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = theme.glow ? 10 : 0;
          ctx.beginPath(); ctx.arc(hx, toY(v), 3.8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
          rows.push({ color: s.color, text: s.label + ': ' + fmtVal(v, stat) });
        });
        if (rows.length > 8) rows = rows.slice(0, 8).concat([{ color: theme.muted, text: '…' }]);
        var head = periods[hi2].label;
        ctx.font = '12px ' + FONT;
        var bw = ctx.measureText(head).width;
        rows.forEach(function (r) { bw = Math.max(bw, ctx.measureText(r.text).width + 14); });
        bw += 18;
        var bh = 24 + rows.length * 17;
        var bx = hx + 12 + bw > W - M.right ? hx - bw - 12 : hx + 12;
        var by = Math.max(M.top + 2, Math.min(H - M.bottom - bh, 90));
        ctx.fillStyle = theme.tooltipBg; ctx.strokeStyle = theme.tooltipBorder; ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 6); else ctx.rect(bx, by, bw, bh);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = theme.text; ctx.textAlign = 'left';
        ctx.fillText(head, bx + 9, by + 16);
        rows.forEach(function (r, i) {
          ctx.fillStyle = r.color;
          ctx.fillRect(bx + 9, by + 24 + i * 17, 8, 8);
          ctx.fillStyle = theme.text;
          ctx.fillText(r.text, bx + 23, by + 32 + i * 17);
        });
      }
    }
  }

  /* Generic PNG download used by every chart type (pyramid included).
     drawFn(ctx, W, H, theme) renders at export size. */
  function exportCanvas(drawFn, slug, themeName) {
    var theme = THEMES[themeName] || THEMES.dark;
    var W = 1600, H = 900;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    drawFn(c.getContext('2d'), W, H, theme);
    var a = document.createElement('a');
    a.download = 'lcecon-' + slug + '-' + themeName + '.png';
    a.href = c.toDataURL('image/png');
    a.click();
  }

  /* ── chart instance ── */
  function create(cfg) {
    var mount = document.getElementById(cfg.mount);
    if (!mount || typeof CsoData === 'undefined') return null;

    var inst = {
      ds: null, slices: [], on: [], activeStat: cfg.stats[0].code,
      hoverIdx: null, canvas: null, ctx: null
    };
    var statBySlice = cfg.sliceDim === 'STATISTIC';

    /* — DOM — */
    var status = el('p', 'status-note', mount);
    status.textContent = 'Fetching live data from the CSO…';
    status.style.display = 'block';
    var controls = el('div', 'data-controls', mount);
    var pillWrap = el('div', 'pill-wrap', controls);
    var statWrap = el('div', 'stat-wrap', controls);
    var actions = el('div', 'chart-actions', controls);

    var tableBtn = el('button', 'btn-toggle', actions);
    tableBtn.type = 'button'; tableBtn.textContent = 'View data table';
    var themeSel = el('select', 'png-theme', actions);
    ['dark', 'light'].forEach(function (t) {
      var o = document.createElement('option');
      o.value = t; o.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      themeSel.appendChild(o);
    });
    var pngBtn = el('button', 'btn-toggle', actions);
    pngBtn.type = 'button'; pngBtn.textContent = 'Download PNG';
    var csvA = el('a', 'btn-toggle', actions);
    csvA.textContent = 'Download CSV'; csvA.target = '_blank'; csvA.rel = 'noopener';
    csvA.href = 'https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/' +
      cfg.matrix + '/CSV/1.0/en';

    inst.canvas = el('canvas', null, mount);
    inst.canvas.style.cssText = 'width:100%;display:block;border-radius:8px;';
    var tableWrap = el('div', 'table-wrap', mount);
    tableWrap.style.display = 'none';
    var caption = el('p', 'chart-caption', mount);
    caption.innerHTML = 'Source: CSO Ireland, PxStat table <strong>' + cfg.matrix +
      '</strong> — ' + cfg.source + '. <span class="upd"></span> Licensed under CC BY 4.0. ' +
      'Cite as: <em>CSO, ' + cfg.source + ' (' + cfg.matrix + '), data.cso.ie</em>.';

    /* — helpers over state — */
    function stat() {
      for (var i = 0; i < cfg.stats.length; i++) {
        if (cfg.stats[i].code === inst.activeStat) return cfg.stats[i];
      }
      return cfg.stats[0];
    }

    function sliceLabel(code, metaLabel) {
      return (cfg.sliceLabels && cfg.sliceLabels[code]) || metaLabel || code;
    }

    function activeSeries() {
      var sp = statBySlice ? null : stat();
      var out = [];
      inst.slices.forEach(function (s, i) {
        if (inst.on.indexOf(s.code) < 0) return;
        var fixed = {};
        var k;
        for (k in (cfg.fixed || {})) fixed[k] = cfg.fixed[k];
        if (statBySlice) {
          fixed.STATISTIC = s.code;
        } else {
          fixed.STATISTIC = inst.activeStat;
          if (cfg.sliceDim) fixed[cfg.sliceDim] = s.code;
        }
        var sc = (statBySlice ? s.spec.scale : sp.scale) || 1;
        var data = CsoData.series(inst.ds, fixed).map(function (p) {
          return { code: p.code, label: p.label, value: p.value == null ? null : p.value * sc };
        });
        out.push({ code: s.code, label: s.label, color: s.color, data: data });
      });
      return out;
    }

    function chartState() {
      var sp = statBySlice ? cfg.stats[0] : stat();
      return {
        series: activeSeries(),
        stat: sp,
        zeroBase: !!cfg.zeroBase,
        hoverIdx: inst.hoverIdx,
        title: cfg.title + (cfg.stats.length > 1 && !statBySlice ? ' — ' + sp.label : '')
      };
    }

    /* — rendering — */
    function draw() {
      var dpr = window.devicePixelRatio || 1;
      var W = Math.min(Math.round(mount.getBoundingClientRect().width), 860);
      if (W < 80) W = 640;
      var H = 320;
      inst.canvas.width = W * dpr; inst.canvas.height = H * dpr;
      inst.canvas.style.width = W + 'px'; inst.canvas.style.height = H + 'px';
      var ctx = inst.canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawChart(ctx, W, H, THEMES.dark, chartState(), {});
    }

    function exportPng() {
      var s = chartState();
      s.hoverIdx = null;
      var footer = 'Source: CSO Ireland, PxStat table ' + cfg.matrix +
        ' (CC BY 4.0) · retrieved via lcecon.ie · ' +
        (CsoData.fmtDate(new Date()) || '');
      exportCanvas(function (ctx, W, H, theme) {
        drawChart(ctx, W, H, theme, s, {
          forExport: true, legend: s.series.length > 1, footer: footer, fontScale: 1.9
        });
      }, cfg.slug, themeSel.value);
    }

    /* — table — */
    function buildTable() {
      var series = activeSeries();
      if (!series.length) return;
      var sp = statBySlice ? cfg.stats[0] : stat();
      var html = '<table class="data-table"><thead><tr><th>Period</th>';
      series.forEach(function (s) { html += '<th>' + s.label + '</th>'; });
      html += '</tr></thead><tbody>';
      for (var i = series[0].data.length - 1; i >= 0; i--) {
        var any = false, row = '<tr><td>' + series[0].data[i].label + '</td>';
        series.forEach(function (s) {
          var v = s.data[i] ? s.data[i].value : null;
          if (v != null) any = true;
          row += '<td>' + fmtVal(v, sp) + '</td>';
        });
        if (any) html += row + '</tr>';
      }
      tableWrap.innerHTML = html + '</tbody></table>';
    }

    function toggleTable() {
      var open = tableWrap.style.display !== 'none';
      if (open) {
        tableWrap.style.display = 'none';
        tableBtn.textContent = 'View data table';
        tableBtn.classList.remove('active');
      } else {
        buildTable();
        tableWrap.style.display = 'block';
        tableBtn.textContent = 'Hide data table';
        tableBtn.classList.add('active');
      }
    }

    /* — controls — */
    function pillStyle(btn, s, on) {
      if (on) {
        btn.style.color = s.color; btn.style.borderColor = s.color;
        btn.style.background = s.color + '22';
      } else {
        btn.style.color = ''; btn.style.borderColor = ''; btn.style.background = '';
      }
    }

    function buildPills() {
      pillWrap.innerHTML = '';
      if (!cfg.sliceDim && !statBySlice) return;
      inst.slices.forEach(function (s) {
        var b = el('button', 'series-pill', pillWrap);
        b.type = 'button'; b.textContent = s.label;
        pillStyle(b, s, inst.on.indexOf(s.code) >= 0);
        b.addEventListener('click', function () {
          var i = inst.on.indexOf(s.code);
          if (i >= 0) {
            if (inst.on.length === 1) return;   // keep at least one series
            inst.on.splice(i, 1);
          } else {
            inst.on.push(s.code);
          }
          inst.on.sort(function (a, b2) {
            return sliceOrder(a) - sliceOrder(b2);
          });
          pillStyle(b, s, i < 0);
          inst.hoverIdx = null;
          draw();
          if (tableWrap.style.display !== 'none') buildTable();
        });
      });
    }

    function sliceOrder(code) {
      for (var i = 0; i < inst.slices.length; i++) if (inst.slices[i].code === code) return i;
      return 99;
    }

    function buildStatToggle() {
      statWrap.innerHTML = '';
      if (statBySlice || cfg.stats.length < 2) return;
      cfg.stats.forEach(function (sp) {
        var b = el('button', 'btn-toggle' + (sp.code === inst.activeStat ? ' active' : ''), statWrap);
        b.type = 'button'; b.textContent = sp.label;
        b.addEventListener('click', function () {
          inst.activeStat = sp.code;
          Array.prototype.forEach.call(statWrap.children, function (c) { c.classList.remove('active'); });
          b.classList.add('active');
          inst.hoverIdx = null;
          draw();
          if (tableWrap.style.display !== 'none') buildTable();
        });
      });
    }

    /* — data — */
    function buildQuery() {
      var dims = {};
      dims.STATISTIC = cfg.stats.map(function (s) { return s.code; });
      if (cfg.sliceDim && !statBySlice && cfg.sliceCodes) dims[cfg.sliceDim] = cfg.sliceCodes;
      var k;
      for (k in (cfg.fixed || {})) dims[k] = [cfg.fixed[k]];
      return dims;
    }

    function onData(ds) {
      inst.ds = ds;
      if (statBySlice) {
        inst.slices = cfg.stats.map(function (sp, i) {
          return { code: sp.code, label: sp.label, color: PALETTE[i % PALETTE.length], spec: sp };
        });
      } else if (cfg.sliceDim) {
        var cats = CsoData.categories(ds, cfg.sliceDim);
        if (cfg.sliceCodes) {
          cats = cfg.sliceCodes.map(function (c) {
            for (var i = 0; i < cats.length; i++) if (cats[i].code === c) return cats[i];
            return null;
          }).filter(Boolean);
        }
        inst.slices = cats.map(function (c, i) {
          return { code: c.code, label: sliceLabel(c.code, c.label), color: PALETTE[i % PALETTE.length] };
        });
      } else {
        inst.slices = [{ code: '_', label: cfg.title, color: PALETTE[0] }];
        inst.on = ['_'];
      }
      if (!inst.on.length) {
        inst.on = (cfg.defaultSlices || [inst.slices[0].code]).slice();
      }
      var up = CsoData.fmtDate(CsoData.updated(ds));
      var updEl = caption.querySelector('.upd');
      if (updEl && up) updEl.textContent = 'Updated ' + up + '.';
      status.style.display = 'none';
      buildPills();
      buildStatToggle();
      draw();
    }

    function onFail() {
      status.textContent = 'The live connection to the CSO is unavailable right now — please try again later. The full dataset is still available via the Download CSV button.';
      status.style.display = 'block';
    }

    /* — events — */
    tableBtn.addEventListener('click', toggleTable);
    pngBtn.addEventListener('click', exportPng);
    inst.canvas.addEventListener('mousemove', function (e) {
      if (!inst.ds) return;
      var series = activeSeries();
      if (!series.length) return;
      var n = series[0].data.length;
      var rect = inst.canvas.getBoundingClientRect();
      var W = parseFloat(inst.canvas.style.width);
      var plotW = W - 64 - 26;
      var frac = (e.clientX - rect.left - 64) / plotW;
      var idx = Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
      if (idx !== inst.hoverIdx) { inst.hoverIdx = idx; draw(); }
    });
    inst.canvas.addEventListener('mouseleave', function () {
      if (inst.hoverIdx != null) { inst.hoverIdx = null; draw(); }
    });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (inst.ds) draw(); }, 90);
    });

    CsoData.fetchDataset(cfg.matrix, buildQuery()).then(onData).catch(onFail);
    return inst;
  }

  return { create: create, exportCanvas: exportCanvas, THEMES: THEMES, PALETTE: PALETTE, FONT: FONT };
})();
