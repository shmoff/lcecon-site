(function(){
  'use strict';
  var U=EconUtils,C=U.C;
  var canvas=document.getElementById('labour-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var M={top:36,right:44,bottom:58,left:60};
  var dShift=0,sShift=0,mode='free';
  var MIN_WAGE=38, UNION_WAGE=55;

  function ld(l){return 80-0.6*l+dShift;}
  function ls(l){return 5+0.5*l-sShift;}
  function lFromW_d(w){return(80-w+dShift)/0.6;}
  function lFromW_s(w){return(w-5+sShift)/0.5;}
  function eqm(){var l=(75+dShift+sShift)/1.1;return{l:l,w:ls(l)};}

  function setup(){var r=U.setupCanvas(canvas,0.58);ctx=r.ctx;draw(r.W,r.H);}

  function draw(W,H){
    if(!W){var dpr=window.devicePixelRatio||1;W=canvas.width/dpr;H=canvas.height/dpr;}
    U.clearBg(ctx,W,H);U.drawGrid(ctx,M,W,H);
    U.drawAxes(ctx,M,W,H,'Employment (L)','Wage (W)');

    ctx.fillStyle=C.axis;ctx.font='10px "Latin Modern Roman",Georgia,serif';
    ctx.textAlign='center';
    [20,40,60,80].forEach(function(v){
      ctx.fillText(v,U.toXY(v,0,M,W,H)[0],H-M.bottom+14);
    });
    ctx.textAlign='right';
    [20,40,60,80].forEach(function(v){
      ctx.fillText(v,M.left-8,U.toXY(0,v,M,W,H)[1]+4);
    });

    // floor shading
    var floorP = mode==='minwage' ? MIN_WAGE : (mode==='union' ? UNION_WAGE : null);
    if(floorP){
      var ld2=lFromW_d(floorP), ls2=lFromW_s(floorP);
      if(ld2>=0&&ls2>=0&&ls2>ld2){
        var fx1=U.toXY(ld2,0,M,W,H)[0], fx2=U.toXY(ls2,0,M,W,H)[0];
        var fy=U.toXY(0,floorP,M,W,H)[1];
        ctx.fillStyle='rgba(252,98,85,0.1)';
        ctx.fillRect(fx1,fy,fx2-fx1,H-M.bottom-fy);
        ctx.fillStyle=mode==='minwage'?C.green:C.purple;
        ctx.font='11px "Latin Modern Roman",Georgia,serif';
        ctx.textAlign='center';
        ctx.fillText('← Unemployment →',(fx1+fx2)/2,fy-8);
      }
      U.hLine(ctx,floorP,M,W,H,mode==='minwage'?C.green:C.purple,false,
        mode==='minwage'?'Minimum Wage':'Union Wage');
      ctx.fillStyle=mode==='minwage'?C.green:C.purple;
      ctx.font='11px "Latin Modern Roman",Georgia,serif';
      ctx.textAlign='right';
      ctx.fillText('Wf',M.left-6,U.toXY(0,floorP,M,W,H)[1]+4);
    }

    U.curve(ctx,ld,M,W,H,C.demand,0,100,'LD',82,false);
    U.curve(ctx,ls,M,W,H,C.supply,0,100,'LS',82,true);

    if(mode==='free'){
      var e=eqm();
      if(e.l>1&&e.l<99&&e.w>1&&e.w<99){
        var ex=U.toXY(e.l,e.w,M,W,H)[0],ey=U.toXY(e.l,e.w,M,W,H)[1];
        U.dropLines(ctx,ex,ey,M,H,C.equil);
        U.dot(ctx,ex,ey,C.equil);
        U.axisLabel(ctx,ex,ey,M,H,C.equil,'W*','L*');
      }
    }
  }

  function resize(){setup();}
  U.onResize(resize);

  function wire(id,fn){
    var el=document.getElementById(id);
    if(el) el.addEventListener('input',function(){fn(Number(this.value));
      var v=document.getElementById(id+'-val');
      if(v)v.textContent=(this.value>0?'+':'')+this.value;
      draw();});
  }
  wire('lab-demand-shift',function(v){dShift=v;});
  wire('lab-supply-shift',function(v){sShift=v;});

  ['free','minwage','union'].forEach(function(m){
    var btn=document.getElementById('lab-btn-'+m);
    if(!btn)return;
    btn.addEventListener('click',function(){
      mode=m;
      document.querySelectorAll('.lab-mode-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      draw();
    });
  });

  setup();
})();
