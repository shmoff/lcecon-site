(function () {
  var canvas = document.getElementById('sd-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var D_COLOR  = '#58c4dd';   /* BLUE_C  — demand  */
  var S_COLOR  = '#fc6255';   /* RED     — supply  */
  var EQ_COLOR = '#f0ac5f';   /* YELLOW  — equilibrium */
  var AX_COLOR = '#50506a';   /* axis lines */
  var TX_COLOR = '#e8e8f4';   /* main text */
  var MT_COLOR = '#8888aa';   /* muted text */
  var BG_COLOR = '#12121f';   /* canvas background */
  var GD_COLOR = 'rgba(80,80,106,0.25)'; /* grid */

  var M = { top: 36, right: 40, bottom: 58, left: 58 };

  var dShift = 0;
  var sShift = 0;

  /* Demand: P = 78 - 0.6Q + dShift   (downward slope) */
  function dP(q) { return 78 - 0.6 * q + dShift; }
  /* Supply: P = 8 + 0.5Q - sShift    (upward slope) */
  function sP(q) { return 8  + 0.5 * q - sShift; }
  /* Equilibrium: 78 - 0.6Q + dShift = 8 + 0.5Q - sShift
     => Q* = (70 + dShift + sShift) / 1.1 */
  function equilibrium() {
    var q = (70 + dShift + sShift) / 1.1;
    var p = sP(q);
    return { q: q, p: p };
  }

  function toXY(q, p, W, H) {
    var x = M.left  + (q / 100) * (W - M.left - M.right);
    var y = H - M.bottom - (p / 100) * (H - M.top - M.bottom);
    return [x, y];
  }

  function resize() {
    var dpr  = window.devicePixelRatio || 1;
    var wrap = canvas.parentElement.getBoundingClientRect();
    var W    = Math.min(Math.round(wrap.width - 32), 680);
    var H    = Math.round(W * 0.58);
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    draw();
  }

  function draw() {
    var dpr = window.devicePixelRatio || 1;
    var W   = canvas.width  / dpr;
    var H   = canvas.height / dpr;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    /* grid */
    ctx.strokeStyle = GD_COLOR;
    ctx.lineWidth   = 1;
    for (var i = 1; i <= 9; i++) {
      var gx = toXY(i * 10, 0, W, H)[0];
      var gy = toXY(0, i * 10, W, H)[1];
      ctx.beginPath();
      ctx.moveTo(gx, M.top);
      ctx.lineTo(gx, H - M.bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(M.left, gy);
      ctx.lineTo(W - M.right, gy);
      ctx.stroke();
    }

    /* axes */
    ctx.strokeStyle = AX_COLOR;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(M.left, M.top);
    ctx.lineTo(M.left, H - M.bottom);
    ctx.lineTo(W - M.right, H - M.bottom);
    ctx.stroke();

    /* axis arrow heads */
    ctx.fillStyle = AX_COLOR;
    var aw = 5, ah = 8;
    ctx.beginPath();
    ctx.moveTo(W - M.right, H - M.bottom);
    ctx.lineTo(W - M.right - aw, H - M.bottom - ah / 2);
    ctx.lineTo(W - M.right - aw, H - M.bottom + ah / 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(M.left, M.top);
    ctx.lineTo(M.left - ah / 2, M.top + aw);
    ctx.lineTo(M.left + ah / 2, M.top + aw);
    ctx.closePath();
    ctx.fill();

    /* axis labels */
    ctx.fillStyle = MT_COLOR;
    ctx.font = '13px "Latin Modern Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Quantity  (Q)', (M.left + W - M.right) / 2, H - 6);
    ctx.save();
    ctx.translate(13, (M.top + H - M.bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Price  (P)', 0, 0);
    ctx.restore();

    /* tick values */
    ctx.font = '10px "Latin Modern Roman", Georgia, serif';
    ctx.fillStyle = AX_COLOR;
    ctx.textAlign = 'center';
    [20, 40, 60, 80].forEach(function (v) {
      var x = toXY(v, 0, W, H)[0];
      ctx.fillText(v, x, H - M.bottom + 14);
    });
    ctx.textAlign = 'right';
    [20, 40, 60, 80].forEach(function (v) {
      var y = toXY(0, v, W, H)[1];
      ctx.fillText(v, M.left - 8, y + 4);
    });

    /* helper: draw a curve from q=0..100, clip at p ∈ [0,100] */
    function drawCurve(pFn, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 10;
      ctx.beginPath();
      var started = false;
      for (var q = 0; q <= 100; q += 1) {
        var p = pFn(q);
        if (p < 0 || p > 100) { started = false; continue; }
        var pt = toXY(q, p, W, H);
        if (!started) { ctx.moveTo(pt[0], pt[1]); started = true; }
        else            ctx.lineTo(pt[0], pt[1]);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    drawCurve(dP, D_COLOR);
    drawCurve(sP, S_COLOR);

    /* curve labels */
    ctx.font = 'italic 15px "Latin Modern Roman", Georgia, serif';
    var dLabelQ = 82, dLabelP = dP(dLabelQ);
    if (dLabelP > 2 && dLabelP < 98) {
      var dPt = toXY(dLabelQ, dLabelP, W, H);
      ctx.fillStyle = D_COLOR;
      ctx.textAlign = 'left';
      ctx.shadowColor = D_COLOR;
      ctx.shadowBlur  = 6;
      ctx.fillText('D', dPt[0] + 5, dPt[1] - 4);
      ctx.shadowBlur = 0;
    }
    var sLabelQ = 82, sLabelP = sP(sLabelQ);
    if (sLabelP > 2 && sLabelP < 98) {
      var sPt = toXY(sLabelQ, sLabelP, W, H);
      ctx.fillStyle = S_COLOR;
      ctx.textAlign = 'left';
      ctx.shadowColor = S_COLOR;
      ctx.shadowBlur  = 6;
      ctx.fillText('S', sPt[0] + 5, sPt[1] + 14);
      ctx.shadowBlur = 0;
    }

    /* equilibrium */
    var eq = equilibrium();
    if (eq.q > 1 && eq.q < 99 && eq.p > 1 && eq.p < 99) {
      var ex = toXY(eq.q, eq.p, W, H)[0];
      var ey = toXY(eq.q, eq.p, W, H)[1];

      /* dashed drop-lines */
      ctx.strokeStyle = EQ_COLOR;
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 5]);
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex, H - M.bottom);
      ctx.moveTo(ex, ey);
      ctx.lineTo(M.left, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      /* equilibrium dot with glow */
      ctx.fillStyle   = EQ_COLOR;
      ctx.shadowColor = EQ_COLOR;
      ctx.shadowBlur  = 20;
      ctx.beginPath();
      ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      /* P* / Q* labels */
      ctx.font      = '12px "Latin Modern Roman", Georgia, serif';
      ctx.fillStyle = EQ_COLOR;
      ctx.textAlign = 'right';
      ctx.fillText('P*', M.left - 6, ey + 4);
      ctx.textAlign = 'center';
      ctx.fillText('Q*', ex, H - M.bottom + 28);
    }
  }

  /* wire up sliders */
  var dSlider = document.getElementById('sd-demand-shift');
  var sSlider = document.getElementById('sd-supply-shift');
  var dVal    = document.getElementById('sd-demand-val');
  var sVal    = document.getElementById('sd-supply-val');

  function fmtShift(v) {
    if (v === 0) return '0';
    return (v > 0 ? '+' : '') + v;
  }

  if (dSlider) {
    dSlider.addEventListener('input', function () {
      dShift = Number(this.value);
      if (dVal) dVal.textContent = fmtShift(dShift);
      draw();
    });
  }
  if (sSlider) {
    sSlider.addEventListener('input', function () {
      sShift = Number(this.value);
      if (sVal) sVal.textContent = fmtShift(sShift);
      draw();
    });
  }

  window.addEventListener('resize', function () {
    /* debounce */
    clearTimeout(window._sdResizeTimer);
    window._sdResizeTimer = setTimeout(resize, 80);
  });

  resize();
})();
