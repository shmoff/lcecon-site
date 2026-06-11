(function(){
  'use strict';
  var canvas=document.getElementById('cf-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var C={
    bg:'#12121f', box:'#25253a', border:'#38385a',
    text:'#e8e8f4', muted:'#8888aa', axis:'#50506a',
    income:'#58c4dd', spending:'#fc6255',
    inject:'#83c167', leakage:'#f0ac5f',
  };
  var dots=[];
  var raf;
  var injScale=0; // -3 to +3, set by slider

  function setup(){
    var dpr=window.devicePixelRatio||1;
    var rect=canvas.parentElement.getBoundingClientRect();
    var W=Math.min(Math.round(rect.width-32),680);
    var H=Math.round(W*0.62);
    canvas.width=W*dpr; canvas.height=H*dpr;
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    ctx.scale(dpr,dpr);
    initDots(W,H); draw(W,H);
  }

  function initDots(W,H){
    dots=[];
    var speed=1.5+injScale*0.3;
    speed=Math.max(0.8,speed);
    var n=18;
    for(var i=0;i<n;i++){
      dots.push({t:i/n, path:'income', speed:speed*0.6+Math.random()*0.2});
    }
    for(var j=0;j<n;j++){
      dots.push({t:j/n, path:'spending', speed:speed*0.6+Math.random()*0.2});
    }
  }

  function draw(W,H){
    if(!W){var dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;}
    ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);

    var cx=W/2, cy=H/2;
    var boxW=W*0.2, boxH=H*0.22;
    var hx=W*0.18, fx=W*0.62;
    var by=cy-boxH/2;

    // draw arc flows (background)
    var topY=cy-H*0.3, botY=cy+H*0.3;

    // income flow (top) — BLUE
    ctx.strokeStyle=C.income; ctx.lineWidth=2; ctx.globalAlpha=0.4;
    ctx.beginPath();
    ctx.moveTo(fx+boxW/2, cy);
    ctx.bezierCurveTo(fx+boxW/2, topY, hx, topY, hx, cy);
    ctx.stroke();

    // spending flow (bottom) — RED
    ctx.strokeStyle=C.spending;
    ctx.beginPath();
    ctx.moveTo(hx, cy);
    ctx.bezierCurveTo(hx, botY, fx+boxW/2, botY, fx+boxW/2, cy);
    ctx.stroke();
    ctx.globalAlpha=1;

    // flow arrows (arrowheads)
    function arrow(x,y,angle,color){
      ctx.fillStyle=color;
      ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
      ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-5,-5);ctx.lineTo(-5,5);ctx.closePath();
      ctx.fill(); ctx.restore();
    }
    // income arrow near households
    arrow(hx+2, cy-H*0.24, -Math.PI/2+0.3, C.income);
    // spending arrow near firms
    arrow(fx+boxW/2-2, cy+H*0.24, Math.PI/2-0.3, C.spending);

    // INJECTIONS (left side: I, G, X feeding into households or inner loop)
    var injY=[cy-H*0.08, cy, cy+H*0.08];
    var injLabel=['I (Investment)','G (Gov\'t Spending)','X (Exports)'];
    injLabel.forEach(function(lbl,i){
      ctx.strokeStyle=C.inject; ctx.lineWidth=1.5; ctx.globalAlpha=0.7;
      ctx.beginPath();ctx.moveTo(hx-W*0.12,injY[i]);ctx.lineTo(hx,injY[i]);ctx.stroke();
      arrow(hx,injY[i],0,C.inject);
      ctx.globalAlpha=1;
      ctx.fillStyle=C.inject;ctx.font='11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='right';ctx.fillText(lbl,hx-W*0.14,injY[i]+4);
    });

    // LEAKAGES (right side: S, T, M)
    var leakLabel=['S (Savings)','T (Taxes)','M (Imports)'];
    leakLabel.forEach(function(lbl,i){
      ctx.strokeStyle=C.leakage; ctx.lineWidth=1.5; ctx.globalAlpha=0.7;
      ctx.beginPath();ctx.moveTo(fx+boxW,injY[i]);ctx.lineTo(fx+boxW+W*0.12,injY[i]);ctx.stroke();
      arrow(fx+boxW+W*0.12,injY[i],0,C.leakage);
      ctx.globalAlpha=1;
      ctx.fillStyle=C.leakage;ctx.font='11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='left';ctx.fillText(lbl,fx+boxW+W*0.02,injY[i]+4);
    });

    // BOXES
    function box(x,y,w,h,label,sub){
      ctx.fillStyle=C.box; ctx.strokeStyle=C.border; ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.roundRect(x,y,w,h,8);
      ctx.fill();ctx.stroke();
      ctx.fillStyle=C.text;ctx.font='bold 13px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='center';ctx.fillText(label,x+w/2,y+h/2-4);
      ctx.fillStyle=C.muted;ctx.font='11px "Latin Modern Roman",Georgia,serif';
      ctx.fillText(sub,x+w/2,y+h/2+12);
    }
    box(hx-boxW/2,by,boxW,boxH,'Households','(income earners)');
    box(fx,by,boxW,boxH,'Firms','(producers)');

    // flow labels
    ctx.fillStyle=C.income;ctx.font='italic 12px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';ctx.fillText('Income (wages, rent, profit)',cx,topY-10);
    ctx.fillStyle=C.spending;ctx.fillText('Spending on goods & services',cx,botY+18);

    // moving dots
    dots.forEach(function(d){
      d.t=(d.t+d.speed*0.004)%1;
      var bezT=d.t;
      var px,py;
      if(d.path==='income'){
        // bezier from (fx+boxW/2, cy) → top → (hx, cy)
        var x0=fx+boxW/2,y0=cy,x1=fx+boxW/2,y1=topY,x2=hx,y2b=topY,x3=hx,y3=cy;
        px=Math.pow(1-bezT,3)*x0+3*Math.pow(1-bezT,2)*bezT*x1+3*(1-bezT)*bezT*bezT*x2+Math.pow(bezT,3)*x3;
        py=Math.pow(1-bezT,3)*y0+3*Math.pow(1-bezT,2)*bezT*y1+3*(1-bezT)*bezT*bezT*y2b+Math.pow(bezT,3)*y3;
        ctx.fillStyle=C.income;
      } else {
        var x0s=hx,y0s=cy,x1s=hx,y1s=botY,x2s=fx+boxW/2,y2s=botY,x3s=fx+boxW/2,y3s=cy;
        px=Math.pow(1-bezT,3)*x0s+3*Math.pow(1-bezT,2)*bezT*x1s+3*(1-bezT)*bezT*bezT*x2s+Math.pow(bezT,3)*x3s;
        py=Math.pow(1-bezT,3)*y0s+3*Math.pow(1-bezT,2)*bezT*y1s+3*(1-bezT)*bezT*bezT*y2s+Math.pow(bezT,3)*y3s;
        ctx.fillStyle=C.spending;
      }
      ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=6;
      ctx.beginPath();ctx.arc(px,py,3,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
    });
  }

  function animate(){
    var dpr=window.devicePixelRatio||1;
    var W=canvas.width/dpr,H=canvas.height/dpr;
    draw(W,H); raf=requestAnimationFrame(animate);
  }

  window.addEventListener('resize',function(){
    cancelAnimationFrame(raf); setup(); animate();
  });

  // Start button
  var startBtn=document.getElementById('cf-start');
  var running=false;
  if(startBtn){
    startBtn.addEventListener('click',function(){
      if(running){cancelAnimationFrame(raf);running=false;startBtn.textContent='▶ Play';}
      else{running=true;startBtn.textContent='⏸ Pause';animate();}
    });
  }

  setup();
  // auto-start
  running=true; if(startBtn)startBtn.textContent='⏸ Pause'; animate();
})();
