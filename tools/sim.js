// 사용: BAL_FILE=<index.html> node sim.js cheap+upg2 40
const S=require('./simlib');
const file=process.env.BAL_FILE||'/home/sandbox/abyss-lantern/index.html';
const [mode='cheap+upg2',N='40']=process.argv.slice(2);
const upg=+(mode.match(/upg(\d)/)||[0,0])[1];
const sim=S.makeSim(file); const t0=Date.now(); const w=[];
for(let i=0;i<+N;i++) w.push(sim.run(1000+i,{buy:'cheap',upg}).wave);
const s=S.stats(w);
console.log(mode,s.n+'판',`avg ${s.avg} | p10 ${s.p10} med ${s.med} p90 ${s.p90} | min ${s.min} max ${s.max} | died@10 ${s.died10}/${s.n}`,'elapsed',((Date.now()-t0)/1000).toFixed(1)+'s');
