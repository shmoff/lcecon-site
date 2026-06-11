/* Shared canvas utilities for LC Econ interactive diagrams */
var EconUtils = (function () {
  'use strict';

  var C = {
    demand:  '#58c4dd', supply:  '#fc6255', equil:   '#f0ac5f',
    green:   '#83c167', purple:  '#9a72ac', teal:    '#5cd0b3',
    mc:      '#fc6255', atc:     '#58c4dd', avc:     '#83c167', afc:'#9a72ac',
    msb:     '#5cd0b3', msc:     '#f0ac5f',
    floor:   '#83c167', ceiling: '#e8b84b',
    dwl:     'rgba(252,98,85,0.16)',
    surplus: 'rgba(131,193,103,0.12)',
    shortage:'rgba(88,196,221,0.12)',
    axis:    '#50506a', grid:'rgba(80,80,106,0.22)',
    text:    '#e8e8f4', muted:'#8888aa', bg:'#12121f',
  };

  function setupCanvas(canvas, ratio) {
    ratio = ratio || 0.58;
    var dpr  = window.devicePixelRatio || 1;
    var rect = canvas.parentElement.getBoundingClientRect();
    var W    = Math.min(Math.round(rect.width - 32), 680);
    var H    = Math.round(W * ratio);
    canvas.width  = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W+'px'; canvas.style.height = H+'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx:ctx, W:W, H:H };
  }

  function clearBg(ctx, W, H) {
    ctx.fillStyle = C.bg; ctx.fillRect(0,0,W,H);
  }

  function drawGrid(ctx, M, W, H) {
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (var i=1; i<10; i++) {
      var x = M.left + (i/10)*(W-M.left-M.right);
      var y = M.top  + (i/10)*(H-M.top -M.bottom);
      ctx.beginPath(); ctx.moveTo(x,M.top);  ctx.lineTo(x,H-M.bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(M.left,y); ctx.lineTo(W-M.right,y);  ctx.stroke();
    }
  }

  function drawAxes(ctx, M, W, H, xLabel, yLabel) {
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(M.left,M.top); ctx.lineTo(M.left,H-M.bottom);
    ctx.lineTo(W-M.right,H-M.bottom); ctx.stroke();
    ctx.fillStyle = C.axis;
    var aw=4.5, ah=8;
    ctx.beginPath(); ctx.moveTo(W-M.right,H-M.bottom);
    ctx.lineTo(W-M.right-aw, H-M.bottom-ah/2);
    ctx.lineTo(W-M.right-aw, H-M.bottom+ah/2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(M.left,M.top);
    ctx.lineTo(M.left-ah/2,M.top+aw);
    ctx.lineTo(M.left+ah/2,M.top+aw); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.muted;
    ctx.font = '13px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, (M.left+W-M.right)/2, H-6);
    ctx.save(); ctx.translate(13,(M.top+H-M.bottom)/2);
    ctx.rotate(-Math.PI/2); ctx.fillText(yLabel,0,0); ctx.restore();
  }

  function curve(ctx, fn, M, W, H, color, qMin, qMax, label, lq, below) {
    qMin=qMin||0; qMax=qMax||100;
    ctx.strokeStyle=color; ctx.lineWidth=2.5;
    ctx.shadowColor=color; ctx.shadowBlur=10;
    ctx.beginPath(); var started=false;
    for (var q=qMin; q<=qMax; q+=0.5) {
      var p=fn(q);
      if (p<0||p>100){started=false;continue;}
      var x=M.left+(q/100)*(W-M.left-M.right);
      var y=H-M.bottom-(p/100)*(H-M.top-M.bottom);
      if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);
    }
    ctx.stroke(); ctx.shadowBlur=0;
    if (label && lq!==undefined) {
      var lp=fn(lq);
      if (lp>0&&lp<100) {
        var lx=M.left+(lq/100)*(W-M.left-M.right);
        var ly=H-M.bottom-(lp/100)*(H-M.top-M.bottom);
        ctx.fillStyle=color;
        ctx.font='italic 15px "Latin Modern Roman",Georgia,serif';
        ctx.textAlign='left'; ctx.shadowColor=color; ctx.shadowBlur=6;
        ctx.fillText(label, lx+5, below ? ly+16 : ly-5); ctx.shadowBlur=0;
      }
    }
  }

  function dropLines(ctx, ex, ey, M, H, color) {
    ctx.strokeStyle=color; ctx.lineWidth=1;
    ctx.setLineDash([4,5]); ctx.globalAlpha=0.55;
    ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(ex,H-M.bottom);
    ctx.moveTo(ex,ey); ctx.lineTo(M.left,ey); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha=1;
  }

  function dot(ctx, x, y, color, r) {
    r=r||5.5;
    ctx.fillStyle=color; ctx.shadowColor=color; ctx.shadowBlur=20;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  }

  function axisLabel(ctx, ex, ey, M, H, color, pLbl, qLbl) {
    ctx.font='12px "Latin Modern Roman",Georgia,serif';
    ctx.fillStyle=color;
    ctx.textAlign='right'; ctx.fillText(pLbl||'P*', M.left-6, ey+4);
    ctx.textAlign='center'; ctx.fillText(qLbl||'Q*', ex, H-M.bottom+28);
  }

  function hLine(ctx, p, M, W, H, color, dashed, label) {
    var y=H-M.bottom-(p/100)*(H-M.top-M.bottom);
    if (y<M.top||y>H-M.bottom) return null;
    ctx.strokeStyle=color; ctx.lineWidth=1.8;
    ctx.shadowColor=color; ctx.shadowBlur=6;
    if (dashed) ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(M.left,y); ctx.lineTo(W-M.right,y); ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur=0;
    if (label) {
      ctx.fillStyle=color; ctx.font='11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='left'; ctx.fillText(label, M.left+6, y-5);
    }
    return y;
  }

  function onResize(fn) {
    var t; window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(fn,80);});
  }

  function toXY(q, p, M, W, H) {
    return [
      M.left + (q/100)*(W-M.left-M.right),
      H - M.bottom - (p/100)*(H-M.top-M.bottom)
    ];
  }

  return { C:C, setupCanvas:setupCanvas, clearBg:clearBg, drawGrid:drawGrid,
    drawAxes:drawAxes, curve:curve, dropLines:dropLines, dot:dot,
    axisLabel:axisLabel, hLine:hLine, onResize:onResize, toXY:toXY };
})();
