/* Population pyramid — CSO PEA11, population estimates by single year of age
   and sex, 1926–2025. Year slider spans a century of Irish demography.
   Shares CsoChart.exportCanvas for themed PNG downloads. */
var CsoPyramid = (function () {
  'use strict';

  var MATRIX = 'PEA11';
  var DIM_AGE = 'C02076V03371', DIM_SEX = 'C02199V02655';
  var MALE = '#58c4dd', FEMALE = '#f472b6';

  var mount, canvas, status, caption, slider, yearLbl;
  var ds = null, years = [], ages = [], yearIdx = 0, hoverRow = null;

  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  /* series of values for one sex across ages, at the selected year */
  function ageValues(sexCode, yearCode) {
    return ages.map(function (a) {
      var fixed = {};
      fixed[DIM_AGE] = a.code;
      fixed[DIM_SEX] = sexCode;
      var s = CsoData.series(ds, fixed);
      for (var i = 0; i < s.length; i++) if (s[i].code === yearCode) return s[i].value;
      return null;
    });
  }

  function fmtN(v) {
    if (v == null) return '–';
    return Math.round(v).toLocaleString('en-IE');
  }

  function draw(ctxIn, Win, Hin, themeIn, forExport) {
    var theme = themeIn || CsoChart.THEMES.dark;
    var ctx = ctxIn, W = Win, H = Hin;
    var f = forExport ? 1.9 : 1;
    if (!ctx) {
      var dpr = window.devicePixelRatio || 1;
      W = Math.min(Math.round(mount.getBoundingClientRect().width), 860);
      if (W < 80) W = 640;
      H = 460;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (!ds) return;

    var year = years[yearIdx];
    var male = ageValues('1', year.code);
    var female = ageValues('2', year.code);
    var maxV = 0;
    male.concat(female).forEach(function (v) { if (v != null && v > maxV) maxV = v; });
    if (!maxV) return;

    var M = { top: Math.round(52 * f), bottom: Math.round((forExport ? 64 : 40) * f),
              side: Math.round(24 * f), mid: Math.round(46 * f) };
    var halfW = (W - 2 * M.side - M.mid) / 2;
    var plotH = H - M.top - M.bottom;
    var rowH = plotH / ages.length;
    var cx = W / 2;

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    /* bars: male left, female right, youngest at the bottom */
    ages.forEach(function (a, i) {
      var y = H - M.bottom - (i + 1) * rowH;
      var mv = male[i], fv = female[i];
      var hl = hoverRow === i;
      if (mv != null) {
        var mw = (mv / maxV) * halfW;
        ctx.fillStyle = hl ? '#8ad8ec' : MALE;
        ctx.fillRect(cx - M.mid / 2 - mw, y, mw, Math.max(1, rowH - 1));
      }
      if (fv != null) {
        var fw = (fv / maxV) * halfW;
        ctx.fillStyle = hl ? '#f8a8d0' : FEMALE;
        ctx.fillRect(cx + M.mid / 2, y, fw, Math.max(1, rowH - 1));
      }
    });

    /* centre age labels every 10 years of age */
    ctx.fillStyle = theme.muted;
    ctx.font = Math.round(10 * f) + 'px ' + CsoChart.FONT;
    ctx.textAlign = 'center';
    ages.forEach(function (a, i) {
      if (i % 10 !== 0) return;
      var y = H - M.bottom - (i + 0.5) * rowH;
      ctx.fillText(String(i), cx, y + 3 * f);
    });
    ctx.fillText('Age', cx, M.top - 8 * f);

    /* x scale ticks (population per single year of age) */
    var step = maxV > 40000 ? 20000 : maxV > 15000 ? 10000 : 5000;
    ctx.font = Math.round(10 * f) + 'px ' + CsoChart.FONT;
    for (var v = step; v <= maxV; v += step) {
      var wpx = (v / maxV) * halfW;
      ctx.fillStyle = theme.muted;
      ctx.fillText((v / 1000) + 'k', cx - M.mid / 2 - wpx, H - M.bottom + 16 * f);
      ctx.fillText((v / 1000) + 'k', cx + M.mid / 2 + wpx, H - M.bottom + 16 * f);
    }

    /* headers */
    ctx.font = 'bold ' + Math.round(13 * f) + 'px ' + CsoChart.FONT;
    ctx.fillStyle = MALE; ctx.textAlign = 'left';
    ctx.fillText('Male', M.side, M.top - 8 * f);
    ctx.fillStyle = FEMALE; ctx.textAlign = 'right';
    ctx.fillText('Female', W - M.side, M.top - 8 * f);

    /* title */
    ctx.fillStyle = theme.text;
    ctx.font = Math.round(14 * f) + 'px ' + CsoChart.FONT;
    ctx.textAlign = 'center';
    ctx.fillText('Population of Ireland by Age — ' + year.label, cx, Math.round(22 * f));

    /* hover tooltip */
    if (!forExport && hoverRow != null) {
      var mv2 = male[hoverRow], fv2 = female[hoverRow];
      var tip = 'Age ' + hoverRow + ' — M: ' + fmtN(mv2) + ' · F: ' + fmtN(fv2);
      ctx.font = '12px ' + CsoChart.FONT;
      var tw = ctx.measureText(tip).width + 18;
      var ty = H - M.bottom - (hoverRow + 1) * rowH;
      ty = Math.max(M.top, Math.min(H - M.bottom - 26, ty - 30));
      ctx.fillStyle = theme.tooltipBg; ctx.strokeStyle = theme.tooltipBorder; ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cx - tw / 2, ty, tw, 24, 6); else ctx.rect(cx - tw / 2, ty, tw, 24);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = theme.text; ctx.textAlign = 'center';
      ctx.fillText(tip, cx, ty + 16);
    }

    /* export footer */
    if (forExport) {
      ctx.fillStyle = theme.muted;
      ctx.font = Math.round(11 * f) + 'px ' + CsoChart.FONT;
      ctx.textAlign = 'left';
      ctx.fillText('Source: CSO Ireland, PxStat table PEA11 (CC BY 4.0) · retrieved via lcecon.ie · ' +
        (CsoData.fmtDate(new Date()) || ''), M.side, H - 18 * f);
    }
  }

  function onData(dataset) {
    ds = dataset;
    var tDim = null;
    ds.id.forEach(function (d) { if (/^TLIST/.test(d)) tDim = d; });
    years = CsoData.categories(ds, tDim);
    ages = CsoData.categories(ds, DIM_AGE).filter(function (a) { return a.code !== '-'; });
    yearIdx = years.length - 1;

    slider.min = 0; slider.max = years.length - 1;
    slider.value = yearIdx; slider.disabled = false;
    yearLbl.textContent = years[yearIdx].label;

    var up = CsoData.fmtDate(CsoData.updated(ds));
    var updEl = caption.querySelector('.upd');
    if (updEl && up) updEl.textContent = 'Updated ' + up + '.';
    status.style.display = 'none';
    draw();
  }

  function init() {
    mount = document.getElementById('cc-pyramid');
    if (!mount || typeof CsoData === 'undefined' || typeof CsoChart === 'undefined') return;

    status = el('p', 'status-note', mount);
    status.textContent = 'Fetching live data from the CSO…';
    status.style.display = 'block';

    var controls = el('div', 'data-controls', mount);
    var sliderWrap = el('div', 'slider-wrap', controls);
    var lbl = el('label', null, sliderWrap);
    lbl.textContent = 'Year:';
    slider = el('input', null, sliderWrap);
    slider.type = 'range'; slider.disabled = true;
    yearLbl = el('span', 'year-lbl', sliderWrap);
    yearLbl.textContent = '…';

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
    csvA.href = 'https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/PEA11/CSV/1.0/en';

    canvas = el('canvas', null, mount);
    canvas.style.cssText = 'width:100%;display:block;border-radius:8px;';
    caption = el('p', 'chart-caption', mount);
    caption.innerHTML = 'Source: CSO Ireland, PxStat table <strong>PEA11</strong> — Population Estimates by Single Year of Age and Sex. <span class="upd"></span> Licensed under CC BY 4.0. Cite as: <em>CSO, Population Estimates (PEA11), data.cso.ie</em>.';

    slider.addEventListener('input', function () {
      yearIdx = +slider.value;
      yearLbl.textContent = years[yearIdx].label;
      hoverRow = null;
      draw();
    });
    pngBtn.addEventListener('click', function () {
      var saved = hoverRow; hoverRow = null;
      CsoChart.exportCanvas(function (ctx, W, H, theme) {
        draw(ctx, W, H, theme, true);
      }, 'population-pyramid-' + (years[yearIdx] ? years[yearIdx].label : ''), themeSel.value);
      hoverRow = saved;
    });
    canvas.addEventListener('mousemove', function (e) {
      if (!ds) return;
      var rect = canvas.getBoundingClientRect();
      var H = parseFloat(canvas.style.height);
      var plotH = H - 52 - 40;
      var row = Math.floor((H - 40 - (e.clientY - rect.top)) / (plotH / ages.length));
      row = row >= 0 && row < ages.length ? row : null;
      if (row !== hoverRow) { hoverRow = row; draw(); }
    });
    canvas.addEventListener('mouseleave', function () {
      if (hoverRow != null) { hoverRow = null; draw(); }
    });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (ds) draw(); }, 90);
    });

    var q = {};
    q.STATISTIC = ['PEA11'];
    q[DIM_SEX] = ['1', '2'];
    CsoData.fetchDataset(MATRIX, q).then(onData).catch(function () {
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
