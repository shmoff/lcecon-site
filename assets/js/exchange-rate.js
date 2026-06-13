(function(){
  'use strict';

  /* ── Colour palette ─────────────────────────────────────── */
  var C = {
    bg:     '#12121f',
    surface:'#25253a',
    axis:   '#50506a',
    grid:   'rgba(80,80,106,0.22)',
    text:   '#e8e8f4',
    muted:  '#8888aa',
    subtle: '#50506a',
  };

  /* Currency config */
  var CURRENCIES = [
    { code:'USD', label:'EUR/USD', color:'#58c4dd', btnId:'exr-btn-usd' },
    { code:'GBP', label:'EUR/GBP', color:'#fc6255', btnId:'exr-btn-gbp' },
    { code:'JPY', label:'EUR/JPY', color:'#f0ac5f', btnId:'exr-btn-jpy' },
    { code:'CNY', label:'EUR/CNY', color:'#83c167', btnId:'exr-btn-cny' },
    { code:'AUD', label:'EUR/AUD', color:'#9a72ac', btnId:'exr-btn-aud' },
  ];

  var ECB_URL = 'https://data-api.ecb.europa.eu/service/data/EXR/M.USD+GBP+JPY+CNY+AUD.EUR.SP00.A?startPeriod=2020-01&format=jsondata';

  /* State */
  var state = {
    series: {},      // { USD: [{date, rate}, ...], GBP: [...], ... }
    dates:  [],      // ['2020-01', '2020-02', ...]
    activeCode: null, // null = all-normalised view; 'USD' etc = single currency
  };

  /* ── Canvas setup ───────────────────────────────────────── */
  var canvas = document.getElementById('exchange-canvas');
  if (!canvas) return;

  canvas.height = 360;

  var ctx = canvas.getContext('2d');
  var W = 0, H = 0;
  var dpr = window.devicePixelRatio || 1;
  var M = { top:44, right:140, bottom:52, left:58 };

  function setupCanvas() {
    dpr = window.devicePixelRatio || 1;
    var parent = canvas.parentElement;
    var rect = parent.getBoundingClientRect();
    W = Math.max(Math.round(rect.width), 320);
    H = 360;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── Status message ─────────────────────────────────────── */
  var statusEl = document.createElement('p');
  statusEl.style.cssText = 'color:#8888aa;font-style:italic;font-size:.88rem;margin:.5rem 0;';
  canvas.parentElement.insertBefore(statusEl, canvas);

  function setStatus(msg) {
    statusEl.textContent = msg;
    statusEl.style.display = msg ? 'block' : 'none';
  }
  setStatus('Fetching ECB exchange rate data…');

  /* ── Fetch & parse ──────────────────────────────────────── */
  function fetchData() {
    return fetch(ECB_URL)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(json) {
        var ds = json.dataSets[0].series;
        var struct = json.structure.dimensions;

        /* Date (observation) dimension */
        var obsDim = struct.observation[0].values;
        var dates = obsDim.map(function(v){ return v.id; });

        /* Currency dimension (series dim index 1) */
        var currDim = struct.series[1].values;

        var series = {};
        Object.keys(ds).forEach(function(key) {
          var parts = key.split(':');
          var currIdx = parseInt(parts[1], 10);
          var code = currDim[currIdx].id; // 'USD', 'GBP', etc.
          var obs = ds[key].observations;
          var arr = dates.map(function(d, i) {
            var o = obs[i];
            return { date: d, rate: o ? o[0] : null };
          });
          series[code] = arr;
        });

        return { dates: dates, series: series };
      });
  }

  /* ── Normalise to Jan 2020 = 100 ───────────────────────── */
  function normalise(arr) {
    var base = null;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].rate !== null) { base = arr[i].rate; break; }
    }
    if (!base) return arr.map(function(){ return null; });
    return arr.map(function(d) {
      return d.rate !== null ? (d.rate / base) * 100 : null;
    });
  }

  /* ── X-axis tick positions (every 6 months) ─────────────── */
  function xTicks(dates) {
    var ticks = [];
    dates.forEach(function(d, i) {
      var month = d.slice(5); // '01' or '07'
      if (month === '01' || month === '07') {
        var yr  = d.slice(2, 4); // '20', '21', ...
        var mon = month === '01' ? 'Jan' : 'Jul';
        ticks.push({ idx: i, label: mon + ' \'' + yr });
      }
    });
    return ticks;
  }

  /* ── Draw ───────────────────────────────────────────────── */
  function draw() {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    if (!state.dates.length) return;

    var isAll = state.activeCode === null;
    var n = state.dates.length;

    /* Build display series */
    var displaySeries = []; // [{label, color, values:[...]}]

    if (isAll) {
      CURRENCIES.forEach(function(cur) {
        var raw = state.series[cur.code];
        if (!raw) return;
        displaySeries.push({
          label:  cur.label,
          color:  cur.color,
          values: normalise(raw),
        });
      });
    } else {
      var cur = CURRENCIES.filter(function(c){ return c.code === state.activeCode; })[0];
      if (!cur) return;
      var raw = state.series[cur.code];
      if (!raw) return;
      displaySeries.push({
        label:  cur.label,
        color:  cur.color,
        values: raw.map(function(d){ return d.rate; }),
      });
    }

    /* Data range */
    var allVals = [];
    displaySeries.forEach(function(s) {
      s.values.forEach(function(v){ if (v !== null) allVals.push(v); });
    });
    if (!allVals.length) return;

    var minV = Math.min.apply(null, allVals);
    var maxV = Math.max.apply(null, allVals);
    var pad  = (maxV - minV) * 0.08 || 0.5;
    var lo   = minV - pad;
    var hi   = maxV + pad;

    var cW = W - M.left - M.right;
    var cH = H - M.top  - M.bottom;

    function toX(i) { return M.left + (i / Math.max(n - 1, 1)) * cW; }
    function toY(v) { return M.top  + (1 - (v - lo) / (hi - lo)) * cH; }

    /* Grid */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth   = 1;
    var nYLines = 5;
    for (var gi = 0; gi <= nYLines; gi++) {
      var gv = lo + (gi / nYLines) * (hi - lo);
      var gy = toY(gv);
      ctx.beginPath(); ctx.moveTo(M.left, gy); ctx.lineTo(W - M.right, gy); ctx.stroke();
    }

    /* X ticks */
    var ticks = xTicks(state.dates);
    ticks.forEach(function(t) {
      var tx = toX(t.idx);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx, M.top); ctx.lineTo(tx, H - M.bottom); ctx.stroke();
    });

    /* Axes */
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(M.left, M.top);
    ctx.lineTo(M.left, H - M.bottom);
    ctx.lineTo(W - M.right, H - M.bottom);
    ctx.stroke();

    /* Y-axis tick labels */
    ctx.fillStyle  = C.axis;
    ctx.font       = '10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign  = 'right';
    for (var yi = 0; yi <= nYLines; yi++) {
      var yv  = lo + (yi / nYLines) * (hi - lo);
      var yy  = toY(yv);
      var lbl = isAll ? yv.toFixed(1) : (yv >= 100 ? yv.toFixed(2) : yv.toFixed(3));
      ctx.fillText(lbl, M.left - 6, yy + 4);
    }

    /* X-axis tick labels */
    ctx.fillStyle = C.axis;
    ctx.font      = '10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign = 'center';
    ticks.forEach(function(t) {
      ctx.fillText(t.label, toX(t.idx), H - M.bottom + 14);
    });

    /* Y-axis label */
    ctx.fillStyle = C.muted;
    ctx.font      = '11px "Latin Modern Roman",Georgia,serif';
    ctx.save();
    ctx.translate(13, M.top + cH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(isAll ? 'Index (Jan 2020 = 100)' : 'Units per EUR', 0, 0);
    ctx.restore();

    /* Lines */
    displaySeries.forEach(function(s) {
      ctx.strokeStyle  = s.color;
      ctx.lineWidth    = 2;
      ctx.shadowColor  = s.color;
      ctx.shadowBlur   = 8;
      ctx.beginPath();
      var started = false;
      for (var i = 0; i < n; i++) {
        var v = s.values[i];
        if (v === null) { started = false; continue; }
        var px = toX(i);
        var py = toY(v);
        if (!started) { ctx.moveTo(px, py); started = true; }
        else           { ctx.lineTo(px, py); }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    /* Legend (top-right) */
    var legX = W - M.right + 12;
    var legY = M.top;
    ctx.font = '10px "Latin Modern Roman",Georgia,serif';
    displaySeries.forEach(function(s, i) {
      var ly = legY + i * 18;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color; ctx.shadowBlur = 6;
      ctx.fillRect(legX, ly + 1, 18, 3);
      ctx.shadowBlur = 0;
      ctx.fillStyle = C.text;
      ctx.textAlign = 'left';
      ctx.fillText(s.label, legX + 22, ly + 6);
    });

    /* Title */
    ctx.fillStyle  = C.text;
    ctx.font       = '13px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign  = 'center';
    ctx.fillText('Exchange Rates vs Euro (ECB Reference Rates)', M.left + cW / 2, M.top - 14);
  }

  /* ── Button logic ───────────────────────────────────────── */
  function updateButtons() {
    CURRENCIES.forEach(function(cur) {
      var btn = document.getElementById(cur.btnId);
      if (!btn) return;
      var isActive = (state.activeCode === null)
        ? false
        : state.activeCode === cur.code;
      btn.classList.toggle('active', isActive);
    });
  }

  function attachButtons() {
    CURRENCIES.forEach(function(cur) {
      var btn = document.getElementById(cur.btnId);
      if (!btn) return;
      btn.addEventListener('click', function() {
        if (state.activeCode === cur.code) {
          /* clicking active single currency → return to all-normalised */
          state.activeCode = null;
        } else {
          state.activeCode = cur.code;
        }
        updateButtons();
        draw();
      });
    });
  }

  /* ── Init ───────────────────────────────────────────────── */
  attachButtons();
  setupCanvas();

  fetchData()
    .then(function(result) {
      state.dates  = result.dates;
      state.series = result.series;
      setStatus('');
      setupCanvas();
      draw();
    })
    .catch(function(err) {
      setStatus('Could not load ECB exchange rate data (' + err.message + '). Check your connection and try refreshing.');
      console.error('[exchange-rate.js]', err);
    });

  /* Redraw on resize */
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      setupCanvas();
      draw();
    }, 80);
  });

})();
