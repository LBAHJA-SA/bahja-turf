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

// خيل المستخدم — من لصقته
const USER_HORSES = [
  'CALAS','RUGER','SHANOUR','LE CAPORAL','JIPET DE CREPIN','PRINCESSE D AMOUR',
  'JUST DE L OISON','HAMANDIO','KIKA JOSSELYN','ELIMAN','JACKPOT MEARAS','LANCIER DU GOUTIER',
  'AMINACO','JAPPELOUP TURGOT','MISTER GATZ','JAGERBOMB','FAWAZ MIL','MIDDLE EARTH',
  'INTERACTIV','JANE CASH','INDIEN DE FONTAINE','BOTERVIA DU KALON','VICTORY PACE',
  'HALFAN SPEED','KEL STORY','HOMARD LAND','JOS MAZA','ANSSIO','JILORD VIVA'
];

const idx = new Map();
for (const f of walk(ROOT)) {
  let j;
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  for (const p of j.participants || []) {
    const n = String(p.horse || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!n) continue;
    if (!idx.has(n)) idx.set(n, []);
    idx.get(n).push({
      date: j.reunion?.date, hip: j.reunion?.hippodrome,
      course: j.course?.num, quinte: !!j.course?.quinte,
      num: p.num, cote: p.cote_pmu, rang: p.rang, run: j.course?.runners,
    });
  }
}

console.log('بحث على', USER_HORSES.length, 'خيل فـ', idx.size, 'خيل موجود فالأرشيف\n');
for (const h of USER_HORSES) {
  const k = h.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const hits = idx.get(k) || [];
  if (!hits.length) { console.log(`✗ ${h.padEnd(22)} — ماكاينش فالأرشيف`); continue; }
  const s = hits.map(x => `${x.date} ${x.hip} C${x.course}${x.quinte ? ' Q' : ''} n°${x.num} cote=${x.cote} rang=${x.rang}/${x.run}`).join('\n     ');
  console.log(`✓ ${h.padEnd(22)} (${hits.length})\n     ${s}`);
}
