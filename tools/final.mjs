import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const XLSX = require('C:/bahja-TURF/node_modules/xlsx');

const wb = XLSX.readFile('C:/Users/sam/Desktop/statistiques_rang_cote_positions_1_a_5.xlsx');
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Données_extraites'], { defval: null });

const D = rows.filter(r => r.cote != null && r.position != null && r.rang_cote != null)
  .map(r => ({ c: +r.course, cote: +r.cote, rang: +r.rang_cote, pos: parseInt(String(r.position), 10) }))
  .filter(r => Number.isFinite(r.cote) && Number.isFinite(r.rang) && Number.isFinite(r.pos) && r.rang >= 1);

const W = Math.max(...D.map(d => d.rang));
const R = D.length, NC = new Set(D.map(d => d.c)).size;
console.log('='.repeat(100));
console.log(`  الداتا: ${R} سطر · ${NC} سباق · أكبر رتبة = ${W}`);
console.log('='.repeat(100));

// ---- تغطية المراكز 1-5 ----
console.log('\n  تغطية: ');
for (let p = 1; p <= 5; p++) {
  const n = D.filter(d => d.pos === p).length;
  console.log(`    P${p}: ${String(n).padStart(3)} / ${NC}  (${(n / NC * 100).toFixed(1)}%)`);
}

// ---- الترتيب الكامل بلا سقف ----
const T = Array.from({ length: 5 }, () => new Array(W + 1).fill(0));
for (const d of D) if (d.pos >= 1 && d.pos <= 5) T[d.pos - 1][d.rang]++;
const tot = T.map(r => r.reduce((a, b) => a + b, 0));
const P = (c, t) => t ? (c / t * 100).toFixed(1) + '%' : '—';

console.log('\n' + '='.repeat(100));
console.log('  الجدول 1 — رتبة الكوط ديال كل مركز (الكل، بلا قص)');
console.log('='.repeat(100));
console.log('\nرتبة →' + Array.from({ length: W }, (_, i) => String(i + 1).padStart(7)).join(''));
for (let p = 0; p < 5; p++) {
  console.log(`\nP${p + 1}  (n=${tot[p]})`);
  console.log('  عدد' + T[p].slice(1).map(c => String(c).padStart(7)).join(''));
  console.log('   % ' + T[p].slice(1).map(c => P(c, tot[p]).padStart(7)).join(''));
  const pk = T[p].slice(1).indexOf(Math.max(...T[p].slice(1)));
  console.log(`  الذروة → رتبة ${pk + 1}  (${P(Math.max(...T[p].slice(1)), tot[p])})`);
}

// ---- زونات: 1-2 / 3-5 / 6-9 / 10+ ----
console.log('\n' + '='.repeat(100));
console.log('  الجدول 2 — زونات الكوط (دون قص)');
console.log('='.repeat(100));
const Z = [['1-2', 1, 2], ['3-5', 3, 5], ['6-9', 6, 9], ['10-15', 10, 15], ['16+', 16, 999]];
console.log('\nالزون    ' + Array.from({ length: 5 }, (_, i) => `P${i + 1}`.padStart(9)).join('') + '   يوصل P5');
Z.forEach(([n, a, b]) => {
  const row = T.map((r, p) => {
    const c = r.slice(a, b + 1).reduce((x, y) => x + y, 0);
    return P(c, tot[p]).padStart(9);
  }).join('');
  const any = T.some(r => r.slice(a, b + 1).some(v => v > 0));
  console.log(n.padEnd(9) + row + (any ? '        نعم' : '        —'));
});

// ---- تراكمي ----
console.log('\n' + '='.repeat(100));
console.log('  الجدول 3 — Top-N (تراكمي، بلا سقف)');
console.log('='.repeat(100));
const avg = R / NC;
console.log(`\nمتوسط الخيل/سباق = ${avg.toFixed(1)}  =>  الحظ ≈ ${(100 / avg).toFixed(1)}%\n`);
console.log('N        P1       P2       P3       P4       P5');
for (let n = 1; n <= W; n++) {
  const row = T.map((r, p) => P(r.slice(1, n + 1).reduce((a, b) => a + b, 0), tot[p]).padStart(9)).join('');
  console.log(`Top-${String(n).padEnd(3)} ` + row);
}

// ----fora كل مركز: كمdl是关键 ----
console.log('\n' + '='.repeat(100));
console.log('  الجدول 4 — بالمركز: من أي عمق باش توصل 50% / 70% / 80%');
console.log('='.repeat(100));
console.log('\nالمركز   50% عند    70% عند    80% عند    90% عند');
T.forEach((r, p) => {
  const at = th => { let s = 0; for (let i = 1; i <= W; i++) { s += r[i]; if (s / tot[p] >= th) return i; } return '>'; +W; };
  console.log(`P${p + 1}`.padEnd(9) + String(at(.5)).padStart(11) + String(at(.7)).padStart(12) + String(at(.8)).padStart(12) + String(at(.9)).padStart(12));
});

// ---- الكوط ----
console.log('\n' + '='.repeat(100));
console.log('  الجدول 5 — الكوط النهائي لكل مركز');
console.log('='.repeat(100));
const C = Array.from({ length: 5 }, () => []);
for (const d of D) if (d.pos >= 1 && d.pos <= 5) C[d.pos - 1].push(d.cote);
console.log('\nالمركز   عدد    الوسيط   P25     P75     الأدنى    الأعلى');
C.forEach((s, p) => {
  const x = s.slice().sort((a, b) => a - b);
  const q = f => x[Math.floor(x.length * f)];
  console.log(`P${p + 1}`.padEnd(9) + String(x.length).padStart(5) + String(q(.5)).padStart(9)
    + String(q(.25)).padStart(8) + String(q(.75)).padStart(8) + String(x[0]).padStart(9) + String(x[x.length - 1]).padStart(9));
});
const b = [[0, 3], [4, 6], [7, 10], [11, 15], [16, 25], [26, 999]];
const bl = ['≤3', '4-6', '7-10', '11-15', '16-25', '>25'];
console.log('\nالمركز  ' + bl.map(s => s.padStart(9)).join(''));
C.forEach((s, p) => console.log(`P${p + 1}`.padEnd(9) + b.map(([a, z]) => P(s.filter(c => c >= a && c <= z).length, s.length).padStart(9)).join('')));
