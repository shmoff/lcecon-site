(function () {
  'use strict';

  var canvas = document.getElementById('cf-canvas');
  if (!canvas) return;

  // ── Palette ──────────────────────────────────────────────────────────────────
  var C = {
    bg:      '#1c1c2e',
    surface: '#25253a',
    border:  'rgba(80,80,106,0.3)',
    text:    '#e8e8f4',
    muted:   '#8888aa',
    spending:'#58c4dd',  // HH → Firms  (consumer spending)
    income:  '#fc6255',  // Firms → HH  (factor income / wages)
    savings: '#f0ac5f',  // S & I
    tax:     '#83c167',  // T & G
    imports: '#9a72ac',  // M & X
  };

  var FONT = '"Latin Modern Roman",Georgia,serif';
  var DOT_SPEED  = 80;   // px per second
  var DOT_SPACING = 0.38; // fraction of total path length between dots

  // ── Canvas setup ─────────────────────────────────────────────────────────────
  var dpr, ctx, W, H;

  function setupCanvas() {
    dpr = window.devicePixelRatio || 1;
    W   = canvas.offsetWidth;
    H   = 480;
    canvas.width        = W * dpr;
    canvas.height       = H * dpr;
    canvas.style.height = H + 'px';
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  // ── Layout (computed fresh each frame / resize) ───────────────────────────────
  // Returns a layout object based on current W, H.
  function buildLayout() {
    var hhCX = W * 0.15 + 60,  hhCY = H * 0.38;
    var fiCX = W * 0.85 - 50,  fiCY = H * 0.38;
    var HH_W = 120, HH_H = 60, FI_W = 100, FI_H = 60;
    var midCX = W * 0.5;
    var SW = 130, SH = 44, SGAP = 18;
    var stackCY  = H * 0.38;
    var stackH   = 3 * SH + 2 * SGAP;
    var stackTop = stackCY - stackH / 2;
    var finCY = stackTop + SH / 2;
    var govCY = finCY + SH + SGAP;
    var ovsCY = govCY + SH + SGAP;

    function rect(cx, cy, w, h) {
      return { cx: cx, cy: cy, w: w, h: h, x: cx - w / 2, y: cy - h / 2 };
    }

    var HH  = rect(hhCX,  hhCY,  HH_W, HH_H);
    var FI  = rect(fiCX,  fiCY,  FI_W, FI_H);
    var FIN = rect(midCX, finCY, SW, SH);
    var GOV = rect(midCX, govCY, SW, SH);
    var OVS = rect(midCX, ovsCY, SW, SH);

    // Arrow rails above and below the box row
    var topY = Math.min(HH.y, FI.y) - 40;
    var botY = Math.max(HH.y + HH.h, FI.y + FI.h) + 40;

    return { HH: HH, FI: FI, FIN: FIN, GOV: GOV, OVS: OVS, topY: topY, botY: botY };
  }

  // ── Path building ─────────────────────────────────────────────────────────────
  // Each path: { pts, segs, total, color, label, labelSide, dots }

  function pathLength(segs) {
    var t = 0; segs.forEach(function (s) { t += s; }); return t;
  }

  function buildSegments(pts) {
    var segs = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var dx = pts[i + 1].x - pts[i].x;
      var dy = pts[i + 1].y - pts[i].y;
      segs.push(Math.sqrt(dx * dx + dy * dy));
    }
    return segs;
  }

  function makePath(pts, color, label, labelSide) {
    var segs  = buildSegments(pts);
    var total = pathLength(segs);
    var nDots = Math.max(2, Math.round(1 / DOT_SPACING));
    var dots  = [];
    for (var i = 0; i < nDots; i++) {
      dots.push({ phase: i / nDots });
    }
    return { pts: pts, segs: segs, total: total, color: color, label: label, labelSide: labelSide || 'above', dots: dots };
  }

  function buildPaths(L) {
    var HH = L.HH, FI = L.FI, FIN = L.FIN, GOV = L.GOV, OVS = L.OVS;
    var topY = L.topY, botY = L.botY;

    // midX for leakage/injection routing
    var leakMidX = (HH.x + HH.w + FIN.x) / 2;
    var injMidX  = (FIN.x + FIN.w + FI.x) / 2;

    return [
      // 0: Consumer Spending HH → Firms  (top rail, left→right)
      makePath([
        { x: HH.cx, y: HH.y      },
        { x: HH.cx, y: topY      },
        { x: FI.cx, y: topY      },
        { x: FI.cx, y: FI.y      }
      ], C.spending, 'Consumer Spending', 'above'),

      // 1: Factor Income Firms → HH  (bottom rail, right→left)
      makePath([
        { x: FI.cx,  y: FI.y + FI.h  },
        { x: FI.cx,  y: botY          },
        { x: HH.cx,  y: botY          },
        { x: HH.cx,  y: HH.y + HH.h  }
      ], C.income, 'Factor Income (wages, rent, profit)', 'below'),

      // 2: Savings (S)  HH → Financial Sector
      makePath([
        { x: HH.x + HH.w, y: HH.cy      },
        { x: leakMidX,     y: HH.cy      },
        { x: leakMidX,     y: FIN.cy     },
        { x: FIN.x,        y: FIN.cy     }
      ], C.savings, 'Savings (S)', 'above'),

      // 3: Tax (T)  HH → Government Sector
      makePath([
        { x: HH.x + HH.w, y: HH.cy      },
        { x: leakMidX,     y: HH.cy      },
        { x: leakMidX,     y: GOV.cy     },
        { x: GOV.x,        y: GOV.cy     }
      ], C.tax, 'Tax (T)', 'above'),

      // 4: Imports (M)  HH → Overseas Sector
      makePath([
        { x: HH.x + HH.w, y: HH.cy      },
        { x: leakMidX,     y: HH.cy      },
        { x: leakMidX,     y: OVS.cy     },
        { x: OVS.x,        y: OVS.cy     }
      ], C.imports, 'Imports (M)', 'below'),

      // 5: Investment (I)  Financial Sector → Firms
      makePath([
        { x: FIN.x + FIN.w, y: FIN.cy },
        { x: injMidX,        y: FIN.cy },
        { x: injMidX,        y: FI.cy  },
        { x: FI.x,           y: FI.cy  }
      ], C.savings, 'Investment (I)', 'above'),

      // 6: Gov't Spending (G)  Government Sector → Firms
      makePath([
        { x: GOV.x + GOV.w, y: GOV.cy },
        { x: injMidX,        y: GOV.cy },
        { x: injMidX,        y: FI.cy  },
        { x: FI.x,           y: FI.cy  }
      ], C.tax, "Gov't Spending (G)", 'above'),

      // 7: Exports (X)  Overseas Sector → Firms
      makePath([
        { x: OVS.x + OVS.w, y: OVS.cy },
        { x: injMidX,        y: OVS.cy },
        { x: injMidX,        y: FI.cy  },
        { x: FI.x,           y: FI.cy  }
      ], C.imports, 'Exports (X)', 'below'),
    ];
  }

  // ── Interpolation ─────────────────────────────────────────────────────────────
  function posOnPath(p, phase) {
    var dist = phase * p.total;
    var acc  = 0;
    for (var i = 0; i < p.segs.length; i++) {
      var s = p.segs[i];
      if (acc + s >= dist) {
        var t = s > 0 ? (dist - acc) / s : 0;
        return {
          x: p.pts[i].x + t * (p.pts[i + 1].x - p.pts[i].x),
          y: p.pts[i].y + t * (p.pts[i + 1].y - p.pts[i].y)
        };
      }
      acc += s;
    }
    var last = p.pts[p.pts.length - 1];
    return { x: last.x, y: last.y };
  }

  // ── Drawing helpers ───────────────────────────────────────────────────────────
  function drawRoundRect(r, radius) {
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, radius || 8);
  }

  function arrowAngle(pts) {
    var n = pts.length;
    return Math.atan2(pts[n - 1].y - pts[n - 2].y, pts[n - 1].x - pts[n - 2].x);
  }

  function drawArrowHead(x, y, angle, color) {
    ctx.save();
    ctx.fillStyle    = color;
    ctx.shadowColor  = color;
    ctx.shadowBlur   = 4;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-5, -4.5);
    ctx.lineTo(-5,  4.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPathLine(p) {
    ctx.strokeStyle  = p.color;
    ctx.lineWidth    = 2.5;
    ctx.globalAlpha  = 0.5;
    ctx.beginPath();
    ctx.moveTo(p.pts[0].x, p.pts[0].y);
    for (var i = 1; i < p.pts.length; i++) {
      ctx.lineTo(p.pts[i].x, p.pts[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    var n   = p.pts.length;
    var ang = arrowAngle(p.pts);
    drawArrowHead(p.pts[n - 1].x, p.pts[n - 1].y, ang, p.color);
  }

  function midOfPath(p) {
    // midpoint of the horizontal segment (index 1→2 for most paths)
    var half = p.pts.length > 2 ? 1 : 0;
    var a = p.pts[half], b = p.pts[half + 1] || p.pts[half];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function drawPathLabel(p) {
    var mid = midOfPath(p);
    var off = p.labelSide === 'above' ? -7 : 7;
    ctx.fillStyle    = C.muted;
    ctx.font         = '10px ' + FONT;
    ctx.textAlign    = 'center';
    ctx.textBaseline = p.labelSide === 'above' ? 'bottom' : 'top';
    ctx.fillText(p.label, mid.x, mid.y + off);
  }

  function drawBox(r, line1, line2, borderColor, textBold) {
    ctx.fillStyle   = C.surface;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth   = 1.5;
    drawRoundRect(r, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    if (line2) {
      ctx.fillStyle = C.text;
      ctx.font      = (textBold ? 'bold ' : '') + '13px ' + FONT;
      ctx.fillText(line1, r.cx, r.cy - 8);
      ctx.fillStyle = C.muted;
      ctx.font      = '10px ' + FONT;
      ctx.fillText(line2, r.cx, r.cy + 8);
    } else {
      ctx.fillStyle = C.text;
      ctx.font      = '12px ' + FONT;
      ctx.fillText(line1, r.cx, r.cy);
    }
  }

  function drawDots(p, dt) {
    var inc = DOT_SPEED / p.total * dt;
    p.dots.forEach(function (dot) {
      dot.phase = (dot.phase + inc) % 1;
      var pos = posOnPath(p, dot.phase);
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawSectionLabel(text, x, y, color) {
    ctx.save();
    ctx.fillStyle    = color;
    ctx.font         = 'bold 11px ' + FONT;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // ── State ─────────────────────────────────────────────────────────────────────
  var paths  = [];
  var layout = null;
  var lastTs = null;

  function init() {
    setupCanvas();
    layout = buildLayout();
    paths  = buildPaths(layout);
  }

  // ── Animate ───────────────────────────────────────────────────────────────────
  function animate(ts) {
    if (lastTs === null) lastTs = ts;
    var dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    var L = layout;

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // 1. Draw all path lines + labels
    paths.forEach(function (p) {
      drawPathLine(p);
      drawPathLabel(p);
    });

    // 2. Draw boxes (on top of lines so lines terminate at box edges cleanly)
    drawBox(L.HH,  'Households',        'income earners', C.spending, true);
    drawBox(L.FI,  'Firms',             'producers',      C.income,   true);
    drawBox(L.FIN, 'Financial Sector',  '',               C.spending, false);
    drawBox(L.GOV, 'Government Sector', '',               C.tax,      false);
    drawBox(L.OVS, 'Overseas Sector',   '',               C.imports,  false);

    // 3. Animate dots
    paths.forEach(function (p) { drawDots(p, dt); });

    // 4. Section headers
    var midSectY = (L.FIN.cy + L.OVS.cy) / 2;
    drawSectionLabel('LEAKAGES',   L.HH.x - 24, midSectY, C.income);
    drawSectionLabel('INJECTIONS', L.FI.x + L.FI.w + 24, midSectY, C.tax);

    requestAnimationFrame(animate);
  }

  // ── Resize ────────────────────────────────────────────────────────────────────
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      // Preserve dot phases so animation continues smoothly
      var savedPhases = paths.map(function (p) {
        return p.dots.map(function (d) { return d.phase; });
      });
      init();
      paths.forEach(function (p, pi) {
        if (savedPhases[pi]) {
          p.dots.forEach(function (d, di) {
            if (savedPhases[pi][di] !== undefined) d.phase = savedPhases[pi][di];
          });
        }
      });
    }, 100);
  });

  // ── Boot ──────────────────────────────────────────────────────────────────────
  init();
  requestAnimationFrame(animate);

})();
