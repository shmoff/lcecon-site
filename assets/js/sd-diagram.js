(function () {
  'use strict';
  var U = EconUtils, C = U.C;
  var canvas = document.getElementById('sd-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var M = {top:36, right:44, bottom:58, left:58};
  var dShift=0, sShift=0, mode='free';
  var FLOOR_P = 60, CEIL_P = 22;

  function dP(q){ return 78 - 0.6*q + dShift; }
  function sP(q){ return 8  + 0.5*q - sShift; }
  function dQ(p){ return (78 - p + dShift) / 0.6; }
  function sQ(p){ return (p  - 8 + sShift) / 0.5; }
  function eq(){ var q=(70+dShift+sShift)/1.1; return {q:q, p:sP(q)}; }

  function setup() {
    var r = U.setupCanvas(canvas, 0.58);
    ctx = r.ctx;
    draw(r.W, r.H);
  }

  function draw(W, H) {
    if (!W) { var dpr=window.devicePixelRatio||1; W=canvas.width/dpr; H=canvas.height/dpr; }
    U.clearBg(ctx,W,H);
    U.drawGrid(ctx,M,W,H);
    U.drawAxes(ctx,M,W,H,'Quantity  (Q)','Price  (P)');

    // tick values
    ctx.fillStyle=C.axis; ctx.font='10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';
    [20,40,60,80].forEach(function(v){
      var x=U.toXY(v,0,M,W,H)[0];
      ctx.fillText(v,x,H-M.bottom+14);
    });
    ctx.textAlign='right';
    [20,40,60,80].forEach(function(v){
      var y=U.toXY(0,v,M,W,H)[1];
      ctx.fillText(v,M.left-8,y+4);
    });

    // Price floor / ceiling shading
    if (mode==='floor' && FLOOR_P < 100) {
      var qd=dQ(FLOOR_P), qs=sQ(FLOOR_P);
      if (qd>=0 && qs>=0 && qs>qd) {
        var x1=U.toXY(qd,0,M,W,H)[0], x2=U.toXY(qs,0,M,W,H)[0];
        var fy=U.toXY(0,FLOOR_P,M,W,H)[1];
        ctx.fillStyle='rgba(131,193,103,0.1)';
        ctx.fillRect(x1, fy, x2-x1, H-M.bottom-fy);
        // surplus brace labels
        ctx.fillStyle=C.floor;
        ctx.font='11px "Latin Modern Roman",Georgia,serif';
        ctx.textAlign='center';
        ctx.fillText('← Surplus →',(x1+x2)/2, fy-8);
        // vertical lines at Qd, Qs
        [x1,x2].forEach(function(x){
          ctx.strokeStyle=C.floor; ctx.lineWidth=1;
          ctx.setLineDash([3,4]); ctx.globalAlpha=0.5;
          ctx.beginPath(); ctx.moveTo(x,fy); ctx.lineTo(x,H-M.bottom);
          ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha=1;
        });
      }
    }
    if (mode==='ceiling' && CEIL_P > 0) {
      var qd2=dQ(CEIL_P), qs2=sQ(CEIL_P);
      if (qd2>=0 && qs2>=0 && qd2>qs2) {
        var x3=U.toXY(qs2,0,M,W,H)[0], x4=U.toXY(qd2,0,M,W,H)[0];
        var cy=U.toXY(0,CEIL_P,M,W,H)[1];
        ctx.fillStyle='rgba(252,98,85,0.1)';
        ctx.fillRect(x3, cy, x4-x3, H-M.bottom-cy);
        ctx.fillStyle=C.ceiling;
        ctx.font='11px "Latin Modern Roman",Georgia,serif';
        ctx.textAlign='center';
        ctx.fillText('← Shortage →',(x3+x4)/2, cy-8);
        [x3,x4].forEach(function(x){
          ctx.strokeStyle=C.ceiling; ctx.lineWidth=1;
          ctx.setLineDash([3,4]); ctx.globalAlpha=0.5;
          ctx.beginPath(); ctx.moveTo(x,cy); ctx.lineTo(x,H-M.bottom);
          ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha=1;
        });
      }
    }

    U.curve(ctx,dP,M,W,H,C.demand,0,100,'D',82,false);
    U.curve(ctx,sP,M,W,H,C.supply,0,100,'S',82,true);

    // floor/ceiling horizontal lines
    if (mode==='floor') {
      U.hLine(ctx,FLOOR_P,M,W,H,C.floor,false,'Price Floor (Pf)');
      ctx.fillStyle=C.floor;ctx.font='11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='right';
      ctx.fillText('Pf',M.left-6,U.toXY(0,FLOOR_P,M,W,H)[1]+4);
    }
    if (mode==='ceiling') {
      U.hLine(ctx,CEIL_P,M,W,H,C.ceiling,false,'Price Ceiling (Pc)');
      ctx.fillStyle=C.ceiling;ctx.font='11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='right';
      ctx.fillText('Pc',M.left-6,U.toXY(0,CEIL_P,M,W,H)[1]+4);
    }

    // equilibrium
    var e=eq();
    if (e.q>1&&e.q<99&&e.p>1&&e.p<99&&mode==='free') {
      var ex=U.toXY(e.q,e.p,M,W,H)[0], ey=U.toXY(e.q,e.p,M,W,H)[1];
      U.dropLines(ctx,ex,ey,M,H,C.equil);
      U.dot(ctx,ex,ey,C.equil);
      U.axisLabel(ctx,ex,ey,M,H,C.equil,'P*','Q*');
    }
  }

  function resize() { setup(); }
  U.onResize(resize);

  // sliders
  function wire(id, onChange) {
    var el=document.getElementById(id);
    if(el) el.addEventListener('input',function(){onChange(Number(this.value));
      var valEl=document.getElementById(id+'-val');
      if(valEl) valEl.textContent=(this.value>0?'+':'')+this.value;
      draw();});
  }
  wire('sd-demand-shift', function(v){dShift=v;});
  wire('sd-supply-shift', function(v){sShift=v;});

  // mode buttons
  ['free','floor','ceiling'].forEach(function(m){
    var btn=document.getElementById('sd-btn-'+m);
    if(!btn)return;
    btn.addEventListener('click',function(){
      mode=m;
      document.querySelectorAll('.sd-mode-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      draw();
    });
  });

  setup();
})();
