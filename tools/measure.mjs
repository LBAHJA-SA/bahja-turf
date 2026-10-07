import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/bahja-TURF/archives';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

const files = walk(ROOT);

const races = [];
for (const f of files) {
  let j;
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch { continue; }

  const parts = j.participants || [];
  const rated = parts.filter(p => typeof p.cote_pmu === 'number' && p.cote_pmu > 0);
  if (rated.length < 5) continue;

  const results = parts.filter(p => typeof p.rang === 'number' && p.rang >= 1 && p.rang <= 5);
  if (results.length < 5) continue;
  if (results.some(p => !(typeof p.cote_pmu === 'number' && p.cote_pmu > 0))) continue;

  const byCote = [...rated].sort((a, b) => a.cote_pmu - b.cote_pmu || a.num - b.num);
  const coteRank = new Map();
  byCote.forEach((p, i) => { if (!coteRank.has(p)) coteRank.set(p, i + 1); });

  // --- Ordre complet (من|La Synthèse/الصحف) إلا كان ---
  const presse = j.pronostics?.presse;
  const selCount = new Map();
  let ordre = null;
  if (Array.isArray(presse) && presse.length) {
    const horses = new Set(byCote.map(p => p.horse));
    const counts = new Map(byCote.map(p => [p.horse, 0]));
    for (const pr of presse) for (const s of pr.selections || []) {
      if (horses.has(s.nomCheval)) counts.set(s.nomCheval, counts.get(s.nomCheval) + 1);
    }
    ordre = byCote.map(p => ({ horse: p.horse, cote: p.cote_pmu, votes: counts.get(p.horse) }))
      .sort((a, b) => b.votes - a.votes || a.cote - b.cote);
    const r = new Map();
    ordre.forEach((x, i) => { if (!r.has(x.horse)) r.set(x.horse, i + 1); });
    ordre = { rank: r, nPronostics: presse.length, votes: counts };
  }

  races.push({
    file: path.relative(ROOT, f),
    hippodrome: j.reunion?.hippodrome,
    date: j.reunion?.date,
    year: (j.reunion?.date || '').slice(0, 4),
    nRated: rated.length,
    results: results.sort((a, b) => a.rang - b.rang).map(p => ({
      rang: p.rang, num: p.num, horse: p.horse, cote: p.cote_pmu, coteRank: coteRank.get(p),
    })),
    ordre,
  });
}

fs.writeFileSync('C:/bahja-TURF/tools/races-index.json', JSON.stringify(races));
const withOrdre = races.filter(r => r.ordre);
console.log('سباقات بنتيجة كاملة + كوط حقيقي:', races.length);
console.log('  2020:', races.filter(r => r.year === '2020').length, '| 2026:', races.filter(r => r.year === '2026').length);
console.log('سباقات فيها Ordre de presse:', withOrdre.length);

const pct = (c, t) => t ? (c / t * 100).toFixed(1) + '%' : '-';

function table(rankOf, label) {
  const R = 12;
  console.log('\n\n===== ' + label + ' =====');
  console.log('المركز'.padEnd(8) + 'عدد'.padStart(7) + '  ' +
    Array.from({ length: R }, (_, i) => (i + 1 === R ? '13+' : String(i + 1)).padStart(7)).join(''));
  const tab = Array.from({ length: 5 }, () => new Array(R).fill(0));
  for (const rc of races) {
    const rk = rankOf(rc);
    if (!rk) continue;
    for (const res of rc.results) {
      const k = rk.get(res.horse);
      if (k == null) continue;
      tab[res.rang - 1][Math.min(k, R) - 1]++;
    }
  }
  for (let pos = 0; pos < 5; pos++) {
    const tot = tab[pos].reduce((a, b) => a + b, 0);
    const cells = tab[pos].map((c, i) => {
      const p = tot ? c / tot * 100 : 0;
      return (c + (p >= 5 ? '*' : ' ')).padStart(7);
    }).join('');
    console.log(`P${pos + 1}`.padEnd(8) + String(tot).padStart(7) + '  ' + cells);
  }
  console.log('\nنسب مئوية:');
  for (let pos = 0; pos < 5; pos++) {
    const tot = tab[pos].reduce((a, b) => a + b, 0);
    const cells = tab[pos].map((c, i) => {
      const p = tot ? c / tot * 100 : 0;
      return (pct(c, tot)).padStart(7);
    }).join('');
    console.log(`P${pos + 1}`.padEnd(8) + String(tot).padStart(7) + '  ' + cells);
  }
  return tab;
}

