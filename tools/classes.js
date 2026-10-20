const S=require('./simlib');
const file=process.env.BAL_FILE||'/home/sandbox/abyss-lantern/index.html';
const N=+(process.argv[2]||40), upg=+(process.argv[3]||2);
const sim=S.makeSim(file); const U=sim.X.UNIT_TYPES;
const cls=[...new Set(U.map(t=>t.cls))];
function go(label,start){ const w=[]; for(let i=0;i<N;i++) w.push(sim.run(5000+i,{buy:'cheap',upg,start}).wave); const s=S.stats(w); console.log(label.padEnd(10),`avg ${s.avg} p10 ${s.p10} med ${s.med} p90 ${s.p90} died@10 ${s.died10}/${s.n}`); return s.avg; }
const ones=cls.map(c=>U.find(t=>t.cls===c&&t.cost===1)).filter(Boolean);
const ctrl=go('대조(비시너지4)',ones.slice(0,4).map(t=>t.id));
for(const c of cls){ const hs=U.filter(t=>t.cls===c&&t.cost<=2); const st=[0,1,2,3].map(i=>hs[i%hs.length].id); const a=go(c,st); }
