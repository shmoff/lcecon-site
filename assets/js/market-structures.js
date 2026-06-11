(function(){
  'use strict';
  var U=EconUtils,C=U.C;
  var canvas=document.getElementById('ms-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var M={top:36,right:44,bottom:58,left:60};
  var mktType='pc';
  var SCALE=100/30;
  function rawAVC(q){return 0.002*q*q-0.2*q+10;}
  function rawAFC(q){if(q<0.5)return 100;return 500/q;}
  function rawATC(q){return rawAVC(q)+rawAFC(q);}
  function rawMC(q){return 0.006*q*q-0.4*q+10;}
  function sc(r){return Math.min(r*SCALE,100);}

  // PC price level (slider)
  var pcPrice=50; // in 0-100 canvas units

  function setup(){var r=U.setupCanvas(canvas,0.58);ctx=r.ctx;draw(r.W,r.H);}

  function draw(W,H){
    if(!W){var dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;}
    U.clearBg(ctx,W,H);U.drawGrid(ctx,M,W,H);
    U.drawAxes(ctx,M,W,H,'Output (Q)','Price / Cost (€)');

    ctx.fillStyle=C.axis;ctx.font='10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='right';
    [5,10,15,20,25,30].forEach(function(v){
      ctx.fillText(v,M.left-6,U.toXY(0,sc(v),M,W,H)[1]+4);
    });
    ctx.textAlign='center';
    [10,20,30,40,50,60,70,80,90].forEach(function(v){
      ctx.fillText(v,U.toXY(v,0,M,W,H)[0],H-M.bottom+14);
    });

    // shared cost curves
    U.curve(ctx,function(q){if(q<2)return null;return sc(rawATC(q));},M,W,H,C.atc,2,95,'ATC',88,true);
    U.curve(ctx,function(q){return sc(rawMC(q));},M,W,H,C.mc,5,92,'MC',88,false);

    if(mktType==='pc'){
      // horizontal AR=MR line
      U.hLine(ctx,pcPrice,M,W,H,C.demand,false,'AR = MR = P');
      // profit-max: MC = AR => find Q
      var arRaw=pcPrice/SCALE;
      var disc=0.16-4*0.006*(10-arRaw);
      if(disc>=0){
        var qStar=(0.4+Math.sqrt(disc))/(2*0.006);
        if(qStar>5&&qStar<90){
          var atcQ=sc(rawATC(qStar));
          var ptX=U.toXY(qStar,pcPrice,M,W,H)[0];
          var ptY=U.toXY(qStar,pcPrice,M,W,H)[1];
          var atcY=U.toXY(qStar,atcQ,M,W,H)[1];
          if(pcPrice>atcQ){
            ctx.fillStyle='rgba(88,196,221,0.1)';
            ctx.fillRect(M.left,ptY,ptX-M.left,atcY-ptY);
            ctx.fillStyle=C.demand;ctx.font='11px "Latin Modern Roman",Georgia,serif';
            ctx.textAlign='center';ctx.fillText('Supernormal profit',(M.left+ptX)/2,(ptY+atcY)/2);
          } else if(pcPrice<atcQ){
            ctx.fillStyle='rgba(252,98,85,0.08)';
            ctx.fillRect(M.left,atcY,ptX-M.left,ptY-atcY);
            ctx.fillStyle=C.supply;ctx.font='11px "Latin Modern Roman",Georgia,serif';
            ctx.textAlign='center';ctx.fillText('Loss',(M.left+ptX)/2,(ptY+atcY)/2);
          }
          U.dot(ctx,ptX,ptY,C.equil,5);
          U.dropLines(ctx,ptX,ptY,M,H,C.equil);
          ctx.fillStyle=C.equil;ctx.font='11px "Latin Modern Roman",Georgia,serif';
          ctx.textAlign='center';ctx.fillText('Q*',ptX,H-M.bottom+28);
        }
      }

    } else {
      // Monopoly: AR = 90-0.7Q, MR = 90-1.4Q (both scaled)
      var ar=function(q){return Math.max(0,90-0.7*q);};
      var mr=function(q){return 90-1.4*q;};
      U.curve(ctx,ar,M,W,H,C.demand,0,100,'AR (Demand)',85,false);
      U.curve(ctx,mr,M,W,H,'#5cd0b3',0,64,'MR',55,true);

      // profit-max: MC=MR => 0.006Q²-0.4Q+10 = 90-1.4Q
      // 0.006Q²+Q-80=0 => Q=(-1+sqrt(1+4*0.006*80))/(2*0.006)
      var discM=1+4*0.006*80;
      var qM=(-1+Math.sqrt(discM))/(2*0.006); // ≈ 57.4
      if(qM>0&&qM<90){
        var pM=ar(qM); // price from AR curve
        var atcM=sc(rawATC(qM));
        var pmX=U.toXY(qM,pM,M,W,H)[0];
        var pmY=U.toXY(qM,pM,M,W,H)[1];
        var atcMY=U.toXY(qM,atcM,M,W,H)[1];
        // profit rectangle
        if(pM>atcM){
          ctx.fillStyle='rgba(88,196,221,0.1)';
          ctx.fillRect(M.left,pmY,pmX-M.left,atcMY-pmY);
          ctx.fillStyle=C.demand;ctx.font='11px "Latin Modern Roman",Georgia,serif';
          ctx.textAlign='center';ctx.fillText('Supernormal profit',(M.left+pmX)/2,(pmY+atcMY)/2);
        }
        // MR=MC intersection point
        var mrX=U.toXY(qM,sc(rawMC(qM)),M,W,H)[0];
        var mrY=U.toXY(qM,sc(rawMC(qM)),M,W,H)[1];
        U.dot(ctx,mrX,mrY,'#5cd0b3',4); // MC=MR point
        // vertical from MC=MR to price on AR
        ctx.strokeStyle=C.equil;ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.globalAlpha=0.5;
        ctx.beginPath();ctx.moveTo(pmX,pmY);ctx.lineTo(pmX,H-M.bottom);ctx.stroke();
        ctx.beginPath();ctx.moveTo(M.left,pmY);ctx.lineTo(pmX,pmY);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
        U.dot(ctx,pmX,pmY,C.equil,5);
        ctx.fillStyle=C.equil;ctx.font='11px "Latin Modern Roman",Georgia,serif';
        ctx.textAlign='right';ctx.fillText('Pm',M.left-6,pmY+4);
        ctx.textAlign='center';ctx.fillText('Qm',pmX,H-M.bottom+28);
      }
    }
  }

  var sl=document.getElementById('ms-price-slider');
  if(sl) sl.addEventListener('input',function(){
    pcPrice=Number(this.value);
    var v=document.getElementById('ms-price-val');
    if(v) v.textContent='€'+Math.round(pcPrice/SCALE);
    draw();
  });

  ['pc','monopoly'].forEach(function(t){
    var btn=document.getElementById('ms-btn-'+t);
    if(!btn)return;
    btn.addEventListener('click',function(){
      mktType=t;
      document.querySelectorAll('.ms-mode-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      draw();
    });
  });

  U.onResize(function(){setup();});
  setup();
})();
