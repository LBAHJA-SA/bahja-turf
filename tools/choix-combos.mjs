/* =============================================================================
 * tools/choix-combos.mjs — QUEL CHOIX PAR BLOC ? (16/10/2026)
 *
 * Blocs 3-2-1-1-1 (par rang de presse). Pour CHAQUE bloc, deux choix possibles :
 *   P = ordre du CARNET (rang presse)   ·   M = ordre du MARCHÉ (cote)
 * 2^5 = 32 combinaisons. On les mesure sur 96 Quintés à presse réelle, puis on
 * refait le choix de combinaison en LOO (la course testée ne vote pas).
 *
 *   node tools\choix-combos.mjs            cotes finales
 *   node tools\choix-combos.mjs ouverture
 * ============================================================================= */
import fs from 'node:fs';
const Q = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'));
const CH = process.argv[2] === 'ouverture' ? 'ouverture' : 'cotes';

const C = Q.map((q) => {
  const c = q[CH] || {}; const nums = Object.keys(c).map(Number);
  if (nums.length < 12 || nums.some((n) => !(c[n] > 1))) return null;
  const presse = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => c[n] > 1);
  if (presse.length < 10) return null;
  return { date: q.date, c, presse, arrivee: q.arrivee.slice(0, 5), nums };
}).filter(Boolean);
const N = C.length;
const QUOTAS = [3, 2, 1, 1, 1];
const G = (r) => (r <= 4 ? 0 : r <= 8 ? 1 : r <= 10 ? 2 : r <= 12 ? 3 : 4);
const f = (a, b) => ((100 * a) / b).toFixed(1) + '%';

/* prépare, pour chaque course, les membres de chaque bloc + leur rang carnet/marché */
const PRE = C.map((c) => {
  const parCote = c.nums.slice().sort((a, b) => c.c[a] - c.c[b]);
  const rangC = {}; parCote.forEach((n, i) => (rangC[n] = i));
  const rangP = {}; c.presse.forEach((n, i) => (rangP[n] = i));
  const blocs = [];
  for (let g = 0; g < 5; g++) blocs.push(c.presse.filter((n) => G(c.presse.indexOf(n) + 1) === g));
  return { blocs, rangC, rangP, arrivee: c.arrivee };
});

function ticket(pre, mask) {   // mask : bit g = 1 → marché, 0 → carnet
  const t = [];
  for (let g = 0; g < 5; g++) {
    const useM = (mask >> g) & 1;
    const membres = pre.blocs[g].slice().sort((a, b) => (useM ? pre.rangC[a] - pre.rangC[b] : pre.rangP[a] - pre.rangP[b]));
    membres.slice(0, QUOTAS[g]).forEach((n) => { if (!t.includes(n)) t.push(n); });
  }
  return t;
}
function kpi(t, arr) { let k = 0; for (const x of arr) { if (!t.includes(x)) break; k++; } return k; }
function score(mask, idxs) {
  let p3 = 0, p5 = 0;
  for (const i of idxs) { const k = kpi(ticket(PRE[i], mask), PRE[i].arrivee); if (k >= 3) p3++; if (k >= 5) p5++; }
  return { p3, p5, n: idxs.length };
}

const ALL = [...Array(N).keys()];
const res = [];
for (let m = 0; m < 32; m++) {
  const s = score(m, ALL);
  const lab = [0, 1, 2, 3, 4].map((g) => ((m >> g) & 1 ? 'M' : 'P')).join('');
  res.push({ m, lab, ...s });
}
res.sort((a, b) => b.p3 - a.p3);
console.log(`\n  ${N} Quintés, presse réelle, cotes ${CH} — 32 combinaisons (P carnet / M marché par bloc)`);
console.log('  ' + '-'.repeat(70));
console.log('  ' + 'G1G2G3G4G5'.padEnd(14) + 'PAYANTE      Quinté 5/5');
for (const r of res.slice(0, 8)) console.log('  ' + r.lab.padEnd(14) + `${f(r.p3, r.n)} (${r.p3}/${r.n})`.padEnd(14) + f(r.p5, r.n));
console.log('  ' + '…');
console.log('  ' + res[res.length - 1].lab.padEnd(14) + f(res[res.length - 1].p3, res[res.length - 1].n).padEnd(14) + f(res[res.length - 1].p5, res[res.length - 1].n));

/* ---- LOO : pour chaque course, la combinaison est choisie sur les 95 autres ---- */
let looP3 = 0, looP5 = 0, pinned = {};
for (let i = 0; i < N; i++) {
  const others = ALL.filter((k) => k !== i);
  let best = 0, bestV = -1;
  for (let m = 0; m < 32; m++) { const v = score(m, others).p3; if (v > bestV) { bestV = v; best = m; } }
  pinned[best] = (pinned[best] || 0) + 1;
  const k = kpi(ticket(PRE[i], best), PRE[i].arrivee);
  if (k >= 3) looP3++; if (k >= 5) looP5++;
}
console.log(`\n  LOO honnête (la course testée ne choisit pas sa combinaison) :`);
console.log(`    PAYANTE = ${f(looP3, N)}  (${looP3}/${N})         5/5 = ${f(looP5, N)}  (${looP5}/${N})`);
const topPin = Object.entries(pinned).sort((a, b) => b[1] - a[1]).slice(0, 4)
  .map(([m, c]) => `${[0, 1, 2, 3, 4].map((g) => ((+m >> g) & 1 ? 'M' : 'P')).join('')}:${c}`);
console.log(`    combinaisons tirées : ${topPin.join('  ')}`);
console.log('');
