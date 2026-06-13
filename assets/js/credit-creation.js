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

  /* ── canvas setup ── */
  function setupCanvas() {
    var dpr    = window.devicePixelRatio || 1;
    var parent = canvas.parentElement;
    var W = Math.min(Math.round(parent.getBoundingClientRect().width - 32), 860);
    var H = 320;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
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

    var plotW = W - M.left - M.right;
    var plotH = H - M.top  - M.bottom;

    var allVals = result.deposits.concat(result.loans);
    var yMax    = Math.max.apply(null, allVals) * 1.18;
    if (yMax === 0) yMax = 1;

    /* background */
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    /* grid */
    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
    for (var gi = 1; gi <= 5; gi++) {
      var gy = M.top + (gi / 5) * plotH;
      ctx.beginPath(); ctx.moveTo(M.left, gy); ctx.lineTo(W - M.right, gy); ctx.stroke();
    }

    /* axes */
    ctx.strokeStyle = COLORS.axis; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(M.left, M.top);
    ctx.lineTo(M.left, H - M.bottom);
    ctx.lineTo(W - M.right, H - M.bottom);
    ctx.stroke();

    /* y-axis labels */
    ctx.fillStyle = COLORS.muted;
    ctx.font = '10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign = 'right';
    for (var yi = 0; yi <= 5; yi++) {
      var yv = (yi / 5) * yMax;
      var yy = H - M.bottom - (yv / yMax) * plotH;
      ctx.fillText(fmtEuro(yv), M.left - 5, yy + 4);
      /* tick */
      ctx.strokeStyle = COLORS.axis; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(M.left - 3, yy); ctx.lineTo(M.left, yy); ctx.stroke();
    }

    /* bars */
    var groupW  = plotW / ROUNDS;
    var barW    = Math.min(groupW * 0.32, 38);
    var barGap  = Math.min(groupW * 0.06, 6);

    function toY(v) { return H - M.bottom - (v / yMax) * plotH; }

    for (var r = 0; r < ROUNDS; r++) {
      var gCentre = M.left + (r + 0.5) * groupW;
      var dep  = result.deposits[r];
      var loan = result.loans[r];

      /* deposit bar (blue) */
      var depBarH = Math.max(0, (dep / yMax) * plotH);
      var depX    = gCentre - barGap / 2 - barW;
      ctx.fillStyle = COLORS.accent;
      ctx.shadowColor = COLORS.accent; ctx.shadowBlur = 6;
      ctx.fillRect(depX, toY(dep), barW, depBarH);
      ctx.shadowBlur = 0;

      /* loan bar (green) */
      var loanBarH = Math.max(0, (loan / yMax) * plotH);
      var loanX    = gCentre + barGap / 2;
      ctx.fillStyle = COLORS.green;
      ctx.shadowColor = COLORS.green; ctx.shadowBlur = 6;
      ctx.fillRect(loanX, toY(loan), barW, loanBarH);
      ctx.shadowBlur = 0;

      /* x-axis label */
      ctx.fillStyle = COLORS.muted;
      ctx.font = '11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign = 'center';
      ctx.fillText('Round ' + (r + 1), gCentre, H - M.bottom + 16);

      /* value labels above bars */
      ctx.font = '9px "Latin Modern Roman",Georgia,serif';
      if (dep > yMax * 0.03) {
        ctx.fillStyle = COLORS.accent;
        ctx.fillText(fmtEuro(dep), depX + barW / 2, toY(dep) - 4);
      }
      if (loan > yMax * 0.03) {
        ctx.fillStyle = COLORS.green;
        ctx.fillText(fmtEuro(loan), loanX + barW / 2, toY(loan) - 4);
      }
    }

    /* title */
    ctx.fillStyle = COLORS.text;
    ctx.font = '13px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign = 'center';
    ctx.fillText('Credit Creation by Round', W / 2, M.top - 30);

    /* summary stats block */
    var mult = isFinite(result.effectiveMult)
      ? result.effectiveMult.toFixed(2) + 'x'
      : '∞';
    var stats = [
      'Effective multiplier: ' + mult,
      'Total credit (5 rounds): ' + fmtEuro(result.totalCredit),
      'ECB Deposit Facility Rate: ' + ecbLabel
    ];
    ctx.font = '11px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign = 'left';
    stats.forEach(function (s, i) {
      ctx.fillStyle = i === 2 ? COLORS.equil : COLORS.muted;
      ctx.fillText(s, M.left, M.top - 12 + i * 14);
    });

    /* legend */
    var lx = W - M.right - 130;
    var ly = M.top + 6;
    [
      { color: COLORS.accent, label: 'Deposit' },
      { color: COLORS.green,  label: 'New loan' }
    ].forEach(function (leg, i) {
      var liy = ly + i * 16;
      ctx.fillStyle = leg.color;
      ctx.fillRect(lx, liy - 8, 14, 10);
      ctx.fillStyle = leg.color;
      ctx.font = '11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign = 'left';
      ctx.fillText(leg.label, lx + 18, liy);
    });

    /* y-axis rotated label */
    ctx.save();
    ctx.fillStyle = COLORS.muted;
    ctx.font = '11px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign = 'center';
    ctx.translate(13, (M.top + H - M.bottom) / 2);
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
