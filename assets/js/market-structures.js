(function(){
  'use strict';
  var U=EconUtils,C=U.C;
  var canvas=document.getElementById('ms-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var M={top:36,right:60,bottom:58,left:60};
  var mktType='pc', pcPrice=55;
  var SCALE=100/30;
  function rawAVC(q){return 0.002*q*q-0.2*q+10;}
  function rawAFC(q){if(q<0.5)return 999;return 500/q;}
  function rawATC(q){return rawAVC(q)+rawAFC(q);}
  function rawMC(q){return 0.006*q*q-0.4*q+10;}
  function sc(r){return Math.min(r*SCALE,100);}
  function toX(q,W){return M.left+(q/100)*(W-M.left-M.right);}
  function toY(p,H){return H-M.bottom-(p/100)*(H-M.top-M.bottom);}

  function setup(){var r=U.setupCanvas(canvas,0.58);ctx=r.ctx;draw(r.W,r.H);}

  function drawAxesTicks(W,H){
    U.drawAxes(ctx,M,W,H,'Output (Q)','Price / Cost (€)');
    ctx.fillStyle=C.axis;ctx.font='10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='right';
    [0,5,10,15,20,25,30].forEach(function(v){
      var y=toY(sc(v),H);if(y<M.top||y>H-M.bottom)return;
      ctx.fillText(v,M.left-6,y+4);
    });
    ctx.textAlign='center';
    [10,20,30,40,50,60,70,80,90].forEach(function(v){
      ctx.fillText(v,toX(v,W),H-M.bottom+14);
    });
  }

  function drawCostCurves(W,H){
    U.curve(ctx,function(q){if(q<2)return null;return sc(rawATC(q));},M,W,H,C.atc,2,95,'ATC',88,true);
    U.curve(ctx,function(q){return sc(rawMC(q));},M,W,H,C.mc,5,92,'MC',88,false);
  }

  function draw(W,H){
    if(!W){var dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;}
    U.clearBg(ctx,W,H);U.drawGrid(ctx,M,W,H);
    drawAxesTicks(W,H);

    if(mktType==='pc'){
      drawCostCurves(W,H);
      // Horizontal AR=MR line
      var arP=pcPrice;
      U.hLine(ctx,arP,M,W,H,C.demand,false,'AR = MR = P');
      // Find Q*: MC=AR
      var arRaw=arP/SCALE;
      var disc=0.16-4*0.006*(10-arRaw);
      if(disc>=0){
        var qStar=(0.4+Math.sqrt(disc))/(2*0.006);
        if(qStar>5&&qStar<92){
          var atcQ=sc(rawATC(qStar));
          var ptX=toX(qStar,W),ptY=toY(arP,H),atcY=toY(atcQ,H);
          if(arP>atcQ){
            ctx.fillStyle='rgba(88,196,221,0.10)';
            ctx.fillRect(M.left,ptY,ptX-M.left,atcY-ptY);
            ctx.fillStyle=C.demand;ctx.font='11px "Latin Modern Roman",Georgia,serif';
            ctx.textAlign='center';ctx.fillText('Supernormal profit',(M.left+ptX)/2,(ptY+atcY)/2);
          } else if(arP<atcQ){
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

    } else if(mktType==='mc'){
      drawCostCurves(W,H);
      // SR demand: P=85-0.6Q, MR: P=85-1.2Q
      var arMC=function(q){return Math.max(0,85-0.6*q);};
      var mrMC=function(q){return 85-1.2*q;};
      // LR demand (dashed): P=75-0.6Q
      var arLR=function(q){return Math.max(0,75-0.6*q);};
      // Draw LR AR dashed first (behind)
      ctx.strokeStyle='rgba(88,196,221,0.3)';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
      ctx.beginPath();var stL=false;
      for(var ql=0;ql<=100;ql+=1){var pl=arLR(ql);if(pl<0||pl>100){stL=false;continue;}var ptL=U.toXY(ql,pl,M,W,H);if(!stL){ctx.moveTo(ptL[0],ptL[1]);stL=true;}else ctx.lineTo(ptL[0],ptL[1]);}
      ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='rgba(88,196,221,0.45)';ctx.font='italic 10px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='left';ctx.fillText('D (long run)',U.toXY(60,arLR(60),M,W,H)[0]+4,U.toXY(60,arLR(60),M,W,H)[1]-4);
      // SR curves
      U.curve(ctx,arMC,M,W,H,C.demand,0,100,'D (short run)',78,false);
      U.curve(ctx,mrMC,M,W,H,C.teal,0,70,'MR',60,true);
      // Profit max: MC=MR => 0.006Q²+0.8Q-75=0
      var dMC=0.64+4*0.006*75;
      var qMC=(-0.8+Math.sqrt(dMC))/(2*0.006);
      if(qMC>0&&qMC<90){
        var pMC=arMC(qMC), atcMC=sc(rawATC(qMC));
        var mcX=toX(qMC,W),mcY=toY(pMC,H),atcMCY=toY(atcMC,H);
        if(pMC>atcMC){
          ctx.fillStyle='rgba(88,196,221,0.10)';
          ctx.fillRect(M.left,mcY,mcX-M.left,atcMCY-mcY);
          ctx.fillStyle=C.demand;ctx.font='10px "Latin Modern Roman",Georgia,serif';
          ctx.textAlign='center';ctx.fillText('SR profit',(M.left+mcX)/2,(mcY+atcMCY)/2);
        }
        U.dot(ctx,mcX,mcY,C.equil,5);
        U.dropLines(ctx,mcX,mcY,M,H,C.equil);
        ctx.fillStyle=C.equil;ctx.font='11px "Latin Modern Roman",Georgia,serif';
        ctx.textAlign='center';ctx.fillText('Q*',mcX,H-M.bottom+28);
        ctx.textAlign='right';ctx.fillText('P*',M.left-6,mcY+4);
      }
      // Note at top
      ctx.fillStyle='#8888aa';ctx.font='10px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='left';
      ctx.fillText('SR: supernormal profit → new firms enter → D shifts left → LR: normal profit',M.left+4,M.top+12);

    } else if(mktType==='oligo'){
      // KINKED DEMAND CURVE — Sweezy oligopoly
      // Demand above kink (Q<=50): P=100-0.8Q (elastic)
      // Demand below kink (Q>=50): P=115-1.1Q (inelastic)
      // MR above (Q<50): MR=100-1.6Q  => at Q=50: MR=20
      // MR below (Q>50): MR=115-2.2Q  => at Q=50: MR=5 (gap: 5 to 20)
      var dAbove=function(q){return Math.max(0,100-0.8*q);};
      var dBelow=function(q){return Math.max(0,115-1.1*q);};
      var mrAbove=function(q){return 100-1.6*q;};
      var mrBelow=function(q){return 115-2.2*q;};

      // Shade MR gap region at Q=50
      var gapX=toX(50,W);
      var gapY1=toY(5,H), gapY2=toY(20,H);
      ctx.fillStyle='rgba(252,98,85,0.12)';
      ctx.fillRect(gapX-8,gapY2,16,gapY1-gapY2);

      // Draw kinked demand: two segments, same color
      ctx.strokeStyle=C.demand;ctx.lineWidth=2.5;ctx.shadowColor=C.demand;ctx.shadowBlur=10;
      ctx.beginPath();var stA=false;
      for(var qa=0;qa<=50;qa+=0.5){var pa=dAbove(qa);if(pa<0||pa>100){stA=false;continue;}var ptA=U.toXY(qa,pa,M,W,H);if(!stA){ctx.moveTo(ptA[0],ptA[1]);stA=true;}else ctx.lineTo(ptA[0],ptA[1]);}
      ctx.stroke();ctx.shadowBlur=0;
      ctx.strokeStyle=C.demand;ctx.lineWidth=2.5;ctx.shadowColor=C.demand;ctx.shadowBlur=10;
      ctx.beginPath();var stB=false;
      for(var qb=50;qb<=100;qb+=0.5){var pb=dBelow(qb);if(pb<0||pb>100){stB=false;continue;}var ptB=U.toXY(qb,pb,M,W,H);if(!stB){ctx.moveTo(ptB[0],ptB[1]);stB=true;}else ctx.lineTo(ptB[0],ptB[1]);}
      ctx.stroke();ctx.shadowBlur=0;

      // MR above kink (Q=0 to 50)
      ctx.strokeStyle=C.teal;ctx.lineWidth=2;ctx.shadowColor=C.teal;ctx.shadowBlur=6;
      ctx.beginPath();var stM1=false;
      for(var qm1=0;qm1<=50;qm1+=0.5){var pm1=mrAbove(qm1);if(pm1<0||pm1>100){stM1=false;continue;}var ptM1=U.toXY(qm1,pm1,M,W,H);if(!stM1){ctx.moveTo(ptM1[0],ptM1[1]);stM1=true;}else ctx.lineTo(ptM1[0],ptM1[1]);}
      ctx.stroke();ctx.shadowBlur=0;

      // MR below kink (Q=50 onwards)
      ctx.strokeStyle=C.teal;ctx.lineWidth=2;ctx.shadowColor=C.teal;ctx.shadowBlur=6;
      ctx.beginPath();var stM2=false;
      for(var qm2=50;qm2<=80;qm2+=0.5){var pm2=mrBelow(qm2);if(pm2<-20){break;}if(pm2>100){stM2=false;continue;}var ptM2=U.toXY(qm2,Math.max(0,pm2),M,W,H);if(!stM2){ctx.moveTo(ptM2[0],ptM2[1]);stM2=true;}else ctx.lineTo(ptM2[0],ptM2[1]);}
      ctx.stroke();ctx.shadowBlur=0;

      // Gap line (vertical dashed red)
      ctx.strokeStyle=C.supply;ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
      ctx.beginPath();ctx.moveTo(gapX,gapY2);ctx.lineTo(gapX,gapY1);ctx.stroke();ctx.setLineDash([]);

      // MC curve (passes through the MR gap)
      U.curve(ctx,function(q){return sc(rawMC(q));},M,W,H,C.mc,5,92,'MC',88,false);

      // Kink point
      var kinkPt=U.toXY(50,60,M,W,H);
      U.dropLines(ctx,kinkPt[0],kinkPt[1],M,H,C.equil);
      U.dot(ctx,kinkPt[0],kinkPt[1],C.equil,6);

      // Labels
      ctx.fillStyle=C.equil;ctx.font='bold 11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='right';ctx.fillText('P* = 60',M.left-6,kinkPt[1]+4);
      ctx.textAlign='center';ctx.fillText('Q* = 50',kinkPt[0],H-M.bottom+28);

      ctx.fillStyle=C.demand;ctx.font='italic 13px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='left';ctx.shadowColor=C.demand;ctx.shadowBlur=6;
      ctx.fillText('D',U.toXY(85,dBelow(85),M,W,H)[0]+4,U.toXY(85,dBelow(85),M,W,H)[1]-4);
      ctx.shadowBlur=0;

      ctx.fillStyle=C.teal;ctx.font='italic 12px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='left';ctx.fillText('MR',U.toXY(10,mrAbove(10),M,W,H)[0]+4,U.toXY(10,mrAbove(10),M,W,H)[1]-4);

      ctx.fillStyle=C.supply;ctx.font='10px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='center';ctx.fillText('MR gap',gapX+18,gapY2-6);
      ctx.fillText('(price rigidity)',gapX+18,gapY2+6);

      ctx.fillStyle='#8888aa';ctx.font='10px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='left';
      ctx.fillText('↑ Elastic (rivals ignore price rises)',M.left+4,M.top+14);
      ctx.textAlign='left';
      ctx.fillText('↓ Inelastic (rivals match price cuts)',M.left+4,H-M.bottom-14);

    } else if(mktType==='monopoly'){
      drawCostCurves(W,H);
      // AR: P=90-0.7Q, MR: P=90-1.4Q
      var arM=function(q){return Math.max(0,90-0.7*q);};
      var mrM=function(q){return 90-1.4*q;};
      U.curve(ctx,arM,M,W,H,C.demand,0,100,'AR (Demand)',85,false);
      U.curve(ctx,mrM,M,W,H,C.teal,0,64,'MR',55,true);

      // Profit max MC=MR: 0.006Q²+Q-80=0
      var dM=1+4*0.006*80;
      var qM=(-1+Math.sqrt(dM))/(2*0.006);
      if(qM>0&&qM<90){
        var pM=arM(qM), atcM=sc(rawATC(qM));
        var mX=toX(qM,W), mY=toY(pM,H), atcMY=toY(atcM,H);
        var mcMY=toY(sc(rawMC(qM)),H);
        if(pM>atcM){
          ctx.fillStyle='rgba(88,196,221,0.10)';
          ctx.fillRect(M.left,mY,mX-M.left,atcMY-mY);
          ctx.fillStyle=C.demand;ctx.font='11px "Latin Modern Roman",Georgia,serif';
          ctx.textAlign='center';ctx.fillText('Supernormal profit',(M.left+mX)/2,(mY+atcMY)/2);
        }
        // MC=MR intersection dot
        U.dot(ctx,mX,mcMY,C.teal,4);
        // Drop-lines from price point on AR
        ctx.strokeStyle=C.equil;ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.globalAlpha=0.6;
        ctx.beginPath();ctx.moveTo(mX,mY);ctx.lineTo(mX,H-M.bottom);
        ctx.moveTo(M.left,mY);ctx.lineTo(mX,mY);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
        U.dot(ctx,mX,mY,C.equil,5);
        ctx.fillStyle=C.equil;ctx.font='11px "Latin Modern Roman",Georgia,serif';
        ctx.textAlign='right';ctx.fillText('Pm',M.left-6,mY+4);
        ctx.textAlign='center';ctx.fillText('Qm',mX,H-M.bottom+28);

        // PC comparison and DWL
        // PC: MC=AR => 0.006Q²+0.3Q-80=0
        var dPC=0.09+4*0.006*80;
        var qPC=(-0.3+Math.sqrt(dPC))/0.012;
        if(qPC>qM&&qPC<100){
          var pPC=arM(qPC), pcX=toX(qPC,W);
          var mcQMY=toY(sc(rawMC(qM)),H);
          var mcQPCY=toY(sc(rawMC(qPC)),H);
          // DWL triangle
          ctx.fillStyle='rgba(252,98,85,0.15)';
          ctx.beginPath();ctx.moveTo(mX,mY);ctx.lineTo(mX,mcQMY);ctx.lineTo(pcX,pPC>0?toY(pPC,H):H-M.bottom);ctx.closePath();ctx.fill();
          ctx.fillStyle=C.supply;ctx.font='italic 10px "Latin Modern Roman",Georgia,serif';
          ctx.textAlign='center';ctx.fillText('DWL',(mX+pcX)/2,(mY+mcQMY)/2);
          ctx.textAlign='center';ctx.fillText('Qc',pcX,H-M.bottom+28);
          ctx.fillStyle='rgba(88,196,221,0.4)';ctx.font='9px "Latin Modern Roman",Georgia,serif';
          ctx.textAlign='center';ctx.fillText('(PC would produce here)',pcX,H-M.bottom+40);
        }
      }
    }
  }

  ['pc','mc','oligo','monopoly'].forEach(function(m){
    var btn=document.getElementById('ms-btn-'+m);
    if(!btn)return;
    btn.addEventListener('click',function(){
      mktType=m;
      document.querySelectorAll('.ms-mode-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      var ctrl=document.getElementById('ms-pc-ctrl');
      if(ctrl)ctrl.style.display=(m==='pc')?'':'none';
      draw();
    });
  });

  var sl=document.getElementById('ms-price-slider');
  if(sl)sl.addEventListener('input',function(){
    pcPrice=Number(this.value);
    var v=document.getElementById('ms-price-val');
    if(v)v.textContent='€'+Math.round(pcPrice/SCALE);
    draw();
  });

  U.onResize(function(){setup();});
  setup();
})();
