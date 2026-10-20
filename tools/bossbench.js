// R93: 보스 난이도 측정 (분석 전용, 게임 파일은 건드리지 않음)
// 사용: BAL_FILE=<index.html> node bossbench.js <보스파도 W> <판 수> [전략: cheap|1G|3G] [startAt(체크포인트, 선택)]
// 게임 파일을 임시 복사본으로 만들어 bossDefForWave만 "강제 보스"로 바꿔 측정합니다 (같은 시드 = 같은 군대로 보스만 바꿔 비교).
const fs = require('fs'), path = require('path');
const BAL = process.env.BAL_FILE || '/home/sandbox/abyss-lantern/index.html';
const W = +process.argv[2] || 10, N = +process.argv[3] || 40, STRAT = process.argv[4] || 'cheap', START = process.argv[5] ? +process.argv[5] : undefined;
const BOSSES = ['tide', 'kelp', 'ruin', 'maw', 'lord'], NAMES = { tide: '격랑', kelp: '포식자', ruin: '수호자', maw: '폭군', lord: '군주' };
let html = fs.readFileSync(BAL, 'utf8');
const marker = 'function bossDefForWave(){ return BOSS_TYPES[dominantZone()] || BOSS_TYPES[BOSS_TYPES.length - 1]; }';
if (!html.includes(marker)) throw new Error('bossDefForWave 형태가 바뀌었습니다. 스크립트를 갱신하세요.');
html = html.replace(marker, 'function bossDefForWave(){ if (globalThis.__FB != null) return BOSS_TYPES[globalThis.__FB]; return BOSS_TYPES[dominantZone()] || BOSS_TYPES[BOSS_TYPES.length - 1]; }');
const tmp = path.join(require('os').tmpdir(), '_bossbench_' + process.pid + '.html'); fs.writeFileSync(tmp, html);
const S = require('./simlib'); const sim = S.makeSim(tmp); const { G, X } = sim;
function mk(costOnly, maxRoll){ // 특정 코스트만 구매 (합체 가능 카드는 코스트 무관 구매), 필요시 리롤
  return (X, G, opt) => {
    let rolls = 0;
    for (let guard = 0; guard < 40; guard++){
      let bi = -1, bc = 99;
      for (let i = 0; i < 5; i++){ const t = G.shop[i]; if (!t) continue; const c = X.cardCost(t); if (c > G.gold) continue;
        const mg = G.units.filter(u => u.id === t.id && u.star === 1).length >= 2 || G.units.filter(u => u.id === t.id && u.star === 2).length >= 2;
        if (t.cost === costOnly || mg){ const key = mg ? 0 : c; if (key < bc){ bc = key; bi = i; } } }
      if (bi >= 0){ X.buyCard(bi); continue; }
      if (rolls < maxRoll && G.gold >= X.rerollCost() + costOnly){ G.gold -= X.rerollCost(); X.rollShop(); rolls++; continue; }
      break;
    }
  };
}
const shopFn = STRAT === '1G' ? mk(1, 4) : STRAT === '3G' ? mk(3, 4) : undefined;
function runOne(bossIdx, seed){
  globalThis.__FB = bossIdx;
  const rec = { reached: false, killed: false, defeat: false, t0: 0, t: 0, core: 0, coreEnr: 0, tEnr: 0, loss: 0, unitsAt: 0, maxhp: 0 };
  let lastCore = null, lastLoss = 0, lastT = 0, enrSeen = false;
  const r = sim.run(seed, { shopFn, upg: 2, cap: W + 1, startAt: START, buy: STRAT === 'cheap' ? undefined : undefined,
    onFrame: G => {
      const b = G.boss;
      if (b && b.hp > 0 && G.wave === W){
        if (!rec.reached){ rec.reached = true; rec.t0 = G.time; rec.unitsAt = G.units.length; { const pw = (G.waveLog || []).find(w => w.wave === W - 1); rec.prev = pw ? pw.coreDmg : 0; } rec.maxhp = b.maxhp; lastCore = G.coreHp; lastLoss = G.waveUnitLoss; lastT = G.time; }
        const dc = Math.max(0, lastCore - G.coreHp), dt = G.time - lastT;
        rec.core += dc; if (b.enraged){ rec.coreEnr += dc; rec.tEnr += dt; }
        lastCore = G.coreHp; lastT = G.time; rec.t = G.time - rec.t0; rec.loss = G.waveUnitLoss - lastLoss + rec.loss * 0; rec.loss = G.waveUnitLoss;
      } else if (rec.reached && !rec.killed && !G.boss && G.wave === W){ rec.killed = true; }
    },
    stopWhen: G => rec.killed && G.wave === W && false });
  if (rec.reached && !rec.killed) rec.defeat = G.phase === 'over';
  rec.coreMax = G.coreMax; rec.endPhase = G.phase; rec.diedWave = G.phase === 'over' ? G.wave : null;
  return rec;
}
const out = [];
console.log('보스 파도 W=' + W + ' 전략=' + STRAT + (START ? ' 체크포인트=' + START : '') + ' 판수=' + N + ' (시드 1000+i, 환생 강화 2단계)');
console.log('보스\t도달\t처치\t패배\t처치시간(초,평균)\t처치시간p90\t등불피해%(평균)\t등불피해p90\t격노구간피해%\t격노구간(초)\t유닛손실(평균)');
const med = (a, p) => { if (!a.length) return NaN; a = a.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
for (let bi = 0; bi < BOSSES.length; bi++){
  const recs = []; for (let i = 0; i < N; i++) recs.push(runOne(bi, 1000 + i));
  const rch = recs.filter(r => r.reached), kl = rch.filter(r => r.killed), df = rch.filter(r => r.defeat);
  const kt = kl.map(r => r.t), cd = rch.map(r => 100 * r.core / r.coreMax), en = rch.filter(r => r.tEnr > 0);
  const f = (x, d) => isNaN(x) ? '-' : x.toFixed(d == null ? 1 : d);
  console.log([NAMES[BOSSES[bi]], rch.length + '/' + N, kl.length, df.length, f(avg(kt)), f(med(kt, 0.9)), f(avg(cd.map(x => Math.min(100, x)))), f(med(cd.map(x => Math.min(100, x)), 0.9)),
    en.length ? f(avg(en.map(r => 100 * r.coreEnr / r.coreMax))) + '(' + en.length + '판)' : '-', en.length ? f(avg(en.map(r => r.tEnr))) : '-', f(avg(rch.map(r => 100 * (r.prev || 0) / r.coreMax))), f(avg(rch.map(r => r.loss)))].join('\t'));
}
fs.unlinkSync(tmp);
