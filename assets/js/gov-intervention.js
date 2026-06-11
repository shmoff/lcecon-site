(function(){
  'use strict';
  var U=EconUtils, C=U.C;
  var canvas=document.getElementById('gov-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var M={top:36,right:44,bottom:58,left:58};
  var mode='free', taxAmt=10, subAmt=10, quotaQ=40;

  function dP(q){return 78-0.6*q;}
  function sP(q){return 8+0.5*q;}
  function eq(){var q=70/1.1;return{q:q,p:sP(q)};}

  function setup(){var r=U.setupCanvas(canvas,0.58);ctx=r.ctx;draw(r.W,r.H);}

  function draw(W,H){
    if(!W){var dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;}
    U.clearBg(ctx,W,H);
    U.drawGrid(ctx,M,W,H);
    U.drawAxes(ctx,M,W,H,'Quantity (Q)','Price (P)');
    ctx.fillStyle=C.axis;ctx.font='10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';
    [20,40,60,80].forEach(function(v){ctx.fillText(v,U.toXY(v,0,M,W,H)[0],H-M.bottom+14);});
    ctx.textAlign='right';
    [20,40,60,80].forEach(function(v){ctx.fillText(v,M.left-8,U.toXY(0,v,M,W,H)[1]+4);});

    if(mode==='free'){
      U.curve(ctx,dP,M,W,H,C.demand,0,100,'D',82,false);
      U.curve(ctx,sP,M,W,H,C.supply,0,100,'S',82,true);
      var e=eq();
      var ex=U.toXY(e.q,e.p,M,W,H)[0],ey=U.toXY(e.q,e.p,M,W,H)[1];
      U.dropLines(ctx,ex,ey,M,H,C.equil);
      U.dot(ctx,ex,ey,C.equil);
      U.axisLabel(ctx,ex,ey,M,H,C.equil,'P*','Q*');

    } else if(mode==='tax'){
      var T=taxAmt;
      function sPtax(q){return 8+0.5*q+T;}
      var qt=(70-T)/1.1; var pc=dP(qt); var pp=pc-T;
      if(qt>0&&qt<100&&pc>0&&pp>0){
        // DWL triangle
        var e2=eq();
        var v1=U.toXY(e2.q,e2.p,M,W,H);
        var v2=U.toXY(qt,pc,M,W,H);
        var v3=U.toXY(qt,pp,M,W,H);
        ctx.fillStyle='rgba(252,98,85,0.15)';
        ctx.beginPath();ctx.moveTo(v1[0],v1[1]);ctx.lineTo(v2[0],v2[1]);ctx.lineTo(v3[0],v3[1]);ctx.closePath();ctx.fill();
        ctx.fillStyle=C.supply;ctx.font='italic 11px "Latin Modern Roman",Georgia,serif';
        ctx.textAlign='center';ctx.fillText('DWL',(v1[0]+v2[0]+v3[0])/3,(v1[1]+v2[1]+v3[1])/3);
        // Pc and Pp horizontal lines
        U.hLine(ctx,pc,M,W,H,C.demand,true,'Pc (consumer)');
        U.hLine(ctx,pp,M,W,H,C.green,true,'Pp (producer)');
        // vertical at Qt
        var qtx=U.toXY(qt,0,M,W,H)[0];
        ctx.strokeStyle=C.equil;ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.globalAlpha=0.6;
        ctx.beginPath();ctx.moveTo(qtx,M.top);ctx.lineTo(qtx,H-M.bottom);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
        ctx.fillStyle=C.equil;ctx.font='11px "Latin Modern Roman",Georgia,serif';ctx.textAlign='center';
        ctx.fillText('Qt',qtx,H-M.bottom+28);
        // Tax wedge arrow label
        var taxY=(U.toXY(0,pc,M,W,H)[1]+U.toXY(0,pp,M,W,H)[1])/2;
        ctx.fillStyle=C.yellow;ctx.textAlign='left';
        ctx.fillText('← Tax = '+T,M.left+4,taxY+4);
        // Pc Pp labels on y-axis
        ctx.fillStyle=C.demand;ctx.textAlign='right';ctx.fillText('Pc',M.left-6,U.toXY(0,pc,M,W,H)[1]+4);
        ctx.fillStyle=C.green;ctx.fillText('Pp',M.left-6,U.toXY(0,pp,M,W,H)[1]+4);
      }
      // original supply muted
      ctx.strokeStyle='rgba(80,80,106,0.5)';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
      ctx.beginPath();var st=false;
      for(var q2=0;q2<=100;q2+=1){var p2=sP(q2);if(p2<0||p2>100){st=false;continue;}var pt2=U.toXY(q2,p2,M,W,H);if(!st){ctx.moveTo(pt2[0],pt2[1]);st=true;}else ctx.lineTo(pt2[0],pt2[1]);}
      ctx.stroke();ctx.setLineDash([]);
      U.curve(ctx,dP,M,W,H,C.demand,0,100,'D',82,false);
      U.curve(ctx,sPtax,M,W,H,C.supply,0,100,'S+Tax',82,true);

    } else if(mode==='subsidy'){
      var S=subAmt;
      function sPsub(q){return 8+0.5*q-S;}
      var qs=(70+S)/1.1; var pcs=dP(qs); var pps=pcs+S;
      if(qs>0&&qs<100&&pcs>0&&pps>0){
        var e3=eq();
        var sv1=U.toXY(e3.q,e3.p,M,W,H);
        var sv2=U.toXY(qs,pcs,M,W,H);
        var sv3=U.toXY(qs,pps,M,W,H);
        ctx.fillStyle='rgba(131,193,103,0.1)';
        ctx.beginPath();ctx.moveTo(sv1[0],sv1[1]);ctx.lineTo(sv2[0],sv2[1]);ctx.lineTo(sv3[0],sv3[1]);ctx.closePath();ctx.fill();
        ctx.fillStyle=C.green;ctx.font='italic 11px "Latin Modern Roman",Georgia,serif';
        ctx.textAlign='center';ctx.fillText('DWL',(sv1[0]+sv2[0]+sv3[0])/3,(sv1[1]+sv2[1]+sv3[1])/3);
        U.hLine(ctx,pcs,M,W,H,C.demand,true,'Pc (consumer)');
        U.hLine(ctx,pps,M,W,H,C.green,true,'Pp (producer)');
        var qsx=U.toXY(qs,0,M,W,H)[0];
        ctx.strokeStyle=C.equil;ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.globalAlpha=0.6;
        ctx.beginPath();ctx.moveTo(qsx,M.top);ctx.lineTo(qsx,H-M.bottom);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
        ctx.fillStyle=C.equil;ctx.font='11px "Latin Modern Roman",Georgia,serif';ctx.textAlign='center';ctx.fillText('Qs',qsx,H-M.bottom+28);
        ctx.fillStyle=C.demand;ctx.textAlign='right';ctx.fillText('Pc',M.left-6,U.toXY(0,pcs,M,W,H)[1]+4);
        ctx.fillStyle=C.green;ctx.fillText('Pp',M.left-6,U.toXY(0,pps,M,W,H)[1]+4);
        var subY=(U.toXY(0,pcs,M,W,H)[1]+U.toXY(0,pps,M,W,H)[1])/2;
        ctx.fillStyle=C.green;ctx.textAlign='left';ctx.fillText('← Subsidy = '+S,M.left+4,subY+4);
      }
      ctx.strokeStyle='rgba(80,80,106,0.5)';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
      ctx.beginPath();var st2=false;
      for(var q3=0;q3<=100;q3+=1){var p3=sP(q3);if(p3<0||p3>100){st2=false;continue;}var pt3=U.toXY(q3,p3,M,W,H);if(!st2){ctx.moveTo(pt3[0],pt3[1]);st2=true;}else ctx.lineTo(pt3[0],pt3[1]);}
      ctx.stroke();ctx.setLineDash([]);
      U.curve(ctx,dP,M,W,H,C.demand,0,100,'D',82,false);
      U.curve(ctx,sPsub,M,W,H,C.green,0,100,'S−Sub',82,true);

    } else if(mode==='quota'){
      var Qq=quotaQ;
      var Pq=dP(Qq);
      // shade restricted area
      var qx=U.toXY(Qq,0,M,W,H)[0];
      ctx.fillStyle='rgba(240,172,95,0.08)';
      ctx.fillRect(M.left,M.top,qx-M.left,H-M.bottom-M.top);
      // demand
      U.curve(ctx,dP,M,W,H,C.demand,0,100,'D',82,false);
      // supply up to quota then vertical
      ctx.strokeStyle=C.supply;ctx.lineWidth=2.5;ctx.shadowColor=C.supply;ctx.shadowBlur=10;
      ctx.beginPath();var stq=false;
      for(var q4=0;q4<=Qq;q4+=0.5){var p4=sP(q4);if(p4<0||p4>100){stq=false;continue;}var pt4=U.toXY(q4,p4,M,W,H);if(!stq){ctx.moveTo(pt4[0],pt4[1]);stq=true;}else ctx.lineTo(pt4[0],pt4[1]);}
      ctx.stroke();ctx.shadowBlur=0;
      // vertical quota line
      ctx.strokeStyle=C.equil;ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.shadowColor=C.equil;ctx.shadowBlur=6;
      ctx.beginPath();ctx.moveTo(qx,M.top+10);ctx.lineTo(qx,H-M.bottom);ctx.stroke();
      ctx.setLineDash([]);ctx.shadowBlur=0;
      if(Pq>0&&Pq<100){
        U.hLine(ctx,Pq,M,W,H,C.equil,true,'Pq');
        ctx.fillStyle=C.equil;ctx.font='11px "Latin Modern Roman",Georgia,serif';
        ctx.textAlign='right';ctx.fillText('Pq',M.left-6,U.toXY(0,Pq,M,W,H)[1]+4);
        ctx.textAlign='center';ctx.fillText('Quota ('+Qq+')',qx,M.top+8);
        ctx.fillText('Qq',qx,H-M.bottom+28);
        U.dot(ctx,qx,U.toXY(Qq,Pq,M,W,H)[1],C.equil);
      }
    }
  }

  ['free','tax','subsidy','quota'].forEach(function(m){
    var btn=document.getElementById('gov-btn-'+m);
    if(!btn)return;
    btn.addEventListener('click',function(){
      mode=m;
      document.querySelectorAll('.gov-mode-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      draw();
    });
  });

  function wireSlider(id,valId,fn){
    var el=document.getElementById(id);
    if(el) el.addEventListener('input',function(){
      if(valId){var v=document.getElementById(valId);if(v)v.textContent=this.value;}
      fn(Number(this.value));draw();
    });
  }
  wireSlider('gov-tax-slider','gov-tax-val',function(v){taxAmt=v;});
  wireSlider('gov-sub-slider','gov-sub-val',function(v){subAmt=v;});
  wireSlider('gov-quota-slider','gov-quota-val',function(v){quotaQ=v;});

  U.onResize(function(){setup();});
  setup();
})();
