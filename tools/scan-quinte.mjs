import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/bahja-TURF/archives';
function walk(d, o = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, o) : e.name.endsWith('.json') && o.push(p);
  }
  return o;
}
const files = walk(ROOT);

const months = new Map();      // "YYYY-MM" -> n
const org = new Map();
const hip = new Map();
let quinte = 0, quinteWithOdds = 0, quinteTop5 = 0;
const orgMonths = new Map();   // organizer -> Set("YYYY-MM")

for (const f of files) {
  let j;
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  const ym = (j.reunion?.date || '').slice(0, 7);
  months.set(ym, (months.get(ym) || 0) + 1);
  const o = String(j.reunion?.organizer || '?');
  org.set(o, (org.get(o) || 0) + 1);
  if (!orgMonths.has(o)) orgMonths.set(o, new Set());
  orgMonths.get(o).add(ym);
  hip.set(j.reunion?.hippodrome, (hip.get(j.reunion?.hippodrome) || 0) + 1);

  if (j.course?.quinte) {
    quinte++;
    const rated = (j.participants || []).filter(p => typeof p.cote_pmu === 'number' && p.cote_pmu > 0);
    const res = (j.participants || []).filter(p => typeof p.rang === 'number' && p.rang >= 1 && p.rang <= 5);
    if (rated.length >= 5) quinteWithOdds++;
    if (rated.length >= 5 && res.length === 5 && !res.some(p => !(p.cote_pmu > 0))) quinteTop5++;
  }
}

console.log('=== ORGANIZER ===');
for (const [k, v] of [...org.entries()].sort((a, b) => b[1] - a[1])) console.log(' ', k.padEnd(10), v);
console.log('\n=== الشهور ===');
for (const [k, v] of [...months.entries()].sort()) console.log(' ', k, v);
console.log('\n=== Kanati (course.quinte === true) ===');
console.log('  total:', quinte, '| >=5-rated:', quinteWithOdds, '| top5 complete:', quinteTop5);
console.log('\n=== months per organizer ===');
for (const [o, s] of orgMonths) if (o !== 'PMU') console.log(' ', o, [...s].sort().join(', '));
