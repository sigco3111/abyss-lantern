// 헤드리스 밸런스 시뮬 라이브러리 (R66). 사용: const S=require('./simlib'); S.makeSim(file)
const fs=require('fs');
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function makeSim(file){
  const mk=()=>new Proxy({}, {get:(t,p)=>{ if(p==='measureText')return s=>({width:String(s||'').length*6}); if(p==='createRadialGradient'||p==='createLinearGradient')return()=>({addColorStop(){}}); return ()=>{} }, set:()=>true});
  const cv=()=>({style:{},getContext:()=>mk(),addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:1024,height:640}),width:1024,height:640});
  const cs={game:cv(),dash:cv(),codex:cv(),roster:cv()};
  global.document={getElementById:id=>cs[id]||cs.game,querySelector:()=>cs.game,createElement:()=>cv()};
  global.window={addEventListener(){},matchMedia:()=>({matches:false})};
  const store={};global.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
  global.location={search:'?sim=1',reload(){}};
  let now=0,raf=null;global.performance={now:()=>now};global.requestAnimationFrame=cb=>{raf=cb};
  global.setTimeout=()=>0;global.setInterval=()=>0;
  const html=fs.readFileSync(file,'utf8');
  const sc=html.match(/<script>([\s\S]*?)<\/script>/)[1]+';globalThis.__X={G,newRun,startWave,buyCard,rollShop,UNIT_TYPES,REBIRTH_UPGRADES,rerollCost,cardCost,unitCap,rosterSize,addUnit,checkClassAwakening,synergyLevel,VERSION,noDraw:()=>{draw=function(){}}};';
  eval(sc);
  const X=globalThis.__X; X.noDraw();
  const G=X.G;
  function frame(){ now+=50; const cb=raf; raf=null; cb&&cb(now); }
  // strat: {buy:'cheap'|'cls:<id>', start:[unit ids], upg:n}
  function run(seed,opt){
    Math.random=mulberry(seed);
    G.meta.upgrades={}; const u=opt.upg||0;
    for(const r of X.REBIRTH_UPGRADES){ if(['wick','ember','discipline','swift'].includes(r.id)) G.meta.upgrades[r.id]=Math.min(u,r.max); }
    X.newRun(opt.startAt);
    for(const id of (opt.start||[])) X.addUnit(X.UNIT_TYPES.find(t=>t.id===id));
    X.checkClassAwakening();
    const cap=opt.cap||40; let guard=0, lastWave=-1;
    while(G.phase!=='over' && G.wave<cap && guard++<400000){
      if(G.phase==='shop' && G.wave!==lastWave+0 || (G.phase==='shop' && !G.waveActive && lastWave!==G.wave)){
        lastWave=G.wave; shopAct(opt);
        if(G.wave>=cap) break;
        if(opt.onShop) opt.onShop(G);
        X.startWave();
      }
      frame();
      if(opt.onFrame) opt.onFrame(G); // R93: 프레임 훅 (분석용)
      if(opt.stopWhen && opt.stopWhen(G)) break;
    }
    return {wave:G.wave, over:G.phase==='over', bossHit:G.wave};
  }
  function shopAct(opt){
    if(opt.shopFn){ opt.shopFn(X,G,opt); return; }
    const want=t=> opt.buy&&opt.buy.startsWith('cls:') ? t.cls===opt.buy.slice(4) : true;
    for(let rr=0;rr<6;rr++){
      let did=true;
      while(did){
        did=false; let bi=-1,bc=99;
        for(let i=0;i<5;i++){const t=G.shop[i]; if(t&&want(t)&&X.cardCost(t)<bc&&X.cardCost(t)<=G.gold){bc=X.cardCost(t);bi=i;}}
        if(bi>=0){ const g0=G.gold,n0=G.units.length; X.buyCard(bi); if(G.shop[bi]===null) did=true; }
      }
      if(opt.buy&&opt.buy.startsWith('cls:')&&G.gold>=X.rerollCost()+1 && G.units.filter(u=>u.cls===opt.buy.slice(4)).length<6){ G.gold-=X.rerollCost(); X.rollShop(); } else break;
    }
  }
  return {run,X,G};
}
function stats(a){
  a=a.slice().sort((x,y)=>x-y); const n=a.length, avg=a.reduce((s,x)=>s+x,0)/n;
  const q=p=>a[Math.min(n-1,Math.floor(p*n))];
  return {n,avg:+avg.toFixed(1),p10:q(0.1),med:q(0.5),p90:q(0.9),min:a[0],max:a[n-1],died10:a.filter(x=>x<10).length};
}
module.exports={makeSim,stats};
