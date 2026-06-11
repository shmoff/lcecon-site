(function(){
  'use strict';
  var U=EconUtils, C=U.C;
  var canvas=document.getElementById('cost-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var M={top:36,right:44,bottom:58,left:60};
  var arLevel=50; // AR = price = horizontal line, 0-100 in scaled units

  /* cost functions — raw values then scaled to 0–100 */
  var SCALE=100/30; // multiply raw cost by this to get canvas y-value
  function rawAVC(q){ return 0.002*q*q - 0.2*q + 10; }
  function rawAFC(q){ if(q<0.5)return 100; return 500/q; }
  function rawATC(q){ return rawAVC(q)+rawAFC(q); }
  function rawMC(q) { return 0.006*q*q - 0.4*q + 10; }

  function sc(raw){ return Math.min(raw*SCALE, 100); }

  function setup(){
    var r=U.setupCanvas(canvas,0.58);ctx=r.ctx;draw(r.W,r.H);
  }

  function draw(W,H){
    if(!W){var dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;}
    U.clearBg(ctx,W,H);
    U.drawGrid(ctx,M,W,H);
    U.drawAxes(ctx,M,W,H,'Output (Q)','Cost / Revenue (€)');

    // y-axis tick labels (actual cost values)
    ctx.fillStyle=C.axis;ctx.font='10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='right';
    [5,10,15,20,25,30].forEach(function(v){
      var y=U.toXY(0,sc(v),M,W,H)[1];
      ctx.fillText(v,M.left-6,y+4);
    });
    ctx.textAlign='center';
    [10,20,30,40,50,60,70,80,90].forEach(function(v){
      var x=U.toXY(v,0,M,W,H)[0];
      ctx.fillText(v,x,H-M.bottom+14);
    });

    // AFC curve
    U.curve(ctx,function(q){if(q<1)return null;return sc(rawAFC(q));},M,W,H,C.afc,1,100,'AFC',15,false);
    // AVC curve
    U.curve(ctx,function(q){return sc(rawAVC(q));},M,W,H,C.avc,5,100,'AVC',90,false);
    // ATC curve
    U.curve(ctx,function(q){if(q<1)return null;return sc(rawATC(q));},M,W,H,C.atc,2,100,'ATC',85,true);
    // MC curve
    U.curve(ctx,function(q){return sc(rawMC(q));},M,W,H,C.mc,5,100,'MC',90,true);

    // AR = P horizontal line (slider)
    var arP=arLevel;
    U.hLine(ctx,arP,M,W,H,'rgba(240,172,95,0.8)',true,'AR = MR = P');

    // profit-maximising point: MC = AR => 0.006Q²-0.4Q+10 = arLevel/SCALE
    // 0.006Q²-0.4Q+(10-arRaw)=0
    var arRaw=arLevel/SCALE;
    var disc=0.16-4*0.006*(10-arRaw);
    if(disc>=0){
      var q1=(0.4-Math.sqrt(disc))/(2*0.006);
      var q2=(0.4+Math.sqrt(disc))/(2*0.006);
      // pick q2 (right side of MC, upward slope) if in range
      var qStar=q2;
      if(qStar>5&&qStar<95){
        var atcAtQ=sc(rawATC(qStar));
        var ptX=U.toXY(qStar,arLevel,M,W,H)[0];
        var ptY=U.toXY(qStar,arLevel,M,W,H)[1];
        var atcY=U.toXY(qStar,atcAtQ,M,W,H)[1];
        // profit rectangle
        if(arLevel>atcAtQ){
          ctx.fillStyle='rgba(88,196,221,0.08)';
          ctx.fillRect(M.left,Math.min(ptY,atcY),ptX-M.left,Math.abs(atcY-ptY));
        } else {
          ctx.fillStyle='rgba(252,98,85,0.08)';
          ctx.fillRect(M.left,Math.min(ptY,atcY),ptX-M.left,Math.abs(atcY-ptY));
        }
        U.dot(ctx,ptX,ptY,C.equil,5);
        U.dropLines(ctx,ptX,ptY,M,H,C.equil);
        ctx.fillStyle=C.equil;ctx.font='11px "Latin Modern Roman",Georgia,serif';
        ctx.textAlign='center';
        ctx.fillText('Q* = '+Math.round(qStar),ptX,H-M.bottom+28);
      }
    }
  }

  var sl=document.getElementById('cost-ar-slider');
  if(sl) sl.addEventListener('input',function(){
    arLevel=Number(this.value);
    var v=document.getElementById('cost-ar-val');
    if(v) v.textContent='€'+Math.round(arLevel/SCALE);
    draw();
  });

  U.onResize(function(){setup();});
  setup();
})();
