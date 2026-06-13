(function(){
  'use strict';
  var U=EconUtils, C=U.C;
  var canvas=document.getElementById('elas-slope-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var M={top:36,right:60,bottom:58,left:58};

  function getB(s){ return Math.pow(10,(50-s)/20); }

  function classify(ped){
    var a=Math.abs(ped);
    if(a<0.05)return'Perfectly Inelastic';
    if(a<1)return'Inelastic';
    if(Math.abs(a-1)<0.05)return'Unit Elastic';
    if(a<50)return'Elastic';
    return'Perfectly Elastic';
  }

  function classColor(label){
    if(label==='Perfectly Inelastic'||label==='Inelastic')return C.supply;
    if(label==='Unit Elastic')return C.equil;
    return C.green;
  }

  function setup(){
    var r=U.setupCanvas(canvas,0.58); ctx=r.ctx; draw(r.W,r.H);
  }

  function draw(W,H){
    if(!W){var dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;}
    var sl=document.getElementById('elas-slope-slider');
    var s=sl?parseFloat(sl.value):50;
    var b=getB(s);
    var a=50+50*b; // intercept: P = a - b*Q
    var ped=-1/b; // at midpoint

    U.clearBg(ctx,W,H);
    U.drawGrid(ctx,M,W,H);
    U.drawAxes(ctx,M,W,H,'Quantity (Q)','Price (P)');

    ctx.fillStyle=C.axis;ctx.font='10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';
    [20,40,60,80].forEach(function(v){ctx.fillText(v,U.toXY(v,0,M,W,H)[0],H-M.bottom+14);});
    ctx.textAlign='right';
    [20,40,60,80].forEach(function(v){ctx.fillText(v,M.left-8,U.toXY(0,v,M,W,H)[1]+4);});

    // Draw demand curve: P = a - b*Q, clip to [0,100]x[0,100]
    ctx.strokeStyle=C.demand; ctx.lineWidth=2.5;
    ctx.shadowColor=C.demand; ctx.shadowBlur=10;
    ctx.beginPath(); var started=false;
    for(var q=0;q<=100;q+=0.5){
      var p=a-b*q;
      if(p<0||p>100){started=false;continue;}
      var pt=U.toXY(q,p,M,W,H);
      if(!started){ctx.moveTo(pt[0],pt[1]);started=true;}else ctx.lineTo(pt[0],pt[1]);
    }
    ctx.stroke(); ctx.shadowBlur=0;

    // Midpoint dot and drop-lines
    var mp=U.toXY(50,50,M,W,H);
    U.dropLines(ctx,mp[0],mp[1],M,H,C.equil);
    U.dot(ctx,mp[0],mp[1],C.equil,5.5);

    // PED annotation (top-left area of chart)
    var lbl=classify(ped);
    var col=classColor(lbl);
    var pedStr=Math.abs(ped)>50?'∞':Math.abs(ped).toFixed(2);
    ctx.fillStyle=col; ctx.font='bold 14px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='left'; ctx.shadowColor=col; ctx.shadowBlur=8;
    ctx.fillText('PED = −'+pedStr,M.left+8,M.top+20);
    ctx.font='12px "Latin Modern Roman",Georgia,serif';
    ctx.fillText(lbl,M.left+8,M.top+36);
    ctx.shadowBlur=0;

    // Curve label
    ctx.fillStyle=C.demand; ctx.font='italic 14px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='left'; ctx.shadowColor=C.demand; ctx.shadowBlur=6;
    // Place label near right end of curve
    var labelQ=Math.min(85, (100-a/b>0)?100-a/b-2:85);
    var labelP=a-b*labelQ;
    if(labelP>=2&&labelP<=98){
      var lpt=U.toXY(labelQ,labelP,M,W,H);
      ctx.fillText('D',lpt[0]+6,lpt[1]-4);
    }
    ctx.shadowBlur=0;

    // Update UI spans
    var pedValEl=document.getElementById('elas-slope-ped-val');
    var pedLblEl=document.getElementById('elas-slope-label');
    if(pedValEl)pedValEl.textContent=(Math.abs(ped)>50?'∞':ped.toFixed(2));
    if(pedLblEl){pedLblEl.textContent=lbl;pedLblEl.style.color=col;}
  }

  var sl=document.getElementById('elas-slope-slider');
  if(sl)sl.addEventListener('input',function(){draw();});
  U.onResize(function(){setup();});
  setup();
})();
