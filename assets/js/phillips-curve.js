(function(){
  'use strict';
  var U=EconUtils,C=U.C;
  var canvas=document.getElementById('phillips-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var M={top:36,right:60,bottom:60,left:66};
  var expectedInf=2; // slider: 0-8, shifts SRPC
  var showData=true;

  // Real Ireland data (CSO LFS unemployment, CSO HICP inflation)
  var irlData=[
    {yr:'2018',u:5.8,pi:0.7},
    {yr:'2019',u:5.0,pi:0.9},
    {yr:'2020',u:5.9,pi:-0.4},
    {yr:'2021',u:6.0,pi:2.4},
    {yr:'2022',u:4.4,pi:8.1},
    {yr:'2023',u:4.3,pi:5.2},
  ];

  var U_MAX=12, PI_MIN=-2, PI_MAX=12;
  var NAIRU=4.5; // estimated Ireland natural rate

  function toXY(u, pi, W, H){
    var x=M.left+(u/U_MAX)*(W-M.left-M.right);
    var y=H-M.bottom-((pi-PI_MIN)/(PI_MAX-PI_MIN))*(H-M.top-M.bottom);
    return [x,y];
  }

  /* SRPC: pi = expectedInf - 0.8*(u - NAIRU)  (simplified) */
  function srpc(u){ return expectedInf - 0.8*(u-NAIRU); }

  function setup(){
    var r=U.setupCanvas(canvas,0.58);ctx=r.ctx;draw(r.W,r.H);
  }

  function draw(W,H){
    if(!W){var dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;}
    ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);

    // grid
    ctx.strokeStyle=C.grid;ctx.lineWidth=1;
    for(var i=0;i<=12;i++){
      var x=M.left+(i/U_MAX)*(W-M.left-M.right);
      ctx.beginPath();ctx.moveTo(x,M.top);ctx.lineTo(x,H-M.bottom);ctx.stroke();
    }
    for(var j=-2;j<=12;j+=2){
      var y=H-M.bottom-((j-PI_MIN)/(PI_MAX-PI_MIN))*(H-M.top-M.bottom);
      ctx.beginPath();ctx.moveTo(M.left,y);ctx.lineTo(W-M.right,y);ctx.stroke();
    }

    // axes
    ctx.strokeStyle=C.axis;ctx.lineWidth=1.5;
    var zeroY=H-M.bottom-((0-PI_MIN)/(PI_MAX-PI_MIN))*(H-M.top-M.bottom);
    ctx.beginPath();ctx.moveTo(M.left,M.top);ctx.lineTo(M.left,H-M.bottom);ctx.stroke();
    ctx.beginPath();ctx.moveTo(M.left,zeroY);ctx.lineTo(W-M.right,zeroY);ctx.stroke();

    // axis labels
    ctx.fillStyle=C.muted;ctx.font='13px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';
    ctx.fillText('Unemployment rate (%)',(M.left+W-M.right)/2,H-6);
    ctx.save();ctx.translate(13,(M.top+H-M.bottom)/2);
    ctx.rotate(-Math.PI/2);ctx.fillText('Inflation rate (%)',0,0);ctx.restore();

    // tick labels
    ctx.fillStyle=C.axis;ctx.font='10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';
    [2,4,6,8,10,12].forEach(function(v){
      ctx.fillText(v+'%',M.left+(v/U_MAX)*(W-M.left-M.right),H-M.bottom+14);
    });
    ctx.textAlign='right';
    [-2,0,2,4,6,8,10,12].forEach(function(v){
      var y=H-M.bottom-((v-PI_MIN)/(PI_MAX-PI_MIN))*(H-M.top-M.bottom);
      ctx.fillText(v+'%',M.left-6,y+4);
    });

    // LRPC: vertical line at NAIRU
    var nairux=M.left+(NAIRU/U_MAX)*(W-M.left-M.right);
    ctx.strokeStyle=C.purple;ctx.lineWidth=2;ctx.setLineDash([6,4]);
    ctx.shadowColor=C.purple;ctx.shadowBlur=8;
    ctx.beginPath();ctx.moveTo(nairux,M.top+10);ctx.lineTo(nairux,H-M.bottom);ctx.stroke();
    ctx.setLineDash([]);ctx.shadowBlur=0;
    ctx.fillStyle=C.purple;ctx.font='11px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';
    ctx.fillText('LRPC',nairux,M.top+6);
    ctx.fillText('(NAIRU ≈ '+NAIRU+'%)',nairux,M.top+18);

    // SRPC curve
    ctx.strokeStyle=C.demand;ctx.lineWidth=2.5;
    ctx.shadowColor=C.demand;ctx.shadowBlur=10;
    ctx.beginPath(); var started=false;
    for(var u2=0.5;u2<=U_MAX-0.1;u2+=0.1){
      var pi2=srpc(u2);
      if(pi2<PI_MIN||pi2>PI_MAX){started=false;continue;}
      var pt=toXY(u2,pi2,W,H);
      if(!started){ctx.moveTo(pt[0],pt[1]);started=true;}else ctx.lineTo(pt[0],pt[1]);
    }
    ctx.stroke();ctx.shadowBlur=0;

    // SRPC label
    ctx.fillStyle=C.demand;ctx.font='italic 13px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='left';
    var srpcLabelPt=toXY(1.5,srpc(1.5),W,H);
    if(srpc(1.5)>=PI_MIN&&srpc(1.5)<=PI_MAX){
      ctx.shadowColor=C.demand;ctx.shadowBlur=6;
      ctx.fillText('SRPC',srpcLabelPt[0]+4,srpcLabelPt[1]-4);
      ctx.shadowBlur=0;
    }

    // Irish real data points
    if(showData){
      irlData.forEach(function(d){
        if(d.u>U_MAX||d.pi<PI_MIN||d.pi>PI_MAX)return;
        var pt=toXY(d.u,d.pi,W,H);
        ctx.fillStyle=C.equil;ctx.shadowColor=C.equil;ctx.shadowBlur=12;
        ctx.beginPath();ctx.arc(pt[0],pt[1],5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle=C.equil;ctx.font='10px "Latin Modern Roman",Georgia,serif';
        ctx.textAlign='left';
        ctx.fillText(d.yr,pt[0]+7,pt[1]+4);
      });
    }
  }

  var sl=document.getElementById('phillips-exp-inf');
  if(sl) sl.addEventListener('input',function(){
    expectedInf=Number(this.value);
    var v=document.getElementById('phillips-exp-val');
    if(v) v.textContent=expectedInf+'%';
    draw();
  });

  var showBtn=document.getElementById('phillips-toggle-data');
  if(showBtn) showBtn.addEventListener('click',function(){
    showData=!showData;
    this.textContent=showData?'Hide Irish data':'Show Irish data (CSO)';
    this.classList.toggle('active',showData);
    draw();
  });

  U.onResize(function(){setup();});
  setup();
})();
