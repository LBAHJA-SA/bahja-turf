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
console.log('total json files:', files.length);

const stats = {
  files: 0, parseFail: 0,
  hasPronostics: 0,
  presseNonNull: 0, presseTotal: 0, presseEmpty: 0,
  synthPremiers: 0, synthSeconds: 0, synthTableRonde: 0, tableRonde: 0, synthPresse: 0,
  geny: 0,
  // per-participant
  pTotal: 0, pCotePmu: 0, pCoteGeny: 0, pRang: 0, pRangNull: 0,
  // race level
  arriveeNonNull: 0,
  dates: new Map(),
};

const typePronoCounter = new Map();
const presseSelSizes = [];

for (const f of files) {
  let j;
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch { stats.parseFail++; continue; }
  stats.files++;

  const y = (j.reunion?.date || '').slice(0, 4);
  stats.dates.set(y, (stats.dates.get(y) || 0) + 1);
  if (j.course?.arrivee != null) stats.arriveeNonNull++;

  const pr = j.pronostics;
  if (pr) stats.hasPronostics++;
  if (pr?.synthesePressePremiers?.liste?.length) stats.synthPremiers++;
  if (pr?.synthesePresseSeconds?.liste?.length) stats.synthSeconds++;
  if (pr?.syntheseTableRonde?.liste?.length) stats.synthTableRonde++;
  if (pr?.tableRonde?.liste?.length) stats.tableRonde++;
  if (pr?.synthesePresse) stats.synthPresse++;
  if (pr?.geny) stats.geny++;

  const presse = pr?.presse;
  if (Array.isArray(presse) && presse.length) {
    stats.presseNonNull++;
    stats.presseTotal += presse.length;
    presseSelSizes.push(presse.length);
    for (const p of presse) {
      if (p?.typePronostic) typePronoCounter.set(p.typePronostic, (typePronoCounter.get(p.typePronostic) || 0) + 1);
    }
  } else {
    stats.presseEmpty++;
  }

  for (const p of j.participants || []) {
    stats.pTotal++;
    if (typeof p.cote_pmu === 'number' && p.cote_pmu > 0) stats.pCotePmu++;
    if (typeof p.cote_geny === 'number' && p.cote_geny > 0) stats.pCoteGeny++;
    if (p.rang != null) stats.pRang++; else stats.pRangNull++;
  }
}

console.log('\n--- FILE LEVEL ---');
console.log(stats);
console.log('\nyears:', [...stats.dates.entries()].sort());
console.log('\npresse per-race sizes: min', Math.min(...presseSelSizes), 'max', Math.max(...presseSelSizes));
console.log('\ntypePronostic counts:');
for (const [k, v] of [...typePronoCounter.entries()].sort((a, b) => b[1] - a[1])) console.log('  ', k, v);
