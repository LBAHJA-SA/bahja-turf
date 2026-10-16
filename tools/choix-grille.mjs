/* =============================================================================
 * tools/choix-grille.mjs — LE CHOIX DANS LE BLOC, blocs du MOTEUR (16/10/2026).
 *
 * ⭐ C'EST LA MESURE DÉCISIVE DU 16/10. Les quotas 3-2-1-1-1 ne bougent pas
 * (§11.16) : on ne redistribue QUE le choix à l'intérieur de chaque bloc, les
 * blocs étant ceux du vrai `buildGrid()` (les cases P1..P20 du carnet).
 *
 * Métrique §11.18 = PAYANTE : « le 1-2-3 (gagnant, 2e, 3e) est complet dans
 * la grille ». Cotes Equidia, 96 Quintés à presse RÉELLE.
 *
 *   node tools\choix-grille.mjs            cotes finales
 *   node tools\choix-grille.mjs ouverture  cotes du matin (proxy 07 h)
 *
 * Trois façons de choisir dans un bloc :
 *   c = CARNET   le rang de presse de la case (P1..P20)
 *   m = MARCHÉ   la cote (rapp_evol)
 *   s = SLOT     le numéro de colonne du carnet papier
 *
 * Résultat (16/10) : le CARNET gagne. « G1 carnet · G2 marché · G3-G5 carnet »,
 * appliqué dans `remplirGrille()`, donne 38,5 % contre 28,1 % pour la règle
 * « la cote partout » (§11.17).
 * ============================================================================= */
import fs from 'node:fs';
import { buildGrid } from '../src/lib/quinte.js';

const Q = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'));
const CH = process.argv[2] === 'ouverture' ? 'ouverture' : 'cotes';

const C = Q.map((q) => {
  const c = q[CH] || {}; const nums = Object.keys(c).map(Number);
  if (nums.length < 12 || nums.some((n) => !(c[n] > 1))) return null;
  const presse = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => c[n] > 1);
  if (presse.length < 10) return null;
  return { c, presse, runners: nums, arrivee: q.arrivee.slice(0, 5) };
}).filter(Boolean);
const N = C.length;
const f = (a, b) => ((100 * a) / b).toFixed(1) + '%';
const kpi = (t, arr) => { let k = 0; for (const x of arr) { if (!t.includes(x)) break; k++; } return k; };

/* les blocs du VRAI moteur (buildGrid) — une fois pour toutes */
const PRE = C.map((q) => ({
  c: q.c,
  arrivee: q.arrivee,
  grp: buildGrid(q.presse, q.runners).groupes.map((g) => ({
    quota: g.quota,
    cases: g.cases.map((c) => ({ num: c.num, place: c.place, slot: c.slot })),
  })),
}));

const NM = { 0: 'c', 1: 'm', 2: 's' };
function ticket(p, modes) {
  const t = [];
  p.grp.forEach((g, i) => {
    const arr = g.cases.slice();
    const m = modes[i];
    if (m === 1) arr.sort((a, b) => p.c[a.num] - p.c[b.num]);
    else if (m === 0) arr.sort((a, b) => a.place - b.place);
    else arr.sort((a, b) => a.slot - b.slot);
    arr.slice(0, g.quota).forEach((x) => { if (!t.includes(x.num)) t.push(x.num); });
  });
  return t;
}
function sc(modes, idxs) {
  let p3 = 0, p5 = 0;
  for (const i of idxs) {
    const k = kpi(ticket(PRE[i], modes), PRE[i].arrivee);
    if (k >= 3) p3++;
    if (k >= 5) p5++;
  }
  return { p3, p5 };
}
const ALL = [...Array(N).keys()];

console.log(`\n  ${N} Quintés à presse réelle — blocs du MOTEUR (buildGrid, cases P1..P20) — cotes ${CH}`);
console.log('  c = carnet/rang presse · m = marché · s = colonne du carnet\n');
console.log('  variantes uniformes');
console.log('  ' + '-'.repeat(60));
for (const [lab, m] of [['carnet partout', 0], ['marché partout (§11.17)', 1], ['slot partout', 2]]) {
  const r = sc([m, m, m, m, m], ALL);
  console.log('  ' + lab.padEnd(28) + `1-2-3 = ${f(r.p3, N)}`.padEnd(20) + `5/5 = ${f(r.p5, N)}`);
}

console.log('\n  combinaisons nommées');
console.log('  ' + '-'.repeat(60));
for (const [lab, mask] of [
  ['G1 carnet · G2-G5 carnet', [0, 0, 0, 0, 0]],
  ['G1 carnet · G2 marché · G3-G5 carnet  ⭐ RETENU', [0, 1, 0, 0, 0]],
  ['G1 carnet · G2-G5 marché', [0, 1, 1, 1, 1]],
  ['G1 marché · G2 marché · G3-G5 carnet', [1, 1, 0, 0, 0]],
  ['G1 marché · G2-G5 carnet', [1, 0, 0, 0, 0]],
  ['G1 marché · G2-G5 marché', [1, 1, 1, 1, 1]],
]) {
  const r = sc(mask, ALL);
  console.log('  ' + lab.padEnd(44) + `1-2-3 = ${f(r.p3, N)}`.padEnd(20) + `5/5 = ${f(r.p5, N)}`);
}

/* les 32 combinaisons, triées, pour voir si la tête est stable */
const out = [];
for (let m = 0; m < 32; m++) {
  const mask = [0, 1, 2, 3, 4].map((g) => ((m >> g) & 1 ? 1 : 0));
  out.push({ lab: mask.map((x) => NM[x]).join(''), ...sc(mask, ALL) });
}
out.sort((a, b) => b.p3 - a.p3);
console.log('\n  les 8 combinaisons de tête (sur 32)');
console.log('  ' + '-'.repeat(60));
for (const r of out.slice(0, 8)) console.log('  ' + r.lab.padEnd(28) + `1-2-3 = ${f(r.p3, N)}`.padEnd(20) + `5/5 = ${f(r.p5, N)}`);

/* LOO : la meilleure combinaison est choisie sur les N-1 autres courses */
let loo3 = 0;
for (let i = 0; i < N; i++) {
  const others = ALL.filter((k) => k !== i);
  let best = 0, bv = -1;
  for (let m = 0; m < 32; m++) {
    const v = sc([0, 1, 2, 3, 4].map((g) => ((m >> g) & 1 ? 1 : 0)), others).p3;
    if (v > bv) { bv = v; best = m; }
  }
  const mask = [0, 1, 2, 3, 4].map((g) => ((best >> g) & 1 ? 1 : 0));
  if (kpi(ticket(PRE[i], mask), PRE[i].arrivee) >= 3) loo3++;
}
console.log(`\n  LOO honnête (combinaison choisie sur les ${N - 1} autres) : 1-2-3 = ${f(loo3, N)} (${loo3}/${N})`);
console.log('  ⚠ la règle retenue est FIXE (« G1 carnet · G2 marché »), donc son 38,5 % n\'est pas un chiffre ajusté.\n');
