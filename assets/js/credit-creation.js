/* Credit Creation Model — interactive bar chart with live ECB policy rate
   Reads sliders from #cc-deposit, #cc-rrr, #cc-capital, #cc-demand
   Renders on #credit-canvas */
var CreditCreation = (function () {
  'use strict';

  var COLORS = {
    bg:      '#12121f',
    surface: '#25253a',
    accent:  '#58c4dd',
    red:     '#fc6255',
    equil:   '#f0ac5f',
    green:   '#83c167',
    purple:  '#9a72ac',
    text:    '#e8e8f4',
    muted:   '#8888aa',
    axis:    '#50506a',
    grid:    'rgba(80,80,106,0.22)'
  };

  var ECB_URL =
    'https://data-api.ecb.europa.eu/service/data/FM/B.U2.EUR.4F.KR.DFR.LEV' +
    '?startPeriod=2020-01&format=jsondata';

  var ROUNDS = 5;
  var canvas, ctx;
  var M = { top: 56, right: 24, bottom: 72, left: 68 };
  var ecbRate = null; // fetched live value
  var ecbLabel = '3.25% (ECB, 2024, fallback)';

  /* ── canvas setup ── full width, matches the other chart canvases ── */
  function setupCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.offsetWidth;
    var H = 340;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.height = H + 'px';
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { W: W, H: H };
  }

  /* ── read sliders ── */
  function getInputs() {
    function val(id, def) {
      var el = document.getElementById(id);
      return el ? parseFloat(el.value) : def;
    }
    return {
      deposit: val('cc-deposit', 1000),
      rrr:     val('cc-rrr', 10),
      capital: val('cc-capital', 8),
      demand:  val('cc-demand', 80)
    };
  }

  /* ── update label spans ── */
  function updateLabels(inp) {
    function setSpan(id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    }
    setSpan('cc-deposit-val', '€' + Math.round(inp.deposit).toLocaleString());
    setSpan('cc-rrr-val',     inp.rrr.toFixed(1) + '%');
    setSpan('cc-capital-val', inp.capital.toFixed(0) + '%');
    setSpan('cc-demand-val',  inp.demand.toFixed(0) + '%');
  }

  /* ── compute credit rounds ── */
  function computeRounds(inp) {
    var retentionRate = (inp.rrr / 100) + (inp.capital / 100);
    var lendRate      = Math.max(0, (1 - retentionRate) * (inp.demand / 100));
    var deposits = [], loans = [];
    for (var n = 0; n < ROUNDS; n++) {
      var dep  = inp.deposit * Math.pow(lendRate, n);
      var loan = dep * lendRate;
      deposits.push(dep);
      loans.push(loan);
    }
    var totalCredit = loans.reduce(function (s, v) { return s + v; }, 0);
    var effectiveMult = lendRate < 1 ? 1 / (1 - lendRate) : Infinity;
    return { deposits: deposits, loans: loans, totalCredit: totalCredit,
             effectiveMult: effectiveMult, lendRate: lendRate };
  }

  function fmtEuro(v) {
    if (v >= 1000000) return '€' + (v / 1000000).toFixed(2) + 'M';
    if (v >= 1000)    return '€' + (v / 1000).toFixed(1) + 'k';
    return '€' + Math.round(v);
  }

  /* ── draw ── */
  function draw() {
    var dims = setupCanvas();
    var W = dims.W, H = dims.H;

    var inp = getInputs();
    updateLabels(inp);
    var result = computeRounds(inp);

    /* background */
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    /* ── header: title + summary stats (responsive: one line, else stacked) ── */
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 14px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign = 'center';
    ctx.fillText('Credit Creation by Round', W / 2, 22);

    var mult = isFinite(result.effectiveMult)
      ? result.effectiveMult.toFixed(2) + '×' : '∞';
    var parts = [
      { t: 'Effective multiplier: ' + mult,                        c: COLORS.accent },
      { t: 'Total credit created: ' + fmtEuro(result.totalCredit), c: COLORS.green  },
      { t: 'ECB Deposit Facility Rate: ' + ecbLabel,               c: COLORS.equil  }
    ];
    ctx.font = '11.5px "Latin Modern Roman",Georgia,serif';
    var sep = '     ';
    var sepW = ctx.measureText(sep).width;
    var widths = parts.map(function (p) { return ctx.measureText(p.t).width; });
    var oneLineW = widths.reduce(function (a, b) { return a + b; }, 0)
                 + sepW * (parts.length - 1);

    var headerBottom;
    if (oneLineW <= W - 16) {
      /* fits on one centred line */
      var sx = W / 2 - oneLineW / 2;
      ctx.textAlign = 'left';
      parts.forEach(function (p, i) {
        ctx.fillStyle = p.c;
        ctx.fillText(p.t, sx, 42);
        sx += widths[i] + sepW;
      });
      headerBottom = 50;
    } else {
      /* stack each stat on its own centred row (narrow screens) */
      ctx.textAlign = 'center';
      parts.forEach(function (p, i) {
        ctx.fillStyle = p.c;
        ctx.fillText(p.t, W / 2, 40 + i * 17);
      });
      headerBottom = 40 + parts.length * 17 - 5;
    }

    /* ── plot geometry (sits below whatever height the header needed) ── */
    M = { top: headerBottom + 14, right: 22, bottom: 58, left: 66 };
    var plotW = W - M.left - M.right;
    var plotH = H - M.top  - M.bottom;
    var plotBottom = M.top + plotH;

    var allVals = result.deposits.concat(result.loans);
    var yMax    = Math.max.apply(null, allVals) * 1.15;
    if (yMax <= 0) yMax = 1;

    function toY(v) { return plotBottom - (v / yMax) * plotH; }

    /* grid + y-axis labels */
    for (var yi = 0; yi <= 5; yi++) {
      var yv = (yi / 5) * yMax;
      var yy = toY(yv);
      ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(M.left, yy); ctx.lineTo(W - M.right, yy); ctx.stroke();
      ctx.fillStyle = COLORS.muted;
      ctx.font = '10px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(fmtEuro(yv), M.left - 8, yy);
    }
    ctx.textBaseline = 'alphabetic';

    /* axes */
    ctx.strokeStyle = COLORS.axis; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(M.left, M.top);
    ctx.lineTo(M.left, plotBottom);
    ctx.lineTo(W - M.right, plotBottom);
    ctx.stroke();

    /* bars */
    var groupW = plotW / ROUNDS;
    var barW   = Math.min(groupW * 0.30, 34);
    var barGap = 5;

    for (var r = 0; r < ROUNDS; r++) {
      var gCentre = M.left + (r + 0.5) * groupW;
      var dep  = result.deposits[r];
      var loan = result.loans[r];

      var depX  = gCentre - barGap / 2 - barW;
      var loanX = gCentre + barGap / 2;

      /* deposit bar (blue) */
      ctx.fillStyle = COLORS.accent;
      ctx.shadowColor = COLORS.accent; ctx.shadowBlur = 6;
      ctx.fillRect(depX, toY(dep), barW, plotBottom - toY(dep));
      /* loan bar (green) */
      ctx.fillStyle = COLORS.green;
      ctx.shadowColor = COLORS.green; ctx.shadowBlur = 6;
      ctx.fillRect(loanX, toY(loan), barW, plotBottom - toY(loan));
      ctx.shadowBlur = 0;

      /* round label */
      ctx.fillStyle = COLORS.muted;
      ctx.font = '11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign = 'center';
      ctx.fillText('Round ' + (r + 1), gCentre, plotBottom + 18);

      /* value labels above bars (only when tall enough to avoid clutter) */
      ctx.font = '9px "Latin Modern Roman",Georgia,serif';
      if (dep > yMax * 0.05) {
        ctx.fillStyle = COLORS.accent;
        ctx.fillText(fmtEuro(dep), depX + barW / 2, toY(dep) - 5);
      }
      if (loan > yMax * 0.05) {
        ctx.fillStyle = COLORS.green;
        ctx.fillText(fmtEuro(loan), loanX + barW / 2, toY(loan) - 5);
      }
    }

    /* legend — top-right inside plot (later-round bars are short, no overlap) */
    var lx = W - M.right - 118, ly = M.top + 16;
    [
      { color: COLORS.accent, label: 'Deposit' },
      { color: COLORS.green,  label: 'New loan' }
    ].forEach(function (leg, i) {
      var liy = ly + i * 18;
      ctx.fillStyle = leg.color;
      ctx.fillRect(lx, liy - 9, 13, 11);
      ctx.fillStyle = COLORS.text;
      ctx.font = '11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign = 'left';
      ctx.fillText(leg.label, lx + 19, liy);
    });

    /* y-axis rotated label */
    ctx.save();
    ctx.fillStyle = COLORS.muted;
    ctx.font = '11px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign = 'center';
    ctx.translate(15, M.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Amount (€)', 0, 0);
    ctx.restore();
  }

  /* ── ECB fetch ── */
  function fetchECBRate() {
    if (!window.fetch) return;
    fetch(ECB_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        try {
          var series = json.dataSets[0].series['0:0:0:0:0:0:0'];
          var obs    = series.observations;
          var keys   = Object.keys(obs).map(Number).sort(function (a, b) { return a - b; });
          var lastKey = keys[keys.length - 1];
          var rate    = obs[String(lastKey)][0];

          /* get the date string for the most recent period */
          var periods = json.structure.dimensions.observation[0].values;
          var periodId = periods[lastKey] ? periods[lastKey].id : '';

          ecbRate  = rate;
          ecbLabel = rate.toFixed(2) + '% (ECB, live — ' + periodId + ')';
          draw();
        } catch (e) {
          /* keep fallback */
        }
      })
      .catch(function () { /* keep fallback */ });
  }

  /* ── wire sliders ── */
  function wireSliders() {
    var ids = ['cc-deposit', 'cc-rrr', 'cc-capital', 'cc-demand'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () { draw(); });
    });
  }

  /* ── init ── */
  function init() {
    canvas = document.getElementById('credit-canvas');
    if (!canvas) return;

    wireSliders();
    fetchECBRate();
    draw();

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { draw(); }, 80);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { redraw: draw };
})();
