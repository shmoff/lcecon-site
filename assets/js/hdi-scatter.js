(function(){
  'use strict';
  var C={
    bg:'#12121f', axis:'#50506a', grid:'rgba(80,80,106,0.22)',
    text:'#e8e8f4', muted:'#8888aa',
    irl:'#58c4dd', other:'#8888aa', dot:'#f0ac5f',
  };

  // UNDP Human Development Report 2023 (2022 data)
  var data=[
    {name:'Norway',   gni:82.5, hdi:0.966, color:'#83c167'},
    {name:'Ireland',  gni:74.7, hdi:0.950, color:'#58c4dd', hl:true},
    {name:'USA',      gni:64.8, hdi:0.927, color:'#9a72ac'},
    {name:'Germany',  gni:54.5, hdi:0.942, color:'#5cd0b3'},
    {name:'UK',       gni:45.2, hdi:0.890, color:'#8888aa'},
    {name:'China',    gni:19.7, hdi:0.788, color:'#f0ac5f'},
    {name:'India',    gni:7.0,  hdi:0.644, color:'#e8b84b'},
    {name:'Nigeria',  gni:5.1,  hdi:0.535, color:'#fc6255'},
    {name:'Ethiopia', gni:2.1,  hdi:0.492, color:'#fc6255'},
  ];

  var canvas=document.getElementById('hdi-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var M={top:36,right:60,bottom:58,left:60};
  var GNI_MAX=90, HDI_MIN=0.4, HDI_MAX=1.0;

  function toXY(gni,hdi,W,H){
    return [
      M.left+(gni/GNI_MAX)*(W-M.left-M.right),
      H-M.bottom-((hdi-HDI_MIN)/(HDI_MAX-HDI_MIN))*(H-M.top-M.bottom),
    ];
  }

  function setup(){
    var dpr=window.devicePixelRatio||1;
    var rect=canvas.parentElement.getBoundingClientRect();
    var W=Math.min(Math.round(rect.width-32),680);
    var H=Math.round(W*0.62);
    canvas.width=W*dpr;canvas.height=H*dpr;
    canvas.style.width=W+'px';canvas.style.height=H+'px';
    ctx.scale(dpr,dpr); draw(W,H);
  }

  function draw(W,H){
    if(!W){var dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;}
    ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);

    // grid
    ctx.strokeStyle=C.grid;ctx.lineWidth=1;
    [0,10,20,30,40,50,60,70,80,90].forEach(function(v){
      var x=M.left+(v/GNI_MAX)*(W-M.left-M.right);
      ctx.beginPath();ctx.moveTo(x,M.top);ctx.lineTo(x,H-M.bottom);ctx.stroke();
    });
    [0.4,0.5,0.6,0.7,0.8,0.9,1.0].forEach(function(v){
      var y=H-M.bottom-((v-HDI_MIN)/(HDI_MAX-HDI_MIN))*(H-M.top-M.bottom);
      ctx.beginPath();ctx.moveTo(M.left,y);ctx.lineTo(W-M.right,y);ctx.stroke();
    });

    // axes
    ctx.strokeStyle=C.axis;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(M.left,M.top);ctx.lineTo(M.left,H-M.bottom);
    ctx.lineTo(W-M.right,H-M.bottom);ctx.stroke();

    // labels
    ctx.fillStyle=C.muted;ctx.font='13px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';
    ctx.fillText('GNI per capita, PPP (USD thousands)',(M.left+W-M.right)/2,H-6);
    ctx.save();ctx.translate(13,(M.top+H-M.bottom)/2);
    ctx.rotate(-Math.PI/2);ctx.fillText('Human Development Index (HDI)',0,0);ctx.restore();

    // tick labels
    ctx.fillStyle=C.axis;ctx.font='10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';
    [0,20,40,60,80].forEach(function(v){
      ctx.fillText('$'+v+'k',M.left+(v/GNI_MAX)*(W-M.left-M.right),H-M.bottom+14);
    });
    ctx.textAlign='right';
    [0.4,0.5,0.6,0.7,0.8,0.9,1.0].forEach(function(v){
      ctx.fillText(v.toFixed(1),M.left-6,H-M.bottom-((v-HDI_MIN)/(HDI_MAX-HDI_MIN))*(H-M.top-M.bottom)+4);
    });

    // data points
    data.forEach(function(d){
      var pt=toXY(d.gni,d.hdi,W,H);
      var r=d.hl?8:5.5;
      ctx.fillStyle=d.color;ctx.shadowColor=d.color;ctx.shadowBlur=d.hl?20:10;
      ctx.beginPath();ctx.arc(pt[0],pt[1],r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle=d.color;
      ctx.font=(d.hl?'bold ':'')+'11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='left';
      var labelX=pt[0]+r+5, labelY=pt[1]+4;
      // avoid overlap for low-GNI points
      if(d.gni<10) { labelX=pt[0]-r-5; ctx.textAlign='right'; }
      if(d.name==='UK') labelY=pt[1]-8;
      ctx.fillText(d.name,labelX,labelY);
    });

    // source note
    ctx.fillStyle=C.muted;ctx.font='italic 10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='right';
    ctx.fillText('Source: UNDP Human Development Report 2023',W-M.right,H-4);
  }

  window.addEventListener('resize',function(){
    var t; clearTimeout(t); t=setTimeout(setup,80);
  });
  setup();
})();
