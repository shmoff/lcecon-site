/* CsoPie — donut charts with a year slider for CSO composition data
   (tax revenue by tax head, social protection expenditure by function).
   Shares CsoData for fetching and CsoChart.exportCanvas for themed PNGs. */
var CsoPie = (function () {
  'use strict';

  var OTHER_COLOR = '#55557a';

  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  function fmtVal(v, cfg) {
    if (v == null) return '–';
    var x = v * (cfg.scale || 1);
    return (cfg.prefix || '') + x.toFixed(cfg.dp != null ? cfg.dp : 1) + (cfg.suffix || '');
  }

  /* cfg: {mount, slug, matrix, title, source, query, catDim, excludeCodes?,
           topN?, labelClean?, scale, prefix, suffix, dp} */
  function create(cfg) {
    var mount = document.getElementById(cfg.mount);
    if (!mount || typeof CsoData === 'undefined' || typeof CsoChart === 'undefined') return null;

    var ds = null, years = [], cats = [], yearIdx = 0, hoverSlice = null, canvas;

    var status = el('p', 'status-note', mount);
    status.textContent = 'Fetching live data from the CSO…';
    status.style.display = 'block';
    var controls = el('div', 'data-controls', mount);
    var sliderWrap = el('div', 'slider-wrap', controls);
    var lbl = el('label', null, sliderWrap); lbl.textContent = 'Year:';
    var slider = el('input', null, sliderWrap);
    slider.type = 'range'; slider.disabled = true;
    var yearLbl = el('span', 'year-lbl', sliderWrap); yearLbl.textContent = '…';
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
    csvA.href = 'https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/' +
      cfg.matrix + '/CSV/1.0/en';
    canvas = el('canvas', null, mount);
    canvas.style.cssText = 'width:100%;display:block;border-radius:8px;';
    var caption = el('p', 'chart-caption', mount);
    caption.innerHTML = 'Source: CSO Ireland, PxStat table <strong>' + cfg.matrix +
      '</strong> — ' + cfg.source + '. <span class="upd"></span> Licensed under CC BY 4.0. ' +
      'Cite as: <em>CSO, ' + cfg.source + ' (' + cfg.matrix + '), data.cso.ie</em>.';

    function cleanLabel(s) {
      return cfg.labelClean ? cfg.labelClean(s) : s;
    }

    /* time series for one category, summing across any array-valued fixedExtra
       dims (e.g. petroleum + gas + coal commodity codes) */
    function seriesSum(catCode) {
      var fixedSets = [{}];
      fixedSets[0][cfg.catDim] = catCode;
      var k;
      for (k in (cfg.fixedExtra || {})) {
        var codes = Array.isArray(cfg.fixedExtra[k]) ? cfg.fixedExtra[k] : [cfg.fixedExtra[k]];
        var next = [];
        fixedSets.forEach(function (fs) {
          codes.forEach(function (c) {
            var copy = {}, kk;
            for (kk in fs) copy[kk] = fs[kk];
            copy[k] = c;
            next.push(copy);
          });
        });
        fixedSets = next;
      }
      var acc = null;
      fixedSets.forEach(function (fs) {
        var s = CsoData.series(ds, fs);
        if (!acc) {
          acc = s.map(function (p) { return { code: p.code, value: p.value }; });
        } else {
          s.forEach(function (p, i) {
            if (p.value != null) acc[i].value = (acc[i].value || 0) + p.value;
          });
        }
      });
      return acc || [];
    }

    /* value for one category at a period key (a year when annualize is on) */
    function valueFor(catCode, periodKey) {
      var s = seriesSum(catCode);
      if (cfg.annualize) {
        var sum = 0, has = false;
        s.forEach(function (p) {
          if (p.value != null && p.code.slice(0, 4) === periodKey) { sum += p.value; has = true; }
        });
        return has ? sum : null;
      }
      for (var i = 0; i < s.length; i++) if (s[i].code === periodKey) return s[i].value;
      return null;
    }

    /* slices for the selected period, sorted by magnitude, top-N + Other when
       configured. With cfg.signed, slice sizes use |value| (sign in legend) —
       a pie of signed balances would otherwise mislead. */
    function slicesFor(periodKey) {
      var rows = [];
      cats.forEach(function (c) {
        var v = valueFor(c.code, periodKey);
        if (v == null) return;
        if (cfg.signed ? v === 0 : v <= 0) return;
        rows.push({ label: cleanLabel(c.label), value: v, size: Math.abs(v) });
      });
      rows.sort(function (a, b) { return b.size - a.size; });
      if (cfg.topN && rows.length > cfg.topN + 1) {
        var top = rows.slice(0, cfg.topN);
        var rest = rows.slice(cfg.topN);
        var ov = 0, os = 0;
        rest.forEach(function (r) { ov += r.value; os += r.size; });
        top.push({ label: 'Other (' + rest.length + ')', value: ov, size: os, other: true });
        rows = top;
      }
      rows.forEach(function (r, i) {
        r.color = r.other ? OTHER_COLOR : CsoChart.PALETTE[i % CsoChart.PALETTE.length];
      });
      return rows;
    }

    function draw(ctxIn, Win, Hin, themeIn, forExport) {
      var theme = themeIn || CsoChart.THEMES.dark;
      var ctx = ctxIn, W = Win, H = Hin;
      var f = forExport ? 1.85 : 1;
      if (!ctx) {
        var dpr = window.devicePixelRatio || 1;
        W = Math.min(Math.round(mount.getBoundingClientRect().width), 860);
        if (W < 80) W = 640;
        H = 400;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      if (!ds) return;

      var year = years[yearIdx];
      var slices = slicesFor(year.code);
      var total = 0, totalValue = 0;
      slices.forEach(function (s) { total += s.size; totalValue += s.value; });
      if (!total) return;

      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, W, H);

      var cx = W * 0.27, cy = H / 2 + (forExport ? 6 * f : 0);
      var R = Math.min(H * 0.38, W * 0.2), r = R * 0.58;

      /* donut */
      var a0 = -Math.PI / 2;
      slices.forEach(function (s, i) {
        var frac = s.size / total;
        var a1 = a0 + frac * Math.PI * 2;
        var mid = (a0 + a1) / 2;
        var off = (hoverSlice === i && !forExport) ? 7 : 0;
        var ox = Math.cos(mid) * off, oy = Math.sin(mid) * off;
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, R, a0, a1);
        ctx.arc(cx + ox, cy + oy, r, a1, a0, true);
        ctx.closePath();
        ctx.fillStyle = s.color;
        ctx.globalAlpha = (hoverSlice != null && hoverSlice !== i && !forExport) ? 0.45 : 1;
        ctx.fill();
        ctx.globalAlpha = 1;
        s.a0 = a0; s.a1 = a1;
        a0 = a1;
      });

      /* centre: total (net when signed) + year */
      ctx.fillStyle = theme.text;
      ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.round(17 * f) + 'px ' + CsoChart.FONT;
      ctx.fillText(fmtVal(totalValue, cfg), cx, cy - 2);
      ctx.fillStyle = theme.muted;
      ctx.font = Math.round(12 * f) + 'px ' + CsoChart.FONT;
      ctx.fillText((cfg.signed ? 'net · ' : '') + year.label, cx, cy + 17 * f);

      /* title */
      ctx.fillStyle = theme.text;
      ctx.font = Math.round(14 * f) + 'px ' + CsoChart.FONT;
      ctx.fillText(cfg.title + ' — ' + year.label, W / 2, Math.round(22 * f));

      /* legend, right side */
      var lx = W * 0.5, ly0 = Math.round(48 * f);
      var rowH = Math.min(Math.round(19 * f), Math.round((H - ly0 - 10) / slices.length));
      ctx.font = Math.round(11.5 * f) + 'px ' + CsoChart.FONT;
      ctx.textAlign = 'left';
      slices.forEach(function (s, i) {
        var y = ly0 + i * rowH;
        ctx.fillStyle = s.color;
        ctx.fillRect(lx, y - 8 * f, 9 * f, 9 * f);
        ctx.fillStyle = (hoverSlice === i && !forExport) ? theme.text : theme.muted;
        var pct = (s.size / total * 100).toFixed(1);
        var name = s.label.length > 38 ? s.label.slice(0, 37) + '…' : s.label;
        ctx.fillText(name, lx + 15 * f, y);
        ctx.textAlign = 'right';
        var valTxt = (cfg.signed && s.value > 0 ? '+' : '') + fmtVal(s.value, cfg);
        ctx.fillText(valTxt + '  (' + pct + '%)', W - 14 * f, y);
        ctx.textAlign = 'left';
      });

      if (forExport) {
        ctx.fillStyle = theme.muted;
        ctx.font = Math.round(11 * f) + 'px ' + CsoChart.FONT;
        ctx.fillText('Source: CSO Ireland, PxStat table ' + cfg.matrix +
          ' (CC BY 4.0) · retrieved via lcecon.ie · ' + (CsoData.fmtDate(new Date()) || ''),
          14 * f, H - 14 * f);
      }
      return slices;
    }

    function onMove(e) {
      if (!ds) return;
      var rect = canvas.getBoundingClientRect();
      var W = parseFloat(canvas.style.width), H = parseFloat(canvas.style.height);
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var cx = W * 0.27, cy = H / 2;
      var R = Math.min(H * 0.38, W * 0.2), r = R * 0.58;
      var dx = mx - cx, dy = my - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var hit = null;
      if (dist >= r * 0.9 && dist <= R + 8) {
        var ang = Math.atan2(dy, dx);
        var a = ang < -Math.PI / 2 ? ang + Math.PI * 2 : ang;
        var slices = slicesFor(years[yearIdx].code);
        var tot = slices.reduce(function (t, s) { return t + s.size; }, 0);
        var acc = -Math.PI / 2;
        for (var i = 0; i < slices.length; i++) {
          var next = acc + (slices[i].size / tot) * Math.PI * 2;
          if (a >= acc && a < next) { hit = i; break; }
          acc = next;
        }
      }
      if (hit !== hoverSlice) { hoverSlice = hit; draw(); }
    }

    function onData(dataset) {
      ds = dataset;
      var tDim = null;
      ds.id.forEach(function (d) { if (/^TLIST/.test(d)) tDim = d; });
      var tc = CsoData.categories(ds, tDim);
      if (cfg.annualize) {
        var seen = {};
        years = [];
        tc.forEach(function (c) {
          var y = c.code.slice(0, 4);
          if (!seen[y]) { seen[y] = 1; years.push({ code: y, label: y }); }
        });
      } else {
        years = tc;
      }
      yearIdx = years.length - 1;
      cats = CsoData.categories(ds, cfg.catDim).filter(function (c) {
        return !(cfg.excludeCodes && cfg.excludeCodes.indexOf(c.code) >= 0);
      });
      slider.min = 0; slider.max = years.length - 1;
      slider.value = yearIdx; slider.disabled = false;
      yearLbl.textContent = years[yearIdx].label;
      var up = CsoData.fmtDate(CsoData.updated(ds));
      var updEl = caption.querySelector('.upd');
      if (updEl && up) updEl.textContent = 'Updated ' + up + '.';
      status.style.display = 'none';
      draw();
    }

    slider.addEventListener('input', function () {
      yearIdx = +slider.value;
      yearLbl.textContent = years[yearIdx].label;
      hoverSlice = null;
      draw();
    });
    pngBtn.addEventListener('click', function () {
      var saved = hoverSlice; hoverSlice = null;
      CsoChart.exportCanvas(function (ctx, W, H, theme) {
        draw(ctx, W, H, theme, true);
      }, cfg.slug + '-' + (years[yearIdx] ? years[yearIdx].label : ''), themeSel.value);
      hoverSlice = saved;
    });
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', function () {
      if (hoverSlice != null) { hoverSlice = null; draw(); }
    });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (ds) draw(); }, 90);
    });

    CsoData.fetchDataset(cfg.matrix, cfg.query).then(onData).catch(function () {
      status.textContent = 'The live connection to the CSO is unavailable right now — please try again later.';
    });
    return { redraw: function () { if (ds) draw(); } };
  }

  return { create: create };
})();
