/* =============================================================================
 * tools/choix-blocs.mjs — LE CHOIX DANS LES BLOCS (16/10/2026)
 *
 * Les quotas 3-2-1-1-1 sont protégés (§11.16). Ce qui se joue, c'est QUELS
 * chevaux on met dans chaque bloc. Ce script mesure différentes règles de
 * choix, à blocs constants, sur les 96 Quintés à presse RÉELLE.
 *
 *   node tools\choix-blocs.mjs            cotes finales
 *   node tools\choix-blocs.mjs ouverture  cotes du matin
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

const kpi = (t, arr) => { let k = 0; for (const x of arr) { if (!t.includes(x)) break; k++; } return k; };
const f = (a, b) => ((100 * a) / b).toFixed(1) + '%';
const rankOf = (arr, n) => arr.indexOf(n);

/* chaque "ordre de référence" : on classe les partants, puis on remplit les blocs */
function fill(order, c) {
  const t = [];
  for (let g = 0; g < 5; g++) {
    const membres = c.presse.filter((n) => G(c.presse.indexOf(n) + 1) === g);
    const tries = membres.slice().sort((a, b) => rankOf(order, a) - rankOf(order, b));
    tries.slice(0, QUOTAS[g]).forEach((n) => { if (!t.includes(n)) t.push(n); });
  }
  return t;
}

const rows = {};
const rec = (nom, t, arr) => {
  const r = (rows[nom] = rows[nom] || { n: 0, p3: 0, p4: 0, p5: 0 });
  r.n++; const k = kpi(t, arr); if (k >= 3) r.p3++; if (k >= 4) r.p4++; if (k >= 5) r.p5++;
};

for (const c of C) {
  const arr = c.arrivee;
  const parCote = c.nums.slice().sort((a, b) => c.c[a] - c.c[b]);       // ordre du marché
  const parPresse = c.presse.slice();                                   // ordre du carnet
  const rangC = {}; parCote.forEach((n, i) => (rangC[n] = i));
  const rangP = {}; parPresse.forEach((n, i) => (rangP[n] = i));
  const blend = c.nums.slice().sort((a, b) => (rangC[a] + rangP[a]) - (rangC[b] + rangP[b]));

  rec('choix = CARNET (rang presse)', fill(parPresse, c), arr);
  rec('choix = MARCHÉ (cote)', fill(parCote, c), arr);
  rec('choix = CARNET + MARCHÉ (somme des rangs)', fill(blend, c), arr);

  /* plafond oracle */
  const or = [];
  for (let g = 0; g < 5; g++) {
    const membres = c.presse.filter((n) => G(c.presse.indexOf(n) + 1) === g);
    const gagnants = membres.filter((n) => arr.includes(n));
    const perdants = membres.filter((n) => !arr.includes(n));
    gagnants.slice(0, QUOTAS[g]).forEach((n) => or.push(n));
    if (gagnants.length < QUOTAS[g]) perdants.slice(0, QUOTAS[g] - gagnants.length).forEach((n) => or.push(n));
  }
  rec('★ PLAFOND ORACLE (choix parfait)', or, arr);
}

console.log(`\n  ${N} Quintés à presse RÉELLE — cotes ${CH} — blocs 3-2-1-1-1`);
console.log('  ' + '-'.repeat(62));
console.log('  ' + 'règle de choix'.padEnd(40) + 'PAYANTE   +4      Quinté 5/5');
const order = Object.entries(rows).sort((a, b) => b[1].p3 / b[1].n - a[1].p3 / a[1].n);
for (const [nom, r] of order) {
  console.log('  ' + nom.padEnd(40) + f(r.p3, r.n).padEnd(10) + f(r.p4, r.n).padEnd(8) + f(r.p5, r.n));
}
console.log('');
