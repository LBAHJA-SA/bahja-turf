import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const XLSX = require('C:/bahja-TURF/node_modules/xlsx');

const wb = XLSX.readFile('C:/Users/sam/Desktop/statistiques_rang_cote_positions_1_a_5.xlsx');
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Données_extraites'], { defval: null });
const D = rows.filter(r => r.cote != null && r.position != null && r.rang_cote != null)
  .map(r => ({ c: +r.course, cote: +r.cote, rang: +r.rang_cote, pos: parseInt(String(r.position), 10) }))
  .filter(r => Number.isFinite(r.cote) && Number.isFinite(r.rang) && Number.isFinite(r.pos) && r.rang >= 1);

const W = Math.max(...D.map(d => d.rang));
const T = Array.from({ length: 5 }, () => new Array(W + 1).fill(0));
for (const d of D) if (d.pos >= 1 && d.pos <= 5) T[d.pos - 1][d.rang]++;
const tot = T.map(r => r.reduce((a, b) => a + b, 0));
const P = (c, t) => t ? (c / t * 100).toFixed(1) + '%' : '—';

console.log('='.repeat(88));
console.log('  P4 — كل رتبة بالتفصيل، بلا أي اختيار');
console.log('='.repeat(88));
console.log('\nرتبة   عدد    %      التراكم');
let s = 0;
for (let r = 1; r <= W; r++) {
  s += T[3][r];
  const bar = '█'.repeat(Math.round(T[3][r]));
  console.log(`${String(r).padStart(4)}  ${String(T[3][r]).padStart(4)}  ${P(T[3][r], tot[3]).padStart(7)}  ${P(s, tot[3]).padStart(8)}  ${bar}`);
}

const nonZero = [];
for (let r = 1; r <= W; r++) if (T[3][r] > 0) nonZero.push([r, T[3][r]]);
console.log(`\n  الرتب اللي عندها شي نتيجة: ${nonZero.map(x => x[0]).join(', ')}  (${nonZero.length} رتبة من ${W})`);
console.log(`  السواء: رتبة 9 = ${T[3][9]}، 12-15 = ${[12,13,14,15].map(r=>T[3][r]).join('/')}`);

console.log('\n' + '='.repeat(88));
console.log('  Top-5 ديالي vs الشامل — الفرق');
console.log('='.repeat(88));
nonZero.sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
const mine = nonZero.slice(0,5).map(x=>x[0]);
console.log(`\n  Top-5 بالحصيلة (هاداك):  ${mine.join(', ')}`);
console.log(`  الشامل (كل الليTermination):  ${nonZero.map(x=>x[0]).join(', ')}`);
const cut = nonZero.slice(5);
console.log(`\n  اللي حذفتهم (${cut.length} رتبة):`);
cut.forEach(([r,c])=>console.log(`    رتبة ${r}: ${c} (${P(c,tot[3])})`));
console.log(`\n  المجموع اللي ضاع: ${cut.reduce((a,x)=>a+x[1],0)} من ${tot[3]} = ${P(cut.reduce((a,x)=>a+x[1],0), tot[3])}`);