const rankOfCote = rc => new Map(rc.results.map(r => [r.horse, r.coteRank]));
table(rankOfCote, 'الجدول A — رتبة الكوط لكل مركز (3,468 سباق)');
table(rc => rc.ordre?.rank, `الجدول B — Ordre de presse لكل مركز (${withOrdre.length} سباق)`);

// ===== جدول C: رتبة الكوط ديال الرابح =====
console.log('\n\n===== الجدول C — رتبة الكوط ديال الرابح (3,468 سباق) =====');
const w = races.map(rc => rc.results[0].coteRank);
const buckets = [[1, 1], [2, 2], [3, 3], [4, 5], [6, 10], [11, 20], [21, 9999]];
console.log('رتبة الكوط'.padEnd(12) + 'عدد'.padStart(8) + 'الحصة'.padStart(10));
for (const [a, b] of buckets) {
  const c = w.filter(r => r >= a && r <= b).length;
  console.log(`${a === b ? a : a + '-' + (b === 9999 ? '∞' : b)}`.padEnd(12) + String(c).padStart(8) + pct(c, w.length).padStart(10));
}

// ===== جدول D: متوسط الكوط لكل مركز =====
console.log('\n\n===== الجدول D — متوسط/وسيط الكوط لكل مركز =====');
console.log('المركز'.padEnd(8) + 'متوسط الكوط'.padStart(14) + 'الوسيط'.padStart(10) + 'متوسط رتبة الكوط'.padStart(18));
for (let pos = 1; pos <= 5; pos++) {
  const cs = races.map(rc => rc.results[pos - 1].cote).sort((a, b) => a - b);
  const rs = races.map(rc => rc.results[pos - 1].coteRank);
  const mean = cs.reduce((a, b) => a + b, 0) / cs.length;
  console.log(`P${pos}`.padEnd(8) + mean.toFixed(2).padStart(14) + cs[Math.floor(cs.length / 2)].toFixed(1).padStart(10)
    + (rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(2).padStart(18));
}

// ===== جدول E: P1/P2/P3 زونات =====
console.log('\n\n===== الجدول E — P1/P2/P3 ديال زونات الكوط =====');
const zones = [['P1 (1-2)', 1, 2], ['P2 (3-5)', 3, 5], ['P3 (6-10)', 6, 10], ['P4 (11+)', 11, 9999]];
const zbp = zones.map(() => new Array(6).fill(0));
const zHit = zones.map(() => 0);
for (const rc of races) {
  const flags = zones.map(([, a, b]) => rc.results.some(r => r.coteRank >= a && r.coteRank <= b));
  flags.forEach((f, i) => { if (f) zHit[i]++; });
  for (let pos = 1; pos <= 5; pos++) {
    const res = rc.results[pos - 1];
    zones.forEach(([, a, b], i) => { if (res.coteRank >= a && res.coteRank <= b) zbp[i][pos]++; });
  }
}
console.log('الزون'.padEnd(12) + 'ف سباق'.padStart(9) + 'ع总数'.padStart(10) +
  'P1'.padStart(9) + 'P2'.padStart(9) + 'P3'.padStart(9) + 'P4'.padStart(9) + 'P5'.padStart(9));
zones.forEach(([n, a, b], i) => {
  const r = zbp[i];
  const cells = r.slice(1).map(c => pct(c, zHit[i]).padStart(9)).join('');
  console.log(n.padEnd(12) + String(zHit[i]).padStart(9) + pct(zHit[i], races.length).padStart(10) + cells);
});
