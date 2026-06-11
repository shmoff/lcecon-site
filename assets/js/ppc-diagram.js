(function(){
  'use strict';
  var U=EconUtils, C=U.C;
  var canvas=document.getElementById('ppc-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var M={top:36,right:44,bottom:58,left:58};
  var shift=0; // -30 to +30
  var clickPt=null; // {x,y} in data space

  /* PPC: ellipse quadrant. A(shift) and B(shift) are the intercepts */
  function A(){ return 70+shift; }
  function B(){ return 70+shift; }
  /* At parameter t in [0, pi/2]: x=A*sin(t), y=B*cos(t) */
  function yFromX(x){ var a=A(),b=B(); if(x<0||x>a)return null; return b*Math.sqrt(1-(x/a)*(x/a)); }

  function setup(){
    var r=U.setupCanvas(canvas,0.58); ctx=r.ctx; draw(r.W,r.H);
  }

  function draw(W,H){
    if(!W){var dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;}
    U.clearBg(ctx,W,H);
    U.drawGrid(ctx,M,W,H);
    U.drawAxes(ctx,M,W,H,'Healthcare (units)','Housing (units)');

    // axis tick labels
    ctx.fillStyle=C.axis;ctx.font='10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';
    [20,40,60,80,100].forEach(function(v){
      var x=U.toXY(v,0,M,W,H)[0];
      ctx.fillText(v,x,H-M.bottom+14);
    });
    ctx.textAlign='right';
    [20,40,60,80,100].forEach(function(v){
      var y=U.toXY(0,v,M,W,H)[1];
      ctx.fillText(v,M.left-8,y+4);
    });

    // PPC curve
    ctx.strokeStyle=C.demand; ctx.lineWidth=2.5;
    ctx.shadowColor=C.demand; ctx.shadowBlur=10;
    ctx.beginPath(); var started=false;
    for(var t=0;t<=Math.PI/2;t+=0.01){
      var xd=A()*Math.sin(t), yd=B()*Math.cos(t);
      if(xd<0||xd>100||yd<0||yd>100){started=false;continue;}
      var pt=U.toXY(xd,yd,M,W,H);
      if(!started){ctx.moveTo(pt[0],pt[1]);started=true;}else ctx.lineTo(pt[0],pt[1]);
    }
    ctx.stroke(); ctx.shadowBlur=0;

    // PPC label
    var lx=A()*0.82, ly=yFromX(lx);
    if(ly!==null){
      var lpt=U.toXY(lx,ly,M,W,H);
      ctx.fillStyle=C.demand; ctx.font='italic 14px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='left'; ctx.shadowColor=C.demand; ctx.shadowBlur=6;
      ctx.fillText('PPC',lpt[0]+6,lpt[1]-6); ctx.shadowBlur=0;
    }

    // clicked point
    if(clickPt){
      var cy2=yFromX(clickPt.x);
      var onCurve = cy2!==null && Math.abs(clickPt.y-cy2)<4;
      var inside = cy2!==null && clickPt.y < cy2 && clickPt.x<A();
      var outside= cy2===null || clickPt.x>A() || (cy2!==null && clickPt.y>cy2);
      var dotColor = onCurve ? C.equil : (inside ? C.green : C.supply);
      var label = onCurve ? 'Productively efficient' : (inside ? 'Inefficient (inside PPC)' : 'Unattainable (outside PPC)');
      var cpt=U.toXY(clickPt.x,clickPt.y,M,W,H);
      U.dot(ctx,cpt[0],cpt[1],dotColor,6);
      ctx.fillStyle=dotColor; ctx.font='12px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='left'; ctx.shadowColor=dotColor; ctx.shadowBlur=8;
      ctx.fillText(label,cpt[0]+10,cpt[1]-4); ctx.shadowBlur=0;
    }
  }

  // canvas click
  canvas.addEventListener('click',function(e){
    var dpr=window.devicePixelRatio||1;
    var rect=canvas.getBoundingClientRect();
    var cx=(e.clientX-rect.left);
    var cy=(e.clientY-rect.top);
    var W=canvas.width/dpr,H=canvas.height/dpr;
    var qx=(cx-M.left)/(W-M.left-M.right)*100;
    var qy=(H-M.bottom-cy)/(H-M.top-M.bottom)*100;
    clickPt={x:qx,y:qy};
    draw(W,H);
  });

  // shift slider
  var sl=document.getElementById('ppc-shift');
  if(sl) sl.addEventListener('input',function(){
    shift=Number(this.value);
    var v=document.getElementById('ppc-shift-val');
    if(v) v.textContent=(shift>0?'+':'')+shift;
    clickPt=null; draw();
  });

  U.onResize(function(){setup();});
  setup();
})();
