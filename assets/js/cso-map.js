/* CsoMap — choropleth of Ireland's NUTS3 regions (geometry: ie-regions.js,
   derived from Eurostat GISCO, © EuroGeographics). First dataset: new dwelling
   completions proxied by ESB connections (NDQ08), summed per year per region.
   Year slider, hover, ranked bars, themed PNG export via CsoChart.exportCanvas. */
var CsoMap = (function () {
  'use strict';

  var MATRIX = 'NDQ08';
  var DIM_REGION = 'C03789V04537', DIM_TYPE = 'C03451V04162';

  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  /* GISCO name → NDQ08 label variants (Midland vs Midlands) */
  function norm(s) { return s.toLowerCase().replace(/[^a-z]/g, '').replace(/s$/, ''); }

  /* sequential scale: deep navy-ish → manim blue */
  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function scaleColor(t, theme) {
    var lo = theme.glow ? [30, 44, 66] : [222, 235, 242];
    var hi = [88, 196, 221];
    return 'rgb(' + lerp(lo[0], hi[0], t) + ',' + lerp(lo[1], hi[1], t) + ',' + lerp(lo[2], hi[2], t) + ')';
  }

  var mount, canvas, status, caption, slider, yearLbl;
  var ds = null, years = [], regions = [], hoverRegion = null, yearIdx = 0, globalMax = 0;
  var paths = {};   // region label -> Path2D (built lazily)

  /* annual totals: {year: {regionLabel: sum}} from quarterly codes 'YYYYQ' */
  var annual = {};

  function buildAnnual() {
    annual = {};
    var maxPerYear = {};
    regions.forEach(function (rg) {
      var fixed = {};
      fixed[DIM_REGION] = rg.code;
      fixed[DIM_TYPE] = '01';
      var s = CsoData.series(ds, fixed);
      s.forEach(function (p) {
        if (p.value == null) return;
        var y = p.code.slice(0, 4);
        (annual[y] = annual[y] || {})[rg.label] = (annual[y][rg.label] || 0) + p.value;
        (annual[y]._q = annual[y]._q || []).push(p.code.slice(4));
      });
    });
    years = Object.keys(annual).sort();
    globalMax = 0;
    years.forEach(function (y) {
      regions.forEach(function (rg) {
        var v = annual[y][rg.label] || 0;
        if (v > globalMax) globalMax = v;
      });
    });
  }

  function yearLabel(y) {
    var q = annual[y] && annual[y]._q;
    var nq = q ? Math.round(q.length / regions.length) : 4;
    return nq < 4 ? y + ' (to Q' + nq + ')' : y;
  }

  function draw(ctxIn, Win, Hin, themeIn, forExport) {
    var theme = themeIn || CsoChart.THEMES.dark;
    var ctx = ctxIn, W = Win, H = Hin;
    var f = forExport ? 1.85 : 1;
    if (!ctx) {
      var dpr = window.devicePixelRatio || 1;
      W = Math.min(Math.round(mount.getBoundingClientRect().width), 860);
      if (W < 80) W = 640;
      H = 480;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx = canvas.getContext('2d');
      ctx.setTransform((window.devicePixelRatio || 1), 0, 0, (window.devicePixelRatio || 1), 0, 0);
    }
    if (!ds || !years.length) return;

    var y = years[yearIdx];
    var data = annual[y];

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    /* map transform: fit into left 52% */
    var vb = IE_REGIONS_VB;
    var availW = W * 0.5 - 30 * f, availH = H - 80 * f;
    var s = Math.min(availW / vb[0], availH / vb[1]);
    var tx = 24 * f, ty = 56 * f;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(s, s);
    ctx.lineWidth = 1.2 / s;
    Object.keys(IE_REGIONS).forEach(function (gname) {
      var p = paths[gname] || (paths[gname] = new Path2D(IE_REGIONS[gname]));
      var rg = regions.find(function (r) { return norm(r.label) === norm(gname); });
      var v = rg && data[rg.label] != null ? data[rg.label] : null;
      var t = v == null || !globalMax ? 0 : v / globalMax;
      ctx.fillStyle = v == null ? theme.grid : scaleColor(Math.pow(t, 0.7), theme);
      ctx.globalAlpha = (hoverRegion && hoverRegion !== gname && !forExport) ? 0.55 : 1;
      ctx.fill(p);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.bg;
      ctx.stroke(p);
    });
    ctx.restore();

    /* title */
    ctx.fillStyle = theme.text;
    ctx.font = Math.round(14 * f) + 'px ' + CsoChart.FONT;
    ctx.textAlign = 'center';
    ctx.fillText('New Dwelling Completions by Region — ' + yearLabel(y), W / 2, 24 * f);
    ctx.fillStyle = theme.muted;
    ctx.font = Math.round(10.5 * f) + 'px ' + CsoChart.FONT;
    ctx.fillText('(ESB domestic connections for new dwellings)', W / 2, 40 * f);

    /* gradient legend under the map */
    var lgx = 30 * f, lgy = H - 26 * f, lgw = W * 0.32;
    var grad = ctx.createLinearGradient(lgx, 0, lgx + lgw, 0);
    for (var gi = 0; gi <= 10; gi++) grad.addColorStop(gi / 10, scaleColor(Math.pow(gi / 10, 0.7), theme));
    ctx.fillStyle = grad;
    ctx.fillRect(lgx, lgy, lgw, 8 * f);
    ctx.fillStyle = theme.muted;
    ctx.font = Math.round(10 * f) + 'px ' + CsoChart.FONT;
    ctx.textAlign = 'left'; ctx.fillText('0', lgx, lgy - 4 * f);
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(globalMax).toLocaleString('en-IE'), lgx + lgw, lgy - 4 * f);

    /* ranked bars, right side */
    var rows = regions.map(function (rg) {
      return { label: rg.label, value: data[rg.label] || 0 };
    }).sort(function (a, b) { return b.value - a.value; });
    var bx = W * 0.55, bw = W * 0.4, by0 = 64 * f;
    var rowH = Math.min(44 * f, (H - by0 - 30 * f) / rows.length);
    ctx.font = Math.round(11.5 * f) + 'px ' + CsoChart.FONT;
    rows.forEach(function (r, i) {
      var by = by0 + i * rowH;
      var t = globalMax ? r.value / globalMax : 0;
      var hl = hoverRegion && norm(hoverRegion) === norm(r.label);
      ctx.fillStyle = hl ? theme.text : theme.muted;
      ctx.textAlign = 'left';
      ctx.fillText(r.label, bx, by - 4 * f);
      ctx.fillStyle = scaleColor(Math.pow(t, 0.7), theme);
      ctx.fillRect(bx, by, Math.max(2, bw * t), 10 * f);
      ctx.fillStyle = hl ? theme.text : theme.muted;
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(r.value).toLocaleString('en-IE'), bx + bw, by - 4 * f);
    });

    /* hover tooltip on the map side */
    if (hoverRegion && !forExport) {
      var rg2 = regions.find(function (r) { return norm(r.label) === norm(hoverRegion); });
      var v2 = rg2 ? (data[rg2.label] || 0) : 0;
      var tip = (rg2 ? rg2.label : hoverRegion) + ': ' + Math.round(v2).toLocaleString('en-IE');
      ctx.font = '12px ' + CsoChart.FONT;
      var tw = ctx.measureText(tip).width + 18;
      ctx.fillStyle = theme.tooltipBg; ctx.strokeStyle = theme.tooltipBorder; ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(24, H - 60, tw, 24, 6); else ctx.rect(24, H - 60, tw, 24);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = theme.text; ctx.textAlign = 'left';
      ctx.fillText(tip, 33, H - 44);
    }

    if (forExport) {
      ctx.fillStyle = theme.muted;
      ctx.font = Math.round(10.5 * f) + 'px ' + CsoChart.FONT;
      ctx.textAlign = 'right';
      ctx.fillText('Source: CSO PxStat NDQ08 (CC BY 4.0) · boundaries © EuroGeographics · lcecon.ie · ' +
        (CsoData.fmtDate(new Date()) || ''), W - 16 * f, H - 10 * f);
    }
  }

  function onMove(e) {
    if (!ds) return;
    var rect = canvas.getBoundingClientRect();
    var W = parseFloat(canvas.style.width), H = parseFloat(canvas.style.height);
    var mx = e.clientX - rect.left, my = e.clientY - rect.top;
    var vb = IE_REGIONS_VB;
    var s = Math.min((W * 0.5 - 30) / vb[0], (H - 80) / vb[1]);
    var px = (mx - 24) / s, py = (my - 56) / s;
    var hit = null;
    var ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    Object.keys(IE_REGIONS).forEach(function (gname) {
      var p = paths[gname] || (paths[gname] = new Path2D(IE_REGIONS[gname]));
      if (ctx.isPointInPath(p, px, py)) hit = gname;
    });
    ctx.restore();
    if (hit !== hoverRegion) { hoverRegion = hit; draw(); }
  }

  function init() {
    mount = document.getElementById('cc-map');
    if (!mount || typeof CsoData === 'undefined' || typeof CsoChart === 'undefined' ||
        typeof IE_REGIONS === 'undefined') return;

    status = el('p', 'status-note', mount);
    status.textContent = 'Fetching live data from the CSO…';
    status.style.display = 'block';
    var controls = el('div', 'data-controls', mount);
    var sliderWrap = el('div', 'slider-wrap', controls);
    var lbl = el('label', null, sliderWrap); lbl.textContent = 'Year:';
    slider = el('input', null, sliderWrap);
    slider.type = 'range'; slider.disabled = true;
    yearLbl = el('span', 'year-lbl', sliderWrap); yearLbl.textContent = '…';
    var actions = el('div', 'chart-actions', controls);
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
    csvA.href = 'https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/NDQ08/CSV/1.0/en';
    canvas = el('canvas', null, mount);
    canvas.style.cssText = 'width:100%;display:block;border-radius:8px;';
    caption = el('p', 'chart-caption', mount);
    caption.innerHTML = 'Source: CSO Ireland, PxStat table <strong>NDQ08</strong> — ESB Connections (new dwelling completions) by NUTS3 region. <span class="upd"></span> Licensed under CC BY 4.0. Boundaries: Eurostat GISCO, © EuroGeographics. Cite as: <em>CSO, ESB Connections (NDQ08), data.cso.ie</em>.';

    slider.addEventListener('input', function () {
      yearIdx = +slider.value;
      yearLbl.textContent = yearLabel(years[yearIdx]);
      hoverRegion = null;
      draw();
    });
    pngBtn.addEventListener('click', function () {
      var saved = hoverRegion; hoverRegion = null;
      CsoChart.exportCanvas(function (ctx, W, H, theme) {
        draw(ctx, W, H, theme, true);
      }, 'completions-map-' + years[yearIdx], themeSel.value);
      hoverRegion = saved;
    });
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', function () {
      if (hoverRegion) { hoverRegion = null; draw(); }
    });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (ds) draw(); }, 90);
    });

    var q = {};
    q[DIM_TYPE] = ['01'];
    CsoData.fetchDataset(MATRIX, q).then(function (dataset) {
      ds = dataset;
      regions = CsoData.categories(ds, DIM_REGION);
      buildAnnual();
      yearIdx = years.length - 1;
      slider.min = 0; slider.max = years.length - 1;
      slider.value = yearIdx; slider.disabled = false;
      yearLbl.textContent = yearLabel(years[yearIdx]);
      var up = CsoData.fmtDate(CsoData.updated(ds));
      var updEl = caption.querySelector('.upd');
      if (updEl && up) updEl.textContent = 'Updated ' + up + '.';
      status.style.display = 'none';
      draw();
    }).catch(function () {
      status.textContent = 'The live connection to the CSO is unavailable right now — please try again later.';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { redraw: function () { if (ds) draw(); } };
})();
