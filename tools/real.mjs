import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const XLSX = require('C:/bahja-TURF/node_modules/xlsx');

const wb = XLSX.readFile('C:/Users/sam/Desktop/statistiques_rang_cote_positions_1_a_5.xlsx');
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Données_extraites'], { defval: null });
console.log('أسطر الداتا:', rows.length);

// تنظيف
const D = rows
  .filter(r => r.cote != null && r.position != null && r.rang_cote != null)
  .map(r => ({
    course: r.course, num: r.cheval,
    cote: Number(r.cote), rang: Number(r.rang_cote),
    pos: parseInt(String(r.position), 10),   // "1er","2e","13e" → 1,2,13
  }))
  .filter(r => Number.isFinite(r.cote) && Number.isFinite(r.rang) && Number.isFinite(r.pos));

console.log('أسطر صالحة:', D.length);
console.log('سباقات (course):', new Set(D.map(d => d.course)).size);
console.log('أكبر rang_cote:', Math.max(...D.map(d => d.rang)));
console.log('أصغر cote:', Math.min(...D.map(d => d.cote)), '| أكبر cote:', Math.max(...D.map(d => d.cote)));

const P = (c, t) => t ? (c / t * 100).toFixed(1) + '%' : '—';

// ===== توزيع course =====
const byC = new Map();
for (const d of D) (byC.get(d.course) ?? byC.set(d.course, []).get(d.course)).push(d);
const sizes = [...byC.values()].map(a => a.length).sort((a, b) => a - b);
console.log('\nعدد الخيل فـ course: أصغر', sizes[0], '| أكبر', sizes[sizes.length - 1],
  '| وسيط', sizes[Math.floor(sizes.length / 2)], '| متوسط', (D.length / byC.size).toFixed(1));

// =====.Table لكل مركز =====
console.log('\n' + '='.repeat(92));
console.log('  رتبة الكوط ديال كل مركز — على الداتا الحقيقية ديالك');
console.log('='.repeat(92));

const W = Math.max(...D.map(d => d.rang));
const T = Array.from({ length: 5 }, () => new Array(W + 1).fill(0));
for (const d of D) { const p = +d.pos; if (p >= 1 && p <= 5) T[p - 1][d.rang]++; }
const tot = T.map(r => r.reduce((a, b) => a + b, 0));

const V = Math.min(12, W);
console.log('\nرتبة الكوط →' + Array.from({ length: V }, (_, i) => String(i + 1).padStart(8)).join('') + (W > V ? '    13+' : ''));
for (let p = 0; p < 5; p++) {
  const last = T[p].reduce((a, b, i) => a + (i > V ? b : 0), 0);
  console.log(`\nP${p + 1}   (n=${tot[p]})`);
  console.log('   عدد ' + T[p].slice(1, V + 1).map(c => String(c).padStart(8)).join('') + (last ? String(last).padStart(8) : ''));
  console.log('    %  ' + T[p].slice(1, V + 1).map(c => P(c, tot[p]).padStart(8)).join('') + (last ? P(last, tot[p]).padStart(8) : ''));
  const body = T[p].slice(1);
  const pk = body.indexOf(Math.max(...body));
  console.log(`   الذروة → رتبة ${pk + 1}  (${P(Math.max(...body), tot[p])})`);
}

// ===== Top-N =====
console.log('\n' + '='.repeat(92));
console.log('  Top-N — من أول N بالكوتب، شحال كيدخل فالمركز N');
console.log('='.repeat(92));
const chance = 100 / (D.length / byC.size);
console.log(`\nمتوسط عدد الخيل فسباق = ${(D.length / byC.size).toFixed(1)}  =>  الحظ = ${chance.toFixed(1)}%`);
console.log('\nN        P1       P2       P3       P4       P5       |  × الحظ (P1)');
for (let n = 1; n <= 12; n++) {
  const r = [];
  for (let p = 0; p < 5; p++) {
    const c = T[p].slice(1, n + 1).reduce((a, b) => a + b, 0);
    r.push(P(c, tot[p]));
  }
  const c1 = T[0].slice(1, n + 1).reduce((a, b) => a + b, 0);
  console.log(`Top-${String(n).padEnd(3)} ` + r.map(s => s.padStart(9)).join(' ') + `  |   ×${(c1 / tot[0] * 100 / chance).toFixed(2)}`);
}

// ===== الكوط الحقيقي =====
console.log('\n' + '='.repeat(92));
console.log('  الكوط النهائي لكل مركز — وسيط ماشي متوسط');
console.log('='.repeat(92));
console.log('\nالمركز   عدد    الوسيط   P25     P75     الأدنى    الأعلى');
const C = Array.from({ length: 5 }, () => []);
for (const d of D) { const p = +d.pos; if (p >= 1 && p <= 5) C[p - 1].push(d.cote); }
for (let p = 0; p < 5; p++) {
  const s = C[p].slice().sort((a, b) => a - b);
  const q = f => s[Math.floor(s.length * f)];
  console.log(`P${p + 1}`.padEnd(9) + String(s.length).padStart(5) + String(q(.5)).padStart(9)
    + String(q(.25)).padStart(8) + String(q(.75)).padStart(8) + String(s[0]).padStart(9) + String(s[s.length - 1]).padStart(9));
}

// ===== التوزيع =====
console.log('\n' + '='.repeat(92));
console.log('  توزيع الكوط النهائي لكل مركز');
console.log('='.repeat(92));
const bins = [[0, 3], [4, 6], [7, 10], [11, 15], [16, 25], [26, 1e9]];
const lbl = ['≤3', '4-6', '7-10', '11-15', '16-25', '>25'];
console.log('\nالمركز  ' + lbl.map(s => s.padStart(9)).join(''));
for (let p = 0; p < 5; p++) {
  const s = C[p];
  console.log(`P${p + 1}`.padEnd(9) + bins.map(([a, b]) => P(s.filter(c => c >= a && c <= b).length, s.length).padStart(9)).join(''));
}

// ===== تحقق =====
console.log('\n' + '='.repeat(92));
console.log('  تحقق');
console.log('='.repeat(92));
for (let p = 0; p < 5; p++) {
  const inSheet = XLSX.utils.sheet_to_json(wb.Sheets[['', '2e', '3e', '4e', '5e'][p]], { header: 1 });
  const sheetTot = inSheet.slice(1).reduce((a, r) => a + (Number(r[1]) || 0), 0);
  console.log(`  P${p + 1}: حاسباتي = ${tot[p]}  |  Excel ديالك = ${sheetTot}  ${tot[p] === sheetTot ? '✓' : '✗ الفرق ' + (tot[p] - sheetTot)}`);
}
