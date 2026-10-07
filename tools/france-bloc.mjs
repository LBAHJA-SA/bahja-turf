import fs from 'node:fs';

// Hippodromes France — غير officiel (France Galop + LeTrot)
const FR = new Set(['VICHY', "LE LION D'ANGERS", 'LE LION D ANGERS', 'CAGNES/MER', 'CABOURG',
  'ARGENTAN', 'PORNICHET', 'LES SABLES D OLONNE', 'SAINT-CLOUD', 'ENGHIEN', 'ENGHIEN SOISY',
  'LA CAPELLE', 'DEAUVILLE', 'LE CROISE LAROCHE', 'LYON LA SOIE', 'LYON PARILLY', 'LAVAL',
  'PONT DE VIVAUX', 'GRAIGNES', 'SAINT GALMIER', 'MAUQUENCHY', 'HYERES', 'SAINT BRIEUC',
  'ANGERS', 'CHANTILLY', 'STRASBOURG', 'LE MANS', 'CHATEAUBRIANT', 'REIMS', 'NANTES',
  'EVREUX', 'MARSEILLE VIVAUX', 'MARSEILLE BORELY', 'VINCENNES', 'LONGCHAMP',
  'PARISLONGCHAMP', 'FONTAINEBLEAU', 'SAINT CYR', 'BORDEAUX', 'BORDEAUX LE BOUSCAT',
  'CAEN', 'COMPIEGNE', 'ROQUEBROTTE', 'DIEPPE', 'MEULIN', 'MORLAIX', 'AGEN', 'AGEN LA GARENNE',
  'MOULINS', 'PONTCHATEAU', 'CHATILLON', 'CHATEAULIN', 'SAINT MALO', 'MORLAIX',
  'BEAUMONT DE LOMAGNE', 'BEAUMONT-DE-LOMAGNE', 'LA ROCHE SUR YON', 'BEAUMONT', 'LAVAL']);

const MS = ['2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08'];
let R = [];
for (const m of MS) {
  const f = `C:/bahja-TURF/tools/quinte-${m}.json`;
  if (fs.existsSync(f)) R.push(...JSON.parse(fs.readFileSync(f, 'utf8')).map(x => ({ ...x, m })));
}
const F = R.filter(r => FR.has(String(r.hip || '').toUpperCase().trim()));
console.log('France: ' + F.length + ' / ' + R.length + '  (' + (F.length / R.length * 100).toFixed(0) + '%)');

const P = (c, t) => t ? (c / t * 100).toFixed(1) + '%' : '—';
const n = F.length;
console.log('\n' + '='.repeat(84));
console.log(`  كانتي فرنسي R1 — ${n} سباق`);
console.log('='.repeat(84));

// عدد الخيل
const sz = F.map(r => r.nRated).sort((a, b) => a - b);
console.log(`  خيل/سباق: ${sz[0]} → ${sz[sz.length - 1]}  (وسيط ${sz[Math.floor(sz.length / 2)]})`);
console.log(`  بـ 13+ خيل: ${F.filter(r => r.nRated >= 13).length}  |  بـ 12-: ${F.filter(r => r.nRated < 13).length}`);

console.log('\n  نختار غير 13+ خيل (كانتي حقيقي):\n');
const G = F.filter(r => r.nRated >= 13);
const g = G.length;
console.log(`  ${g} سباق\n`);

// BLOCS
console.log('  البلوك        P1       P1&P2     P1&P2&P3  +P4      +P5');
console.log('  ' + '-'.repeat(66));
for (const k of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16]) {
  const f = x => G.filter(r => r.top.slice(0, x).every(y => y.rk <= k)).length;
  console.log(`  Top-${String(k).padEnd(3)}   ${P(f(1), g).padStart(8)}  ${P(f(2), g).padStart(8)}  ${P(f(3), g).padStart(8)}  ${P(f(4), g).padStart(7)}  ${P(f(5), g).padStart(7)}`);
}

// 3 احتمالات
console.log('\n  3 احتمالات لكل بلوك:\n');
console.log('  البلوك       قوي            متوسط          مفاجأة');
for (const [label, x, lo, mid, hi] of [
  ['P1', 1, 3, 6, 9], ['P1&P2', 2, 5, 7, 10], ['P1&P2&P3', 3, 7, 9, 12],
  ['P1&P2&P3&P4', 4, 9, 11, 14], ['P1..&P5', 5, 10, 12, 14],
]) {
  const f = k => G.filter(r => r.top.slice(0, x).every(y => y.rk <= k)).length;
  console.log(`  ${label.padEnd(12)} طوب${String(lo).padEnd(2)}=${P(f(lo), g).padStart(7)}     طوب${String(mid).padEnd(2)}=${P(f(mid), g).padStart(7)}      طوب${String(hi).padEnd(2)}=${P(f(hi), g).padStart(7)}`);
}

fs.writeFileSync('C:/bahja-TURF/tools/france-quinte.json', JSON.stringify(G, null, 1));
console.log('\n  محفوظ:', G.length, 'سباق → tools\\france-quinte.json');
