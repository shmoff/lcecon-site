(function(){
  'use strict';
  var C={
    bg:'#12121f', axis:'#50506a', grid:'rgba(80,80,106,0.22)',
    text:'#e8e8f4', muted:'#8888aa', subtle:'#50506a',
    pos:'#83c167', neg:'#fc6255', irl:'#58c4dd',
  };

  // IMF WEO October 2023, current account balance % GDP
  // Ireland: underlying/adjusted figure used (see note)
  var data=[
    {name:'Norway',  val:16.1},
    {name:'Germany', val:6.3},
    {name:'Ireland', val:3.1, note:true},  // underlying; headline distorted by MNC flows
    {name:'China',   val:1.5},
    {name:'UK',      val:-2.9},
    {name:'USA',     val:-3.3},
  ];

  var canvas=document.getElementById('trade-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var M={top:20,right:20,bottom:30,left:80};

  function setup(){
    var dpr=window.devicePixelRatio||1;
    var rect=canvas.parentElement.getBoundingClientRect();
    var W=Math.min(Math.round(rect.width-32),680);
    var rowH=38, H=M.top+data.length*rowH+M.bottom;
    canvas.width=W*dpr;canvas.height=H*dpr;
    canvas.style.width=W+'px';canvas.style.height=H+'px';
    ctx.scale(dpr,dpr); draw(W,H,rowH);
  }

  function draw(W,H,rowH){
    if(!W){var dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;rowH=38;}
    ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);

    var chartW=W-M.left-M.right;
    var MAX=18; // scale max
    var zero=M.left+chartW*(MAX/(MAX*2)); // 0 is in the middle

    // zero line
    ctx.strokeStyle=C.axis;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(zero,M.top-4);ctx.lineTo(zero,H-M.bottom);ctx.stroke();

    // grid lines at -10,0,+10
    [-15,-10,-5,0,5,10,15].forEach(function(v){
      var x=zero+(v/MAX)*chartW*0.5;
      if(x<M.left||x>W-M.right)return;
      ctx.strokeStyle=C.grid;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x,M.top-4);ctx.lineTo(x,H-M.bottom);ctx.stroke();
      ctx.fillStyle=C.axis;ctx.font='10px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='center';ctx.fillText(v+'%',x,H-M.bottom+14);
    });

    data.forEach(function(d,i){
      var y=M.top+i*rowH+rowH*0.1;
      var barH=rowH*0.6;
      var barW=(Math.abs(d.val)/MAX)*chartW*0.5;
      var color=d.note?C.irl:(d.val>=0?C.pos:C.neg);
      var barX=d.val>=0?zero:zero-barW;

      // bar
      ctx.fillStyle=color;ctx.globalAlpha=0.85;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(barX,y,barW,barH,2);
      else ctx.rect(barX,y,barW,barH);
      ctx.fill();ctx.globalAlpha=1;

      // country label
      ctx.fillStyle=d.note?C.irl:C.text;
      ctx.font=(d.note?'bold ':'')+'12px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='right';ctx.fillText(d.name,M.left-8,y+barH/2+4);

      // value label
      var valX=d.val>=0?barX+barW+5:barX-5;
      ctx.fillStyle=color;ctx.font='11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign=d.val>=0?'left':'right';
      ctx.fillText((d.val>0?'+':'')+d.val+'%',valX,y+barH/2+4);
      if(d.note){
        ctx.fillStyle=C.muted;ctx.font='italic 9px "Latin Modern Roman",Georgia,serif';
        ctx.textAlign=d.val>=0?'left':'right';
        ctx.fillText('(underlying)',valX+(d.val>=0?50:-50),y+barH/2+4);
      }
    });

    // axis label
    ctx.fillStyle=C.muted;ctx.font='italic 10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='right';
    ctx.fillText('Source: IMF World Economic Outlook, Oct 2023 est.',W-M.right,H-2);
  }

  window.addEventListener('resize',function(){var t;clearTimeout(t);t=setTimeout(setup,80);});
  setup();
})();
