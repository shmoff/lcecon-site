(function(){
  'use strict';
  var U=EconUtils, C=U.C;
  var canvas=document.getElementById('compound-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var M={top:36,right:80,bottom:58,left:68};

  function getInputs(){
    var P=parseFloat((document.getElementById('compound-principal')||{}).value)||1000;
    var r=parseFloat((document.getElementById('compound-rate')||{}).value)||5;
    var n=parseInt((document.getElementById('compound-years')||{}).value)||20;
    return{P:P,r:r,n:n};
  }

  function annualA(P,r,t){return P*Math.pow(1+r/100,t);}
  function monthlyA(P,r,t){return P*Math.pow(1+r/1200,12*t);}
  function simpleA(P,r,t){return P*(1+r*t/100);}

  function fmtK(v){
    if(v>=1000000) return '€'+(v/1000000).toFixed(1)+'M';
    if(v>=1000) return '€'+(v/1000).toFixed(1)+'k';
    return '€'+Math.round(v);
  }

  function setup(){var r=U.setupCanvas(canvas,0.52);ctx=r.ctx;draw(r.W,r.H);}

  function draw(W,H){
    if(!W){var dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;}
    var inp=getInputs();
    var P=inp.P, r=inp.r, nYears=inp.n;

    var finalAnnual=annualA(P,r,nYears);
    var finalMonthly=monthlyA(P,r,nYears);
    var finalSimple=simpleA(P,r,nYears);
    var finalMax=Math.max(finalAnnual,finalMonthly,finalSimple);
    var yMax=finalMax*1.1;

    // Update result spans
    function setSpan(id,val){var el=document.getElementById(id);if(el)el.textContent=fmtK(val);}
    setSpan('compound-result-annual',finalAnnual);
    setSpan('compound-result-monthly',finalMonthly);
    setSpan('compound-result-simple',finalSimple);

    U.clearBg(ctx,W,H);

    // Grid
    var plotW=W-M.left-M.right;
    var plotH=H-M.top-M.bottom;
    ctx.strokeStyle=C.grid;ctx.lineWidth=1;
    for(var gi=1;gi<10;gi++){
      var gx=M.left+(gi/10)*plotW;
      var gy=M.top+(gi/10)*plotH;
      ctx.beginPath();ctx.moveTo(gx,M.top);ctx.lineTo(gx,H-M.bottom);ctx.stroke();
      ctx.beginPath();ctx.moveTo(M.left,gy);ctx.lineTo(W-M.right,gy);ctx.stroke();
    }

    // Axes
    ctx.strokeStyle=C.axis;ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(M.left,M.top);ctx.lineTo(M.left,H-M.bottom);
    ctx.lineTo(W-M.right,H-M.bottom);ctx.stroke();
    // Arrowheads
    ctx.fillStyle=C.axis;
    var aw=4.5,ah=8;
    ctx.beginPath();ctx.moveTo(W-M.right,H-M.bottom);
    ctx.lineTo(W-M.right-aw,H-M.bottom-ah/2);
    ctx.lineTo(W-M.right-aw,H-M.bottom+ah/2);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(M.left,M.top);
    ctx.lineTo(M.left-ah/2,M.top+aw);
    ctx.lineTo(M.left+ah/2,M.top+aw);ctx.closePath();ctx.fill();

    // Axis labels
    ctx.fillStyle=C.muted;
    ctx.font='13px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';
    ctx.fillText('Years',(M.left+W-M.right)/2,H-6);
    ctx.save();ctx.translate(13,(M.top+H-M.bottom)/2);
    ctx.rotate(-Math.PI/2);ctx.fillText('Value',0,0);ctx.restore();

    // X-axis ticks
    ctx.fillStyle=C.axis;
    ctx.font='10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';
    var step=nYears<=20?5:nYears<=35?10:10;
    for(var t=0;t<=nYears;t+=step){
      var tx=M.left+(t/nYears)*plotW;
      ctx.fillText(t,tx,H-M.bottom+14);
    }
    // always label nYears if not already landed on
    if(nYears%step!==0){
      ctx.fillText(nYears,M.left+plotW,H-M.bottom+14);
    }

    // Y-axis ticks — 5 evenly spaced
    ctx.textAlign='right';
    for(var yi=0;yi<=5;yi++){
      var yv=(yi/5)*yMax;
      var ypos=H-M.bottom-(yv/yMax)*plotH;
      if(ypos<M.top)continue;
      ctx.fillStyle=C.axis;
      ctx.font='10px "Latin Modern Roman",Georgia,serif';
      ctx.fillText(fmtK(yv),M.left-6,ypos+4);
      // subtle tick mark
      ctx.strokeStyle=C.axis;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(M.left-3,ypos);ctx.lineTo(M.left,ypos);ctx.stroke();
    }

    // Helper: map (t, value) -> canvas (x, y)
    function toX(t){return M.left+(t/nYears)*plotW;}
    function toY(v){return H-M.bottom-(v/yMax)*plotH;}

    // Draw a time-series curve
    function drawLine(fn,color,dashed,lineW){
      ctx.strokeStyle=color;ctx.lineWidth=lineW||2.5;
      ctx.shadowColor=color;ctx.shadowBlur=dashed?0:10;
      if(dashed)ctx.setLineDash([6,4]);else ctx.setLineDash([]);
      ctx.beginPath();var started=false;
      for(var t2=0;t2<=nYears;t2+=0.2){
        var v=fn(P,r,t2);
        var x=toX(t2);var y=toY(v);
        if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.setLineDash([]);ctx.shadowBlur=0;
    }

    // 1. Simple interest (muted dashed, draw first so it's behind)
    drawLine(simpleA,'#50506a',true,1.8);

    // 2. Annual compounding (blue)
    drawLine(annualA,C.demand,false,2.5);

    // 3. Monthly compounding (green) — on top
    drawLine(monthlyA,C.green,false,2.5);

    // Final value annotations at right edge
    var annotX=W-M.right+6;
    ctx.font='11px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='left';

    // Spread the labels vertically if they're close together
    var yAnnual=toY(finalAnnual);
    var yMonthly=toY(finalMonthly);
    var ySimple=toY(finalSimple);
    var minSep=14;

    // Monthly is always highest or equal; nudge if too close to annual
    if(Math.abs(yMonthly-yAnnual)<minSep) yAnnual=yMonthly+minSep;
    if(Math.abs(yAnnual-ySimple)<minSep)  ySimple=yAnnual+minSep;

    ctx.fillStyle=C.green;
    ctx.shadowColor=C.green;ctx.shadowBlur=4;
    ctx.fillText(fmtK(finalMonthly),annotX,yMonthly+4);

    ctx.fillStyle=C.demand;
    ctx.shadowColor=C.demand;ctx.shadowBlur=4;
    ctx.fillText(fmtK(finalAnnual),annotX,yAnnual+4);

    ctx.fillStyle=C.muted;
    ctx.shadowColor='transparent';ctx.shadowBlur=0;
    ctx.fillText(fmtK(finalSimple),annotX,ySimple+4);

    ctx.shadowBlur=0;

    // Legend (top-left inside plot area)
    var lx=M.left+10, ly=M.top+14;
    var legends=[
      {color:C.demand,label:'Annual compound',dashed:false},
      {color:C.green, label:'Monthly compound',dashed:false},
      {color:'#50506a',label:'Simple interest', dashed:true}
    ];
    ctx.font='11px "Latin Modern Roman",Georgia,serif';
    legends.forEach(function(leg,i){
      var liy=ly+i*18;
      ctx.strokeStyle=leg.color;ctx.lineWidth=2;
      if(leg.dashed)ctx.setLineDash([5,3]);else ctx.setLineDash([]);
      ctx.beginPath();ctx.moveTo(lx,liy);ctx.lineTo(lx+22,liy);ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=leg.color;ctx.textAlign='left';
      ctx.fillText(leg.label,lx+27,liy+4);
    });
  }

  function redraw(){
    var dpr=window.devicePixelRatio||1;
    var W=canvas.width/dpr, H=canvas.height/dpr;
    draw(W,H);
  }

  function wireInput(id,valId,fn){
    var el=document.getElementById(id);
    if(!el)return;
    el.addEventListener('input',function(){
      if(valId){var v=document.getElementById(valId);if(v)v.textContent=this.value;}
      if(fn)fn(Number(this.value));
      redraw();
    });
    el.addEventListener('change',function(){redraw();});
  }

  wireInput('compound-principal',null,null);
  wireInput('compound-rate','compound-rate-val',null);
  wireInput('compound-years','compound-years-val',null);

  // Frequency toggle buttons (optional — both lines always shown; buttons can add .active class)
  ['annual','monthly'].forEach(function(freq){
    var btn=document.getElementById('compound-btn-'+freq);
    if(!btn)return;
    btn.addEventListener('click',function(){
      document.querySelectorAll('.compound-freq-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
    });
  });

  U.onResize(function(){setup();});
  setup();
})();
