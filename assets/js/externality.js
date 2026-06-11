(function(){
  'use strict';
  var U=EconUtils,C=U.C;
  var canvas=document.getElementById('ext-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var M={top:36,right:60,bottom:58,left:60};
  var extType='negative';

  function setup(){var r=U.setupCanvas(canvas,0.58);ctx=r.ctx;draw(r.W,r.H);}

  function draw(W,H){
    if(!W){var dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;}
    U.clearBg(ctx,W,H);U.drawGrid(ctx,M,W,H);
    U.drawAxes(ctx,M,W,H,'Quantity (Q)','Price (P)');

    ctx.fillStyle=C.axis;ctx.font='10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';
    [20,40,60,80].forEach(function(v){ctx.fillText(v,U.toXY(v,0,M,W,H)[0],H-M.bottom+14);});
    ctx.textAlign='right';
    [20,40,60,80].forEach(function(v){ctx.fillText(v,M.left-8,U.toXY(0,v,M,W,H)[1]+4);});

    if(extType==='negative'){
      /* MPC, MSC, MPB=MSB */
      var mpc=function(q){return 8+0.5*q;};
      var msc=function(q){return 18+0.5*q;};  // MPC + external cost of 10
      var mpb=function(q){return 78-0.6*q;};
      var qMkt=(70)/1.1;   // MPC=MPB: 78-0.6Q=8+0.5Q => Q=70/1.1≈63.6
      var qOpt=(60)/1.1;   // MSC=MPB: 78-0.6Q=18+0.5Q => Q=60/1.1≈54.5
      var pMkt=mpc(qMkt), pOpt=msc(qOpt);

      // DWL shading
      var dpt1=U.toXY(qOpt,msc(qOpt),M,W,H);
      var dpt2=U.toXY(qOpt,mpc(qOpt),M,W,H);
      var dpt3=U.toXY(qMkt,mpc(qMkt),M,W,H); // = U.toXY(qMkt,mpb(qMkt))
      ctx.fillStyle=C.dwl;
      ctx.beginPath();ctx.moveTo(dpt1[0],dpt1[1]);
      ctx.lineTo(dpt2[0],dpt2[1]);ctx.lineTo(dpt3[0],dpt3[1]);
      ctx.closePath();ctx.fill();

      U.curve(ctx,mpb,M,W,H,C.demand,0,100,'MPB = MSB',82,false);
      U.curve(ctx,mpc,M,W,H,C.green,0,100,'MPC',82,true);
      U.curve(ctx,msc,M,W,H,C.msc,0,100,'MSC',82,true);

      // market equilibrium
      var mx=U.toXY(qMkt,pMkt,M,W,H)[0],my=U.toXY(qMkt,pMkt,M,W,H)[1];
      U.dropLines(ctx,mx,my,M,H,'rgba(252,98,85,0.5)');
      U.dot(ctx,mx,my,C.supply,5);
      ctx.fillStyle=C.supply;ctx.font='11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='center';ctx.fillText('Qm',mx,H-M.bottom+28);

      // social optimum
      var ox=U.toXY(qOpt,pOpt,M,W,H)[0],oy=U.toXY(qOpt,pOpt,M,W,H)[1];
      U.dropLines(ctx,ox,oy,M,H,'rgba(240,172,95,0.5)');
      U.dot(ctx,ox,oy,C.equil,5);
      ctx.fillStyle=C.equil;ctx.font='11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='center';ctx.fillText('Q*',ox,H-M.bottom+28);

      // DWL label
      ctx.fillStyle=C.supply;ctx.font='italic 11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='center';
      ctx.fillText('DWL',(mx+ox)/2+8,(my+oy)/2-6);

    } else {
      /* Positive externality */
      var mpc2=function(q){return 8+0.5*q;};
      var mpb2=function(q){return 68-0.6*q;};
      var msb2=function(q){return 78-0.6*q;};  // MPB + external benefit of 10
      var qMkt2=(60)/1.1;  // MPC=MPB: 68-0.6Q=8+0.5Q => Q=60/1.1≈54.5
      var qOpt2=(70)/1.1;  // MPC=MSB: 78-0.6Q=8+0.5Q => Q=70/1.1≈63.6
      var pMkt2=mpc2(qMkt2);

      var dp1=U.toXY(qMkt2,msb2(qMkt2),M,W,H);
      var dp2=U.toXY(qMkt2,mpc2(qMkt2),M,W,H);
      var dp3=U.toXY(qOpt2,mpc2(qOpt2),M,W,H);
      ctx.fillStyle='rgba(88,196,221,0.1)';
      ctx.beginPath();ctx.moveTo(dp1[0],dp1[1]);
      ctx.lineTo(dp2[0],dp2[1]);ctx.lineTo(dp3[0],dp3[1]);
      ctx.closePath();ctx.fill();

      U.curve(ctx,mpb2,M,W,H,C.demand,0,100,'MPB',82,false);
      U.curve(ctx,msb2,M,W,H,C.teal,0,100,'MSB',82,false);
      U.curve(ctx,mpc2,M,W,H,C.supply,0,100,'MPC = MSC',82,true);

      var mx2=U.toXY(qMkt2,pMkt2,M,W,H)[0],my2=U.toXY(qMkt2,pMkt2,M,W,H)[1];
      U.dropLines(ctx,mx2,my2,M,H,'rgba(252,98,85,0.5)');
      U.dot(ctx,mx2,my2,C.supply,5);
      ctx.fillStyle=C.supply;ctx.font='11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='center';ctx.fillText('Qm',mx2,H-M.bottom+28);

      var ox2=U.toXY(qOpt2,mpc2(qOpt2),M,W,H)[0],oy2=U.toXY(qOpt2,mpc2(qOpt2),M,W,H)[1];
      U.dropLines(ctx,ox2,oy2,M,H,'rgba(240,172,95,0.5)');
      U.dot(ctx,ox2,oy2,C.equil,5);
      ctx.fillStyle=C.equil;ctx.font='11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='center';ctx.fillText('Q*',ox2,H-M.bottom+28);

      ctx.fillStyle=C.teal;ctx.font='italic 11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='center';
      ctx.fillText('DWL',(mx2+ox2)/2+8,(my2+oy2)/2-6);
    }
  }

  ['negative','positive'].forEach(function(t){
    var btn=document.getElementById('ext-btn-'+t);
    if(!btn)return;
    btn.addEventListener('click',function(){
      extType=t;
      document.querySelectorAll('.ext-mode-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      draw();
    });
  });

  U.onResize(function(){setup();});
  setup();
})();
